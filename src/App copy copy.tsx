import React, { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { ConversionProgress } from './components/ConversionProgress';
import { ImageGallery } from './components/ImageGallery';
import { usePdfConverter } from './hooks/usePdfConverter';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    images,
    isConverting,
    currentPage,
    totalPages,
    convertPdfToImages,
    downloadSingleImage,
    downloadAllImages,
    resetConverter,
  } = usePdfConverter();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    await convertPdfToImages(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    resetConverter();
  };

  const handleStartOver = () => {
    setSelectedFile(null);
    resetConverter();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                PDF to Image Converter
              </h1>
              <p className="text-sm text-gray-600">Convert your PDF files to high-quality images instantly</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-blue-600 mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wide">Free & Secure</span>
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Transform PDF Pages into
              <span className="block bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Beautiful Images
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload your PDF and convert each page to a high-resolution PNG image. 
              Perfect for presentations, sharing, and archiving.
            </p>
          </div>

          {/* Upload Section */}
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onRemoveFile={handleRemoveFile}
            isConverting={isConverting}
          />

          {/* Progress Section */}
          <ConversionProgress
            isConverting={isConverting}
            currentPage={currentPage}
            totalPages={totalPages}
          />

          {/* Results Section */}
          {images.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Conversion Complete! 🎉
                </h3>
                <p className="text-gray-600 mb-4">
                  Your PDF has been successfully converted to {images.length} image{images.length !== 1 ? 's' : ''}.
                </p>
                <button
                  onClick={handleStartOver}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  Convert Another PDF →
                </button>
              </div>

              <ImageGallery
                images={images}
                onDownloadAll={downloadAllImages}
                onDownloadSingle={downloadSingleImage}
              />
            </div>
          )}

          {/* Features Section */}
          {!selectedFile && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <div className="text-center p-6">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">High Quality</h3>
                <p className="text-gray-600 text-sm">
                  Convert PDFs to crisp, high-resolution PNG images with perfect clarity.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Fast & Secure</h3>
                <p className="text-gray-600 text-sm">
                  All processing happens in your browser. Your files never leave your device.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Batch Download</h3>
                <p className="text-gray-600 text-sm">
                  Download all converted images as a ZIP file or individually.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>© 2025 PDF to Image Converter. Built with React & PDF.js.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;