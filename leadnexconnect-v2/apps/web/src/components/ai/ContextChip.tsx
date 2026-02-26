import React from 'react';
import { X } from 'lucide-react';

interface ContextChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
}

export default function ContextChip({ label, value, onRemove }: ContextChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
      <span className="text-blue-700 font-medium">{label}:</span>
      <span className="text-blue-900">{value}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
