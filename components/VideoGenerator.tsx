
import React, { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon } from './icons/FeatureIcons';
import type { VideoGenerationModel } from '../types';

const loadingMessages = [
    "اوستا در حال آماده‌سازی بوم دیجیتال...",
    "در حال پردازش پیکسل‌های هوشمند...",
    "مدل Veo 2 در حال رندر کردن تخیل شما...",
    "افزودن جزئیات سینمایی به صحنه...",
    "تقریباً تمام شد، در حال نهایی‌سازی فایل...",
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

    const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">('16:9');
    const [resolution, setResolution] = useState<"720p" | "1080p">('1080p');

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        }
    }, [videoUrl, extendedVideoUrl]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

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
        }, 6000);

        try {
            // Using veo-3.1-fast-generate-preview as the implementation of "Veo 2"
            const { downloadLink, video } = await geminiService.generateVideo(prompt, 'veo-3.1-fast-generate-preview', aspectRatio, resolution);
            setGeneratedVideoObject(video);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`خطا در دریافت ویدیو از سرور.`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setVideoUrl(objectUrl);
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
        } finally {
            clearInterval(interval);
            setIsLoading(false);
        }
    };

    const handleExtend = async (e: FormEvent) => {
        e.preventDefault();
        if (!extensionPrompt.trim() || !generatedVideoObject || isExtending) return;
        
        setIsExtending(true);
        if(extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        setExtendedVideoUrl(null);
        setExtensionError('');

        try {
            const downloadLink = await geminiService.extendVideo(extensionPrompt, generatedVideoObject);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`خطا در گسترش ویدیو.`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setExtendedVideoUrl(objectUrl);
        } catch (err: any) {
             setExtensionError(err instanceof Error ? err.message : 'خطای ناشناخته در گسترش ویدیو.');
        } finally {
            setIsExtending(false);
        }
    }

    return (
        <div className="flex flex-col h-full animate-fade-in p-2">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600/20 rounded-xl">
                    <span className="text-2xl">🎬</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-indigo-300">تولید ویدیو با Veo 2</h2>
                    <p className="text-xs text-gray-400">نسخه بدون محدودیت و فوق‌سریع اوستا</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-gray-900/40 p-6 rounded-2xl border border-gray-800/50">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">چی توی ذهنت داری؟</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="مثلاً: نمای سینمایی از پرواز یک اژدها برفراز قله‌های بابل..."
                        className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none h-24"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">نسبت تصویر</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as "16:9" | "9:16")} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" disabled={isLoading}>
                            <option value="16:9">16:9 (سینمایی)</option>
                            <option value="9:16">9:16 (استوری/تیک‌تاک)</option>
                        </select>
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm text-gray-400">کیفیت خروجی</label>
                        <select value={resolution} onChange={e => setResolution(e.target.value as "720p" | "1080p")} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" disabled={isLoading}>
                            <option value="1080p">Ultra HD (1080p)</option>
                            <option value="720p">Standard (720p)</option>
                        </select>
                    </div>
                </div>

                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all font-bold text-lg shadow-lg shadow-indigo-600/20 active:scale-[0.98]" disabled={isLoading || !prompt.trim()}>
                    {isLoading ? 'در حال خلق جادو...' : 'ساخت ویدیو'}
                </button>
                
                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">{error}</div>}
            </form>

            <div className="mt-8 flex-1">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-64 text-center animate-pulse">
                        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-xl font-medium text-indigo-200">{loadingMessage}</p>
                    </div>
                )}
                
                {!isLoading && videoUrl && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                            <video src={videoUrl} controls autoPlay className="w-full aspect-video object-cover"></video>
                        </div>

                        <div className="p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl">
                             <h3 className="text-lg font-bold text-indigo-300 mb-2">ادامه این داستان...</h3>
                             <p className="text-sm text-gray-400 mb-4">می‌توانی ویدیو را به مدت ۷ ثانیه دیگر گسترش دهی.</p>
                             <form onSubmit={handleExtend} className="flex flex-col sm:flex-row gap-3">
                                 <input 
                                     type="text"
                                     value={extensionPrompt}
                                     onChange={(e) => setExtensionPrompt(e.target.value)}
                                     placeholder="چه اتفاقی در ادامه بیفتد؟"
                                     className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                     disabled={isExtending}
                                 />
                                 <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all font-bold" disabled={isExtending || !extensionPrompt.trim()}>
                                     {isExtending ? 'در حال پردازش...' : 'گسترش ویدیو'}
                                 </button>
                             </form>
                             {extensionError && <p className="text-red-400 mt-2 text-sm">{extensionError}</p>}
                        </div>

                        {isExtending && (
                             <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-900/40 rounded-2xl">
                                <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-indigo-200 text-sm">در حال دوختن سکانس‌های جدید...</p>
                            </div>
                        )}

                        {extendedVideoUrl && !isExtending && (
                             <div className="animate-fade-in">
                                <h3 className="text-lg font-bold text-gray-200 mb-3">سکانس الحاقی:</h3>
                                <video src={extendedVideoUrl} controls className="w-full rounded-2xl shadow-xl border border-white/5"></video>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="mt-auto pt-6 flex justify-center">
                 <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50">
                    <InfoIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-gray-500">تمامی پردازش‌ها روی سرورهای قدرتمند اوستا انجام می‌شود.</span>
                </div>
            </div>
        </div>
    );
};
