import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import type { FC } from 'react';
import type { ChatMessage } from '../types';
import { geminiService, fileToBase64, fileToDataURL } from '../services/geminiService';
import type { Chat as ChatSession } from '@google/genai';
import { SendIcon, PaperclipIcon, XIcon } from './icons/FeatureIcons';
import { ThinkingModeToggle, ThinkingMode } from './ThinkingModeToggle';

const LoadingIndicator: FC = () => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
  </div>
);

export const Chat: FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ThinkingMode>('fast');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video' | 'audio' }[]>([]);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatSessionRef.current = geminiService.createChatSession(mode);
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
          chatSessionRef.current = geminiService.createChatSession(mode);
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
  }, [isLoading, mode]);

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-indigo-300">چت با اوستا</h2>
        <ThinkingModeToggle mode={mode} setMode={setMode} disabled={isLoading} />
      </div>
      <div className="flex-1 overflow-y-auto pl-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-bl-none' : 'bg-gray-700 text-gray-200 rounded-br-none'}`}>
               {msg.mediaPreviews && msg.mediaPreviews.length > 0 && (
                  <div className={`grid gap-2 mb-2 ${msg.mediaPreviews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {msg.mediaPreviews.map((preview, idx) => {
                        if (preview.type === 'image') {
                           return <img key={idx} src={preview.url} alt="user upload" className="rounded-lg max-w-full max-h-48 object-cover" />;
                        }
                        if (preview.type === 'video') {
                            return <video key={idx} src={preview.url} controls className="rounded-lg max-w-full max-h-48" />;
                        }
                        if (preview.type === 'audio') {
                            return <audio key={idx} src={preview.url} controls className="w-full" />;
                        }
                        return null;
                    })}
                  </div>
              )}
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="max-w-xl px-4 py-2 rounded-2xl bg-gray-700 text-gray-200 rounded-br-none">
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