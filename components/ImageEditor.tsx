
import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { geminiService, fileToBase64 } from '../services/geminiService';
import { InfoIcon, XIcon, DownloadIcon, EditIcon } from './icons/FeatureIcons';
import type { ImageEditingModel } from '../types';

const imageEditModels: { id: ImageEditingModel, name: string }[] = [
    { id: 'gemini-2.5-flash-image' as any, name: 'Gemini 2.5 Flash Image' },
    { id: 'gemini-3-pro-image-preview' as any, name: 'Gemini 3.0 Pro Image' },
];

export const ImageEditor: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImages, setOriginalImages] = useState<File[]>([]);
    const [originalImagePreviews, setOriginalImagePreviews] = useState<string[]>([]);
    const [generatedResult, setGeneratedResult] = useState<{ text: string | null, image: string | null } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [model, setModel] = useState<ImageEditingModel>('gemini-2.5-flash-image' as any);

    useEffect(() => {
        return () => originalImagePreviews.forEach(url => URL.revokeObjectURL(url));
    }, [originalImagePreviews]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles: File[] = Array.from(files);
            setOriginalImages(prev => [...prev, ...newFiles]);
            setOriginalImagePreviews(prev => [...prev, ...newFiles.map((f: File) => URL.createObjectURL(f))]);
            setError('');
        }
    };

    const handleRemoveImage = (idx: number) => {
        setOriginalImages(prev => prev.filter((_, i) => i !== idx));
        setOriginalImagePreviews(prev => {
            URL.revokeObjectURL(prev[idx]);
            return prev.filter((_, i) => i !== idx);
        });
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || originalImages.length === 0 || isLoading) return;

        setIsLoading(true);
        setError('');
        setGeneratedResult(null);

        try {
            const imagePayload = await Promise.all(originalImages.map(async (file) => ({
                base64ImageData: await fileToBase64(file),
                mimeType: file.type,
            })));
            const response = await geminiService.generateFromImages(prompt, imagePayload, model);
            setGeneratedResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطای ناشناخته.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in p-2">
            <h2 className="text-2xl font-bold mb-2 text-indigo-300">تحلیل و ویرایش هوشمند عکس</h2>
            <p className="mb-6 text-sm text-gray-400">عکس آپلود کن و از اوستا بخواه برات تغییرش بده.</p>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
                <div className="flex flex-col gap-5 overflow-y-auto pr-2">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800 space-y-4">
                            <label className="block text-sm font-bold text-gray-300">۱. آپلود تصاویر</label>
                            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 cursor-pointer" />
                            
                            {originalImagePreviews.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 pt-2">
                                    {originalImagePreviews.map((p, i) => (
                                        <div key={i} className="relative aspect-square">
                                            <img src={p} className="w-full h-full object-cover rounded-xl border border-gray-700" />
                                            <button type="button" onClick={() => handleRemoveImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800 space-y-4">
                            <label className="block text-sm font-bold text-gray-300">۲. تنظیمات مدل</label>
                            <select value={model} onChange={e => setModel(e.target.value as ImageEditingModel)} className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-indigo-300 focus:outline-none">
                                {imageEditModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-800 space-y-4">
                            <label className="block text-sm font-bold text-gray-300">۳. دستور ویرایش</label>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="مثلاً: یک کلاه قرمز به تصویر اضافه کن یا تصویر را به سبک آبرنگ تغییر بده." className="w-full p-4 h-32 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-gray-200" />
                        </div>

                        <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-xl font-bold shadow-xl shadow-indigo-600/20 transition active:scale-95" disabled={isLoading || originalImages.length === 0 || !prompt.trim()}>
                            {isLoading ? 'در حال پردازش...' : 'اعمال تغییرات'}
                        </button>
                    </form>
                    {error && <p className="text-red-400 text-center bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>}
                </div>

                <div className="flex flex-col h-full bg-gray-950/40 rounded-3xl border border-gray-800 p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold text-indigo-300 mb-4 border-b border-gray-800 pb-2">نتیجه ویرایش:</h3>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {isLoading && (
                            <div className="text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-gray-400 text-sm animate-pulse">در حال اعمال جادوی بصری...</p>
                            </div>
                        )}
                        {!isLoading && !generatedResult && !error && (
                            <div className="text-center space-y-3 opacity-30">
                                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                                    <EditIcon className="w-10 h-10" />
                                </div>
                                <p className="text-sm">تصویری رندر نشده است.</p>
                            </div>
                        )}
                        {generatedResult && (
                            <div className="w-full space-y-6 animate-slide-up">
                                {generatedResult.image && (
                                    <div className="relative group rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black">
                                        <img src={generatedResult.image} className="w-full h-auto object-contain" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = generatedResult.image!;
                                                a.download = 'avesta-edited.png';
                                                a.click();
                                            }} className="p-4 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md">
                                                <DownloadIcon className="w-8 h-8 text-white"/>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {generatedResult.text && (
                                    <div className="p-5 bg-gray-900 border border-gray-800 rounded-2xl text-gray-200 leading-relaxed text-sm">
                                        {generatedResult.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
