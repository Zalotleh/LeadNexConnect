import React from 'react';
import { AIWorkflowDraft } from '@/types/ai-conversation.types';
import { Workflow, Mail, Clock, Lightbulb, Zap, Target, MapPin, Loader2 } from 'lucide-react';

interface WorkflowDraftCardProps {
  draft: AIWorkflowDraft;
  onCreate: () => void;
  isLoading?: boolean;
}

export default function WorkflowDraftCard({ draft, onCreate, isLoading }: WorkflowDraftCardProps) {
  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Workflow className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Workflow Draft</h3>
          <p className="text-sm text-gray-500">{draft.stepsCount}-step email sequence</p>
        </div>
      </div>

      {/* Name & Description */}
      <div className="space-y-3 mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Workflow Name</p>
          <p className="text-base font-semibold text-gray-900">{draft.name}</p>
        </div>
        {draft.description && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{draft.description}</p>
          </div>
        )}
      </div>

      {/* Industry & Location */}
      {(draft.industry || draft.country) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {draft.industry && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Target className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Industry</p>
                <p className="text-sm font-medium text-gray-900">{draft.industry}</p>
              </div>
            </div>
          )}
          {draft.country && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">{draft.country}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Steps preview */}
      <div className="space-y-3 mb-4">
        <p className="text-xs font-medium text-gray-500">Email Steps</p>
        {draft.steps.map((step) => (
          <div key={step.stepNumber} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-gray-900">
                  Step {step.stepNumber}
                </span>
              </div>
              {step.daysAfterPrevious > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  +{step.daysAfterPrevious} days
                </div>
              )}
              {step.daysAfterPrevious === 0 && step.stepNumber === 1 && (
                <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  Day 0
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{step.subject}</p>
            <p className="text-xs text-gray-600 line-clamp-2">{step.body}</p>
          </div>
        ))}
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
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Create Workflow
          </>
        )}
      </button>
    </div>
  );
}
