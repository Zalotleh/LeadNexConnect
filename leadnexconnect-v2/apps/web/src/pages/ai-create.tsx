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
import { detectIntent } from '@/utils/detect-intent';
import { ResolvedEntities } from '@/types/ai-conversation.types';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { Sparkles } from 'lucide-react';

export default function AICreatePage() {
  const router = useRouter();
  const { state, addMessage, updateEntities, setDraft, setLoading } = useConversationState();
  const { context, fetchContext, parseCampaign, generateWorkflow } = useAICampaignCreation();
  const { parseWorkflow } = useAIWorkflowCreation();
  const { parseLeadBatch } = useAILeadBatchCreation();

  // Fix #3: When "Generate emails for this campaign" is clicked, we switch the right panel
  // to show the workflow draft for user approval. We park the active campaign draft here
  // so we can restore it (with the new workflowId linked) after the user approves.
  const [pendingCampaignDraft, setPendingCampaignDraft] = useState<any>(null);

  useEffect(() => {
    fetchContext.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async (message: string) => {
    addMessage('user', message);
    setLoading(true);

    try {
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
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            addMessage('assistant', `I've prepared a campaign draft for "${draft.name}". Review it on the right.`);
            setDraft(draft, 'campaign');

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
        addMessage('assistant',
          "I wasn't sure what to create from that. Try being more specific — " +
          'e.g. "Create a campaign for dental clinics in London" — or create it manually via the campaigns page.'
        );
      }
    } catch (error: any) {
      console.error('Error parsing message:', error);
      addMessage('assistant',
        'Something went wrong on my end. Please try again, or create it manually if the issue persists.'
      );
    } finally {
      setLoading(false);
    }
  };

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
        aiInstructions: state.currentDraft.aiInstructions,
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

        if (pendingCampaignDraft) {
          const linkedCampaign = { ...pendingCampaignDraft, workflowId: newWorkflowId };
          setDraft(linkedCampaign, 'campaign');
          setPendingCampaignDraft(null);
          updateEntities({ lastWorkflowId: newWorkflowId, lastWorkflowName: workflowName });
          addMessage('assistant',
            `Workflow "${workflowName}" created and linked to your campaign. ` +
            "Review the updated campaign on the right, then click 'Create & Launch' when ready."
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
        instructions: state.currentDraft.suggestedWorkflowInstructions
          || `Email workflow for ${state.currentDraft.industry || 'service businesses'} in ${
            state.currentDraft.targetCities?.[0]
            || state.currentDraft.targetCountries?.[0]
            || 'target region'
          }`,
      });

      if (result.success && result.draft) {
        // Fix #3: DO NOT write to DB here. Show draft card for user approval first.
        setPendingCampaignDraft(state.currentDraft);
        setDraft(result.draft, 'workflow');
        addMessage('assistant',
          `I've drafted a "${result.draft.name}" email workflow. ` +
          "Review the steps on the right — click 'Create Workflow' to approve it and I'll link it to your campaign automatically."
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
                isLoading={state.isLoading || false}
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
