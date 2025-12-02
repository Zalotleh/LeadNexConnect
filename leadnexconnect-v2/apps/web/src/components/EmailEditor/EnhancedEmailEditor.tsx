import React, { useState, Suspense, lazy } from 'react';
import { Palette, Code, Eye } from 'lucide-react';
import { EMAIL_VARIABLES } from '../EmailEditor';

// Lazy load GrapeJS editor to avoid SSR issues
const GrapeJSEmailEditor = lazy(() => import('./GrapeJSEmailEditor'));

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
  const [showVisualEditor, setShowVisualEditor] = useState(false);

  const handleOpenVisualEditor = () => {
    setShowVisualEditor(true);
  };

  const handleCloseVisualEditor = () => {
    setShowVisualEditor(false);
  };

  // Simple textarea editor (current implementation)
  const SimpleEditor = lazy(() => import('../EmailEditor'));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {enableVisualEditor && (
          <div className="flex items-center gap-2">
            {/* Editor Mode Toggle */}
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

            {editorMode === 'visual' && (
              <button
                type="button"
                onClick={handleOpenVisualEditor}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                <Palette className="w-4 h-4" />
                Open Visual Editor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Simple Editor */}
      {editorMode === 'simple' && (
        <Suspense fallback={<div className="h-64 bg-gray-50 rounded-lg animate-pulse" />}>
          <SimpleEditor
            label=""
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
          />
        </Suspense>
      )}

      {/* Visual Editor Mode */}
      {editorMode === 'visual' && !showVisualEditor && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Visual Email Editor
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Design beautiful, professional emails with drag-and-drop components, 
            custom fonts, colors, and responsive layouts.
          </p>
          <button
            type="button"
            onClick={handleOpenVisualEditor}
            className="px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            Launch Visual Editor
          </button>

          {/* Preview of current content */}
          {value && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-600 mb-3">Current Content Preview:</p>
              <div 
                className="text-left bg-gray-50 border rounded-lg p-4 max-h-48 overflow-auto text-sm"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          )}
        </div>
      )}

      {/* Visual Editor Modal */}
      {showVisualEditor && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 shadow-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading Visual Editor...</p>
            </div>
          </div>
        }>
          <GrapeJSEmailEditor
            value={value}
            onChange={onChange}
            onClose={handleCloseVisualEditor}
            variables={EMAIL_VARIABLES.map(v => ({
              label: v.label,
              value: v.value,
            }))}
          />
        </Suspense>
      )}

      {/* Help Text */}
      <div className="mt-2 flex items-start gap-2">
        <Eye className="w-4 h-4 text-gray-400 mt-0.5" />
        <div className="text-xs text-gray-600">
          <strong>Simple Mode:</strong> Basic text editor with variable insertion. 
          <strong className="ml-2">Visual Mode:</strong> Full design editor with fonts, colors, images, and responsive layouts.
        </div>
      </div>
    </div>
  );
}
