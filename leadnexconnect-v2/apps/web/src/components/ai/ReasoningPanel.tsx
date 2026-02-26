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
