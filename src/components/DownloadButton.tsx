import React from 'react';
import { Download } from 'lucide-react';

interface DownloadButtonProps {
  href: string;
  filename: string;
  children: React.ReactNode;
  className?: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  href,
  filename,
  children,
  className = ''
}) => {
  return (
    <a
      href={href}
      download={filename}
      className={`inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 ${className}`}
    >
      <Download className="w-5 h-5" />
      {children}
    </a>
  );
};

export default DownloadButton;