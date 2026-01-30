'use client';

import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Copilot is thinking
          </span>
          <span className="flex gap-1">
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </span>
        </div>
      </div>
    </div>
  );
}
