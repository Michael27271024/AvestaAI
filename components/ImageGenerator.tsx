
import React, { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon, DownloadIcon } from './icons/FeatureIcons';
import type { ImageGenerationModel } from '../types';

const imageModels: { id: ImageGenerationModel, name: string, supportsMultiple: boolean, supportsAspectRatio: boolean, requiresApiKey: boolean }[] = [
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (استاندارد)', supportsMultiple: false, supportsAspectRatio: true, requiresApiKey: false },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3.0 Pro Image (بالاترین کیفیت)', supportsMultiple: false, supportsAspectRatio: true, requiresApiKey: true },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (فوق هنری)', supportsMultiple: true, supportsAspectRatio: true, requiresApiKey: false },
];

export const ImageGenerator: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [model, setModel] = useState<ImageGenerationModel>('gemini-2.5-flash-image');

  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  
  const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  const currentModelConfig = imageModels.find(m => m.id === model);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const keyStatus = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keyStatus);
        } else {
            setHasApiKey(true);
        }
        setIsCheckingApiKey(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        setError(''); 
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value as ImageGenerationModel;
    setModel(newModelId);
    const selectedModel = imageModels.find(m => m.id === newModelId);
    if (selectedModel) {
        if (!selectedModel.supportsMultiple) setNumImages(1);
        if (!selectedModel.supportsAspectRatio) setAspectRatio('1:1');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (currentModelConfig?.requiresApiKey && !hasApiKey) {
        setError("لطفا ابتدا یک کلید API انتخاب کنید.");
        return;
    }
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setImages([]);
    setError('');
    setEnhancedPrompt('');
    try {
        const response = await geminiService.generateImages(prompt, numImages, aspectRatio, model);
        setImages(response.images);
        setEnhancedPrompt(response.translatedPrompt);
    } catch(err) {
        const errorMsg = err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.';
        setError(errorMsg);
        if (errorMsg.includes("Requested entity was not found")) {
            setHasApiKey(false);
            setError("کلید API شما معتبر نیست یا دسترسی به این مدل را ندارد.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownloadImage = (imgSrc: string, index: number) => {
    const link = document.createElement('a');
    link.href = imgSrc;
    link.download = `avesta-ai-${model}-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in p-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-indigo-300">تولید تصویر هوشمند</h2>
        <p className="text-sm text-gray-400 mt-1">ایده‌های خود را به واقعیت بصری تبدیل کنید.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-gray-900/40 p-5 rounded-2xl border border-gray-800">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="چی تو ذهنته؟ به فارسی بنویس..."
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-gray-200"
          disabled={isLoading}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 mr-2">انتخاب مدل</label>
            <select value={model} onChange={handleModelChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                {imageModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={`text-xs text-gray-500 mr-2 ${!currentModelConfig?.supportsMultiple ? 'opacity-30' : ''}`}>تعداد خروجی</label>
            <select value={numImages} onChange={e => setNumImages(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30" disabled={isLoading || !currentModelConfig?.supportsMultiple}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={`text-xs text-gray-500 mr-2 ${!currentModelConfig?.supportsAspectRatio ? 'opacity-30' : ''}`}>ابعاد تصویر</label>
            <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30" disabled={isLoading || !currentModelConfig?.supportsAspectRatio}>
                {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
        </div>

        {currentModelConfig?.requiresApiKey && !isCheckingApiKey && !hasApiKey && (
             <div className="p-4 bg-yellow-950/40 text-yellow-200 rounded-xl border border-yellow-700/50 flex flex-col sm:flex-row items-center gap-4 animate-pulse">
                <p className="text-xs flex-1">این مدل نیاز به کلید API اختصاصی دارد.</p>
                <button type="button" onClick={handleSelectKey} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition text-xs font-bold">انتخاب کلید</button>
            </div>
        )}

        <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-xl transition font-bold text-lg shadow-xl shadow-indigo-600/20 active:scale-95" disabled={isLoading || (currentModelConfig?.requiresApiKey && !hasApiKey)}>
            {isLoading ? 'در حال خلق جادو...' : 'تولید تصویر'}
        </button>
        {error && <p className="text-red-400 text-center text-sm">{error}</p>}
      </form>

      <div className="mt-8 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-300 animate-pulse text-sm">در حال رندر کردن تصویر...</p>
          </div>
        )}
        {!isLoading && images.length > 0 && (
          <div className="space-y-6">
            {enhancedPrompt && (
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-widest">توصیف فنی:</p>
                <p className="text-xs text-indigo-200/80 italic" dir="ltr">{enhancedPrompt}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {images.map((imgSrc, index) => (
                <div key={index} className="relative group overflow-hidden rounded-2xl shadow-2xl border border-white/5 bg-gray-900">
                  <img src={imgSrc} alt="Generated" className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownloadImage(imgSrc, index)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition transform active:scale-90">
                          <DownloadIcon className="w-8 h-8 text-white"/>
                      </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
