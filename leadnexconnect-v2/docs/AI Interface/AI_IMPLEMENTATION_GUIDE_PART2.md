## FRONTEND FILES - PART 2
### 3. NEW: /apps/web/src/hooks/useConversationState.ts


``` typescript
import { useState, useCallback } from 'react';
import { ConversationState, ConversationMessage, ResolvedEntities } from '@/types/ai-conversation.types';

export function useConversationState() {
  const [state, setState] = useState<ConversationState>({
    sessionId: `session-${Date.now()}`,
    messages: [],
    resolvedEntities: {},
    currentDraft: null,
    currentIntent: undefined,
    isLoading: false,
  });

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          role,
          content,
          timestamp: new Date(),
        },
      ],
    }));
  }, []);

  const updateEntities = useCallback((entities: Partial<ResolvedEntities>) => {
    setState(prev => ({
      ...prev,
      resolvedEntities: {
        ...prev.resolvedEntities,
        ...entities,
      },
    }));
  }, []);

  const setDraft = useCallback((draft: any, intent: 'campaign' | 'workflow' | 'lead_batch') => {
    setState(prev => ({
      ...prev,
      currentDraft: draft,
      currentIntent: intent,
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      sessionId: `session-${Date.now()}`,
      messages: [],
      resolvedEntities: {},
      currentDraft: null,
      currentIntent: undefined,
      isLoading: false,
    });
  }, []);

  return {
    state,
    addMessage,
    updateEntities,
    setDraft,
    setLoading,
    reset,
  };
}

```
## 4. NEW: /apps/web/src/hooks/useAICampaignCreation.ts

 ``` typescript


import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAICampaignCreation() {
  const [context, setContext] = useState<any>(null);

  // Fetch context (workflows + batches)
  const fetchContext = useMutation({
    mutationFn: aiAPI.getContext,
    onSuccess: (data) => {
      setContext(data.data);
    },
    onError: (error: any) => {
      toast.error('Failed to load context');
      console.error('Context fetch error:', error);
    },
  });

  // Parse campaign
  const parseCampaign = useMutation({
    mutationFn: aiAPI.parseCampaign,
    onError: (error: any) => {
      toast.error('Failed to parse campaign');
      console.error('Campaign parse error:', error);
    },
  });

  // Generate workflow on demand
  const generateWorkflow = useMutation({
    mutationFn: aiAPI.generateWorkflow,
    onError: (error: any) => {
      toast.error('Failed to generate workflow');
      console.error('Workflow generation error:', error);
    },
  });

  return {
    context,
    fetchContext,
    parseCampaign,
    generateWorkflow,
  };
}

```

## 5. NEW: /apps/web/src/hooks/useAIWorkflowCreation.ts

``` typescript

import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAIWorkflowCreation() {
  const parseWorkflow = useMutation({
    mutationFn: aiAPI.parseWorkflow,
    onError: (error: any) => {
      toast.error('Failed to parse workflow');
      console.error('Workflow parse error:', error);
    },
  });

  return {
    parseWorkflow,
  };
}

```
## 6. NEW: /apps/web/src/hooks/useAILeadBatchCreation.ts

``` typescript

import { useMutation } from '@tanstack/react-query';
import { aiAPI } from '@/services/ai-api';
import { toast } from 'react-hot-toast';

export function useAILeadBatchCreation() {
  const parseLeadBatch = useMutation({
    mutationFn: aiAPI.parseLeadBatch,
    onError: (error: any) => {
      toast.error('Failed to parse lead batch');
      console.error('Lead batch parse error:', error);
    },
  });

  return {
    parseLeadBatch,
  };
}

```
## 7. NEW: /apps/web/src/components/ai/ThinkingAnimation.tsx
 ``` typescript

 import React from 'react';
import { Loader } from 'lucide-react';

export default function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <Loader className="w-5 h-5 text-primary-600 animate-spin" />
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600">Claude is thinking</span>
        <span className="animate-pulse">.</span>
        <span className="animate-pulse animation-delay-200">.</span>
        <span className="animate-pulse animation-delay-400">.</span>
      </div>
    </div>
  );
}
 ```

 ## 8. NEW: /apps/web/src/components/ai/ContextChip.tsx

 ```typescript
import React from 'react';
import { X } from 'lucide-react';

interface ContextChipProps {
  label: string;
  value: string;
  onRemove?: () => void;
}

export default function ContextChip({ label, value, onRemove }: ContextChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
      <span className="text-blue-700 font-medium">{label}:</span>
      <span className="text-blue-900">{value}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-blue-400 hover:text-blue-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
 ```

 ## 9. NEW: /apps/web/src/components/ai/MessageBubble.tsx

 ```typescript
import React from 'react';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-gray-700" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        <span className="text-xs text-gray-400 mt-1 px-2">
          {timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

 ```

 ## 10. NEW: /apps/web/src/components/ai/WorkflowSelector.tsx
```typescript
// Bug Fix #12: removed unused `useState` import (was causing ESLint warning — useState is never called)
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

```

## 11. NEW: /apps/web/src/components/ai/CampaignDraftCard.tsx

``` typescript
import React, { useState, useEffect } from 'react'; // Bug Fix #11: useEffect added
import { AICampaignDraft } from '@/types/ai-conversation.types';
import WorkflowSelector from './WorkflowSelector';
import { 
  Target, MapPin, Users, Calendar, Zap, Send, 
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
          Create & Launch Campaign
        </button>
      </div>
    </div>
  );
}
```
## 12. NEW: /apps/web/src/components/ai/WorkflowDraftCard.tsx
``` typescript
import React from 'react';
import { AIWorkflowDraft } from '@/types/ai-conversation.types';
import { Workflow, Mail, Clock, Lightbulb, Zap } from 'lucide-react';

interface WorkflowDraftCardProps {
  draft: AIWorkflowDraft;
  onCreate: () => void;
}

export default function WorkflowDraftCard({ draft, onCreate }: WorkflowDraftCardProps) {
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

      {/* Steps preview */}
      <div className="space-y-3 mb-4">
        <p className="text-xs font-medium text-gray-500">Email Steps</p>
        {draft.steps.map((step, index) => (
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
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
      >
        <Zap className="w-4 h-4" />
        Create Workflow
      </button>
    </div>
  );
}

```
## 13. NEW: /apps/web/src/components/ai/LeadBatchDraftCard.tsx

```typescript
import React from 'react';
import { AILeadBatchDraft } from '@/types/ai-conversation.types';
import { Database, MapPin, Target, Zap, Lightbulb, CheckCircle } from 'lucide-react';

interface LeadBatchDraftCardProps {
  draft: AILeadBatchDraft;
  onCreate: () => void;
}

export default function LeadBatchDraftCard({ draft, onCreate }: LeadBatchDraftCardProps) {
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
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        <Zap className="w-4 h-4" />
        Generate Leads
      </button>
    </div>
  );
}

```
## 14. NEW: /apps/web/src/components/ai/ChatInterface.tsx
``` typescript
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ThinkingAnimation from './ThinkingAnimation';
import ContextChip from './ContextChip';
import { Send, Sparkles } from 'lucide-react';
import { ConversationMessage, ResolvedEntities } from '@/types/ai-conversation.types';

interface ChatInterfaceProps {
  messages: ConversationMessage[];
  resolvedEntities: ResolvedEntities;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onRemoveEntity: (key: keyof ResolvedEntities) => void;
}

export default function ChatInterface({
  messages,
  resolvedEntities,
  isLoading,
  onSendMessage,
  onRemoveEntity,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const hasEntities = Object.values(resolvedEntities).some(v => v);

  return (
    <div className="flex flex-col h-full">
      {/* Context chips */}
      {hasEntities && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {resolvedEntities.lastBatchName && (
              <ContextChip
                label="Batch"
                value={resolvedEntities.lastBatchName}
                onRemove={() => onRemoveEntity('lastBatchName')}
              />
            )}
            {resolvedEntities.lastWorkflowName && (
              <ContextChip
                label="Workflow"
                value={resolvedEntities.lastWorkflowName}
                onRemove={() => onRemoveEntity('lastWorkflowName')}
              />
            )}
            {resolvedEntities.lastIndustry && (
              <ContextChip
                label="Industry"
                value={resolvedEntities.lastIndustry}
                onRemove={() => onRemoveEntity('lastIndustry')}
              />
            )}
            {resolvedEntities.lastLocation && (
              <ContextChip
                label="Location"
                value={resolvedEntities.lastLocation}
                onRemove={() => onRemoveEntity('lastLocation')}
              />
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              What would you like to create?
            </h3>
            <p className="text-gray-600 max-w-md mb-6">
              Tell me what you need and I'll help you create campaigns, workflows, or generate leads — all in plain English.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
              <button
                onClick={() => onSendMessage('Create an outreach campaign for spa salons in Madrid')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Campaign Example</p>
                <p className="text-xs text-gray-600">
                  "Create an outreach campaign for spa salons in Madrid"
                </p>
              </button>
              <button
                onClick={() => onSendMessage('Write a 3-step email sequence for yoga studios')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Workflow Example</p>
                <p className="text-xs text-gray-600">
                  "Write a 3-step email sequence for yoga studios"
                </p>
              </button>
              <button
                onClick={() => onSendMessage('Find 50 dental clinics in Barcelona')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Lead Gen Example</p>
                <p className="text-xs text-gray-600">
                  "Find 50 dental clinics in Barcelona"
                </p>
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            {isLoading && <ThinkingAnimation />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-6 py-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
```

## 15. NEW: /apps/web/src/pages/ai-create.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ChatInterface from '@/components/ai/ChatInterface';
import CampaignDraftCard from '@/components/ai/CampaignDraftCard';
import WorkflowDraftCard from '@/components/ai/WorkflowDraftCard';
import LeadBatchDraftCard from '@/components/ai/LeadBatchDraftCard';
import { useConversationState } from '@/hooks/useConversationState';
import { useAICampaignCreation } from '@/hooks/useAICampaignCreation';
import { useAIWorkflowCreation } from '@/hooks/useAIWorkflowCreation';
import { useAILeadBatchCreation } from '@/hooks/useAILeadBatchCreation';
import { detectIntent } from '@/utils/detect-intent'; // Enhancement #7: client-side, zero network overhead
import { ResolvedEntities } from '@/types/ai-conversation.types';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { Sparkles } from 'lucide-react';

export default function AICreatePage() {
  const router = useRouter();
  const { state, addMessage, updateEntities, setDraft, setLoading, reset } = useConversationState();
  const { context, fetchContext, parseCampaign, generateWorkflow } = useAICampaignCreation();
  const { parseWorkflow } = useAIWorkflowCreation();
  const { parseLeadBatch } = useAILeadBatchCreation();

  // Fix #3: When "Generate emails for this campaign" is clicked, we switch the right panel
  // to show the workflow draft for user approval. We park the active campaign draft here
  // so we can restore it (with the new workflowId linked) after the user approves.
  const [pendingCampaignDraft, setPendingCampaignDraft] = useState<any>(null);

  // Fetch context on mount
  useEffect(() => {
    fetchContext.mutate();
  }, []);

  const handleSendMessage = async (message: string) => {
    // Add user message
    addMessage('user', message);
    setLoading(true);

    try {
      // Enhancement #7: detect intent client-side — zero network overhead
      const intent = detectIntent(message);
      const conversationMessages = state.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }));

      let result: any;

      if (intent === 'lead_batch') {
        result = await parseLeadBatch.mutateAsync({ message });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            // Show Claude's follow-up question as a message bubble — no draft card
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            addMessage('assistant', `I've prepared a lead generation config for "${draft.name}". Review it on the right.`);
            setDraft(draft, 'lead_batch');
            updateEntities({
              lastIndustry: draft.industry,
              lastLocation: draft.city || draft.country,
            });
          }
        }
      } else if (intent === 'workflow') {
        result = await parseWorkflow.mutateAsync({
          message,
          industry: state.resolvedEntities.lastIndustry,
          country: state.resolvedEntities.lastCountry,
        });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            addMessage('assistant', `I've drafted a "${draft.name}" email sequence. Review the steps on the right.`);
            setDraft(draft, 'workflow');
          }
        }
      } else {
        // campaign (default)
        result = await parseCampaign.mutateAsync({
          message,
          sessionId: state.sessionId,
          conversationHistory: conversationMessages,
          resolvedEntities: state.resolvedEntities,
        });

        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            // Show Claude's clarifying question — no draft card shown until user answers
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            addMessage('assistant', `I've prepared a campaign draft for "${draft.name}". Review it on the right.`);
            setDraft(draft, 'campaign');

            // Update session entities for multi-turn continuity
            if (draft.workflowId && context?.workflows) {
              const workflow = context.workflows.find((w: any) => w.id === draft.workflowId);
              if (workflow) updateEntities({ lastWorkflowId: workflow.id, lastWorkflowName: workflow.name });
            }
            if (draft.batchIds?.[0] && context?.recentBatches) {
              const batch = context.recentBatches.find((b: any) => b.id === draft.batchIds[0]);
              if (batch) updateEntities({ lastBatchId: batch.id, lastBatchName: batch.name });
            }
            if (draft.industry) updateEntities({ lastIndustry: draft.industry });
            if (draft.targetCities?.[0]) updateEntities({ lastLocation: draft.targetCities[0] });
          }
        }
      }

      if (!result?.success || !result?.draft) {
        // Enhancement #13: helpful fallback with link to manual wizard
        addMessage('assistant',
          "I wasn't sure what to create from that. Try being more specific — " +
          'e.g. "Create a campaign for dental clinics in London" — or [create it manually](/campaigns/create).'
        );
      }
    } catch (error: any) {
      console.error('Error parsing message:', error);
      addMessage('assistant',
        'Something went wrong on my end. Please try again, or [create it manually](/campaigns/create) if the issue persists.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Bug Fix #6: type is `keyof ResolvedEntities`, not `string`
  const handleRemoveEntity = (key: keyof ResolvedEntities) => {
    updateEntities({ [key]: undefined });
  };

  const handleCreateCampaign = async () => {
    if (!state.currentDraft) return;

    try {
      const response = await api.post('/campaigns', state.currentDraft);
      
      if (response.data.success) {
        toast.success('Campaign created successfully!');
        router.push(`/campaigns/${response.data.data.id}`);
      }
    } catch (error: any) {
      toast.error('Failed to create campaign');
      console.error('Campaign creation error:', error);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!state.currentDraft) return;

    try {
      const response = await api.post('/workflows/manual', {
        name: state.currentDraft.name,
        description: state.currentDraft.description,
        industry: state.currentDraft.industry,
        country: state.currentDraft.country,
        aiInstructions: state.currentDraft.aiInstructions, // Enhancement #G: propagate context
        steps: state.currentDraft.steps.map((step: any) => ({
          stepNumber: step.stepNumber,
          daysAfterPrevious: step.daysAfterPrevious,
          subject: step.subject,
          body: step.body,
        })),
      });

      if (response.data.success) {
        const newWorkflowId = response.data.data.id;
        const workflowName = state.currentDraft.name;

        // Fix #3: if this was generated as part of a campaign flow, link it back
        if (pendingCampaignDraft) {
          const linkedCampaign = { ...pendingCampaignDraft, workflowId: newWorkflowId };
          setDraft(linkedCampaign, 'campaign');
          setPendingCampaignDraft(null);
          updateEntities({ lastWorkflowId: newWorkflowId, lastWorkflowName: workflowName });
          addMessage('assistant',
            `Workflow "${workflowName}" created and linked to your campaign. ` +
            'Review the updated campaign on the right, then click \'Create & Launch\' when ready.'
          );
          toast.success('Workflow created and linked to campaign!');
        } else {
          toast.success('Workflow created successfully!');
          router.push('/workflows');
        }
      }
    } catch (error: any) {
      toast.error('Failed to create workflow');
      console.error('Workflow creation error:', error);
    }
  };

  const handleCreateLeadBatch = async () => {
    if (!state.currentDraft) return;

    try {
      // Map to scraping endpoint based on source
      const sourceMap: Record<string, string> = {
        apollo: '/scraping/apollo',
        google_places: '/scraping/google-places',
        peopledatalabs: '/scraping/peopledatalabs',
        hunter: '/scraping/hunter',
      };

      const endpoint = sourceMap[state.currentDraft.source] || '/scraping/google-places';

      const response = await api.post(endpoint, {
        industry: state.currentDraft.industry,
        country: state.currentDraft.country,
        city: state.currentDraft.city,
        maxResults: state.currentDraft.maxResults,
        enrichEmail: state.currentDraft.enrichEmail,
        analyzeWebsite: state.currentDraft.analyzeWebsite,
      });

      if (response.data.success) {
        toast.success('Lead generation started!');
        router.push('/leads');
      }
    } catch (error: any) {
      toast.error('Failed to start lead generation');
      console.error('Lead generation error:', error);
    }
  };

  const handleGenerateWorkflow = async () => {
    if (!state.currentDraft) return;

    setLoading(true);
    try {
      const result = await generateWorkflow.mutateAsync({
        industry: state.currentDraft.industry,
        country: state.currentDraft.targetCountries?.[0],
        // Enhancement #G: wire suggestedWorkflowInstructions → aiInstructions
        // This ensures Claude writes "your spa in Madrid" not generic copy
        instructions: state.currentDraft.suggestedWorkflowInstructions
          || `Email workflow for ${state.currentDraft.industry || 'service businesses'} in ${
            state.currentDraft.targetCities?.[0]
            || state.currentDraft.targetCountries?.[0]
            || 'target region'
          }`,
      });

      if (result.success && result.draft) {
        // Fix #3: DO NOT write to DB here. Show draft card for user approval first.
        // Park the current campaign draft so we can restore it after workflow approval.
        setPendingCampaignDraft(state.currentDraft);

        // Switch right panel to workflow draft for review
        setDraft(result.draft, 'workflow');

        addMessage('assistant',
          `I\'ve drafted a "${result.draft.name}" email workflow. ` +
          'Review the steps on the right — click \'Create Workflow\' to approve it and I\'ll link it to your campaign automatically.'
        );
      }
    } catch (error: any) {
      toast.error('Failed to generate workflow. Please try again.');
      console.error('Workflow generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Create</h1>
                <p className="text-sm text-gray-600">
                  Tell me what you need in plain English — campaigns, workflows, or leads
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
            {/* Chat interface - 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <ChatInterface
                messages={state.messages}
                resolvedEntities={state.resolvedEntities}
                isLoading={state.isLoading}
                onSendMessage={handleSendMessage}
                onRemoveEntity={handleRemoveEntity}
              />
            </div>

            {/* Draft preview - 1 column */}
            <div className="overflow-y-auto">
              {state.currentDraft && state.currentIntent === 'campaign' && (
                <CampaignDraftCard
                  draft={state.currentDraft}
                  workflows={context?.workflows || []}
                  onEdit={(updated) => setDraft(updated, 'campaign')}
                  onCreate={handleCreateCampaign}
                  onGenerateWorkflow={handleGenerateWorkflow}
                  isGeneratingWorkflow={generateWorkflow.isPending}
                />
              )}

              {state.currentDraft && state.currentIntent === 'workflow' && (
                <WorkflowDraftCard
                  draft={state.currentDraft}
                  onCreate={handleCreateWorkflow}
                />
              )}

              {state.currentDraft && state.currentIntent === 'lead_batch' && (
                <LeadBatchDraftCard
                  draft={state.currentDraft}
                  onCreate={handleCreateLeadBatch}
                />
              )}

              {!state.currentDraft && state.messages.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Draft will appear here once I understand your request
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

---

## NEW: /apps/web/src/hooks/useSSEStream.ts

> **[A2 UI Decision — Feb 25, 2026]** This hook is the frontend counterpart to the backend `AIStreamService`.
> It opens an `EventSource`-style connection using `fetch` + `ReadableStream` (more control than `EventSource`
> which doesn't support POST requests). It parses SSE lines from the `/api/ai-campaigns/stream` endpoint
> and fires callbacks for each event type.

```typescript
import { useCallback, useRef, useState } from 'react';

export type SSEEventType = 'reasoning' | 'draft_field' | 'draft_complete' | 'error' | 'done';

export interface SSEEvent {
  type: SSEEventType;
  step?: string;       // for 'reasoning'
  field?: string;      // for 'draft_field'
  value?: unknown;     // for 'draft_field'
  draft?: object;      // for 'draft_complete'
  message?: string;    // for 'error'
}

interface UseSSEStreamOptions {
  onReasoning: (step: string) => void;
  onDraftField: (field: string, value: unknown) => void;
  onDraftComplete: (draft: object) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export function useSSEStream(options: UseSSEStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (payload: {
    message: string;
    sessionId?: string;
    conversationHistory?: any[];
    resolvedEntities?: any;
  }) => {
    // Abort any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsStreaming(true);

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-campaigns/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        options.onError('Stream connection failed');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'reasoning':
                if (event.step) options.onReasoning(event.step);
                break;
              case 'draft_field':
                if (event.field !== undefined) options.onDraftField(event.field, event.value);
                break;
              case 'draft_complete':
                if (event.draft) options.onDraftComplete(event.draft);
                break;
              case 'error':
                options.onError(event.message || 'Unknown error');
                break;
              case 'done':
                options.onDone();
                break;
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        options.onError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [options]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { startStream, cancelStream, isStreaming };
}
```

---

## NEW: /apps/web/src/components/ai/ReasoningPanel.tsx

> **[A2 UI Decision — Feb 25, 2026]** Renders reasoning steps as they arrive from the SSE stream,
> one by one. Each step fades in with a small animation. Steps are shown with status icons:
> all steps are shown with a checkmark once `draft_complete` arrives. During streaming, the latest
> step shows a pulsing indicator.

```typescript
import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

interface ReasoningPanelProps {
  steps: string[];
  isStreaming: boolean;
  isDone: boolean;
}

export default function ReasoningPanel({ steps, isStreaming, isDone }: ReasoningPanelProps) {
  if (steps.length === 0 && !isStreaming) return null;

  return (
    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        AI Reasoning
      </p>
      <ul className="space-y-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCurrent = isLast && isStreaming && !isDone;
          const isDoneStep = isDone || !isLast;

          return (
            <li
              key={index}
              className="flex items-start gap-2 text-sm animate-fade-in"
            >
              <span className="flex-shrink-0 mt-0.5">
                {isCurrent ? (
                  <Loader className="w-4 h-4 text-primary-500 animate-spin" />
                ) : isDoneStep ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
              </span>
              <span className={`${isCurrent ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>
                {step}
              </span>
            </li>
          );
        })}

        {isStreaming && steps.length === 0 && (
          <li className="flex items-center gap-2 text-sm text-gray-500">
            <Loader className="w-4 h-4 text-primary-500 animate-spin" />
            <span>Analysing your request...</span>
          </li>
        )}
      </ul>
    </div>
  );
}
```

---

## NEW: /apps/web/src/components/ai/CommandBar.tsx

> **[Option B — Feb 25, 2026]** Global Ctrl+K / Cmd+K overlay. Mounted once inside `Layout.tsx`.
> On submit, navigates to `/` (Command Center) with the message as a query param, which the
> Command Center page reads on mount and auto-sends.

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles, X, ArrowRight } from 'lucide-react';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Create campaign', example: 'Create an outreach campaign for spa salons in Madrid' },
  { label: 'Write workflow', example: 'Write a 3-step email sequence for dental clinics' },
  { label: 'Find leads',     example: 'Find 50 yoga studios in Barcelona' },
];

export default function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setInput('');
    }
  }, [isOpen]);

  const handleSubmit = (message: string) => {
    const msg = message.trim();
    if (!msg) return;
    onClose();
    // Navigate to Command Center with message as query param — it will auto-send
    router.push(`/?q=${encodeURIComponent(msg)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit(input);
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <Sparkles className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to create?"
            className="flex-1 text-base text-gray-900 outline-none placeholder-gray-400"
          />
          {input && (
            <button
              onClick={() => handleSubmit(input)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-gray-400 mb-2">Quick starts</p>
          <ul className="space-y-1">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.label}>
                <button
                  onClick={() => handleSubmit(action.example)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="text-xs font-medium text-primary-600 w-28 flex-shrink-0">
                    {action.label}
                  </span>
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 truncate">
                    "{action.example}"
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-4">
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">↵</kbd>
            {' '}to send
          </span>
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">Esc</kbd>
            {' '}to close
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 15. NEW: /apps/web/src/pages/index.tsx  ← REPLACED: Command Center Homepage

> **[A2 UI Decision — Feb 25, 2026]** This file completely replaces the old index.tsx (which just redirected
> to /dashboard). The app's root URL is now the AI Command Center.
>
> **Layout behaviour:**
> - Default (no messages): single column, hero input centred, quick-start tiles, recent activity
> - Triggered (message sent): CSS transition splits into two panels — left (chat + reasoning), right (draft card)
> - Collapse: after approval / dismiss, panels collapse back to single column
>
> Reads `?q=` query param on mount to support Ctrl+K CommandBar navigation.
> All existing pages (/campaigns, /leads, /workflows, /settings) remain fully accessible via sidebar.

```typescript
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ReasoningPanel from '@/components/ai/ReasoningPanel';
import CampaignDraftCard from '@/components/ai/CampaignDraftCard';
import WorkflowDraftCard from '@/components/ai/WorkflowDraftCard';
import LeadBatchDraftCard from '@/components/ai/LeadBatchDraftCard';
import MessageBubble from '@/components/ai/MessageBubble';
import ThinkingAnimation from '@/components/ai/ThinkingAnimation';
import ContextChip from '@/components/ai/ContextChip';
import { useConversationState } from '@/hooks/useConversationState';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useAICampaignCreation } from '@/hooks/useAICampaignCreation';
import { useAIWorkflowCreation } from '@/hooks/useAIWorkflowCreation';
import { useAILeadBatchCreation } from '@/hooks/useAILeadBatchCreation';
import { detectIntent } from '@/utils/detect-intent';
import { ResolvedEntities } from '@/types/ai-conversation.types';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { Sparkles, Send, ArrowRight } from 'lucide-react';

const QUICK_STARTS = [
  { label: '💆 Campaign', message: 'Create an outreach campaign for spa salons in Madrid' },
  { label: '✉ Workflow', message: 'Write a 3-step email sequence for dental clinics' },
  { label: '🔍 Find leads', message: 'Find 50 yoga studios in Barcelona' },
];

export default function CommandCenterPage() {
  const router = useRouter();
  const { state, addMessage, updateEntities, setDraft, setLoading, reset } = useConversationState();
  const { context, fetchContext, generateWorkflow } = useAICampaignCreation();
  const { parseWorkflow } = useAIWorkflowCreation();
  const { parseLeadBatch } = useAILeadBatchCreation();

  const [input, setInput] = useState('');
  const [isSplit, setIsSplit] = useState(false); // A2: controls split-screen CSS transition
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [partialDraft, setPartialDraft] = useState<Record<string, unknown>>({});
  const [streamDone, setStreamDone] = useState(false);
  const [pendingCampaignDraft, setPendingCampaignDraft] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SSE stream — fires callbacks for each event type
  const { startStream, cancelStream, isStreaming } = useSSEStream({
    onReasoning: (step) => {
      setReasoningSteps(prev => [...prev, step]);
    },
    onDraftField: (field, value) => {
      setPartialDraft(prev => ({ ...prev, [field]: value }));
    },
    onDraftComplete: (draft) => {
      const d = draft as any;
      setStreamDone(true);
      setLoading(false);
      // Handle special status responses (clarification, off-topic, policy violation)
      if (d.status === 'needs_clarification') {
        addMessage('assistant', d.question);
        return;
      }
      if (d.status === 'off_topic' || d.status === 'policy_violation') {
        addMessage('assistant', d.message);
        return;
      }
      // Normal draft — set card and update entities
      setDraft(draft, 'campaign');
      addMessage('assistant', `I've prepared a campaign draft. Review it on the right and click "Create & Launch" when ready.`);
      if (d.industry) updateEntities({ lastIndustry: d.industry });
      if (d.targetCities?.[0]) updateEntities({ lastLocation: d.targetCities[0] });
    },
    onError: (message) => {
      addMessage('assistant', `Something went wrong: ${message}. Try rephrasing, or [create it manually](/campaigns).`);
      setLoading(false);
      setStreamDone(true);
    },
    onDone: () => {
      setLoading(false);
    },
  });

  // Fetch AI context on mount
  useEffect(() => {
    fetchContext.mutate();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, reasoningSteps]);

  // Read ?q= param from CommandBar navigation
  useEffect(() => {
    const q = router.query.q as string;
    if (q) {
      router.replace('/', undefined, { shallow: true });
      sendMessage(q);
    }
  }, [router.query.q]);

  const sendMessage = useCallback(async (message: string) => {
    const msg = message.trim();
    if (!msg || isStreaming) return;

    addMessage('user', msg);
    setLoading(true);
    setIsSplit(true); // Trigger CSS split transition
    setReasoningSteps([]);
    setPartialDraft({});
    setStreamDone(false);

    const intent = detectIntent(msg);
    const historyForAPI = state.messages.map(m => ({
      role: m.role, content: m.content, timestamp: m.timestamp.toISOString(),
    }));

    if (intent === 'lead_batch') {
      try {
        const result = await parseLeadBatch.mutateAsync({ message: msg });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            setDraft(draft, 'lead_batch');
            addMessage('assistant', `Lead generation config ready for "${draft.name}". Review it on the right.`);
            updateEntities({ lastIndustry: draft.industry, lastLocation: draft.city || draft.country });
          }
        }
      } catch { addMessage('assistant', 'Failed to parse lead request. Try being more specific.'); }
      setLoading(false);
      return;
    }

    if (intent === 'workflow') {
      try {
        const result = await parseWorkflow.mutateAsync({
          message: msg,
          industry: state.resolvedEntities.lastIndustry,
          country: state.resolvedEntities.lastCountry,
        });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            setDraft(draft, 'workflow');
            addMessage('assistant', `Workflow draft ready: "${draft.name}". Review the steps on the right.`);
          }
        }
      } catch { addMessage('assistant', 'Failed to generate workflow. Try being more specific.'); }
      setLoading(false);
      return;
    }

    // Default: campaign — use SSE streaming
    startStream({
      message: msg,
      sessionId: state.sessionId,
      conversationHistory: historyForAPI,
      resolvedEntities: state.resolvedEntities,
    });
  }, [isStreaming, state, addMessage, setLoading, setDraft, updateEntities, startStream, parseLeadBatch, parseWorkflow]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) { sendMessage(input); setInput(''); }
  };

  const handleRemoveEntity = (key: keyof ResolvedEntities) => updateEntities({ [key]: undefined });
  const handleDismissDraft = () => { setIsSplit(false); setDraft(null as any, 'campaign'); };

  const handleCreateCampaign = async () => {
    if (!state.currentDraft) return;
    try {
      const res = await api.post('/campaigns', state.currentDraft);
      if (res.data.success) { toast.success('Campaign created!'); router.push(`/campaigns/${res.data.data.id}`); }
    } catch { toast.error('Failed to create campaign'); }
  };

  const handleCreateWorkflow = async () => {
    if (!state.currentDraft) return;
    try {
      const res = await api.post('/workflows/manual', {
        name: state.currentDraft.name, description: state.currentDraft.description,
        industry: state.currentDraft.industry, country: state.currentDraft.country,
        aiInstructions: state.currentDraft.aiInstructions,
        steps: state.currentDraft.steps,
      });
      if (res.data.success) {
        if (pendingCampaignDraft) {
          const linked = { ...pendingCampaignDraft, workflowId: res.data.data.id };
          setDraft(linked, 'campaign');
          setPendingCampaignDraft(null);
          updateEntities({ lastWorkflowId: res.data.data.id, lastWorkflowName: state.currentDraft.name });
          addMessage('assistant', `Workflow created and linked to your campaign. Click "Create & Launch" when ready.`);
          toast.success('Workflow created and linked!');
        } else { toast.success('Workflow created!'); router.push('/workflows'); }
      }
    } catch { toast.error('Failed to create workflow'); }
  };

  const handleCreateLeadBatch = async () => {
    if (!state.currentDraft) return;
    try {
      const sourceMap: Record<string, string> = {
        apollo: '/scraping/apollo', google_places: '/scraping/google-places',
        peopledatalabs: '/scraping/peopledatalabs', hunter: '/scraping/hunter',
      };
      const endpoint = sourceMap[state.currentDraft.source] || '/scraping/google-places';
      const res = await api.post(endpoint, state.currentDraft);
      if (res.data.success) { toast.success('Lead generation started!'); router.push('/leads'); }
    } catch { toast.error('Failed to start lead generation'); }
  };

  const handleGenerateWorkflow = async () => {
    if (!state.currentDraft) return;
    setLoading(true);
    try {
      const result = await generateWorkflow.mutateAsync({
        industry: state.currentDraft.industry,
        country: state.currentDraft.targetCountries?.[0],
        instructions: state.currentDraft.suggestedWorkflowInstructions
          || `Email workflow for ${state.currentDraft.industry || 'businesses'} in ${state.currentDraft.targetCities?.[0] || 'target region'}`,
      });
      if (result.success && result.draft) {
        setPendingCampaignDraft(state.currentDraft);
        setDraft(result.draft, 'workflow');
        addMessage('assistant', `Workflow draft ready: "${result.draft.name}". Approve it and I'll link it to your campaign.`);
      }
    } catch { toast.error('Failed to generate workflow'); }
    finally { setLoading(false); }
  };

  const hasMessages = state.messages.length > 0 || isStreaming;
  const hasDraft = !!state.currentDraft;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">

        {/* ── Single-column hero (collapses when split) ─────────────────────── */}
        {!isSplit && (
          <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              What would you like to create?
            </h1>
            <p className="text-gray-500 mb-8 max-w-lg">
              Campaigns, email workflows, lead generation — describe it in plain English.
            </p>

            {/* Hero input */}
            <form onSubmit={handleSubmit} className="w-full max-w-2xl">
              <div className="flex gap-3 bg-white border-2 border-gray-200 rounded-xl p-2 shadow-sm focus-within:border-primary-400 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='e.g. "Create a campaign for spa salons in Madrid"'
                  className="flex-1 px-3 py-2 text-base outline-none text-gray-900 placeholder-gray-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </form>

            {/* Quick starts */}
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              {QUICK_STARTS.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => { sendMessage(qs.message); }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-center gap-1.5"
                >
                  {qs.label} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            {/* Manual links */}
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
              <span>Prefer manual setup?</span>
              <a href="/campaigns" className="text-gray-500 hover:text-primary-600 transition-colors">Campaigns ↗</a>
              <a href="/workflows" className="text-gray-500 hover:text-primary-600 transition-colors">Workflows ↗</a>
              <a href="/leads" className="text-gray-500 hover:text-primary-600 transition-colors">Leads ↗</a>
            </div>
          </div>
        )}

        {/* ── Split-screen (slides in when isSplit = true) ──────────────────── */}
        {isSplit && (
          <div className="flex flex-1 overflow-hidden transition-all duration-300 ease-in-out">

            {/* Left panel — conversation thread */}
            <div className={`flex flex-col transition-all duration-300 ease-in-out ${hasDraft ? 'w-full lg:w-[58%]' : 'w-full'} border-r border-gray-200 bg-white`}>

              {/* Context chips */}
              {Object.values(state.resolvedEntities).some(Boolean) && (
                <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                  {state.resolvedEntities.lastIndustry && (
                    <ContextChip label="Industry" value={state.resolvedEntities.lastIndustry} onRemove={() => handleRemoveEntity('lastIndustry')} />
                  )}
                  {state.resolvedEntities.lastLocation && (
                    <ContextChip label="Location" value={state.resolvedEntities.lastLocation} onRemove={() => handleRemoveEntity('lastLocation')} />
                  )}
                  {state.resolvedEntities.lastWorkflowName && (
                    <ContextChip label="Workflow" value={state.resolvedEntities.lastWorkflowName} onRemove={() => handleRemoveEntity('lastWorkflowName')} />
                  )}
                  {state.resolvedEntities.lastBatchName && (
                    <ContextChip label="Batch" value={state.resolvedEntities.lastBatchName} onRemove={() => handleRemoveEntity('lastBatchName')} />
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                {state.messages.map((msg, i) => (
                  <MessageBubble key={i} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
                ))}
                {isStreaming && !streamDone && <ThinkingAnimation />}

                {/* Live reasoning steps */}
                {reasoningSteps.length > 0 && (
                  <div className="ml-11">
                    <ReasoningPanel steps={reasoningSteps} isStreaming={isStreaming} isDone={streamDone} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-gray-200 px-5 py-4 bg-white">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Continue the conversation..."
                    disabled={isStreaming}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right panel — live draft card (slides in when draft arrives) */}
            {hasDraft && (
              <div className="hidden lg:flex lg:w-[42%] flex-col overflow-y-auto bg-gray-50 px-5 py-5 space-y-4 transition-all duration-300 ease-in-out">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Live Draft</p>
                  <button onClick={handleDismissDraft} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Dismiss ✕
                  </button>
                </div>

                {state.currentIntent === 'campaign' && (
                  <CampaignDraftCard
                    draft={state.currentDraft}
                    workflows={context?.workflows || []}
                    onEdit={(updated) => setDraft(updated, 'campaign')}
                    onCreate={handleCreateCampaign}
                    onGenerateWorkflow={handleGenerateWorkflow}
                    isGeneratingWorkflow={generateWorkflow.isPending}
                  />
                )}
                {state.currentIntent === 'workflow' && (
                  <WorkflowDraftCard draft={state.currentDraft} onCreate={handleCreateWorkflow} />
                )}
                {state.currentIntent === 'lead_batch' && (
                  <LeadBatchDraftCard draft={state.currentDraft} onCreate={handleCreateLeadBatch} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

---

## NEW UTILITY FILE: /apps/web/src/utils/detect-intent.ts

> **Enhancement #7** — The original design had a `POST /api/ai-campaigns/detect-intent` endpoint that made a full HTTP round trip to run 30 lines of string matching. This is a pure client-side utility. No network call, no server, no dependency.

```typescript
export type IntentType = 'campaign' | 'workflow' | 'lead_batch';

const CAMPAIGN_KEYWORDS = [
  'campaign', 'outreach', 'email campaign', 'run outreach',
  'start campaign', 'create campaign', 'launch campaign',
];

const WORKFLOW_KEYWORDS = [
  'workflow', 'email sequence', 'email series', 'follow-up sequence',
  'write emails', 'create emails', 'generate emails',
  '3-step', '2-step', '5-step', 'multi-step', 'email steps',
];

const LEAD_GEN_KEYWORDS = [
  'find leads', 'generate leads', 'scrape', 'search for',
  'get leads', 'find companies', 'find businesses', 'find clinics',
  'find salons', 'find gyms', 'find studios', 'lead batch',
  'create batch', 'import leads',
];

/**
 * Detect user intent from natural language message.
 * Runs entirely client-side — zero network overhead.
 * Default: 'campaign' (most common intent).
 */
export function detectIntent(message: string): IntentType {
  const lower = message.toLowerCase();

  const campaignScore = CAMPAIGN_KEYWORDS.filter(k => lower.includes(k)).length;
  const workflowScore = WORKFLOW_KEYWORDS.filter(k => lower.includes(k)).length;
  const leadScore     = LEAD_GEN_KEYWORDS.filter(k => lower.includes(k)).length;

  if (leadScore > campaignScore && leadScore > workflowScore) return 'lead_batch';
  if (workflowScore > campaignScore && workflowScore > leadScore) return 'workflow';
  return 'campaign'; // default — most messages are campaign-related
}
```

> **Import in `ai-create.tsx`:**
> ```typescript
> import { detectIntent } from '@/utils/detect-intent';
> ```
> The `IntentDetectorService` on the backend and the `/detect-intent` endpoint can be removed entirely.