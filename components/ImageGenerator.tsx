import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';
import { InfoIcon, DownloadIcon } from './icons/FeatureIcons';

export const ImageGenerator: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [mode, setMode] = useState<ThinkingMode>('creative');
  
  const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setImages([]);
    setError('');
    setEnhancedPrompt('');
    try {
        const response = await geminiService.generateImages(prompt, numImages, aspectRatio, mode);
        setImages(response.images);
        setEnhancedPrompt(response.translatedPrompt);
    } catch(err) {
        setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownloadImage = (imgSrc: string, index: number) => {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `avesta-ai-image-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">تولید عکس</h2>
      <p className="mb-4 text-gray-400">
        دستور خود را به فارسی وارد کنید. اوستا آن را برای بهترین نتیجه به یک دستور دقیق انگلیسی تبدیل می‌کند.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="توصیف عکسی که می‌خواهید بسازید..."
          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="numImages">تعداد:</label>
            <select id="numImages" value={numImages} onChange={e => setNumImages(Number(e.target.value))} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="aspectRatio">نسبت تصویر:</label>
            <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
           <button type="submit" className="mr-auto px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading}>
            {isLoading ? 'در حال تولید...' : 'تولید کن'}
          </button>
        </div>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </form>

      <div className="mt-6 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!isLoading && images.length > 0 && (
          <>
            {enhancedPrompt && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">دستور بهینه شده (انگلیسی):</p>
                <p className="text-indigo-200" dir="ltr">{enhancedPrompt}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((imgSrc, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg shadow-lg">
                  <img
                    src={imgSrc}
                    alt={`Generated image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                          onClick={() => handleDownloadImage(imgSrc, index)} 
                          className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 backdrop-blur-sm transition-transform transform active:scale-90"
                          aria-label="دانلود تصویر"
                          title="دانلود با کیفیت اصلی"
                      >
                          <DownloadIcon className="w-8 h-8"/>
                      </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>محدودیت استفاده (نمایشی): ۲۰ تصویر در روز.</span>
      </div>
    </div>
  );
};
