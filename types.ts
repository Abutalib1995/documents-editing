// Fix: Import React to use its types like React.ReactNode.
import type React from 'react';

export enum Tool {
  PDF_TO_JPG = 'PDF_TO_JPG',
  JPG_TO_PDF = 'JPG_TO_PDF',
  MERGE_FILES = 'MERGE_FILES',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  REMOVE_BACKGROUND = 'REMOVE_BACKGROUND',
}

export interface ToolInfo {
    id: Tool;
    name: string;
    // Fix: Changed type from JSX.Element to React.ReactNode to resolve JSX namespace error in a plain TypeScript file.
    icon: React.ReactNode;
    description: string;
}
