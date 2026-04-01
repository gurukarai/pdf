import { CheckCircle, Loader2, XCircle, Clock } from 'lucide-react';

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  message?: string;
}

interface ProcessingStatusProps {
  steps: ProcessingStep[];
}

export default function ProcessingStatus({ steps }: ProcessingStatusProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Processing Status</h3>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              step.status === 'processing'
                ? 'bg-blue-50 border border-blue-200'
                : step.status === 'complete'
                ? 'bg-green-50 border border-green-200'
                : step.status === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <div className="flex-shrink-0">
              {step.status === 'pending' && <Clock className="w-5 h-5 text-slate-400" />}
              {step.status === 'processing' && (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
              {step.status === 'complete' && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              {step.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
            </div>

            <div className="flex-1">
              <p
                className={`font-medium ${
                  step.status === 'processing'
                    ? 'text-blue-700'
                    : step.status === 'complete'
                    ? 'text-green-700'
                    : step.status === 'error'
                    ? 'text-red-700'
                    : 'text-slate-600'
                }`}
              >
                {step.name}
              </p>
              {step.message && (
                <p className="text-sm text-slate-500 mt-1">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
