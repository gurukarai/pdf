import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import App from './App.tsx';
import './index.css';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
