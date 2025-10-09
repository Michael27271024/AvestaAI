import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon } from './icons/FeatureIcons';

const loadingMessages = [
    "در حال ارسال درخواست به هوش مصنوعی...",
    "پردازش ویدیو آغاز شد. این ممکن است چند دقیقه طول بکشد.",
    "در حال ساخت فریم‌های اولیه...",
    "در حال رندر کردن صحنه‌ها...",
    "افزودن جزئیات نهایی...",
    "تقریباً تمام شد، در حال آماده‌سازی ویدیو...",
];

export const VideoGenerator: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setVideoUrl(null);
        setError('');
        
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 8000);

        try {
            const responseUrl = await geminiService.generateVideo(prompt);
            setVideoUrl(responseUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
        } finally {
            clearInterval(interval);
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-300">تولید ویدیو</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="توصیف ویدیویی که می‌خواهید بسازید..."
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    disabled={isLoading}
                />
                <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading}>
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
                    <div>
                        <h3 className="text-lg font-semibold mb-2">ویدیوی شما آماده است:</h3>
                        <video src={videoUrl} controls className="w-full max-w-2xl mx-auto rounded-lg"></video>
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