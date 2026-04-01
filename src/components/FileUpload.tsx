import React from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  id: string;
  accept: string;
  multiple?: boolean;
  onFileChange: (files: FileList | null) => void;
  label: string;
  description: string;
  fileCount?: string;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  id,
  accept,
  multiple = false,
  onFileChange,
  label,
  description,
  fileCount,
  className = ''
}) => {
  return (
    <div className={`relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors duration-200 cursor-pointer ${className}`}>
      <input
        type="file"
        id={id}
        multiple={multiple}
        accept={accept}
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => onFileChange(e.target.files)}
      />
      <label htmlFor={id} className="block cursor-pointer">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="text-gray-700 font-semibold mb-2">{label}</div>
        <div className="text-gray-500 text-sm mb-2">{description}</div>
        {fileCount && (
          <span className="text-blue-600 font-medium">{fileCount}</span>
        )}
      </label>
    </div>
  );
};

export default FileUpload;