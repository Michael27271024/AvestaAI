
import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import type { FC } from 'react';
import type { ChatMessage, TextGenerationModel, ChatSessionRecord } from '../types';
import { geminiService, fileToBase64, fileToDataURL } from '../services/geminiService';
import type { Chat as ChatSession } from '@google/genai';
import { SendIcon, PaperclipIcon, XIcon, CopyIcon, CheckIcon, TrashIcon, ChatIcon, HomeIcon, EditIcon, MenuIcon } from './icons/FeatureIcons';

const SESSIONS_STORAGE_KEY = 'avesta_chat_sessions_v5';

const LoadingIndicator: FC = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
  </div>
);

const textModels: { id: TextGenerationModel, name: string, shortName: string }[] = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', shortName: 'Pro 3.0' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash', shortName: 'Flash 3.0' },
    { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', shortName: 'Pro 2.5' },
    { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', shortName: 'Flash 2.5' },
    { id: 'gemini-2.0-pro-preview', name: 'Gemini 2.0 Pro', shortName: 'Pro 2.0' },
    { id: 'gemini-2.0-flash-preview', name: 'Gemini 2.0 Flash', shortName: 'Flash 2.0' },
];

interface CodeBlockProps {
    language: string;
    code: string;
}

const CodeBlock: FC<CodeBlockProps> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-2 rounded-lg overflow-hidden border border-gray-700 bg-gray-950/90 shadow-sm" dir="ltr">
            <div className="flex justify-between items-center px-3 py-1.5 bg-gray-900 border-b border-gray-800">
                <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">{language || 'code'}</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors">
                    {copied ? <CheckIcon className="w-3 h-3 text-green-400" /> : <CopyIcon className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
            <div className="p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

const MessageBubble: FC<{ msg: ChatMessage }> = ({ msg }) => {
    const [copied, setCopied] = useState(false);
    const handleCopyAll = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderContent = (text: string) => {
        if (!text) return null;
        const splitRegex = /(```[\w-]*\n[\s\S]*?```)/g;
        const parts = text.split(splitRegex);
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const contentMatch = part.match(/^```([\w-]*)\n([\s\S]*?)```$/);
                if (contentMatch) {
                    return <CodeBlock key={index} language={contentMatch[1]} code={contentMatch[2]} />;
                }
                return <CodeBlock key={index} language="" code={part.slice(3, -3)} />;
            }
            if (!part) return null;
            return <p key={index} className="whitespace-pre-wrap mb-1 last:mb-0 leading-relaxed">{part}</p>;
        });
    };

    return (
        <div className={`relative max-w-[85%] sm:max-w-xl px-3.5 py-2.5 rounded-2xl shadow-sm text-sm sm:text-base ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-bl-none' : 'bg-gray-800 text-gray-200 rounded-br-none border border-gray-700/50'}`}>
            {msg.mediaPreviews && msg.mediaPreviews.length > 0 && (
                <div className={`grid gap-1.5 mb-2 ${msg.mediaPreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {msg.mediaPreviews.map((preview, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-white/5">
                             {preview.type === 'image' && <img src={preview.url} alt="upload" className="w-full max-h-40 object-cover" />}
                             {preview.type === 'video' && <video src={preview.url} controls className="w-full max-h-40" />}
                             {preview.type === 'audio' && <audio src={preview.url} controls className="w-full scale-90" />}
                        </div>
                    ))}
                </div>
            )}
            <div className="leading-snug">{renderContent(msg.text)}</div>
            {msg.sender === 'ai' && msg.text && (
                <div className="flex justify-end mt-1.5 pt-1.5 border-t border-gray-700/20">
                    <button onClick={handleCopyAll} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-indigo-300 transition-colors">
                         {copied ? <CheckIcon className="w-3 h-3 text-green-400" /> : <CopyIcon className="w-3 h-3" />}
                         <span>{copied ? 'کپی شد' : 'کپی'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const Chat: FC = () => {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video' | 'audio' }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const chatSessionRef = useRef<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
    let initialSessions: ChatSessionRecord[] = [];
    if (saved) {
      try {
        initialSessions = JSON.parse(saved);
        setSessions(initialSessions);
      } catch (e) { console.error(e); }
    }

    const initialMsg = sessionStorage.getItem('initialChatMessage');
    if (initialMsg) {
      sessionStorage.removeItem('initialChatMessage');
      setTimeout(() => {
          sendMessage(initialMsg);
      }, 100);
    } else if (initialSessions.length > 0) {
      setActiveSessionId(initialSessions[0].id);
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } else {
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
    }
  }, [sessions]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setShowHistory(true);
      else setShowHistory(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeSession) {
      chatSessionRef.current = geminiService.createChatSession(activeSession.model, activeSession.messages);
    } else {
      chatSessionRef.current = null;
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeSessionId, activeSession?.model]);

  const createNewChat = () => {
    const newId = crypto.randomUUID();
    const newSession: ChatSessionRecord = {
      id: newId,
      title: 'گفتگوی جدید',
      messages: [],
      model: 'gemini-3-flash-preview',
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setInput('');
    if (window.innerWidth < 1024) setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("آیا از حذف این گفتگو اطمینان داری؟")) return;
    setSessions(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (activeSessionId === id) setActiveSessionId(filtered.length > 0 ? filtered[0].id : null);
        return filtered;
    });
  };

  const renameSession = (e: React.MouseEvent, id: string, currentTitle: string) => {
      e.stopPropagation();
      const newTitle = window.prompt("نام جدید گفتگو:", currentTitle);
      if (newTitle?.trim()) {
          setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected) {
        const newFiles = Array.from(selected);
        setFiles(prev => [...prev, ...newFiles]);
        const newPreviews = await Promise.all(newFiles.map(async (f: File) => {
            const url = await fileToDataURL(f);
            const type = f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'image';
            return { url, type: type as 'image' | 'video' | 'audio' };
        }));
        setFilePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const sendMessage = useCallback(async (text: string, attached: File[] = []) => {
      if (isLoading || (!text.trim() && attached.length === 0)) return;

      setIsLoading(true);
      let currentId = activeSessionId;
      
      // اگر نشستی فعال نیست، یکی بساز
      if (!currentId) {
          currentId = crypto.randomUUID();
          const newS: ChatSessionRecord = { 
              id: currentId, 
              title: text.slice(0, 30) || 'بدون عنوان', 
              messages: [], 
              model: 'gemini-3-flash-preview', 
              createdAt: Date.now() 
          };
          setSessions(prev => [newS, ...prev]);
          setActiveSessionId(currentId);
      }

      const previews = await Promise.all(attached.map(async (f: File) => ({
          url: await fileToDataURL(f),
          type: (f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'image') as 'image' | 'video' | 'audio'
      })));

      const userMsg: ChatMessage = { sender: 'user', text, mediaPreviews: previews.length > 0 ? previews : undefined };
      
      // اضافه کردن پیام کاربر به استیت
      setSessions(prev => prev.map(s => {
          if (s.id === currentId) {
              const newTitle = (s.title === 'گفتگوی جدید' || s.messages.length === 0) 
                  ? text.slice(0, 30) + (text.length > 30 ? '...' : '')
                  : s.title;
              return { ...s, messages: [...s.messages, userMsg], title: newTitle || s.title };
          }
          return s;
      }));

      // پاک کردن ورودی‌ها
      setInput('');
      setFiles([]);
      setFilePreviews([]);

      try {
        // بازسازی نشست با تاریخچه (بدون پیام آخری که الان فرستادیم)
        // این کار باعث می‌شود نشست همیشه با مدل درست و کلید درست کار کند
        const targetSession = sessions.find(s => s.id === currentId);
        const modelToUse = targetSession?.model || 'gemini-3-flash-preview';
        const historyToUse = targetSession?.messages || [];
        
        const session = geminiService.createChatSession(modelToUse, historyToUse);
        
        const fileParts = await Promise.all(attached.map(async (f: File) => ({
            inlineData: { mimeType: f.type, data: await fileToBase64(f) }
        })));
        
        const payload = text.trim() ? (fileParts.length > 0 ? [{ text }, ...fileParts] : text) : fileParts;
        const stream = await session.sendMessageStream({ message: payload });
        
        let aiText = '';
        const aiMsg: ChatMessage = { sender: 'ai', text: '' };
        
        // ایجاد یک جایگاه برای پیام هوش مصنوعی
        setSessions(prev => prev.map(s => {
            if (s.id === currentId) return { ...s, messages: [...s.messages, aiMsg] };
            return s;
        }));

        for await (const chunk of stream) {
            aiText += chunk.text;
            setSessions(prev => prev.map(s => {
                if (s.id === currentId) {
                    const msgs = [...s.messages];
                    msgs[msgs.length - 1] = { sender: 'ai', text: aiText };
                    return { ...s, messages: msgs };
                }
                return s;
            }));
        }
      } catch (err) {
        console.error(err);
        setSessions(prev => prev.map(s => {
            if (s.id === currentId) return { ...s, messages: [...s.messages, { sender: 'ai', text: "اوخ! رفیق سیستمم یه لحظه هنگ کرد، دوباره بگو چکار کنم؟" }] };
            return s;
        }));
      } finally {
        setIsLoading(false);
      }
  }, [isLoading, activeSessionId, sessions]);

  return (
    <div className="flex h-full overflow-hidden bg-gray-950/20 rounded-xl relative">
      <div 
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${showHistory ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setShowHistory(false)}
      />
      
      <div className={`absolute lg:relative z-50 lg:z-0 top-0 right-0 h-full bg-gray-900 border-l border-gray-800 transition-all duration-300 shadow-2xl lg:shadow-none overflow-hidden flex flex-col ${showHistory ? 'w-64 translate-x-0' : 'w-0 translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 border-b border-gray-800">
            <button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition text-sm font-bold shadow-lg shadow-indigo-500/10">
                <span>+ چت جدید</span>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
                <div key={s.id} onClick={() => { setActiveSessionId(s.id); if(window.innerWidth < 1024) setShowHistory(false); }} className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${activeSessionId === s.id ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}>
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <ChatIcon className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        <span className="truncate text-xs font-medium">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => renameSession(e, s.id, s.title)} className="p-1 hover:text-indigo-400 transition" title="تغییر نام">
                            <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => deleteSession(e, s.id)} className="p-1 hover:text-red-400 transition" title="حذف">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ))}
            {sessions.length === 0 && <p className="text-center text-[10px] text-gray-500 mt-10">تاریخچه‌ای یافت نشد</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-gray-900/10 relative">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-800/60 bg-gray-900/30 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-indigo-400 hover:text-white bg-indigo-600/10 rounded-lg lg:hidden">
                    <MenuIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-lg hidden lg:block">
                    <HomeIcon className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-gray-200 truncate text-sm sm:text-base">{activeSession?.title || 'چت با اوستا'}</h3>
            </div>
            <select value={activeSession?.model || 'gemini-3-flash-preview'} onChange={e => {
                const newModel = e.target.value as TextGenerationModel;
                setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, model: newModel} : s));
            }} className="bg-gray-800 border border-gray-700 text-[10px] sm:text-xs rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[100px] sm:max-w-none">
                {textModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-6 scroll-smooth">
            {!activeSessionId && sessions.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3 px-6 text-center animate-fade-in">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-full flex items-center justify-center animate-bounce">
                        <ChatIcon className="w-7 h-7 text-indigo-500" />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-gray-300">چطور می‌توانم کمکت کنم رفیق؟</p>
                    <button onClick={createNewChat} className="text-indigo-400 hover:text-indigo-300 underline text-sm">شروع یک گفتگوی جدید</button>
                </div>
            )}
            {activeSession?.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <MessageBubble msg={msg} />
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl bg-gray-800 text-gray-200 rounded-br-none border border-gray-700/50">
                        <LoadingIndicator />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 bg-gray-900/50 border-t border-gray-800/50 backdrop-blur-sm sticky bottom-0">
            {filePreviews.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                    {filePreviews.map((p, i) => (
                        <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-indigo-500/30">
                             <img src={p.url} className="w-full h-full object-cover" alt="preview" />
                             <button onClick={() => {
                                setFiles(prev => prev.filter((_, idx) => idx !== i));
                                setFilePreviews(prev => prev.filter((_, idx) => idx !== i));
                             }} className="absolute top-0 right-0 bg-red-500/80 p-0.5 text-white"><XIcon className="w-3 h-3"/></button>
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input, files); }} className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="relative flex-1 group">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="پیامی بنویس..." 
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-200 text-sm sm:text-base transition-all pr-10" 
                        disabled={isLoading} 
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-indigo-400 transition">
                        <PaperclipIcon className="w-5 h-5" />
                    </button>
                </div>
                <button type="submit" disabled={isLoading || (!input.trim() && files.length === 0)} className="p-2.5 sm:p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-white transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                    <SendIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
            </form>
            <p className="text-[9px] sm:text-[10px] text-center text-gray-600 mt-2 font-medium">اوستا حسن‌زاده؛ رفیق هوشمند و بی‌باک شما!</p>
        </div>
      </div>
    </div>
  );
};
