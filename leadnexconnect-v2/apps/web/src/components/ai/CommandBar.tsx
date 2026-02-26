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
                    &quot;{action.example}&quot;
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
