import React from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';

interface ConvertedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
}

interface ImageGalleryProps {
  images: ConvertedImage[];
  onDownloadAll: () => void;
  onDownloadSingle: (image: ConvertedImage) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDownloadAll,
  onDownloadSingle,
}) => {
  if (images.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-100 p-2 rounded-lg">
            <ImageIcon className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Converted Images</h3>
            <p className="text-sm text-gray-500">{images.length} pages converted</p>
          </div>
        </div>
        <button
          onClick={onDownloadAll}
          className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download All</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div key={image.pageNumber} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
              <img
                src={image.dataUrl}
                alt={`Page ${image.pageNumber}`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  Page {image.pageNumber}
                </span>
                <button
                  onClick={() => onDownloadSingle(image)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};