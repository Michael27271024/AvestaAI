import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';
import { InfoIcon } from './icons/FeatureIcons';

export const TextGenerator: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ThinkingMode>('creative');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResult('');
    const response = await geminiService.generateText(prompt, mode);
    // A simple check to see if the response is an error message we generated
    if (response.toLowerCase().includes('خطا')) {
        setError(response);
    } else {
        setResult(response);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-4 text-indigo-300">تولید متن</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="دستور خود را اینجا وارد کنید. برای مثال: یک داستان کوتاه در مورد یک ربات بنویس."
          className="w-full p-3 h-32 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading}>
              {isLoading ? 'در حال تولید...' : 'تولید کن'}
            </button>
            <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
        </div>
         {error && <p className="text-red-400 mt-2">{error}</p>}
      </form>
      
      <div className="flex-1 mt-6 flex flex-col overflow-hidden">
        {result && !isLoading && (
            <div className="p-4 bg-gray-800 rounded-lg flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">نتیجه:</h3>
            <p className="whitespace-pre-wrap text-gray-300">{result}</p>
            </div>
        )}
        {isLoading && (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
      </div>

       <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>محدودیت استفاده (نمایشی): نامحدود (با اولویت پایین‌تر برای درخواست‌های سنگین).</span>
        </div>
    </div>
  );
};
