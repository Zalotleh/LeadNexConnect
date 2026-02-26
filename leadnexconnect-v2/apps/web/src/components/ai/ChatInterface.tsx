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
              Tell me what you need and I&apos;ll help you create campaigns, workflows, or generate leads — all in plain English.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
              <button
                onClick={() => onSendMessage('Create an outreach campaign for spa salons in Madrid')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Campaign Example</p>
                <p className="text-xs text-gray-600">
                  &quot;Create an outreach campaign for spa salons in Madrid&quot;
                </p>
              </button>
              <button
                onClick={() => onSendMessage('Write a 3-step email sequence for yoga studios')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Workflow Example</p>
                <p className="text-xs text-gray-600">
                  &quot;Write a 3-step email sequence for yoga studios&quot;
                </p>
              </button>
              <button
                onClick={() => onSendMessage('Find 50 dental clinics in Barcelona')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
              >
                <p className="text-sm font-medium text-gray-900 mb-1">Lead Gen Example</p>
                <p className="text-xs text-gray-600">
                  &quot;Find 50 dental clinics in Barcelona&quot;
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
