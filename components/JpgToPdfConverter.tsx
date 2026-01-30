import React, { useState } from 'react';
import { TOOLS } from '../constants';
import { Tool } from '../types';
import FileUploader from './FileUploader';
import LoadingSpinner from './LoadingSpinner';

declare const PDFLib: any;
declare const JSZip: any;
declare const saveAs: any;

const toolInfo = TOOLS.find(t => t.id === Tool.JPG_TO_PDF)!;

interface UploadedFile {
    id: string;
    file: File;
    previewUrl: string;
}

export default function JpgToPdfConverter() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combineToOnePdf, setCombineToOnePdf] = useState(true);

  const handleFileSelected = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFiles.length) {
        [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
        setFiles(newFiles);
    }
  };

  const convertToPdf = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
        const { PDFDocument } = PDFLib;

        if (combineToOnePdf) {
            const pdfDoc = await PDFDocument.create();
    
            for (const { file } of files) {
                const jpgBytes = await file.arrayBuffer();
                const jpgImage = await pdfDoc.embedJpg(jpgBytes);
                const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
                page.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: jpgImage.width,
                    height: jpgImage.height
                });
            }
    
            const pdfBytes = await pdfDoc.save();
            saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'converted.pdf');
        } else {
            const zip = new JSZip();
            for (const { file } of files) {
                const pdfDoc = await PDFDocument.create();
                const jpgBytes = await file.arrayBuffer();
                const jpgImage = await pdfDoc.embedJpg(jpgBytes);
                const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
                page.drawImage(jpgImage, {
                    x: 0,
                    y: 0,
                    width: jpgImage.width,
                    height: jpgImage.height
                });
                const pdfBytes = await pdfDoc.save();
                const pdfName = file.name.replace(/\.(jpg|jpeg)$/i, '.pdf');
                zip.file(pdfName, pdfBytes);
            }
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'converted_images_as_pdfs.zip');
        }

    } catch (e) {
        console.error(e);
        setError('Failed to convert images to PDF. Please ensure all files are valid JPGs.');
    } finally {
        setIsLoading(false);
    }
  };

  const ToggleSwitch = () => (
    <div className="flex items-center justify-center space-x-3 my-6">
        <span className={`transition-colors ${!combineToOnePdf ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}>Convert Separately</span>
        <label htmlFor="toggle" className="flex items-center cursor-pointer">
            <div className="relative">
                <input id="toggle" type="checkbox" className="sr-only" checked={combineToOnePdf} onChange={() => setCombineToOnePdf(!combineToOnePdf)} />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${combineToOnePdf ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
        </label>
        <span className={`transition-colors ${combineToOnePdf ? 'text-indigo-400 font-semibold' : 'text-gray-400'}`}>Combine into One PDF</span>
    </div>
  );

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2 text-white">{toolInfo.name}</h2>
      <p className="text-gray-400 mb-6">{toolInfo.description}</p>

      {files.length === 0 ? (
        <FileUploader onFilesSelected={handleFileSelected} accept=".jpg,.jpeg" multiple title="Upload JPG(s)" />
      ) : (
        <div className="bg-gray-800 p-4 rounded-lg">
            {files.map((f, i) => (
                <div key={f.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md mb-2">
                    <div className="flex items-center min-w-0">
                        <img src={f.previewUrl} alt={f.file.name} className="w-10 h-10 object-cover rounded-md mr-4 flex-shrink-0" />
                        <span className="text-sm truncate">{f.file.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        {combineToOnePdf && (
                        <>
                            <button onClick={() => moveFile(i, 'up')} disabled={i === 0} className="p-1 disabled:opacity-30 hover:bg-gray-600 rounded">↑</button>
                            <button onClick={() => moveFile(i, 'down')} disabled={i === files.length - 1} className="p-1 disabled:opacity-30 hover:bg-gray-600 rounded">↓</button>
                        </>
                        )}
                        <button onClick={() => removeFile(f.id)} className="p-1 text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
            ))}
             <FileUploader onFilesSelected={handleFileSelected} accept=".jpg,.jpeg" multiple title="Add more JPGs" />
        </div>
      )}

      {error && <div className="mt-4 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
      
      {files.length > 0 && (
        <div className="mt-6 text-center">
          <ToggleSwitch />
          <button
            onClick={convertToPdf}
            disabled={isLoading}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-gray-500 flex items-center justify-center mx-auto"
          >
            {isLoading ? <><LoadingSpinner /> <span className="ml-2">Converting...</span></> : (combineToOnePdf ? 'Create Single PDF' : 'Create Separate PDFs (.zip)')}
          </button>
        </div>
      )}
    </div>
  );
}
