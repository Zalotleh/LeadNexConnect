import React from 'react';
import { AILeadBatchDraft } from '@/types/ai-conversation.types';
import { Database, MapPin, Target, Zap, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';

interface LeadBatchDraftCardProps {
  draft: AILeadBatchDraft;
  onCreate: () => void;
  isLoading?: boolean;
}

export default function LeadBatchDraftCard({ draft, onCreate, isLoading }: LeadBatchDraftCardProps) {
  return (
    <div className="bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Database className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Lead Batch Draft</h3>
          <p className="text-sm text-gray-500">Generate leads from {draft.source}</p>
        </div>
      </div>

      {/* Name */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Batch Name</p>
        <p className="text-base font-semibold text-gray-900">{draft.name}</p>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Target className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Industry</p>
            <p className="text-sm font-medium text-gray-900">{draft.industry}</p>
          </div>
        </div>

        {(draft.city || draft.country) && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {draft.city || draft.country}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Database className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Source</p>
            <p className="text-sm font-medium text-gray-900">{draft.source}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Zap className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Max Results</p>
            <p className="text-sm font-medium text-gray-900">{draft.maxResults}</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-gray-500">Options</p>
        <div className="flex flex-wrap gap-2">
          {draft.enrichEmail && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Email enrichment
            </span>
          )}
          {draft.analyzeWebsite && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Website analysis
            </span>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {draft.reasoning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-900 mb-1">AI Reasoning</p>
              <p className="text-sm text-amber-800">{draft.reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create button */}
      <button
        onClick={onCreate}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Generate Leads
          </>
        )}
      </button>
    </div>
  );
}
