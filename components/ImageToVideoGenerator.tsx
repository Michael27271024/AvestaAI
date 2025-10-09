import React, { useState } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { geminiService, fileToBase64 } from '../services/geminiService';
import { InfoIcon } from './icons/FeatureIcons';

const loadingMessages = [
    "در حال تحلیل تصویر و دستور شما...",
    "پردازش ویدیو آغاز شد. این ممکن است چند دقیقه طول بکشد.",
    "در حال ساخت فریم‌های اولیه بر اساس تصویر...",
    "متحرک‌سازی صحنه...",
    "افزودن جزئیات نهایی...",
    "تقریباً تمام شد، در حال آماده‌سازی ویدیو...",
];

export const ImageToVideoGenerator: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('');

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError('');
            setVideoUrl(null);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !imageFile || isLoading) {
            setError("لطفا یک تصویر و یک دستور ارائه دهید.");
            return;
        }

        setIsLoading(true);
        setError('');
        setVideoUrl(null);

        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 8000);

        try {
            const base64Image = await fileToBase64(imageFile);
            const responseUrl = await geminiService.generateVideoFromImage(prompt, base64Image, imageFile.type);
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
            <h2 className="text-2xl font-semibold mb-4 text-indigo-300">متحرک سازی عکس</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="توصیف کنید که تصویر چگونه متحرک شود..."
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    disabled={isLoading || !imageFile}
                />
                <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !imageFile || !prompt}>
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
                {!isLoading && !videoUrl && imagePreview && (
                    <div>
                         <h3 className="text-lg font-semibold mb-2">تصویر انتخاب شده:</h3>
                         <img src={imagePreview} alt="Selected preview" className="w-full max-w-md mx-auto h-auto rounded-lg object-contain" />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>محدودیت استفاده (نمایشی): ۵ ویدیو در روز (مشترک با تولید ویدیو از متن).</span>
            </div>
        </div>
    );
};