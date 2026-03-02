import React, { useState } from 'react';
import { Workflow, Sparkles, CheckCircle2, Mail, ChevronDown } from 'lucide-react';

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
  const [changing, setChanging] = useState(false);
  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

  const handleChange = () => {
    setChanging(true);
    onSelect(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Email Workflow</label>

      {/* Linked workflow banner — shown when a workflow is selected */}
      {selectedWorkflowId && !changing ? (
        <div className="flex items-center justify-between gap-3 p-4 bg-green-50 border-2 border-green-400 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Workflow Linked ✓</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {selectedWorkflow?.name ?? 'Workflow'}
              </p>
              {selectedWorkflow && (
                <p className="flex items-center gap-1 text-xs text-green-700 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {selectedWorkflow.stepsCount} email{selectedWorkflow.stepsCount !== 1 ? 's' : ''} in sequence
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleChange}
            className="shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 bg-white rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Change
          </button>
        </div>
      ) : (
        <>
          {/* Dropdown */}
          <select
            value={selectedWorkflowId || ''}
            onChange={(e) => {
              setChanging(false);
              onSelect(e.target.value || null);
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus={changing}
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
            onClick={() => { setChanging(false); onGenerateNew(); }}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium">
              {isGenerating ? 'Generating workflow...' : 'Or generate new workflow with AI'}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
