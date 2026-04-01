import { useRef } from 'react';
import { Video as LucideIcon, Upload, X } from 'lucide-react';

interface FileUploaderProps {
  title: string;
  icon: LucideIcon;
  accept: string;
  multiple: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileUploader({
  title,
  icon: Icon,
  accept,
  multiple,
  files,
  onFilesChange,
  disabled = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (multiple) {
      onFilesChange([...files, ...selectedFiles]);
    } else {
      onFilesChange(selectedFiles);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h3>

      <div className="space-y-3">
        <label className="block">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              disabled
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />
            <p className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>
              Click to upload {multiple ? 'files' : 'a file'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {accept.split(',').join(', ')}
            </p>
          </div>
        </label>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={disabled}
                  className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
