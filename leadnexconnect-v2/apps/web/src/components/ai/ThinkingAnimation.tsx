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
