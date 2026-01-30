import React, { useState, useRef, useEffect } from 'react';
import { TOOLS } from '../constants';
import { Tool } from '../types';
import FileUploader from './FileUploader';
import LoadingSpinner from './LoadingSpinner';

declare const Cropper: any;

const toolInfo = TOOLS.find(t => t.id === Tool.IMAGE_EDITOR)!;

const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
          bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

export default function ImageEditor() {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [resizeWidth, setResizeWidth] = useState<number | string>('');
    const [resizeHeight, setResizeHeight] = useState<number | string>('');
    const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [targetSize, setTargetSize] = useState<number | string>('');
    const [currentSizeKB, setCurrentSizeKB] = useState<number | null>(null);
    const [currentMimeType, setCurrentMimeType] = useState('image/png');

    const imageRef = useRef<HTMLImageElement>(null);
    const cropperRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        if (editingUrl && imageRef.current) {
            if (cropperRef.current) {
                cropperRef.current.destroy();
            }
            const cropper = new Cropper(imageRef.current, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                background: false,
            });
            cropperRef.current = cropper;
        }
    }, [editingUrl]);
    
    useEffect(() => {
        if (editingUrl) {
            const blob = dataURLtoBlob(editingUrl);
            setCurrentSizeKB(Math.round(blob.size / 1024));
        } else {
            setCurrentSizeKB(null);
        }
    }, [editingUrl]);

    const resetState = () => {
        setOriginalFile(null);
        setEditingUrl(null);
        setResizeWidth('');
        setResizeHeight('');
        setMaintainAspectRatio(true);
        setAspectRatio(1);
        setTargetSize('');
        setCurrentSizeKB(null);
        setCurrentMimeType('image/png');
        if (cropperRef.current) {
            cropperRef.current.destroy();
        }
    }

    const handleFileSelected = (files: File[]) => {
        if (files.length === 0) return;
        
        resetState();
        const file = files[0];
        setOriginalFile(file);
        setCurrentMimeType(file.type);

        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result as string;
            setEditingUrl(url);

            const img = new Image();
            img.onload = () => {
                setResizeWidth(img.width);
                setResizeHeight(img.height);
                setAspectRatio(img.width / img.height);
            };
            img.src = url;
        };
        reader.readAsDataURL(file);
    };
    
    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const newWidth = value === '' ? '' : parseInt(value, 10);
        setResizeWidth(newWidth);
        if (maintainAspectRatio && typeof newWidth === 'number' && !isNaN(newWidth)) {
            setResizeHeight(Math.round(newWidth / aspectRatio));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const newHeight = value === '' ? '' : parseInt(value, 10);
        setResizeHeight(newHeight);
        if (maintainAspectRatio && typeof newHeight === 'number' && !isNaN(newHeight)) {
            setResizeWidth(Math.round(newHeight * aspectRatio));
        }
    };

    const applyResize = () => {
        if (!editingUrl || !resizeWidth || !resizeHeight || Number(resizeWidth) <= 0 || Number(resizeHeight) <= 0) return;
        setIsLoading(true);
        const imageElement = new Image();
        imageElement.src = editingUrl;
        imageElement.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = Number(resizeWidth);
            canvas.height = Number(resizeHeight);
            ctx!.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
            const resizedUrl = canvas.toDataURL(currentMimeType);
            setEditingUrl(resizedUrl);
            setAspectRatio(canvas.width / canvas.height);
            setIsLoading(false);
        };
    };

    const applyCrop = () => {
        if (!cropperRef.current) return;
        setIsLoading(true);
        const croppedCanvas = cropperRef.current.getCroppedCanvas();
        if (croppedCanvas) {
            const croppedUrl = croppedCanvas.toDataURL(currentMimeType);
            setEditingUrl(croppedUrl);
            setResizeWidth(croppedCanvas.width);
            setResizeHeight(croppedCanvas.height);
            setAspectRatio(croppedCanvas.width / croppedCanvas.height);
        }
        setIsLoading(false);
    };
    
    const applyTargetSize = async () => {
        if (!editingUrl || !targetSize || Number(targetSize) <= 0) return;
        setIsLoading(true);

        const targetBytes = Number(targetSize) * 1024;
        const imageElement = new Image();
        
        const loadPromise = new Promise(resolve => imageElement.onload = resolve);
        imageElement.src = editingUrl;
        await loadPromise;

        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(imageElement, 0, 0);

        const getBlob = (quality: number): Promise<Blob> => {
            return new Promise(resolve => {
                canvas.toBlob(blob => resolve(blob!), 'image/jpeg', quality);
            });
        };

        let minQuality = 0;
        let maxQuality = 1;
        let bestBlob: Blob | null = null;
        let bestSizeDiff = Infinity;

        for (let i = 0; i < 10; i++) { // Binary search for quality
            const midQuality = (minQuality + maxQuality) / 2;
            const currentBlob = await getBlob(midQuality);
            const currentSize = currentBlob.size;
            const diff = Math.abs(currentSize - targetBytes);

            if (diff < bestSizeDiff) {
                bestSizeDiff = diff;
                bestBlob = currentBlob;
            }

            if (currentSize > targetBytes) {
                maxQuality = midQuality;
            } else {
                minQuality = midQuality;
            }
        }

        if (bestBlob) {
            const reader = new FileReader();
            reader.readAsDataURL(bestBlob);
            reader.onloadend = () => {
                setEditingUrl(reader.result as string);
                setCurrentMimeType('image/jpeg');
                setIsLoading(false);
            };
        } else {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!editingUrl || !originalFile) return;
        const link = document.createElement('a');
        link.href = editingUrl;
        const name = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
        const extension = currentMimeType.split('/')[1] || 'png';
        link.download = `${name}_edited.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-white">{toolInfo.name}</h2>
            <p className="text-gray-400 mb-6">{toolInfo.description}</p>
            
            {!originalFile ? (
                <FileUploader onFilesSelected={handleFileSelected} accept="image/jpeg,image/png,image/webp" title="Upload an Image" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 relative">
                        {isLoading && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10"><LoadingSpinner /></div>}
                        <div className="bg-gray-800 p-2 rounded-lg">
                           <img ref={imageRef} src={editingUrl!} alt="Editing preview" className="max-w-full max-h-[70vh] block" />
                        </div>
                    </div>
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Resize</h3>
                            <div className="flex items-center space-x-2">
                                <input type="number" value={resizeWidth} onChange={handleWidthChange} className="w-full bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Width" />
                                <span className="text-gray-400">×</span>
                                <input type="number" value={resizeHeight} onChange={handleHeightChange} className="w-full bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Height" />
                            </div>
                            <div className="mt-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={maintainAspectRatio} onChange={(e) => setMaintainAspectRatio(e.target.checked)} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500" />
                                    <span className="text-sm">Maintain aspect ratio</span>
                                </label>
                            </div>
                            <button onClick={applyResize} className="w-full mt-3 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
                                Apply Resize
                            </button>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Crop</h3>
                            <p className="text-sm text-gray-400 mb-3">Adjust the frame on the image to your liking.</p>
                            <button onClick={applyCrop} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
                                Apply Crop
                            </button>
                        </div>

                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">File Size</h3>
                            {currentSizeKB !== null && <p className="text-sm text-gray-400 mb-2">Current size: ~{currentSizeKB} KB</p>}
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="number" 
                                    value={targetSize} 
                                    onChange={(e) => setTargetSize(e.target.value)}
                                    className="w-full bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                    placeholder="Target KB" 
                                />
                                <span className="text-gray-400">KB</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Changes image format to JPG for best compression.</p>
                            <button onClick={applyTargetSize} className="w-full mt-3 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
                                Adjust Size
                            </button>
                        </div>
                        
                        <div className="flex flex-col space-y-3">
                           <button onClick={handleDownload} className="bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition-colors">
                                Download Image
                            </button>
                             <button onClick={() => handleFileSelected([originalFile!])} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors">
                                Reset Changes
                            </button>
                            <button onClick={resetState} className="bg-red-700/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600/80 transition-colors">
                                Upload New Image
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
