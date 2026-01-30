import React, { useState, useEffect } from 'react';
import { Tool } from './types';
import { TOOLS } from './constants';
import PdfToJpgConverter from './components/PdfToJpgConverter';
import JpgToPdfConverter from './components/JpgToPdfConverter';
import MergeFiles from './components/MergeFiles';
import BackgroundRemover from './components/BackgroundRemover';
import ImageEditor from './components/ImageEditor';

declare const pdfjsLib: any;

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.PDF_TO_JPG);

  useEffect(() => {
    // Set up the PDF.js worker source once
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;
    }
  }, []);

  const renderActiveTool = () => {
    switch (activeTool) {
      case Tool.PDF_TO_JPG:
        return <PdfToJpgConverter />;
      case Tool.JPG_TO_PDF:
        return <JpgToPdfConverter />;
      case Tool.MERGE_FILES:
        return <MergeFiles />;
      case Tool.IMAGE_EDITOR:
        return <ImageEditor />;
      case Tool.REMOVE_BACKGROUND:
        return <BackgroundRemover />;
      default:
        return <PdfToJpgConverter />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-gray-100 font-sans">
      <aside className="w-full md:w-64 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-indigo-400 mb-6">Media Toolkit Pro</h1>
        <nav>
          <ul>
            {TOOLS.map(({ id, name, icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActiveTool(id)}
                  className={`w-full text-left flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                    activeTool === id
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {icon}
                  <span className="ml-3">{name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {renderActiveTool()}
      </main>
    </div>
  );
}
