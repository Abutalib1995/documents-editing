import React, { useCallback, useState } from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  title: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, accept, multiple = false, title }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-300 ${isDragging ? 'border-indigo-400 bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center">
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="mt-2 text-sm text-gray-400">
            <span className="font-semibold text-indigo-400">{title}</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">{accept.split(',').join(', ').toUpperCase()}</p>
        </div>
      </label>
    </div>
  );
};

export default FileUploader;
