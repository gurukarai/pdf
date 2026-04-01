import { Move } from 'lucide-react';

interface PositionControlsProps {
  offsetX: number;
  offsetY: number;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  disabled?: boolean;
}

export default function PositionControls({
  offsetX,
  offsetY,
  onOffsetXChange,
  onOffsetYChange,
  disabled = false,
}: PositionControlsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Move className="w-5 h-5" />
        Position Adjustments
      </h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="offset-x" className="block text-sm font-medium text-slate-700 mb-2">
            Horizontal Offset (mm): <span className="font-mono text-blue-600">{offsetX}</span>
          </label>
          <input
            id="offset-x"
            type="range"
            value={offsetX}
            onChange={(e) => onOffsetXChange(Number(e.target.value))}
            disabled={disabled}
            min={-50}
            max={50}
            step={0.5}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>-50 mm</span>
            <span>0</span>
            <span>+50 mm</span>
          </div>
        </div>

        <div>
          <label htmlFor="offset-y" className="block text-sm font-medium text-slate-700 mb-2">
            Vertical Offset (mm): <span className="font-mono text-blue-600">{offsetY}</span>
          </label>
          <input
            id="offset-y"
            type="range"
            value={offsetY}
            onChange={(e) => onOffsetYChange(Number(e.target.value))}
            disabled={disabled}
            min={-50}
            max={50}
            step={0.5}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>-50 mm</span>
            <span>0</span>
            <span>+50 mm</span>
          </div>
        </div>

        <button
          onClick={() => {
            onOffsetXChange(0);
            onOffsetYChange(0);
          }}
          disabled={disabled || (offsetX === 0 && offsetY === 0)}
          className="w-full mt-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium rounded-lg transition-colors"
        >
          Reset to Center
        </button>
      </div>
    </div>
  );
}
