// Bug Fix #12: removed unused `useState` import
import React from 'react';
import { Workflow, Sparkles } from 'lucide-react';

interface WorkflowOption {
  id: string;
  name: string;
  stepsCount: number;
}

interface WorkflowSelectorProps {
  workflows: WorkflowOption[];
  selectedWorkflowId: string | null;
  onSelect: (workflowId: string | null) => void;
  onGenerateNew: () => void;
  isGenerating?: boolean;
}

export default function WorkflowSelector({
  workflows,
  selectedWorkflowId,
  onSelect,
  onGenerateNew,
  isGenerating = false,
}: WorkflowSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Email Workflow
      </label>

      {/* Dropdown */}
      <select
        value={selectedWorkflowId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Select an existing workflow...</option>
        {workflows.map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name} ({workflow.stepsCount} steps)
          </option>
        ))}
      </select>

      {/* Generate new button */}
      <button
        type="button"
        onClick={onGenerateNew}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium">
          {isGenerating ? 'Generating workflow...' : 'Or generate new workflow with AI'}
        </span>
      </button>

      {selectedWorkflowId && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Workflow className="w-3.5 h-3.5" />
          Workflow selected
        </p>
      )}
    </div>
  );
}
