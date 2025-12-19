
import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon } from './icons/FeatureIcons';
import type { TextGenerationModel } from '../types';

const textModels: { id: TextGenerationModel, name: string }[] = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (هوش فوق‌العاده)' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (سریع و هوشمند)' },
    { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro (منطق پیشرفته)' },
    { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (بهینه)' },
    { id: 'gemini-2.0-pro-preview', name: 'Gemini 2.0 Pro (کلاسیک قدرتمند)' },
    { id: 'gemini-2.0-flash-preview', name: 'Gemini 2.0 Flash (بسیار سریع)' },
];

export const TextGenerator: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState<TextGenerationModel>('gemini-3-flash-preview');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResult('');
    const response = await geminiService.generateText(prompt, model);
    if (response.toLowerCase().includes('خطا')) {
        setError(response);
    } else {
        setResult(response);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-2">
      <h2 className="text-2xl font-bold mb-4 text-indigo-300">تولید محتوای متنی</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="دستور خود را بنویس رفیق... مثلاً: یه مقاله در مورد آینده هوش مصنوعی بنویس."
          className="w-full p-4 h-40 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-gray-200"
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <label className="text-sm text-gray-400">انتخاب مغز متفکر:</label>
                 <select 
                    value={model} 
                    onChange={e => setModel(e.target.value as TextGenerationModel)} 
                    className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    disabled={isLoading}
                >
                    {textModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
            <button type="submit" className="px-8 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:bg-gray-700 transition font-bold shadow-lg shadow-indigo-600/20" disabled={isLoading || !prompt.trim()}>
              {isLoading ? 'در حال تفکر...' : 'تولید متن'}
            </button>
        </div>
         {error && <p className="text-red-400 mt-2 text-center bg-red-400/10 p-2 rounded-lg">{error}</p>}
      </form>
      
      <div className="flex-1 mt-6 flex flex-col overflow-hidden">
        {result && !isLoading && (
            <div className="p-5 bg-gray-900/60 border border-gray-800 rounded-2xl flex-1 overflow-y-auto animate-slide-up">
                <h3 className="text-lg font-bold mb-3 text-indigo-400 border-b border-gray-800 pb-2">پاسخ اوستا:</h3>
                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-lg">{result}</div>
            </div>
        )}
        {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-300 animate-pulse">اوستا در حال نوشتن است...</p>
            </div>
        )}
      </div>

       <div className="flex items-center gap-2 p-3 mt-4 text-xs text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700/30">
          <InfoIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span>مدل‌های Pro برای کارهای پیچیده و مدل‌های Flash برای سرعت بیشتر توصیه می‌شوند.</span>
        </div>
    </div>
  );
};
