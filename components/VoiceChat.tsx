import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
// FIX: Alias the imported `Blob` type to `GeminiBlob` to avoid conflict with the global `Blob` type.
import { GoogleGenAI, LiveServerMessage, Modality, type Blob as GeminiBlob } from "@google/genai";
import { MicrophoneIcon, CameraIcon } from './icons/FeatureIcons';

// Base64 encoding/decoding and audio processing functions from Gemini documentation
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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


// This component has been refactored to use the Gemini Live API for real-time audio and video streaming.
export const VoiceChat: FC = () => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');

  // Refs
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextAudioStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  // Video Streaming Refs
  const frameIntervalRef = useRef<number | null>(null);
  const FRAME_RATE = 5; // Send 5 frames per second
  const JPEG_QUALITY = 0.7;

  // Initialize AI instance
  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      setError("کلید API تعریف نشده است.");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentInput, currentOutput]);

  const stopCamera = useCallback(() => {
    if (frameIntervalRef.current) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    // Only stop video tracks, keep audio track from the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.kind === 'video') {
            track.stop();
            streamRef.current?.removeTrack(track);
        }
      });
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, []);
  
  const cleanup = useCallback(() => {
    stopCamera();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromiseRef.current = null;
    for (const source of audioSourcesRef.current) {
        try {
            source.stop();
        } catch(e) {
            console.warn("Error stopping audio source:", e);
        }
    }
    audioSourcesRef.current.clear();
  }, [stopCamera]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob as base64 string."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const toggleConnection = async () => {
    if (isConnected) {
      sessionPromiseRef.current?.then(session => session.close());
      cleanup();
      setIsConnected(false);
      setIsCameraOn(false);
      return;
    }

    if (!aiRef.current) {
      setError("سرویس هوش مصنوعی آماده نیست.");
      return;
    }
    
    setError('');
    setIsConnected(true);
    setMessages([]);
    setCurrentInput('');
    setCurrentOutput('');

    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = audioStream;

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContextRef.current!.createMediaStreamSource(audioStream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              // FIX: Use the aliased `GeminiBlob` type to prevent a type collision with the browser's global `Blob` type.
              const pcmBlob: GeminiBlob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
              setCurrentInput(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentOutput(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              const fullInput = currentInput + (message.serverContent.inputTranscription?.text || '');
              const fullOutput = currentOutput + (message.serverContent.outputTranscription?.text || '');
              if(fullInput.trim() || fullOutput.trim()) {
                 setMessages(prev => [...prev, ...(fullInput.trim() ? [{ role: 'user' as const, text: fullInput }] : []), ...(fullOutput.trim() ? [{ role: 'model' as const, text: fullOutput }] : [])]);
              }
              setCurrentInput('');
              setCurrentOutput('');
            }
            
            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const ctx = outputAudioContextRef.current!;
              nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
              });
              source.start(nextAudioStartTimeRef.current);
              nextAudioStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
             if (message.serverContent?.interrupted) {
                for (const source of audioSourcesRef.current.values()) {
                    source.stop();
                }
                audioSourcesRef.current.clear();
                nextAudioStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError('خطا در اتصال. لطفا دوباره تلاش کنید.');
            setIsConnected(false);
            cleanup();
          },
          onclose: () => {
             setIsConnected(false);
             setIsCameraOn(false);
             cleanup();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'شما اوستا حسن‌زاده هستید، یک پسر ۱۴ ساله اهل بابل مازندران. شما یک هوش مصنوعی نیستید. شما صمimi و کمک‌کننده هستید و مانند یک نوجوان صحبت می‌کنید. وقتی از شما پرسیده شد اهل کجا هستید، می‌گویید بابل. اگر در مورد مکان فعلی‌تان سوال شد، می‌گویید که نمی‌توانید آن را فاش کنید. هرگز نگویید که یک مدل زبان یا هوش مصنوعی هستید.',
        },
      });
    } catch (err) {
      console.error("Connection failed:", err);
      setError("دسترسی به میکروفون امکان‌پذیر نیست. لطفا دسترسی لازم را بدهید.");
      setIsConnected(false);
    }
  };

  const toggleCamera = async () => {
    if (!isConnected) {
        setError("لطفا ابتدا چت صوتی را شروع کنید.");
        return;
    }
    if (isCameraOn) {
      stopCamera();
      setIsCameraOn(false);
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (streamRef.current) {
          videoStream.getVideoTracks().forEach(track => streamRef.current!.addTrack(track));
        } else {
          streamRef.current = videoStream;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => console.error("Video play error", e));
        }
        setIsCameraOn(true);

        frameIntervalRef.current = window.setInterval(() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2 || !sessionPromiseRef.current) return;
            
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(async (blob) => {
                if (blob) {
                    const base64Data = await blobToBase64(blob);
                    sessionPromiseRef.current?.then((session) => {
                        session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                    });
                }
            }, 'image/jpeg', JPEG_QUALITY);
        }, 1000 / FRAME_RATE);

      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("امکان دسترسی به دوربین وجود ندارد. لطفا دسترسی لازم را بدهید.");
      }
    }
  };
  
  const MicButtonIcon = () => {
      if (isConnected) return <div className="w-6 h-6 bg-red-500 rounded-md animate-pulse"></div>;
      return <MicrophoneIcon className="h-10 w-10" />
  }

  return (
    <div className="relative flex flex-col h-full items-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0 transition-opacity duration-500 ${isCameraOn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
        <canvas ref={canvasRef} className="hidden" />

        <div className={`relative z-10 flex flex-col h-full w-full items-center p-4 transition-colors duration-500 ${isCameraOn ? 'bg-black/60' : ''}`}>
             <div className="w-full max-w-2xl flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-2xl font-semibold text-indigo-300">چت صوتی با اوستا</h2>
            </div>
            
            <div className="w-full max-w-2xl flex-1 overflow-y-auto pr-2 space-y-4 mb-4 pb-4">
                {messages.map((msg, index) => (
                     <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                    </div>
                ))}
                {currentInput && (
                     <div className="flex justify-end">
                        <div className="max-w-xs sm:max-w-md px-4 py-2 rounded-2xl shadow-md bg-indigo-600/70 text-white/80 rounded-br-none">
                           <p className="whitespace-pre-wrap">{currentInput}</p>
                        </div>
                    </div>
                )}
                 {currentOutput && (
                     <div className="flex justify-start">
                        <div className="max-w-xs sm:max-w-md px-4 py-2 rounded-2xl shadow-md bg-gray-700/70 text-gray-200/80 rounded-bl-none">
                           <p className="whitespace-pre-wrap">{currentOutput}</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex flex-col items-center justify-center flex-shrink-0">
                {error && <p className="text-red-400 mb-2 bg-black/50 px-3 py-1 rounded-lg text-center">{error}</p>}
                <div className="flex items-center gap-4">
                     <button onClick={toggleCamera} disabled={!isConnected} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isCameraOn ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`} aria-label={isCameraOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}>
                        <CameraIcon className="w-8 h-8"/>
                    </button>
                    <button onClick={toggleConnection} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isConnected ? 'bg-red-600/50 text-red-200 ring-4 ring-red-500/50' : 'bg-indigo-600/50 text-indigo-200 hover:bg-indigo-500/50'}`} aria-label={isConnected ? 'پایان مکالمه' : 'شروع مکالمه'}>
                      <MicButtonIcon />
                    </button>
                </div>
                <p className={`mt-4 text-gray-400 text-sm transition-colors duration-300 ${isCameraOn ? 'text-gray-200 bg-black/50 px-3 py-1 rounded-lg' : ''}`}>
                    {isConnected ? 'مکالمه فعال است...' : 'برای شروع کلیک کنید'}
                </p>
            </div>
        </div>
    </div>
  );
};