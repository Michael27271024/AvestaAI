import React from 'react';
import type { FC } from 'react';

export type ThinkingMode = 'fast' | 'creative';

interface ThinkingModeToggleProps {
  mode: ThinkingMode;
  setMode: (mode: ThinkingMode) => void;
  disabled?: boolean;
}

export const ThinkingModeToggle: FC<ThinkingModeToggleProps> = ({ mode, setMode, disabled }) => {
  const baseButtonClass = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500';
  const activeButtonClass = 'bg-indigo-600 text-white shadow-md';
  const inactiveButtonClass = 'bg-gray-700/50 text-gray-300 hover:bg-gray-700';

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-xl">
      <button
        onClick={() => setMode('creative')}
        className={`${baseButtonClass} ${mode === 'creative' ? activeButtonClass : inactiveButtonClass}`}
        disabled={disabled}
        aria-pressed={mode === 'creative'}
      >
        🧠 متفکر
      </button>
      <button
        onClick={() => setMode('fast')}
        className={`${baseButtonClass} ${mode === 'fast' ? activeButtonClass : inactiveButtonClass}`}
        disabled={disabled}
        aria-pressed={mode === 'fast'}
      >
        ⚡️ سریع
      </button>
    </div>
  );
};
