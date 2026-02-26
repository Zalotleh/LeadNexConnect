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
  const [isSplit, setIsSplit] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [streamDone, setStreamDone] = useState(false);
  const [pendingCampaignDraft, setPendingCampaignDraft] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { startStream, isStreaming } = useSSEStream({
    onReasoning: (step) => {
      setReasoningSteps(prev => [...prev, step]);
    },
    onDraftField: (_field, _value) => {
      // partial draft fields arrive — could show live preview here
    },
    onDraftComplete: (draft) => {
      const d = draft as any;
      setStreamDone(true);
      setLoading(false);
      if (d.status === 'needs_clarification') {
        addMessage('assistant', d.question);
        return;
      }
      if (d.status === 'off_topic' || d.status === 'policy_violation') {
        addMessage('assistant', d.message);
        return;
      }
      setDraft(draft, 'campaign');
      addMessage('assistant', `I've prepared a campaign draft. Review it on the right and click "Create & Launch" when ready.`);
      if (d.industry) updateEntities({ lastIndustry: d.industry });
      if (d.targetCities?.[0]) updateEntities({ lastLocation: d.targetCities[0] });
    },
    onError: (message) => {
      addMessage('assistant', `Something went wrong: ${message}. Try rephrasing, or create it manually via the campaigns page.`);
      setLoading(false);
      setStreamDone(true);
    },
    onDone: () => {
      setLoading(false);
    },
  });

  useEffect(() => {
    fetchContext.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, reasoningSteps]);

  useEffect(() => {
    const q = router.query.q as string;
    if (q) {
      router.replace('/', undefined, { shallow: true });
      sendMessage(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.q]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendMessage = useCallback(async (message: string) => {
    const msg = message.trim();
    if (!msg || isStreaming) return;

    addMessage('user', msg);
    setLoading(true);
    setIsSplit(true);
    setReasoningSteps([]);
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
        name: state.currentDraft.name,
        description: state.currentDraft.description,
        industry: state.currentDraft.industry,
        country: state.currentDraft.country,
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
        apollo: '/scraping/apollo',
        google_places: '/scraping/google-places',
        peopledatalabs: '/scraping/peopledatalabs',
        hunter: '/scraping/hunter',
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

  const hasDraft = !!state.currentDraft;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">

        {/* Single-column hero */}
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

            <div className="mt-8 flex items-center gap-6 text-sm text-gray-400">
              <span>Prefer manual setup?</span>
              <a href="/campaigns" className="text-gray-500 hover:text-primary-600 transition-colors">Campaigns ↗</a>
              <a href="/workflows" className="text-gray-500 hover:text-primary-600 transition-colors">Workflows ↗</a>
              <a href="/leads" className="text-gray-500 hover:text-primary-600 transition-colors">Leads ↗</a>
            </div>
          </div>
        )}

        {/* Split-screen */}
        {isSplit && (
          <div className="flex flex-1 overflow-hidden">

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

            {/* Right panel — live draft card */}
            {hasDraft && (
              <div className="hidden lg:flex lg:w-[42%] flex-col overflow-y-auto bg-gray-50 px-5 py-5 space-y-4">
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
