import React from 'react';
import { Loader2 } from 'lucide-react';

interface ConversionProgressProps {
  isConverting: boolean;
  currentPage: number;
  totalPages: number;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  isConverting,
  currentPage,
  totalPages,
}) => {
  if (!isConverting) return null;

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="flex items-center space-x-4 mb-4">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <div>
          <h3 className="font-semibold text-gray-900">Converting PDF to Images</h3>
          <p className="text-sm text-gray-500">
            Processing page {currentPage} of {totalPages}
          </p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};