import React from 'react';
import { Loader } from 'lucide-react';

export default function ThinkingAnimation() {
  return (
    <div 
      className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg border-2 border-primary-200 shadow-sm"
      style={{
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <Loader className="w-5 h-5 text-primary-600 animate-spin flex-shrink-0" />
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-primary-700">Processing your request</span>
        <span className="text-primary-600 animate-bounce">.</span>
        <span className="text-primary-600 animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
        <span className="text-primary-600 animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
      </div>
    </div>
  );
}
