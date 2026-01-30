import React, { useState } from 'react';
import { TOOLS } from '../constants';
import { Tool } from '../types';
import FileUploader from './FileUploader';
import LoadingSpinner from './LoadingSpinner';

declare const pdfjsLib: any;
declare const JSZip: any;
declare const saveAs: any;

const toolInfo = TOOLS.find(t => t.id === Tool.PDF_TO_JPG)!;

interface ProcessedPdf {
  file: File;
  imageUrls: string[];
}

export default function PdfToJpgConverter() {
  const [processedPdfs, setProcessedPdfs] = useState<ProcessedPdf[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setProcessedPdfs([]);
      setError(null);
      processPdfs(files);
    }
  };

  const processPdfs = async (files: File[]) => {
    setIsLoading(true);
    const results: ProcessedPdf[] = [];
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        const urls: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          urls.push(canvas.toDataURL('image/jpeg'));
        }
        results.push({ file, imageUrls: urls });
      }
      setProcessedPdfs(results);
    } catch (e) {
      console.error(e);
      setError('Failed to process one or more PDFs. Please ensure all are valid files.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (processedPdfs.length === 0) return;
    const zip = new JSZip();

    if (processedPdfs.length === 1) {
      const pdf = processedPdfs[0];
      pdf.imageUrls.forEach((url, i) => {
        const base64Data = url.split(',')[1];
        zip.file(`page_${i + 1}.jpg`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${pdf.file.name.replace('.pdf', '') || 'images'}.zip`);
    } else {
      for (const { file, imageUrls } of processedPdfs) {
        const folderName = file.name.replace(/\.pdf$/i, '');
        const folder = zip.folder(folderName);
        if (folder) {
            imageUrls.forEach((url, i) => {
                const base64Data = url.split(',')[1];
                folder.file(`page_${i + 1}.jpg`, base64Data, { base64: true });
            });
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'converted_pdfs.zip');
    }
  };

  // FIX: Refactored props to use a defined interface to resolve type error.
  interface AccordionProps {
    title: string;
    // FIX: Made the 'children' prop optional to resolve the TypeScript error.
    children?: React.ReactNode;
    pageCount: number;
  }
  const Accordion = ({ title, children, pageCount }: AccordionProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="bg-gray-800 rounded-lg mb-4">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-700/50 transition-colors">
          <span className="font-semibold truncate pr-4">{title} ({pageCount} pages)</span>
          <svg className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        {isOpen && <div className="p-4 border-t border-gray-700">{children}</div>}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2 text-white">{toolInfo.name}</h2>
      <p className="text-gray-400 mb-6">{toolInfo.description}</p>
      
      {processedPdfs.length === 0 && !isLoading && (
         <FileUploader onFilesSelected={handleFileSelected} accept=".pdf" title="Upload PDF(s)" multiple />
      )}

      {isLoading && <div className="flex items-center justify-center p-8 bg-gray-800 rounded-lg"><LoadingSpinner /> <span className="ml-4">Processing PDFs...</span></div>}
      {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}

      {processedPdfs.length > 0 && (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Generated Images</h3>
                <button
                    onClick={handleDownload}
                    className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                    Download All (.zip)
                </button>
            </div>
            <div>
              {processedPdfs.map(({ file, imageUrls }) => (
                <div key={file.name}>
                  <Accordion title={file.name} pageCount={imageUrls.length}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img src={url} alt={`Page ${index + 1}`} className="w-full h-auto rounded-md shadow-lg"/>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-md">
                              Page {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
}