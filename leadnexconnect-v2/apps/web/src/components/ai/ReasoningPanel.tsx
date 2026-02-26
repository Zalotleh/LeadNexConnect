import React from 'react';
import { CheckCircle, Circle, Loader, X } from 'lucide-react';

interface ReasoningPanelProps {
  steps: string[];
  isStreaming: boolean;
  isDone: boolean;
  onDismiss?: () => void;
}

export default function ReasoningPanel({ steps, isStreaming, isDone, onDismiss }: ReasoningPanelProps) {
  if (steps.length === 0 && !isStreaming) return null;

  return (
    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          AI Reasoning
        </p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            aria-label="Dismiss reasoning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCurrent = isLast && isStreaming && !isDone;
          const isDoneStep = isDone || !isLast;

          return (
            <li
              key={index}
              className="flex items-start gap-2 text-sm"
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
