import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { geminiService, fileToBase64 } from '../services/geminiService';
import { InfoIcon, XIcon, DownloadIcon } from './icons/FeatureIcons';

export const ImageEditor: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImages, setOriginalImages] = useState<File[]>([]);
    const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);
    const [generatedResult, setGeneratedResult] = useState<{ text: string | null, image: string | null } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        // Cleanup function to revoke object URLs
        return () => {
            originalImagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [originalImagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            setOriginalImages(prev => [...prev, ...newFiles]);

            // FIX: Explicitly type 'file' as 'File' to help TypeScript's type inference.
            // This resolves an issue where 'file' could be inferred as 'unknown', which is not assignable to `URL.createObjectURL`.
            const newPreviews = newFiles.map((file: File) => URL.createObjectURL(file));
            setOriginalImagePreviews(prev => [...prev, ...newPreviews]);
            
            setError('');
            setGeneratedResult(null);
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setOriginalImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setOriginalImagePreviews(prev => {
            const urlToRevoke = prev[indexToRemove];
            if (urlToRevoke) {
                URL.revokeObjectURL(urlToRevoke);
            }
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || originalImages.length === 0 || isLoading) {
            setError("لطفا یک تصویر و یک دستور ارائه دهید.");
            return;
        }

        setIsLoading(true);
        setError('');
        setGeneratedResult(null);

        try {
            const imagePayload = await Promise.all(
                originalImages.map(async (file) => ({
                    base64ImageData: await fileToBase64(file),
                    mimeType: file.type,
                }))
            );

            const response = await geminiService.generateFromImages(prompt, imagePayload);
            setGeneratedResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadImage = (dataUrl: string) => {
        if (!dataUrl) return;

        const mimeTypeMatch = dataUrl.match(/data:(image\/.*?);/);
        const extension = mimeTypeMatch ? mimeTypeMatch[1].split('/')[1] : 'png';

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `avesta-ai-edited-image-${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-2xl font-semibold mb-2 text-indigo-300">ویرایشگر عکس</h2>
            <p className="mb-4 text-gray-400">یک یا چند عکس آپلود کنید و با دستورات متنی آن‌ها را ویرایش، ترکیب یا تحلیل کنید.</p>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                {/* Input Panel */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">۱. آپلود عکس</label>
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                                disabled={isLoading}
                            />
                        </div>
                        {originalImagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-gray-800/50 rounded-lg">
                                {originalImagePreviews.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img src={preview} alt={`Original ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                                        <button type="button" onClick={() => handleRemoveImage(index)} className="absolute -top-1 -left-1 bg-gray-900 text-gray-400 hover:text-white rounded-full p-1 shadow-md" aria-label="Remove image">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-300 mb-2">۲. دستور شما</label>
                            <textarea
                                id="prompt-input"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="مثال: یک کلاه خنده‌دار روی سر شخص در عکس اول بگذار."
                                className="w-full p-3 h-28 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                                disabled={isLoading}
                            />
                        </div>
                        <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || originalImages.length === 0 || !prompt.trim()}>
                            {isLoading ? 'در حال پردازش...' : 'اجرا کن'}
                        </button>
                    </form>
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                </div>

                {/* Output Panel */}
                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">نتیجه</h3>
                    <div className="flex-1 border border-gray-700 rounded-lg bg-gray-900/50 p-4 flex flex-col items-center justify-center overflow-y-auto">
                        {isLoading && (
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="mt-4 text-gray-400">در حال پردازش تصویر...</p>
                            </div>
                        )}
                        {!isLoading && !generatedResult && !error && (
                            <p className="text-gray-500">نتیجه اینجا نمایش داده می‌شود.</p>
                        )}
                        {generatedResult && (
                            <div className="space-y-4 w-full">
                                {generatedResult.image && (
                                    <div className="relative group w-full flex justify-center">
                                        <img 
                                            src={generatedResult.image} 
                                            alt="Generated result" 
                                            className="max-w-full h-auto max-h-[60vh] object-contain rounded-lg cursor-pointer"
                                            onClick={() => setZoomedImage(generatedResult.image)}
                                        />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent zoom
                                                    handleDownloadImage(generatedResult.image!);
                                                }}
                                                className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 backdrop-blur-sm transition-transform transform active:scale-90"
                                                aria-label="دانلود تصویر"
                                                title="دانلود با کیفیت اصلی"
                                            >
                                                <DownloadIcon className="w-8 h-8"/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {generatedResult.text && (
                                    <div className="p-3 bg-gray-800 rounded-lg">
                                        <p className="whitespace-pre-wrap text-gray-300">{generatedResult.text}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {zoomedImage && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <img src={zoomedImage} alt="Zoomed result" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white" aria-label="بستن">
                        <XIcon className="w-8 h-8" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>محدودیت استفاده (نمایشی): ۲۰ ویرایش در روز.</span>
            </div>
        </div>
    );
};
