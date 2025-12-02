import React from 'react';
import { X, Plus, Loader, Sparkles } from 'lucide-react';
import WorkflowSelector from '../WorkflowSelector';
import EnhancedEmailEditor from '../EmailEditor/EnhancedEmailEditor';

interface CreateCampaignForm {
  name: string;
  description: string;
  workflowId: string | null;
  emailSubject: string;
  emailBody: string;
  startTime: string;
}

interface CreateCampaignModalProps {
  show: boolean;
  selectedLeadsCount: number;
  createCampaignForm: CreateCampaignForm;
  aiGenerating: boolean;
  onClose: () => void;
  onFormChange: (form: CreateCampaignForm) => void;
  onSubmit: () => void;
  onGenerateAI: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  show,
  selectedLeadsCount,
  createCampaignForm,
  aiGenerating,
  onClose,
  onFormChange,
  onSubmit,
  onGenerateAI,
}) => {
  if (!show) return null;

  const isSubmitDisabled = 
    !createCampaignForm.name || 
    (!createCampaignForm.workflowId && (!createCampaignForm.emailSubject || !createCampaignForm.emailBody));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Manual Campaign</h2>
            <p className="text-sm text-gray-600 mt-1">
              Campaign will be created with {selectedLeadsCount} selected lead{selectedLeadsCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              value={createCampaignForm.name}
              onChange={(e) => onFormChange({ ...createCampaignForm, name: e.target.value })}
              placeholder="e.g., Imported Leads Q4 Outreach"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={createCampaignForm.description}
              onChange={(e) => onFormChange({ ...createCampaignForm, description: e.target.value })}
              placeholder="Describe the campaign purpose..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Workflow Selector */}
          <div className="border-t pt-6">
            <WorkflowSelector
              selectedWorkflowId={createCampaignForm.workflowId}
              onSelect={(workflowId) => onFormChange({ ...createCampaignForm, workflowId })}
              label="Email Workflow (Optional)"
              placeholder="Select a workflow or create custom emails below"
              required={false}
            />
            <p className="text-xs text-blue-600 mt-2">
              💡 Tip: Use a workflow for multi-step sequences, or create a single email below
            </p>
          </div>

          {/* Only show email fields if no workflow selected */}
          {!createCampaignForm.workflowId && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Subject *
                  </label>
                  <button
                    type="button"
                    onClick={onGenerateAI}
                    disabled={aiGenerating}
                    className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 flex items-center gap-1 disabled:opacity-50"
                  >
                    {aiGenerating ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {aiGenerating ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                <input
                  type="text"
                  value={createCampaignForm.emailSubject}
                  onChange={(e) => onFormChange({ ...createCampaignForm, emailSubject: e.target.value })}
                  placeholder="e.g., Transform Your Booking Process with [Product]"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <EnhancedEmailEditor
                label="Email Body"
                value={createCampaignForm.emailBody}
                onChange={(value: string) => onFormChange({ ...createCampaignForm, emailBody: value })}
                placeholder="Hi {{contactName}},&#10;&#10;I noticed {{companyName}} and wanted to reach out...&#10;&#10;Click 'Insert Variable' above to add personalization"
                rows={8}
                required
                enableVisualEditor={true}
              />
            </>
          )}

          {/* Schedule Options */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={createCampaignForm.startTime}
                  onChange={(e) => onFormChange({ ...createCampaignForm, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Campaign will be created in draft status</li>
              <li>All {selectedLeadsCount} selected leads will be linked</li>
              <li>Go to Campaigns page to start sending emails</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );
};
