
import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import type { FC } from 'react';
import type { ChatMessage, TextGenerationModel } from '../types';
import { geminiService, fileToBase64, fileToDataURL } from '../services/geminiService';
import type { Chat as ChatSession } from '@google/genai';
import { SendIcon, PaperclipIcon, XIcon, CopyIcon, CheckIcon, TrashIcon } from './icons/FeatureIcons';

const STORAGE_KEY = 'avesta_chat_history';

const LoadingIndicator: FC = () => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
  </div>
);

const textModels: { id: TextGenerationModel, name: string }[] = [
    { id: 'gemini-flash-lite-latest', name: 'Gemini 2.0 Flash Lite (سبک و سریع)' },
    { id: 'gemini-flash-latest', name: 'Gemini 2.0 Flash (استاندارد جدید)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (متعادل)' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (قدرتمندترین)' },
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
        <div className="my-3 rounded-lg overflow-hidden border border-gray-600 bg-gray-950/80 shadow-md">
            <div className="flex justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-700">
                <span className="text-xs text-indigo-300 font-mono font-semibold">{language || 'code'}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                    {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                    <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
                </button>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300 whitespace-pre">
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
                    const language = contentMatch[1];
                    const code = contentMatch[2];
                    return <CodeBlock key={index} language={language} code={code} />;
                }
                 const content = part.slice(3, -3);
                 return <CodeBlock key={index} language="" code={content} />;
            }
            if (!part) return null;
            return <p key={index} className="whitespace-pre-wrap mb-1 leading-relaxed">{part}</p>;
        });
    };

    return (
        <div className={`relative max-w-xl px-5 py-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-bl-none' : 'bg-gray-800 text-gray-200 rounded-br-none border border-gray-700/50'}`}>
            {msg.mediaPreviews && msg.mediaPreviews.length > 0 && (
                <div className={`grid gap-2 mb-3 ${msg.mediaPreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {msg.mediaPreviews.map((preview, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden">
                             {preview.type === 'image' && <img src={preview.url} alt="user upload" className="w-full max-h-48 object-cover" />}
                             {preview.type === 'video' && <video src={preview.url} controls className="w-full max-h-48" />}
                             {preview.type === 'audio' && <audio src={preview.url} controls className="w-full" />}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="text-sm sm:text-base">
                {renderContent(msg.text)}
            </div>

            {msg.sender === 'ai' && msg.text && (
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-700/30">
                    <button 
                        onClick={handleCopyAll} 
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-300 transition-colors opacity-70 hover:opacity-100"
                        title="کپی کل متن پیام"
                    >
                         {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                         <span>{copied ? 'کپی شد!' : 'کپی متن'}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export const Chat: FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<TextGenerationModel>('gemini-2.5-flash');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video' | 'audio' }[]>([]);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setMessages(parsedHistory);
        // Initialize chat session with history
        chatSessionRef.current = geminiService.createChatSession(model, parsedHistory);
      } catch (e) {
        console.error("Failed to load history", e);
        chatSessionRef.current = geminiService.createChatSession(model);
      }
    } else {
      chatSessionRef.current = geminiService.createChatSession(model);
    }
  }, []);

  // Sync messages with localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Handle model changes
  useEffect(() => {
    chatSessionRef.current = geminiService.createChatSession(model, messages);
  }, [model]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const clearHistory = () => {
    if (window.confirm("آیا از پاک کردن کل تاریخچه چت اطمینان دارید؟")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      chatSessionRef.current = geminiService.createChatSession(model);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
        const newFiles = Array.from(selectedFiles);
        setFiles(prev => [...prev, ...newFiles]);

        try {
            const newPreviews = await Promise.all(
                newFiles.map(async (file: File) => {
                    const url = await fileToDataURL(file);
                    let type: 'image' | 'video' | 'audio' = 'image';
                    if (file.type.startsWith('video/')) {
                        type = 'video';
                    } else if (file.type.startsWith('audio/')) {
                        type = 'audio';
                    }
                    return { url, type };
                })
            );
            setFilePreviews(prev => [...prev, ...newPreviews]);
        } catch (error) {
            console.error("Error creating file previews:", error);
        }
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
      setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
      setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };
  
  const sendMessage = useCallback(async (messageText: string, attachedFiles: File[] = []) => {
      if (isLoading) return;

      const previews = attachedFiles.length > 0 ? await Promise.all(
          attachedFiles.map(async (file: File) => {
              const url = await fileToDataURL(file);
              let type: 'image' | 'video' | 'audio' = 'image';
              if (file.type.startsWith('video/')) type = 'video';
              else if (file.type.startsWith('audio/')) type = 'audio';
              return { url, type };
          })
      ) : [];

      const userMessage: ChatMessage = {
          sender: 'user',
          text: messageText,
          ...(previews.length > 0 && { mediaPreviews: previews }),
      };
      setMessages(prev => [...prev, userMessage]);

      setInput('');
      setFiles([]);
      setFilePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setIsLoading(true);

      try {
        if (!chatSessionRef.current) {
          chatSessionRef.current = geminiService.createChatSession(model, messages);
        }
        
        let messagePayload: string | (object)[];

        if (attachedFiles.length > 0) {
            const fileParts = await Promise.all(
                attachedFiles.map(async (file: File) => {
                    const base64Data = await fileToBase64(file);
                    return {
                        inlineData: { mimeType: file.type, data: base64Data },
                    };
                })
            );
            messagePayload = messageText.trim() ? [{ text: messageText }, ...fileParts] : [...fileParts];
        } else {
            messagePayload = messageText;
        }

        const stream = await chatSessionRef.current.sendMessageStream({ message: messagePayload });

        let aiResponseText = '';
        setMessages(prev => [...prev, { sender: 'ai', text: '' }]);

        for await (const chunk of stream) {
          aiResponseText += chunk.text;
          setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { sender: 'ai', text: aiResponseText };
              return newMessages;
          });
        }
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { sender: 'ai', text: "متاسفانه خطایی رخ داد." }]);
      } finally {
        setIsLoading(false);
      }
  }, [isLoading, model, messages]);

  useEffect(() => {
    const initialMessage = sessionStorage.getItem('initialChatMessage');
    if (initialMessage) {
        sessionStorage.removeItem('initialChatMessage');
        sendMessage(initialMessage);
    }
  }, [sendMessage]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && files.length === 0) || isLoading) return;
    sendMessage(input, files);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-indigo-300">چت با اوستا</h2>
          {messages.length > 0 && (
            <button 
              onClick={clearHistory}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="پاک کردن تاریخچه"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
             <select 
                value={model} 
                onChange={e => setModel(e.target.value as TextGenerationModel)} 
                className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                disabled={isLoading}
            >
                {textModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pl-2 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <MessageBubble msg={msg} />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="max-w-xl px-5 py-3 rounded-2xl bg-gray-800 text-gray-200 rounded-br-none border border-gray-700/50">
                <LoadingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4">
        {filePreviews.length > 0 && (
            <div className="flex overflow-x-auto gap-2 mb-2 p-2 bg-gray-700/50 rounded-lg">
                {filePreviews.map((preview, index) => (
                    <div key={index} className="relative flex-shrink-0">
                        {preview.type === 'image' && <img src={preview.url} alt="Preview" className="h-24 w-24 object-cover rounded-md" />}
                        {preview.type === 'video' && <video src={preview.url} className="h-24 w-24 object-cover rounded-md" />}
                        {preview.type === 'audio' && (
                             <div className="h-24 w-48 flex flex-col items-center justify-center bg-gray-800 rounded-md p-2">
                                <span className="text-xs text-gray-400 truncate w-full text-center">{(files[index]?.name) || 'audio file'}</span>
                                <audio src={preview.url} controls className="w-full mt-2" />
                             </div>
                        )}
                        <button onClick={() => handleRemoveFile(index)} className="absolute -top-2 -left-2 bg-gray-900 text-gray-400 hover:text-white rounded-full p-1 shadow-lg" aria-label="حذف فایل">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button type="submit" className="p-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition" disabled={isLoading}>
            <SendIcon />
            </button>
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            disabled={isLoading}
            />
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*"
                multiple
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition" aria-label="پیوست کردن فایل">
                <PaperclipIcon />
            </button>
        </form>
      </div>
    </div>
  );
};
