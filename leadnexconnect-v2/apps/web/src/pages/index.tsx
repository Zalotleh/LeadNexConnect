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
import { Sparkles, Send, X, Loader2, RotateCcw } from 'lucide-react';

const QUICK_STARTS = [
  {
    emoji: '💆',
    label: 'Campaign Example',
    message: 'Create an outreach campaign for spa salons in Madrid',
    preview: '"Create an outreach campaign for spa salons in Madrid"',
    cardClass: 'border-primary-200 bg-gradient-to-br from-primary-50 to-blue-50 hover:border-primary-400',
    labelClass: 'text-primary-700',
  },
  {
    emoji: '✉️',
    label: 'Workflow Example',
    message: 'Write a 3-step email sequence for dental clinics',
    preview: '"Write a 3-step email sequence for dental clinics"',
    cardClass: 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 hover:border-purple-400',
    labelClass: 'text-purple-700',
  },
  {
    emoji: '🔍',
    label: 'Lead Gen Example',
    message: 'Find 50 yoga studios in Barcelona',
    preview: '"Find 50 yoga studios in Barcelona"',
    cardClass: 'border-green-200 bg-gradient-to-br from-green-50 to-teal-50 hover:border-green-400',
    labelClass: 'text-green-700',
  },
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
  const [isReasoningVisible, setIsReasoningVisible] = useState(true);
  const [pendingCampaignDraft, setPendingCampaignDraft] = useState<any>(null);
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracks which parser last asked a clarification so the user's next reply routes back to it
  const pendingClarificationParser = useRef<'workflow' | 'lead_batch' | 'campaign' | null>(null);

  const { startStream, cancelStream, isStreaming } = useSSEStream({
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
        pendingClarificationParser.current = 'campaign';
        addMessage('assistant', d.question);
        return;
      }
      if (d.status === 'off_topic' || d.status === 'policy_violation') {
        pendingClarificationParser.current = null;
        addMessage('assistant', d.message);
        return;
      }
      pendingClarificationParser.current = null;
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
    setIsReasoningVisible(true);

    // Track start time to ensure minimum loading display time
    const startTime = Date.now();
    const MIN_LOADING_TIME = 800; // milliseconds

    const intent = detectIntent(msg);
    console.log('[sendMessage] Intent detected:', intent, 'for message:', msg);

    // overrideParser from a pending clarification takes ABSOLUTE precedence over intent detection
    const overrideParser = pendingClarificationParser.current;
    pendingClarificationParser.current = null; // clear before routing
    const effectiveIntent = overrideParser || intent;

    const historyForAPI = state.messages.map(m => ({
      role: m.role, content: m.content, timestamp: m.timestamp.toISOString(),
    }));

    if (effectiveIntent === 'lead_batch') {
      try {
        const result = await parseLeadBatch.mutateAsync({ message: msg, currentDraft: state.currentDraft || undefined });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            pendingClarificationParser.current = 'lead_batch';
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
      
      // Ensure minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MIN_LOADING_TIME - elapsedTime;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      setLoading(false);
      return;
    }

    if (effectiveIntent === 'workflow') {
      try {
        const result = await parseWorkflow.mutateAsync({
          message: msg,
          industry: state.resolvedEntities.lastIndustry,
          country: state.resolvedEntities.lastCountry || state.resolvedEntities.lastLocation,
          conversationHistory: historyForAPI,
          resolvedEntities: state.resolvedEntities,
        });
        if (result.success && result.draft) {
          const draft = result.draft;
          if (draft.status === 'needs_clarification') {
            pendingClarificationParser.current = 'workflow';
            addMessage('assistant', draft.question);
          } else if (draft.status === 'off_topic' || draft.status === 'policy_violation') {
            addMessage('assistant', draft.message);
          } else {
            setDraft(draft, 'workflow');
            addMessage('assistant', `Workflow draft ready: "${draft.name}". Review the steps on the right.`);
          }
        }
      } catch { addMessage('assistant', 'Failed to generate workflow. Try being more specific.'); }
      
      // Ensure minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = MIN_LOADING_TIME - elapsedTime;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
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
    setIsCreatingWorkflow(true);
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
      } else {
        toast.error(res.data.error?.message || 'Failed to create workflow');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create workflow');
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const handleCreateLeadBatch = async () => {
    if (!state.currentDraft) return;
    setIsGeneratingLeads(true);
    try {
      // Use the leads/generate endpoint which creates a proper batch record
      // and saves all leads linked to it, instead of the raw scraping endpoints.
      const res = await api.post('/leads/generate', {
        batchName: state.currentDraft.name,
        industry: state.currentDraft.industry,
        country: state.currentDraft.country,
        city: state.currentDraft.city,
        sources: [state.currentDraft.source || 'google_places'],
        maxResults: state.currentDraft.maxResults || 50,
      });
      if (res.data.success) {
        toast.success('Lead generation started! Leads will appear in your batches.');
        router.push('/leads');
      } else {
        toast.error(res.data.error?.message || 'Failed to start lead generation');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to start lead generation');
    } finally {
      setIsGeneratingLeads(false);
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

  const handleNewConversation = () => {
    cancelStream();
    reset();
    setIsSplit(false);
    setReasoningSteps([]);
    setStreamDone(false);
    setIsReasoningVisible(true);
    setPendingCampaignDraft(null);
    pendingClarificationParser.current = null;
    setInput('');
  };

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-2xl">
              {QUICK_STARTS.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => { sendMessage(qs.message); }}
                  className={`p-4 border-2 ${qs.cardClass} rounded-xl hover:shadow-md transition-all text-left`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{qs.emoji}</span>
                    <p className={`text-sm font-semibold ${qs.labelClass}`}>{qs.label}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{qs.preview}</p>
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

              {/* Chat header with New Conversation button */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">
                  {state.messages.length} message{state.messages.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleNewConversation}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                  title="Clear chat and start fresh"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New conversation
                </button>
              </div>

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
                {(state.isLoading || (isStreaming && !streamDone)) && <ThinkingAnimation />}

                {reasoningSteps.length > 0 && isReasoningVisible && (
                  <div className="ml-11">
                    <ReasoningPanel
                      steps={reasoningSteps}
                      isStreaming={isStreaming}
                      isDone={streamDone}
                      onDismiss={() => setIsReasoningVisible(false)}
                    />
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
                    disabled={isStreaming || state.isLoading}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming || state.isLoading}
                    className="px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right panel — live draft card */}
            {(hasDraft || state.isLoading) && (
              <div className="hidden lg:flex lg:w-[42%] flex-col overflow-y-auto bg-gray-50 px-5 py-5 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Live Draft</p>
                  {hasDraft && (
                    <button
                      onClick={handleDismissDraft}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-200 hover:bg-red-100 hover:text-red-700 transition-colors"
                      aria-label="Dismiss draft"
                    >
                      <X className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  )}
                </div>

                {state.isLoading && !hasDraft && (
                  <div className="bg-white rounded-xl border-2 border-primary-200 p-8 text-center shadow-lg animate-pulse">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                      <div>
                        <p className="text-lg font-semibold text-gray-900 mb-1">
                          Processing your request...
                        </p>
                        <p className="text-sm text-gray-600">
                          Analyzing your input and preparing a draft
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasDraft && state.currentIntent === 'campaign' && (
                  <CampaignDraftCard
                    draft={state.currentDraft}
                    workflows={context?.workflows || []}
                    onEdit={(updated) => setDraft(updated, 'campaign')}
                    onCreate={handleCreateCampaign}
                    onGenerateWorkflow={handleGenerateWorkflow}
                    isGeneratingWorkflow={generateWorkflow.isPending}
                  />
                )}
                {hasDraft && state.currentIntent === 'workflow' && (
                  <WorkflowDraftCard draft={state.currentDraft} onCreate={handleCreateWorkflow} isLoading={isCreatingWorkflow} />
                )}
                {hasDraft && state.currentIntent === 'lead_batch' && (
                  <LeadBatchDraftCard
                    draft={state.currentDraft}
                    onCreate={handleCreateLeadBatch}
                    isLoading={isGeneratingLeads}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
