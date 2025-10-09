import React, { useState, useCallback, useEffect } from 'react';
import type { FC, ChangeEvent } from 'react';
import { geminiService, fileToDataURL } from '../services/geminiService';
import { InfoIcon, UploadIcon, XIcon } from './icons/FeatureIcons';

export const SongIdentifier: FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [videoPreview, setVideoPreview] = useState<string>('');

  const cleanup = useCallback(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  }, [videoPreview]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      cleanup();
      setVideoFile(file);
      setResult('');
      setError('');
      try {
        const url = await fileToDataURL(file);
        setVideoPreview(url);
      } catch (err) {
        setError("خطا در ایجاد پیش‌نمایش ویدیو.");
      }
    }
  };
  
  const handleRemoveVideo = () => {
      cleanup();
      setVideoFile(null);
      setVideoPreview('');
      setResult('');
      setError('');
  }

  const handleSubmit = async () => {
    if (!videoFile || isLoading) return;

    setIsLoading(true);
    setError('');
    setResult('');
    
    try {
        setLoadingStep("در حال تحلیل صدای ویدیو...");
        const response = await geminiService.identifySongFromVideo(videoFile);
        
        // Simulate the second step for user feedback
        await new Promise(res => setTimeout(res, 1500)); 
        setLoadingStep("در حال جستجو برای آهنگ...");

        if (response.toLowerCase().includes('خطا') || response.toLowerCase().includes('could not identify')) {
            setError(response);
        } else {
            setResult(response);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.');
    } finally {
        setIsLoading(false);
        setLoadingStep('');
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">یابنده آهنگ</h2>
      <p className="mb-4 text-gray-400">یک ویدیو از گالری خود انتخاب کنید تا اوستا با تحلیل هوشمند صدای آن، آهنگ را برایتان پیدا کند.</p>
      
        <div className="w-full">
            {!videoFile ? (
                <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/80 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">برای انتخاب ویدیو کلیک کنید</span></p>
                        <p className="text-xs text-gray-500">فایل ویدیویی (MP4, MOV, WEBM)</p>
                    </div>
                    <input id="video-upload" type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
            ) : (
                <div className="relative w-full max-w-md mx-auto">
                    <video src={videoPreview} controls className="w-full rounded-lg shadow-lg"></video>
                     <button onClick={handleRemoveVideo} className="absolute -top-2 -right-2 bg-gray-900 text-gray-400 hover:text-white rounded-full p-1.5 shadow-lg" aria-label="Remove video">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>

        <button onClick={handleSubmit} className="self-center mt-4 px-8 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !videoFile}>
          {isLoading ? 'در حال جستجو...' : 'پیدا کن'}
        </button>

       <div className="mt-6 flex-1 overflow-y-auto pr-2">
        {error && !isLoading && <p className="text-red-400 text-center mt-2">{error}</p>}
        {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-indigo-200">{loadingStep}</p>
            </div>
        )}
        {!isLoading && result && (
          <div className="p-4 bg-gray-800 rounded-lg text-center animate-fade-in">
              <h3 className="text-lg font-semibold mb-2 text-indigo-200">آهنگ شناسایی شده:</h3>
              <p className="text-xl font-bold text-white mb-4">{result}</p>
              <p className="text-sm text-gray-400">برای پخش، این نام را در بخش "جستجوی آهنگ" وارد کنید.</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>این ابزار از یک فرآیند دو مرحله‌ای هوشمند (تحلیل صوتی و جستجوی وب) برای افزایش دقت استفاده می‌کند.</span>
      </div>
    </div>
  );
};