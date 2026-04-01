import React from 'react';
import { CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';
import { StatusMessage as StatusMessageType } from '../types';

interface StatusMessageProps {
  status: StatusMessageType | null;
  isProcessing?: boolean;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ status, isProcessing }) => {
  if (!status && !isProcessing) return null;

  const getIcon = () => {
    if (isProcessing) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (!status) return null;
    
    switch (status.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    if (isProcessing) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (!status) return '';
    
    switch (status.type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border font-medium ${getStyles()}`}>
      {getIcon()}
      <span>{isProcessing ? 'Processing...' : status?.message}</span>
    </div>
  );
};

export default StatusMessage;