import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { InfoIcon, DownloadIcon } from './icons/FeatureIcons';

// This is a placeholder component.
// In a real application, this would require a robust backend service to handle downloads from various social media platforms,
// which is complex and needs to respect each platform's terms of service.
// For this demo, we will simulate the UI and a successful download of a placeholder video.

export const SocialDownloader: FC = () => {
    const [url, setUrl] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!url.trim() || isLoading) return;

        try {
            // Validate URL format
            new URL(url);
        } catch (_) {
            setError("لطفا یک لینک معتبر وارد کنید.");
            return;
        }

        setIsLoading(true);
        setError('');
        setResultUrl(null);
        
        // Simulate an API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
            // Placeholder logic: We're not actually fetching from the URL.
            // In a real app, this would be a call to a backend service.
            // We'll return a sample video for demonstration purposes.
            const sampleVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            const suggestedFileName = `avesta_ai_download_${Date.now()}.mp4`;
            
            setFileName(suggestedFileName);
            setResultUrl(sampleVideoUrl);

        } catch (err) {
            setError("خطا در پردازش لینک. ممکن است لینک پشتیبانی نشود یا مشکلی در سرویس وجود داشته باشد.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-2xl font-semibold mb-2 text-indigo-300">دانلود از شبکه‌های اجتماعی</h2>
            <p className="mb-4 text-gray-400">لینک ویدیو یا پست مورد نظر را وارد کنید تا لینک دانلود آن آماده شود. (این یک نسخه نمایشی است)</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="لینک از اینستاگرام، یوتیوب، تیک‌تاک و..."
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    disabled={isLoading}
                />
                <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !url.trim()}>
                    {isLoading ? 'در حال پردازش...' : 'دریافت لینک'}
                </button>
                {error && <p className="text-red-400 mt-2">{error}</p>}
            </form>

            <div className="mt-6 flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg text-indigo-200">در حال جستجوی لینک دانلود...</p>
                    </div>
                )}
                {!isLoading && resultUrl && (
                    <div className="max-w-xl mx-auto text-center">
                        <h3 className="text-lg font-semibold mb-4">لینک دانلود شما آماده است!</h3>
                        <video src={resultUrl} controls className="w-full rounded-lg mb-4"></video>
                        <a 
                            href={resultUrl} 
                            download={fileName}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition font-semibold"
                        >
                            <DownloadIcon />
                            دانلود فایل
                        </a>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>این ابزار برای اهداف نمایشی است. لطفاً به قوانین کپی‌رایت و شرایط استفاده از هر پلتفرم احترام بگذارید.</span>
            </div>
        </div>
    );
};
