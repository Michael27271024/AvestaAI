import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import type { GroundingSource } from '../types';
import { InfoIcon } from './icons/FeatureIcons';

export const SongFinderDownloader: FC = () => {
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
    
    const fullPrompt = `Find information and listening/purchasing links for the song: "${prompt}". Also, provide guidance on safe and legal ways to download this song for offline listening. Respond in Farsi.`;
    const response = await geminiService.groundedSearch(fullPrompt);

    if (response.sources.length === 0 && response.text.toLowerCase().includes('خطا')) {
        setError(response.text);
    } else {
        setResult(response);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">جستجوی آهنگ</h2>
      <p className="mb-4 text-gray-400">نام آهنگ و خواننده را وارد کنید تا اوستا اطلاعات، لینک‌های شنیدن و راهنمای دانلود آن را برای شما پیدا کند.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="نام آهنگ و خواننده را وارد کنید..."
          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          disabled={isLoading}
        />
        <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading}>
          {isLoading ? 'در حال جستجو...' : 'جستجو کن'}
        </button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </form>
       <div className="mt-6 flex-1 overflow-y-auto">
        {isLoading && (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
        {!isLoading && result.text && !error && (
          <div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">نتیجه:</h3>
              <p className="whitespace-pre-wrap text-gray-300">{result.text}</p>
            </div>
            {result.sources.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-indigo-200">منابع و لینک‌ها:</h4>
                <ul className="list-disc list-inside mt-2 space-y-2">
                  {result.sources.map((source, index) => (
                    <li key={index}>
                      <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                        {source.web.title || source.web.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>این ابزار یک راهنما است. لطفاً به قوانین کپی‌رایت احترام بگذارید و از هنرمندان حمایت کنید.</span>
      </div>
    </div>
  );
};