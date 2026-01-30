import React, { useState } from 'react';
import { TOOLS } from '../constants';
import { Tool } from '../types';
import FileUploader from './FileUploader';
import LoadingSpinner from './LoadingSpinner';
import { fileToBase64 } from '../utils/fileUtils';
import { removeBackground } from '../services/geminiService';

const toolInfo = TOOLS.find(t => t.id === Tool.REMOVE_BACKGROUND)!;

export default function BackgroundRemover() {
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setOriginalFile(file);
            setOriginalUrl(URL.createObjectURL(file));
            setResultUrl(null);
            setError(null);
            processImage(file);
        }
    };

    const processImage = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const base64Image = await fileToBase64(file);
            const resultBase64 = await removeBackground(base64Image, file.type);
            setResultUrl(`data:image/png;base64,${resultBase64}`);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`AI processing failed. ${errorMessage}. Please try again or use a different image.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl || !originalFile) return;
        const link = document.createElement('a');
        link.href = resultUrl;
        const name = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
        link.download = `${name}_no_bg.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold mb-2 text-white">{toolInfo.name}</h2>
            <p className="text-gray-400 mb-6">{toolInfo.description}</p>

            {!originalFile && (
                <FileUploader onFilesSelected={handleFileSelected} accept="image/jpeg,image/png,image/webp" title="Upload an Image" />
            )}

            {originalUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Original</h3>
                        <img src={originalUrl} alt="Original" className="max-w-full mx-auto rounded-lg shadow-lg" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">Result</h3>
                        <div className="relative aspect-square flex items-center justify-center bg-gray-800 rounded-lg shadow-lg" style={{backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, transparent 0% 50%)', backgroundSize: '16px 16px'}}>
                            {isLoading && <div className="flex flex-col items-center"><LoadingSpinner /><p className="mt-2 text-sm">AI is thinking...</p></div>}
                            {error && <div className="text-red-400 p-4">{error}</div>}
                            {resultUrl && <img src={resultUrl} alt="Background removed" className="max-w-full max-h-full mx-auto" />}
                        </div>
                    </div>
                </div>
            )}

            {resultUrl && !isLoading && (
                 <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4">
                    <button
                        onClick={handleDownload}
                        className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                        Download Result (.png)
                    </button>
                    <button
                        onClick={() => {
                            setOriginalFile(null);
                            setOriginalUrl(null);
                            setResultUrl(null);
                        }}
                        className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors"
                    >
                        Process Another Image
                    </button>
                </div>
            )}
        </div>
    );
}
