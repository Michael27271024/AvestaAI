
import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { geminiService, fileToBase64 } from '../services/geminiService';
import { InfoIcon, UploadIcon, XIcon } from './icons/FeatureIcons';

const loadingMessages = [
    "تحلیل ساختار تصویر توسط Veo 2...",
    "در حال جان بخشیدن به پیکسل‌ها...",
    "رندر کردن حرکات سینمایی...",
    "مدل Veo 2 در حال پردازش نهایی است...",
];

export const ImageToVideoGenerator: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
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
    const [resolution, setResolution] = useState<"720p" | "1080p">('720p');
    
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (extendedVideoUrl) URL.revokeObjectURL(extendedVideoUrl);
        };
    }, [imagePreview, videoUrl, extendedVideoUrl]);
    
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError('');
            setVideoUrl(null);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !imageFile || isLoading) {
            setError("لطفاً یک تصویر و توصیف حرکت را وارد کنید.");
            return;
        }

        setIsLoading(true);
        setError('');
        if(videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setGeneratedVideoObject(null);

        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 6000);

        try {
            const base64Image = await fileToBase64(imageFile);
            // Using veo-3.1-fast-generate-preview for "Veo 2"
            const { downloadLink, video } = await geminiService.generateVideoFromImage(prompt, base64Image, imageFile.type, 'veo-3.1-fast-generate-preview', aspectRatio, resolution);
            setGeneratedVideoObject(video);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`خطا در ارتباط با واحد پردازش ویدیو.`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setVideoUrl(objectUrl);
        } catch (err: any) {
            setError(err instanceof Error ? err.message : 'خطای غیرمنتظره در رندر ویدیو.');
        } finally {
            clearInterval(interval);
            setIsLoading(false);
        }
    };

    const handleExtend = async (e: FormEvent) => {
        e.preventDefault();
        if (!extensionPrompt.trim() || !generatedVideoObject || isExtending) return;
        
        setIsExtending(true);
        setExtensionError('');

        try {
            const downloadLink = await geminiService.extendVideo(extensionPrompt, generatedVideoObject);
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) throw new Error(`خطا در گسترش ویدیو.`);
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setExtendedVideoUrl(objectUrl);
        } catch (err: any) {
             setExtensionError(err instanceof Error ? err.message : 'خطا در عملیات الحاق.');
        } finally {
            setIsExtending(false);
        }
    }

    return (
        <div className="flex flex-col h-full animate-fade-in p-2">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600/20 rounded-xl">
                    <span className="text-2xl">✨</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-indigo-300">متحرک سازی با Veo 2</h2>
                    <p className="text-xs text-gray-400">تبدیل عکس به ویدیو در چند ثانیه</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-gray-900/40 p-6 rounded-2xl border border-gray-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">۱. تصویر خود را انتخاب کن</label>
                            {!imageFile ? (
                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer bg-gray-800/30 hover:bg-gray-800/60 transition-all group">
                                    <UploadIcon className="w-8 h-8 text-gray-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                                    <span className="text-xs text-gray-500">کلیک برای آپلود عکس</span>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                            ) : (
                                <div className="relative group rounded-xl overflow-hidden h-40 border border-gray-700">
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    <button onClick={() => {setImageFile(null); setImagePreview('');}} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:text-red-400">
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">۲. توصیف حرکت</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="مثلاً: حرکت آرام دوربین به سمت جلو و لرزش ملایم شاخه‌ها..."
                                className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition resize-none h-[140px]"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as "16:9" | "9:16")} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" disabled={isLoading}>
                        <option value="16:9">سینمایی (16:9)</option>
                        <option value="9:16">عمودی (9:16)</option>
                    </select>
                    <select value={resolution} onChange={e => setResolution(e.target.value as "720p" | "1080p")} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" disabled={isLoading}>
                        <option value="720p">720p (سریع)</option>
                        <option value="1080p">1080p (باکیفیت)</option>
                    </select>
                </div>
                
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all font-bold shadow-lg" disabled={isLoading || !imageFile || !prompt}>
                    {isLoading ? 'در حال متحرک‌سازی...' : 'شروع متحرک‌سازی'}
                </button>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </form>

            <div className="mt-8 flex-1 overflow-y-auto pr-1">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg text-indigo-200">{loadingMessage}</p>
                    </div>
                )}
                
                {!isLoading && videoUrl && (
                     <div className="space-y-8 animate-fade-in">
                        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black">
                           <video src={videoUrl} controls autoPlay className="w-full"></video>
                        </div>
                        
                        <div className="p-6 bg-gray-900/40 border border-gray-800 rounded-2xl">
                             <h3 className="text-lg font-bold text-indigo-300 mb-4">ادامه سکانس</h3>
                             <form onSubmit={handleExtend} className="flex flex-col sm:flex-row gap-3">
                                 <input 
                                     type="text"
                                     value={extensionPrompt}
                                     onChange={(e) => setExtensionPrompt(e.target.value)}
                                     placeholder="چه تغییری در ادامه تصویر ایجاد شود؟"
                                     className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                     disabled={isExtending}
                                 />
                                 <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all font-bold" disabled={isExtending || !extensionPrompt.trim()}>
                                     {isExtending ? 'در حال الحاق...' : 'گسترش ویدیو'}
                                 </button>
                             </form>
                        </div>

                        {extendedVideoUrl && (
                             <div className="animate-slide-up">
                                <h3 className="text-lg font-bold text-gray-200 mb-3">نسخه نهایی:</h3>
                                <video src={extendedVideoUrl} controls className="w-full rounded-2xl shadow-xl"></video>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex justify-center">
                 <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50">
                    <InfoIcon className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-gray-500">تمامی پردازش‌های Veo 2 به صورت ابری و آنی انجام می‌شود.</span>
                </div>
            </div>
        </div>
    );
};
