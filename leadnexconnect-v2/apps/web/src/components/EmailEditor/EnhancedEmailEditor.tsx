import React, { useState } from 'react';
import { Palette, Code, Sparkles } from 'lucide-react';
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
  enableAI?: boolean; // Enable AI generation button
  aiContext?: {
    companyName?: string;
    contactName?: string;
    industry?: string;
    city?: string;
    country?: string;
    followUpStage?: string;
  };
}

export default function EnhancedEmailEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 10,
  required = false,
  enableVisualEditor = true,
  enableAI = false,
  aiContext,
}: EnhancedEmailEditorProps) {
  const [editorMode, setEditorMode] = useState<'simple' | 'visual'>('simple');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAIGenerate = async () => {
    if (!aiContext || !aiContext.companyName || !aiContext.industry) {
      setAiError('Missing required information for AI generation');
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiContext),
      });

      if (!response.ok) {
        throw new Error('Failed to generate email');
      }

      const result = await response.json();
      
      // Load the AI-generated HTML into the editor
      // Backend returns { success, data: { subject, bodyText, bodyHtml } }
      onChange(result.data?.bodyHtml || result.data?.bodyText || '');
      
      // Switch to visual mode to show the generated content
      setEditorMode('visual');
    } catch (error: any) {
      console.error('AI generation error:', error);
      setAiError(error.message || 'Failed to generate email with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="flex items-center gap-2">
          {/* AI Generate Button */}
          {enableAI && aiContext && (
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={isGeneratingAI}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Generate email content with AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              {isGeneratingAI ? 'Generating...' : 'AI Generate'}
            </button>
          )}

          {/* Editor Mode Toggle */}
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
      </div>

      {/* AI Error Message */}
      {aiError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{aiError}</p>
        </div>
      )}

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
        {enableAI && <strong className="ml-2">✨ AI Generate:</strong>}{enableAI && ' Automatically generate personalized email content.'}
      </div>
    </div>
  );
}
