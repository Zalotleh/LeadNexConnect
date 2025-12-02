import React, { useState } from 'react';
import { Palette, Code } from 'lucide-react';
import { getAllEmailVariables } from '@/lib/emailVariables';
import EmailEditor from '../EmailEditor';
import TinyMCEEmailEditor from './TinyMCEEmailEditor';

interface EnhancedEmailEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  enableVisualEditor?: boolean; // Toggle to enable/disable visual editor
}

export default function EnhancedEmailEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 10,
  required = false,
  enableVisualEditor = true,
}: EnhancedEmailEditorProps) {
  const [editorMode, setEditorMode] = useState<'simple' | 'visual'>('simple');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {enableVisualEditor && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setEditorMode('simple')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                editorMode === 'simple'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Simple
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('visual')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                editorMode === 'visual'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Visual
            </button>
          </div>
        )}
      </div>

      {/* Simple Editor */}
      {editorMode === 'simple' && (
        <EmailEditor
          label=""
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
        />
      )}

      {/* Visual Editor - TinyMCE */}
      {editorMode === 'visual' && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <TinyMCEEmailEditor
            value={value}
            onChange={onChange}
            variables={getAllEmailVariables()}
          />
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-600">
        <strong>Simple Mode:</strong> Basic text editor with variable insertion. 
        <strong className="ml-2">Visual Mode:</strong> Rich text editor with formatting, colors, images, and more.
      </div>
    </div>
  );
}
