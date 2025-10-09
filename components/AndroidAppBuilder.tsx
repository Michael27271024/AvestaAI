import React, { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import type { CodeFile } from '../types';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';
import { InfoIcon } from './icons/FeatureIcons';

const languageOptions = [
    { value: 'compose', label: 'Jetpack Compose' },
    { value: 'xml', label: 'XML + Kotlin' },
    { value: 'flutter', label: 'Flutter (Dart)' }
];

export const AndroidAppBuilder: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [files, setFiles] = useState<CodeFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<ThinkingMode>('creative');
    const [language, setLanguage] = useState('compose');
    const [activeFile, setActiveFile] = useState<CodeFile | null>(null);
    const [explanation, setExplanation] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [editInstruction, setEditInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (files.length > 0) {
            const explanationFile = files.find(f => f.name.toLowerCase().includes('explanation.md') || f.name.toLowerCase().includes('readme.md'));
            setExplanation(explanationFile ? explanationFile.content : 'توضیحات این پروژه یافت نشد.');
            
            const firstCodeFile = files.find(f => !f.name.toLowerCase().includes('explanation.md') && !f.name.toLowerCase().includes('readme.md'));
            setActiveFile(firstCodeFile || files[0]);
        }
    }, [files]);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setFiles([]);
        setError('');
        setActiveFile(null);
        setExplanation('');
        setEditInstruction('');
        
        try {
            const responseFiles = await geminiService.generateCodeProject(prompt, 'android', language, mode);
            setFiles(responseFiles);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editInstruction.trim() || isEditing) return;

        setIsEditing(true);
        setError('');

        try {
            const responseFiles = await geminiService.editCodeProject(files, editInstruction, 'android', language, mode);
            setFiles(responseFiles);
            setEditInstruction(''); // Clear input on success
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during edit.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleCopy = () => {
        if (!activeFile) return;
        navigator.clipboard.writeText(activeFile.content).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-2xl font-semibold mb-2 text-indigo-300">سازنده اپ اندروید</h2>
            <p className="mb-4 text-gray-400">یک صفحه از اپلیکیشن را توصیف کنید تا "اوستا" کد آن را برایتان تولید کند.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="مثال: یک صفحه لاگین با دو فیلد برای نام کاربری و رمز عبور و یک دکمه ورود."
                    className="w-full p-3 h-24 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                    disabled={isLoading || isEditing}
                />
                <div className="flex flex-wrap items-center gap-4">
                    <button type="submit" className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || isEditing}>
                        {isLoading ? 'در حال ساخت...' : 'بساز'}
                    </button>
                     <div className="flex items-center gap-2">
                        <label htmlFor="language-select" className="text-sm font-medium text-gray-300">تکنولوژی:</label>
                        <select id="language-select" value={language} onChange={e => setLanguage(e.target.value)} disabled={isLoading || isEditing} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {languageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading || isEditing} />
                </div>
                {error && <p className="text-red-400 mt-2">{error}</p>}
            </form>

            {files.length > 0 && !isLoading && (
                <form onSubmit={handleEditSubmit} className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 flex flex-col gap-3 animate-fade-in">
                    <h3 className="text-lg font-semibold text-indigo-300">ویرایش پروژه</h3>
                    <textarea
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder="تغییرات مورد نظر خود را توصیف کنید. مثلا: یک فیلد برای تکرار رمز عبور اضافه کن."
                        className="w-full p-3 h-20 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                        disabled={isEditing}
                    />
                    <button type="submit" className="self-start px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isEditing || !editInstruction.trim()}>
                        {isEditing ? 'در حال اعمال...' : 'اعمال تغییرات'}
                    </button>
                </form>
            )}

            <div className="mt-6 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Explanation Panel */}
                <div className="flex flex-col overflow-hidden">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-200 flex-shrink-0">توضیحات</h3>
                    </div>
                    <div className="flex-1 border border-gray-700 rounded-lg bg-gray-900/80 p-4 overflow-y-auto">
                        {isLoading || isEditing ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="ml-4 text-gray-400">{isEditing ? 'در حال اعمال تغییرات...' : 'در حال ساخت اپ...'}</span>
                            </div>
                        ) : explanation ? (
                            <pre className="text-sm whitespace-pre-wrap break-words text-gray-300">{explanation}</pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 p-4 text-center">
                                توضیحات پروژه اینجا نمایش داده می‌شود.
                            </div>
                        )}
                    </div>
                </div>

                {/* Files Panel */}
                 <div className="flex flex-col overflow-hidden">
                    <h3 className="text-lg font-semibold mb-2 text-gray-200 flex-shrink-0">فایل‌های پروژه</h3>
                    <div className="flex-1 flex flex-col border border-gray-700 rounded-lg bg-gray-900/80 overflow-hidden">
                        {isLoading && !files.length ? (
                           <div className="flex items-center justify-center h-full text-gray-500">...</div>
                        ) : files.length > 0 ? (
                            <>
                                <div className="flex-shrink-0 flex items-center border-b border-gray-700 bg-gray-950/50">
                                    <div className="flex-1 overflow-x-auto whitespace-nowrap p-1">
                                    {files.map((file) => (
                                        <button key={file.name} onClick={() => setActiveFile(file)} className={`px-3 py-1.5 text-xs rounded-md mr-1 transition ${activeFile?.name === file.name ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                                            {file.name}
                                        </button>
                                    ))}
                                    </div>
                                </div>
                                <div className="flex-1 relative overflow-auto p-1">
                                     <button onClick={handleCopy} className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold z-10">
                                        {copySuccess ? 'کپی شد!' : 'کپی'}
                                    </button>
                                    <pre className="text-sm whitespace-pre-wrap break-words h-full">
                                        <code className={`language-${activeFile?.language} text-gray-300`}>{activeFile?.content}</code>
                                    </pre>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 p-4 text-center">
                                فایل‌های کد شما اینجا نمایش داده می‌شوند.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>محدودیت استفاده (نمایشی): ۲۰ پروژه در روز.</span>
            </div>
        </div>
    );
};