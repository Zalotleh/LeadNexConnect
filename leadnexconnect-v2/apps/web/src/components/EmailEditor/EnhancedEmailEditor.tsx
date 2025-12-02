import React, { useState } from 'react';
import { Palette, Code, Sparkles, Save, X } from 'lucide-react';
import { getAllEmailVariables } from '@/lib/emailVariables';
import EmailEditor from '../EmailEditor';
import TinyMCEEmailEditor from './TinyMCEEmailEditor';
import toast from 'react-hot-toast';

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
  enableTemplates?: boolean; // Enable save/load templates
  defaultSubject?: string; // Used when saving as template
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
  enableTemplates = false,
  defaultSubject = '',
}: EnhancedEmailEditorProps) {
  const [editorMode, setEditorMode] = useState<'simple' | 'visual'>('simple');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Template states
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    subject: defaultSubject,
    category: 'general' as 'initial_outreach' | 'follow_up' | 'meeting_request' | 'introduction' | 'product_demo' | 'partnership' | 'general' | 'other'
  });

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

  const handleSaveAsTemplate = async () => {
    if (!templateForm.name || !templateForm.subject) {
      toast.error('Template name and subject are required');
      return;
    }

    if (!value || value.trim() === '') {
      toast.error('Email body cannot be empty');
      return;
    }

    setIsSavingTemplate(true);

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateForm.name,
          description: templateForm.description,
          subject: templateForm.subject,
          category: templateForm.category,
          bodyHtml: value,
          bodyText: value.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
          isActive: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const savedTemplate = await response.json();
      
      toast.success('Template saved successfully!');
      setShowSaveTemplateModal(false);
      
      // Reset form
      setTemplateForm({
        name: '',
        description: '',
        subject: defaultSubject,
        category: 'general'
      });
    } catch (error: any) {
      console.error('Template save error:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
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
          {/* Save as Template Button */}
          {enableTemplates && value && value.trim() !== '' && (
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
              title="Save as template"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Template
            </button>
          )}

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

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Save as Template</h3>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Initial Outreach - Tech Industry"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Brief description of when to use this template"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Email subject line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="initial_outreach">Initial Outreach</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="meeting_request">Meeting Request</option>
                  <option value="introduction">Introduction</option>
                  <option value="product_demo">Product Demo</option>
                  <option value="partnership">Partnership</option>
                  <option value="general">General</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={isSavingTemplate || !templateForm.name || !templateForm.subject}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className={`w-4 h-4 ${isSavingTemplate ? 'animate-spin' : ''}`} />
                {isSavingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
