import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import type { GroundingSource } from '../types';
import { InfoIcon, SearchIcon } from './icons/FeatureIcons';

export const GroundedSearch: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{text: string, sources: GroundingSource[]}>({text: '', sources: []});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResult({text: '', sources: []});
    const response = await geminiService.groundedSearch(prompt);
    if (response.sources.length === 0 && response.text.toLowerCase().includes('خطا')) {
        setError(response.text);
    } else {
        setResult(response);
    }
    setIsLoading(false);
  };
  
  const getDomainName = (uri: string) => {
      try {
          const url = new URL(uri);
          return url.hostname;
      } catch (e) {
          return uri;
      }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">جستجو با گوگل</h2>
      <p className="mb-4 text-gray-400">از این قابلیت برای پرسش در مورد رویدادهای اخیر، اخبار و اطلاعات به‌روز استفاده کنید.</p>
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="سوال خود را بپرسید..."
          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          disabled={isLoading}
        />
        <button type="submit" className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !prompt.trim()}>
            <SearchIcon className="w-6 h-6" />
        </button>
      </form>
       {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
       
       <div className="mt-6 flex-1 overflow-y-auto pr-2">
        {isLoading && (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
        {!isLoading && result.text && !error && (
          <div className="max-w-4xl mx-auto">
            {/* AI Summary Card */}
            <div className="p-5 mb-8 bg-gray-800/50 rounded-lg border border-indigo-500/30 glow-border">
              <h3 className="text-lg font-semibold mb-2 text-indigo-300">خلاصه هوشمند</h3>
              <p className="whitespace-pre-wrap text-gray-200">{result.text}</p>
            </div>
            
            {/* Search Results */}
            <h4 className="font-semibold text-gray-300 mb-4">نتایج وب:</h4>
            <div className="space-y-6">
              {result.sources.map((source, index) => (
                <div key={index} className="animate-slide-up" style={{animationDelay: `${index * 100}ms`}}>
                   <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg bg-gray-900/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 transition">
                      <p className="text-sm text-gray-400 truncate">{getDomainName(source.web.uri)}</p>
                      <h5 className="text-lg font-semibold text-indigo-400 hover:underline">
                        {source.web.title || "بدون عنوان"}
                      </h5>
                   </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>محدودیت استفاده (نمایشی): ۵۰ جستجو در روز.</span>
      </div>
    </div>
  );
};