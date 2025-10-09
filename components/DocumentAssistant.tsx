import React, { useState } from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';
import { InfoIcon } from './icons/FeatureIcons';

export const DocumentAssistant: FC = () => {
  const [documentContent, setDocumentContent] = useState('');
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ThinkingMode>('creative');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) {
        setError("لطفاً یک دستور برای پردازش وارد کنید.");
        return;
    }

    setIsLoading(true);
    setError('');
    try {
        const response = await geminiService.assistDocument(documentContent, instruction, mode);
        if (response.toLowerCase().includes('خطا')) {
            setError(response);
        } else {
            setDocumentContent(response);
            setInstruction('');
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "خطایی در پردازش سند رخ داد.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt') && !file.name.endsWith('.md') && !file.name.endsWith('.csv')) {
        setError('لطفا یک فایل متنی (txt, md, csv) انتخاب کنید. پشتیبانی از فرمت‌های دیگر در آینده اضافه خواهد شد.');
        return;
    }
    
    const fileProcessing = async () => {
        setError('');
        try {
            const text = await file.text();
            setDocumentContent(text);
        } catch (err) {
            console.error(err);
            setError('خطا در خواندن فایل.');
        }
    };
    
    await fileProcessing();
  };


  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">دستیار اسناد</h2>
      <p className="mb-4 text-gray-400">متن خود را در کادر اصلی بنویسید یا یک فایل متنی بارگذاری کنید. سپس در کادر دستور، بگویید چه تغییری می‌خواهید ایجاد کنید (مثلا: خلاصه‌اش کن، غلط‌های املایی را بگیر، رسمی‌تر بنویس).</p>
      
      <div className="flex-1 flex flex-col gap-4">
        <textarea
          value={documentContent}
          onChange={(e) => setDocumentContent(e.target.value)}
          placeholder="متن سند خود را اینجا بنویسید یا جای‌گذاری کنید..."
          className="w-full flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          disabled={isLoading}
        />
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
           <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="دستور خود را اینجا وارد کنید..."
            className="flex-1 w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            disabled={isLoading}
            />
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" />
                <label htmlFor="file-upload" className="cursor-pointer px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition">بارگذاری فایل</label>
                <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
                <button type="submit" className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !instruction}>
                {isLoading ? '...' : 'اجرا کن'}
                </button>
            </div>
        </form>
         {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>محدودیت استفاده (نمایشی): ۱۰۰ پردازش در روز.</span>
      </div>
    </div>
  );
};