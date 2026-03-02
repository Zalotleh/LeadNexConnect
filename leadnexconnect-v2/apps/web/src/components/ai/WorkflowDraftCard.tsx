import React, { useState } from 'react';
import { AIWorkflowDraft } from '@/types/ai-conversation.types';
import { Workflow, Mail, Clock, Lightbulb, Zap, Target, MapPin, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

interface WorkflowDraftCardProps {
  draft: AIWorkflowDraft;
  onCreate: () => void;
  isLoading?: boolean;
}

function EmailStepCard({ step }: { step: AIWorkflowDraft['steps'][number] }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Step header — always visible */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-900">Step {step.stepNumber}</span>
          {step.daysAfterPrevious > 0 ? (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              +{step.daysAfterPrevious} day{step.daysAfterPrevious !== 1 ? 's' : ''}
            </span>
          ) : step.stepNumber === 1 ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Zap className="w-3 h-3" />
              Day 0
            </span>
          ) : null}
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title={collapsed ? 'Show email body' : 'Collapse'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Full email content */}
      {!collapsed && (
        <div className="p-3 bg-white space-y-2">
          {/* Subject line */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Subject</p>
            <p className="text-sm font-semibold text-gray-900">{step.subject}</p>
          </div>
          {/* Full body */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Body</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{step.body}</p>
          </div>
        </div>
      )}

      {/* Collapsed preview */}
      {collapsed && (
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500 italic truncate">{step.subject}</p>
        </div>
      )}
    </div>
  );
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

      {/* Email steps — full body visible, collapsible per step */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">Email Steps</p>
          <p className="text-xs text-gray-400">Review each email before creating</p>
        </div>
        {(draft.steps ?? []).map((step) => (
          <EmailStepCard key={step.stepNumber} step={step} />
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
            Creating Workflow...
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
