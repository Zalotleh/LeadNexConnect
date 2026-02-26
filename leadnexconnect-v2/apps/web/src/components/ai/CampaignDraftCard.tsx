import React, { useState, useEffect } from 'react';
import { AICampaignDraft } from '@/types/ai-conversation.types';
import WorkflowSelector from './WorkflowSelector';
import {
  Target, MapPin, Users, Calendar, Zap,
  Lightbulb, Edit2, Check
} from 'lucide-react';

interface CampaignDraftCardProps {
  draft: AICampaignDraft;
  workflows: Array<{ id: string; name: string; stepsCount: number }>;
  onEdit: (updatedDraft: AICampaignDraft) => void;
  onCreate: () => void;
  onGenerateWorkflow: () => void;
  isGeneratingWorkflow?: boolean;
}

export default function CampaignDraftCard({
  draft,
  workflows,
  onEdit,
  onCreate,
  onGenerateWorkflow,
  isGeneratingWorkflow = false,
}: CampaignDraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(draft);

  // Bug Fix #11: sync local edit state when parent passes a new draft
  // (happens when a workflow is generated and auto-linked to the campaign draft)
  useEffect(() => {
    setEditedDraft(draft);
    setIsEditing(false);
  }, [draft]);

  const handleSave = () => {
    onEdit(editedDraft);
    setIsEditing(false);
  };

  return (
    <div className="bg-white border-2 border-primary-200 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Campaign Draft</h3>
            <p className="text-sm text-gray-500">Review and approve before creating</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isEditing ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Campaign Name</label>
          {isEditing ? (
            <input
              type="text"
              value={editedDraft.name}
              onChange={(e) => setEditedDraft({ ...editedDraft, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          ) : (
            <p className="text-base font-semibold text-gray-900">{draft.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          {isEditing ? (
            <textarea
              value={editedDraft.description}
              onChange={(e) => setEditedDraft({ ...editedDraft, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          ) : (
            <p className="text-sm text-gray-700">{draft.description}</p>
          )}
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-3">
          {draft.industry && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Target className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Industry</p>
                <p className="text-sm font-medium text-gray-900">{draft.industry}</p>
              </div>
            </div>
          )}

          {(draft.targetCities?.length || draft.targetCountries?.length) && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900">
                  {draft.targetCities?.join(', ') || draft.targetCountries?.join(', ')}
                </p>
              </div>
            </div>
          )}

          {draft.leadsPerDay && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Leads/day</p>
                <p className="text-sm font-medium text-gray-900">{draft.leadsPerDay}</p>
              </div>
            </div>
          )}

          {draft.scheduleType && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Schedule</p>
                <p className="text-sm font-medium text-gray-900">
                  {draft.scheduleType === 'daily' ? `Daily at ${draft.scheduleTime || '09:00'}` : draft.scheduleType}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Lead sources */}
        {draft.leadSources && draft.leadSources.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Lead Sources</label>
            <div className="flex flex-wrap gap-2">
              {draft.leadSources.map((source) => (
                <span
                  key={source}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Workflow selector */}
        {draft.campaignType === 'outreach' && (
          <WorkflowSelector
            workflows={workflows}
            selectedWorkflowId={editedDraft.workflowId || null}
            onSelect={(id) => setEditedDraft({ ...editedDraft, workflowId: id })}
            onGenerateWorkflow={onGenerateWorkflow}
            isGenerating={isGeneratingWorkflow}
          />
        )}

        {/* AI Reasoning */}
        {draft.reasoning && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900 mb-1">AI Reasoning</p>
                <p className="text-sm text-amber-800">{draft.reasoning}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {isEditing && (
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Save Changes
          </button>
        )}
        <button
          onClick={onCreate}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <Zap className="w-4 h-4" />
          Create &amp; Launch Campaign
        </button>
      </div>
    </div>
  );
}
