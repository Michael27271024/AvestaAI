import React, { useState, useRef, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import type { TTSVoice } from '../types';
import { InfoIcon, PlayIcon } from './icons/FeatureIcons';

// Audio decoding functions from Gemini documentation
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const voices: { id: TTSVoice, name: string }[] = [
    { id: 'Zephyr', name: 'Zephyr (مردانه - آرام)' },
    { id: 'Kore', name: 'Kore (زنانه - دوستانه)' },
    { id: 'Puck', name: 'Puck (مردانه - پرانرژی)' },
    { id: 'Charon', name: 'Charon (مردانه - عمیق)' },
    { id: 'Fenrir', name: 'Fenrir (زنانه - رسمی)' },
];

export const AudioGenerator: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [voice, setVoice] = useState<TTSVoice>('Zephyr');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction (or component mount)
    // It's better to create it once.
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    // Cleanup function
    return () => {
        audioSourceRef.current?.stop();
    };
  }, []);

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;
    
    // Stop any existing playback
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
    };
    source.start();
    audioSourceRef.current = source;
    setIsPlaying(true);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setAudioBuffer(null);
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      setIsPlaying(false);
    }

    try {
        const base64Audio = await geminiService.generateSpeech(prompt, voice);
        if (audioContextRef.current) {
             const buffer = await decodeAudioData(
                decode(base64Audio),
                audioContextRef.current,
                24000,
                1,
            );
            setAudioBuffer(buffer);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">تولید صدا (Text-to-Speech)</h2>
      <p className="mb-4 text-gray-400">متن خود را وارد کنید، یک صدا انتخاب کنید و به هوش مصنوعی اجازه دهید آن را برایتان بخواند.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="متنی که می‌خواهید به صدا تبدیل شود را اینجا بنویسید..."
          className="w-full p-3 h-32 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label htmlFor="voice-select" className="text-sm">انتخاب صدا:</label>
                <select id="voice-select" value={voice} onChange={e => setVoice(e.target.value as TTSVoice)} className="bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading}>
                    {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>
            <button type="submit" className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading}>
              {isLoading ? 'در حال تولید...' : 'تولید کن'}
            </button>
        </div>
         {error && <p className="text-red-400 mt-2">{error}</p>}
      </form>
      
      <div className="flex-1 mt-6 flex flex-col items-center justify-center overflow-hidden">
        {isLoading && (
            <div className="flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-400">در حال ساخت صدا...</p>
            </div>
        )}
        {!isLoading && audioBuffer && (
            <div className="text-center animate-fade-in p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">صدای شما آماده است</h3>
                 <button onClick={playAudio} disabled={isPlaying} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:bg-gray-600 flex items-center gap-2 transition">
                    <PlayIcon className="w-5 h-5"/>
                    {isPlaying ? 'در حال پخش...' : 'پخش کن'}
                 </button>
            </div>
        )}
      </div>

       <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>محدودیت استفاده (نمایشی): ۱۰۰ تولید صدا در روز.</span>
        </div>
    </div>
  );
};
