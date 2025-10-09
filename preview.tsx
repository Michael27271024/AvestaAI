import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import pako from 'pako';
import type { CodeFile } from './types';

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

const PreviewApp: React.FC = () => {
    const [files, setFiles] = useState<CodeFile[] | null>(null);
    const [error, setError] = useState<string>('');
    const [projectType, setProjectType] = useState<'web' | 'android' | 'unknown'>('unknown');
    const [activeFile, setActiveFile] = useState<CodeFile | null>(null);

    useEffect(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const sharedData = searchParams.get('share');
            if (!sharedData) {
                setError('داده‌ای برای نمایش یافت نشد.');
                return;
            }

            const decodedData = decodeURIComponent(sharedData);
            const compressed = base64ToUint8Array(decodedData);
            const jsonString = pako.inflate(compressed, { to: 'string' });
            const parsedFiles: CodeFile[] = JSON.parse(jsonString);

            if (!Array.isArray(parsedFiles) || parsedFiles.length === 0) {
                 setError('فرمت داده اشتراک‌گذاری شده نامعتبر است.');
                 return;
            }
            
            setFiles(parsedFiles);

            if (parsedFiles.some(f => f.name.endsWith('index.html'))) {
                setProjectType('web');
            } else if (parsedFiles.some(f => ['kotlin', 'xml', 'dart'].includes(f.language))) {
                setProjectType('android');
                const firstCodeFile = parsedFiles.find(f => !f.name.toLowerCase().includes('explanation.md')) || parsedFiles[0];
                setActiveFile(firstCodeFile);
            } else {
                setProjectType('unknown');
                setError('نوع پروژه قابل تشخیص نیست.');
            }
        } catch (err) {
            console.error(err);
            setError('خطا در بارگذاری پیش‌نمایش. ممکن است لینک ناقص یا خراب باشد.');
        }
    }, []);

    const renderContent = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">خطا</h2>
                    <p className="text-gray-300">{error}</p>
                </div>
            );
        }

        if (!files) {
             return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
             );
        }

        if (projectType === 'web') {
            const indexFile = files.find(f => f.name.endsWith('index.html'));
            if (!indexFile) {
                return <div className="p-4 text-red-400">فایل index.html برای پیش‌نمایش یافت نشد.</div>;
            }
            return (
                <iframe
                    srcDoc={indexFile.content}
                    title="Project Preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                />
            );
        }
        
        if (projectType === 'android') {
             return (
                <div className="flex flex-col h-full bg-gray-900/80">
                    <div className="flex-shrink-0 flex items-center border-b border-gray-700 bg-gray-950/50">
                        <div className="flex-1 overflow-x-auto whitespace-nowrap p-1">
                        {files.map((file) => (
                            <button key={file.name} onClick={() => setActiveFile(file)} className={`px-3 py-1.5 text-xs rounded-md mr-1 transition ${activeFile?.name === file.name ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                                {file.name}
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="flex-1 relative overflow-auto p-4">
                        <pre className="text-sm whitespace-pre-wrap break-words h-full">
                            <code className={`language-${activeFile?.language} text-gray-300`}>{activeFile?.content}</code>
                        </pre>
                    </div>
                </div>
            );
        }

        return null;
    };
    
    return (
        <div className="flex flex-col h-screen">
            <header className="flex-shrink-0 flex items-center justify-between p-3 bg-gray-950/80 backdrop-blur-sm border-b border-gray-700/50">
                 <h1 className="text-xl font-bold logo-font">Avesta AI</h1>
                 <p className="text-sm text-gray-400">پیش‌نمایش پروژه</p>
            </header>
            <main className="flex-1 overflow-hidden">
                {renderContent()}
            </main>
        </div>
    );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<PreviewApp />);
