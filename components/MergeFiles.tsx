import React, { useState } from 'react';
import { TOOLS } from '../constants';
import { Tool } from '../types';
import FileUploader from './FileUploader';
import LoadingSpinner from './LoadingSpinner';

declare const PDFLib: any;
declare const saveAs: any;

const toolInfo = TOOLS.find(t => t.id === Tool.MERGE_FILES)!;

interface UploadedFile {
    id: string;
    file: File;
    previewUrl: string;
    type: 'pdf' | 'jpg';
}

export default function MergeFiles() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => {
        // FIX: Explicitly set the type to 'pdf' | 'jpg' to prevent TypeScript
        // from widening it to a generic string, which caused a type error.
        const type: 'pdf' | 'jpg' = file.type === 'application/pdf' ? 'pdf' : 'jpg';
        const previewUrl = type === 'jpg' ? URL.createObjectURL(file) : '';
        return {
            id: `${file.name}-${file.lastModified}`,
            file,
            previewUrl,
            type
        };
    });
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

  const mergeFiles = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const { file, type } of files) {
            if (type === 'jpg') {
                const jpgBytes = await file.arrayBuffer();
                const jpgImage = await mergedPdf.embedJpg(jpgBytes);
                const page = mergedPdf.addPage([jpgImage.width, jpgImage.height]);
                page.drawImage(jpgImage, { x: 0, y: 0, width: jpgImage.width, height: jpgImage.height });
            } else if (type === 'pdf') {
                const pdfBytes = await file.arrayBuffer();
                const donorPdf = await PDFDocument.load(pdfBytes);
                const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }
        }

        const pdfBytes = await mergedPdf.save();
        saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'merged.pdf');

    } catch (e) {
        console.error(e);
        setError('Failed to merge files. Please ensure all files are valid and not corrupted.');
    } finally {
        setIsLoading(false);
    }
  };

  const FileIcon = ({type}: {type: 'pdf' | 'jpg'}) => type === 'pdf' ? 
    (<svg className="w-10 h-10 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>) :
    (<svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2 text-white">{toolInfo.name}</h2>
      <p className="text-gray-400 mb-6">{toolInfo.description}</p>

      {files.length === 0 ? (
        <FileUploader onFilesSelected={handleFileSelected} accept=".jpg,.jpeg,.pdf" multiple title="Upload PDF(s) & JPG(s)" />
      ) : (
        <div className="bg-gray-800 p-4 rounded-lg">
            {files.map((f, i) => (
                <div key={f.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md mb-2">
                    <div className="flex items-center">
                        {f.type === 'jpg' ? 
                            <img src={f.previewUrl} alt={f.file.name} className="w-10 h-10 object-cover rounded-md mr-4" />
                            : <div className="w-10 h-10 flex items-center justify-center mr-4"><FileIcon type="pdf"/></div>
                        }
                        <span className="text-sm truncate w-48 md:w-full">{f.file.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => moveFile(i, 'up')} disabled={i === 0} className="p-1 disabled:opacity-30">↑</button>
                        <button onClick={() => moveFile(i, 'down')} disabled={i === files.length - 1} className="p-1 disabled:opacity-30">↓</button>
                        <button onClick={() => removeFile(f.id)} className="p-1 text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
            ))}
             <FileUploader onFilesSelected={handleFileSelected} accept=".jpg,.jpeg,.pdf" multiple title="Add more files" />
        </div>
      )}

      {error && <div className="mt-4 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
      
      {files.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={mergeFiles}
            disabled={isLoading}
            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-gray-500 flex items-center justify-center mx-auto"
          >
            {isLoading ? <><LoadingSpinner /> <span className="ml-2">Merging...</span></> : 'Merge and Download PDF'}
          </button>
        </div>
      )}
    </div>
  );
}