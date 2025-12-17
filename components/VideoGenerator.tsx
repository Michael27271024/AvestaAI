import React, { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon } from './icons/FeatureIcons';
import type { VideoGenerationModel } from '../types';

const loadingMessages = [
    "در حال ارسال درخواست به هوش مصنوعی...",
    "پردازش ویدیو آغاز شد. این ممکن است چند دقیقه طول بکشد.",
    "در حال ساخت فریم‌های اولیه...",
    "در حال رندر کردن صحنه‌ها...",
    "افزودن جزئیات نهایی...",
    "تقریباً تمام شد، در حال آماده‌سازی ویدیو...",
];

const videoModels: { id: VideoGenerationModel, name: string }[] = [
    { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast (سریع)' },
    { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 HD (کیفیت بالا)' },
];

export const VideoGenerator: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [generatedVideoObject, setGeneratedVideoObject] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Extension state
    const [isExtending, setIsExtending] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState('');
    const [extendedVideoUrl, setExtendedVideoUrl] = useState<string | null>(null);
    const [extensionError, setExtensionError] = useState('');

    const [model, setModel] = useState<VideoGenerationModel>('veo-3.1-fast-generate-preview');
    const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">('16:9');
    const [resolution, setResolution] = useState<"720p" | "1080p">('720p');

    const [hasApiKey, setHasApiKey] = useState(false);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

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

        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        }
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
            setError(''); 
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading || !hasApiKey) return;

        setIsLoading(true);
        if(videoUrl) URL.revokeObjectURL(videoUrl);
        if(extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        setVideoUrl(null);
        setExtendedVideoUrl(null);
        setGeneratedVideoObject(null);
        setError('');
        setExtensionError('');
        
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 8000);

        try {
            const { downloadLink, video } = await geminiService.generateVideo(prompt, model, aspectRatio, resolution);
            setGeneratedVideoObject(video);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setVideoUrl(objectUrl);
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
            if (err.message?.includes("خطا در کلید API")) setHasApiKey(false);
        } finally {
            clearInterval(interval);
            setIsLoading(false);
        }
    };

    const handleExtend = async (e: FormEvent) => {
        e.preventDefault();
        if (!extensionPrompt.trim() || !generatedVideoObject || isExtending) return;
        
        if (generatedVideoObject.resolution !== '720p') {
            setExtensionError("گسترش ویدیو فقط برای ویدیوهای با کیفیت 720p امکان‌پذیر است.");
            return;
        }

        setIsExtending(true);
        if(extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        setExtendedVideoUrl(null);
        setExtensionError('');

        try {
            const downloadLink = await geminiService.extendVideo(extensionPrompt, generatedVideoObject);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`Failed to fetch extended video: ${response.statusText}`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setExtendedVideoUrl(objectUrl);
        } catch (err: any) {
             setExtensionError(err instanceof Error ? err.message : 'خطای ناشناخته در گسترش ویدیو.');
             if (err.message?.includes("خطا در کلید API")) setHasApiKey(false);
        } finally {
            setIsExtending(false);
        }
    }
    

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-300">تولید ویدیو از متن</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="توصیف ویدیویی که می‌خواهید بسازید..."
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    disabled={isLoading}
                />
                <div className="flex flex-wrap items-center gap-4">
                     <div className="flex items-center gap-2">
                        <label htmlFor="model-select" className="text-sm">مدل:</label>
                        <select id="model-select" value={model} onChange={e => setModel(e.target.value as VideoGenerationModel)} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                            {videoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="aspectRatio" className="text-sm">نسبت تصویر:</label>
                        <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value as "16:9" | "9:16")} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                            <option value="16:9">16:9 (افقی)</option>
                            <option value="9:16">9:16 (عمودی)</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <label htmlFor="resolution" className="text-sm">کیفیت:</label>
                        <select id="resolution" value={resolution} onChange={e => setResolution(e.target.value as "720p" | "1080p")} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                        </select>
                    </div>
                </div>

                {!isCheckingApiKey && !hasApiKey && (
                    <div className="p-4 bg-yellow-900/50 text-yellow-200 rounded-lg border border-yellow-700/50 flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1">
                            <h4 className="font-bold">نیاز به کلید API</h4>
                            <p className="text-sm mt-1">
                                برای استفاده از قابلیت تولید ویدیو، نیاز به انتخاب یک کلید API دارید که صورت‌حساب (billing) برای آن فعال شده باشد.
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-1">اطلاعات بیشتر</a>
                            </p>
                        </div>
                        <button type="button" onClick={handleSelectKey} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition font-semibold flex-shrink-0">
                            انتخاب کلید API
                        </button>
                    </div>
                )}
                
                <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !hasApiKey}>
                    {isLoading ? 'در حال تولید...' : 'تولید کن'}
                </button>
                 {error && !isLoading && <p className="text-red-400 mt-2">{error}</p>}
            </form>

            <div className="mt-6 flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg text-indigo-200">{loadingMessage}</p>
                    </div>
                )}
                {!isLoading && videoUrl && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">ویدیوی شما آماده است:</h3>
                            <video src={videoUrl} controls autoPlay className="w-full max-w-2xl mx-auto rounded-lg"></video>
                        </div>

                        <div className="p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                             <h3 className="text-lg font-semibold mb-2">گسترش ویدیو</h3>
                             <p className="text-sm text-gray-400 mb-2">
                                یک دستور جدید برای ادامه ویدیو بدهید. (ویدیو به مدت ۷ ثانیه با کیفیت 720p گسترش می‌یابد)
                             </p>
                             <form onSubmit={handleExtend} className="flex flex-col sm:flex-row gap-2">
                                 <input 
                                     type="text"
                                     value={extensionPrompt}
                                     onChange={(e) => setExtensionPrompt(e.target.value)}
                                     placeholder="اتفاق بعدی را توصیف کنید..."
                                     className="flex-1 p-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                     disabled={isExtending || generatedVideoObject?.resolution !== '720p'}
                                 />
                                 <button type="submit" className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isExtending || !extensionPrompt.trim() || generatedVideoObject?.resolution !== '720p'}>
                                     {isExtending ? 'در حال گسترش...' : 'گسترش بده'}
                                 </button>
                             </form>
                             {extensionError && <p className="text-red-400 mt-2 text-sm">{extensionError}</p>}
                             {generatedVideoObject?.resolution !== '720p' && <p className="text-yellow-400 mt-2 text-sm">گسترش ویدیو فقط برای ویدیوهای با کیفیت 720p امکان‌پذیر است. لطفاً یک ویدیوی جدید با این کیفیت بسازید.</p>}
                        </div>

                        {isExtending && (
                             <div className="flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-3 text-indigo-200">در حال اضافه کردن ادامه ویدیو...</p>
                            </div>
                        )}

                        {extendedVideoUrl && !isExtending && (
                             <div>
                                <h3 className="text-lg font-semibold mb-2">ویدیوی گسترش‌یافته:</h3>
                                <video src={extendedVideoUrl} controls autoPlay className="w-full max-w-2xl mx-auto rounded-lg"></video>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>محدودیت استفاده (نمایشی): ۵ ویدیو در روز.</span>
            </div>
        </div>
    );
};
