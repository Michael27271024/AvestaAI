import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';
import { InfoIcon } from './icons/FeatureIcons';

export const CodeAssistant: FC = () => {
  const [inputCode, setInputCode] = useState('');
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ThinkingMode>('creative');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || !inputCode.trim() || isLoading) {
        setError("لطفاً کد و دستور خود را وارد کنید.");
        return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    
    const response = await geminiService.assistCode(inputCode, instruction, mode);
    if (response.toLowerCase().includes('خطا')) {
        setError(response);
    } else {
        setResult(response);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">دستیار کد</h2>
      <p className="mb-4 text-gray-400">کد خود را وارد کرده و به اوستا بگویید با آن چه کاری انجام دهد (مثلا: توضیح بده، به پایتون تبدیل کن، باگ‌ها را پیدا کن).</p>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        <div className="flex flex-col gap-2">
            <label htmlFor="input-code" className="text-sm font-semibold text-gray-400">کد ورودی</label>
            <textarea
                id="input-code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="کد خود را اینجا وارد کنید..."
                className="w-full flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none font-mono text-sm"
                disabled={isLoading}
            />
        </div>
         <div className="flex flex-col gap-2">
            <label htmlFor="output-code" className="text-sm font-semibold text-gray-400">خروجی</label>
            <div className="w-full flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : result ? (
                     <pre className="whitespace-pre-wrap break-words text-gray-300 text-sm">
                        <code>{result}</code>
                     </pre>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        نتیجه اینجا نمایش داده می‌شود.
                    </div>
                )}
            </div>
        </div>
      </div>
      
       <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4 mt-4">
           <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="دستور خود را اینجا وارد کنید..."
            className="flex-1 w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            disabled={isLoading}
            />
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
                <button type="submit" className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !instruction || !inputCode}>
                {isLoading ? '...' : 'اجرا کن'}
                </button>
            </div>
        </form>
         {error && <p className="text-red-400 mt-2">{error}</p>}

      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>محدودیت استفاده (نمایشی): ۵۰ پردازش کد در روز.</span>
      </div>
    </div>
  );
};
