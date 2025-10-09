import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { geminiService } from '../services/geminiService';
import { InfoIcon, PlayIcon, SearchIcon, DownloadIcon, XIcon, MusicIcon } from './icons/FeatureIcons';

interface SongResult {
    title: string;
    artist: string;
    coverArtUrl: string;
    pageUrl: string;
    audioSrc?: string;
}

export const SongSearch: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setResults([]);
    setSelectedSong(null);
    
    try {
        const response = await geminiService.searchIranianMusic(prompt);
        if (response.length === 0) {
            setError("نتیجه‌ای یافت نشد. لطفاً از نام کامل و صحیح آهنگ و خواننده استفاده کنید.");
        }
        setResults(response);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'خطای ناشناخته رخ داد.');
    } finally {
        setIsLoading(false);
    }
  };

  const PlayerModal = ({ song, onClose }: { song: SongResult, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="relative w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition">
                <XIcon className="w-6 h-6" />
            </button>
            <img src={song.coverArtUrl || 'default-cover.png'} alt={song.title} className="w-48 h-48 mx-auto rounded-lg shadow-lg mb-4" onError={(e) => e.currentTarget.src = 'https://placehold.co/200x200/1f2937/a5b4fc?text=AvestaAI'} />
            <h3 className="text-xl font-bold text-white truncate">{song.title}</h3>
            <p className="text-md text-gray-400 mb-6">{song.artist}</p>
            {song.audioSrc ? (
                 <audio controls autoPlay src={song.audioSrc} className="w-full">
                    مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                </audio>
            ) : (
                <div className="p-3 bg-yellow-900/50 text-yellow-300 text-sm rounded-lg">
                    <p>پخش مستقیم ممکن نیست. برای شنیدن آهنگ به صفحه آن بروید.</p>
                    <a href={song.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-4 py-1 bg-yellow-600 text-white rounded-md text-xs font-semibold hover:bg-yellow-500">
                        رفتن به صفحه آهنگ
                    </a>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {selectedSong && <PlayerModal song={selectedSong} onClose={() => setSelectedSong(null)} />}
      <h2 className="text-2xl font-semibold mb-2 text-indigo-300">جستجو و پخش آهنگ</h2>
      <p className="mb-4 text-gray-400">آهنگ‌های ایرانی مورد نظر خود را جستجو کرده، گوش دهید و دانلود کنید.</p>
      
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: شادمهر عقیلی - تقدیر"
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            disabled={isLoading}
            />
            <button type="submit" className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-semibold" disabled={isLoading || !prompt.trim()}>
            {isLoading ? '...' : 'جستجو'}
            </button>
        </form>
      
       <div className="flex-1 overflow-y-auto pr-2">
        {isLoading && (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

        {error && !isLoading && <p className="text-red-400 my-4 text-center">{error}</p>}
        
        {results.length > 0 && !isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((song, index) => (
                    <div key={index} className="group relative bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-500/50 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                       <img src={song.coverArtUrl || 'default-cover.png'} alt={song.title} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-110" onError={(e) => e.currentTarget.src = 'https://placehold.co/400x400/1f2937/a5b4fc?text=AvestaAI'} />
                       <div className="p-4">
                           <h3 className="font-bold text-gray-100 truncate">{song.title}</h3>
                           <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                       </div>
                       <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setSelectedSong(song)} className="w-14 h-14 bg-indigo-600/80 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition transform hover:scale-110" title="پخش">
                               <PlayIcon className="w-7 h-7" />
                           </button>
                            <a href={song.pageUrl} target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-gray-600/80 rounded-full flex items-center justify-center text-white hover:bg-gray-500 transition transform hover:scale-110" title="رفتن به صفحه دانلود">
                               <DownloadIcon className="w-7 h-7" />
                           </a>
                       </div>
                    </div>
                ))}
            </div>
        ) : !isLoading && !error && (
             <div className="flex items-center justify-center h-full text-center text-gray-500 border-2 border-dashed border-gray-600 rounded-lg p-8">
                <div>
                    <MusicIcon className="w-16 h-16 mx-auto text-gray-600" />
                    <p className="mt-4">نتایج جستجوی آهنگ اینجا نمایش داده می‌شود.</p>
                </div>
            </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-2 mt-4 text-sm text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <InfoIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span>نتایج از وب‌سایت‌های موسیقی ایرانی معتبر جمع‌آوری می‌شوند. لطفاً به قوانین کپی‌رایت احترام بگذارید.</span>
      </div>
    </div>
  );
};