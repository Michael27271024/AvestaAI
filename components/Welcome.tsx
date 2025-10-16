import React, { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { ActiveView } from '../types';
import { ImageIcon, TextIcon, CodeIcon, SearchIcon, SendIcon, EditIcon, VoiceIcon } from './icons/FeatureIcons';

interface WelcomeProps {
    setActiveView: (view: ActiveView) => void;
}

const FeatureCard: FC<{
    title: string;
    description: string;
    icon: FC<{ className?: string }>;
    view: ActiveView;
    onClick: (view: ActiveView) => void;
}> = ({ title, description, icon: Icon, view, onClick }) => (
    <button
        onClick={() => onClick(view)}
        className="text-right p-6 bg-gray-900/50 rounded-2xl border border-gray-700/50 hover:border-indigo-500/50 hover:bg-gray-900 transition-all duration-300 transform hover:-translate-y-1 glow-border"
    >
        <div className="flex items-center justify-center w-12 h-12 mb-4 bg-indigo-600/20 rounded-lg">
            <Icon className="w-6 h-6 text-indigo-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
    </button>
);


export const Welcome: FC<WelcomeProps> = ({ setActiveView }) => {
    const [input, setInput] = useState('');
    
    const features = [
        {
            title: 'چت صوتی',
            description: 'یک مکالمه طبیعی و زنده با هوش مصنوعی داشته باشید.',
            icon: VoiceIcon,
            view: 'voice-chat' as ActiveView
        },
        {
            title: 'تولید تصویر',
            description: 'با توصیف آنچه در ذهن دارید، تخیل خود را به تصاویر خیره‌کننده تبدیل کنید.',
            icon: ImageIcon,
            view: 'image-gen' as ActiveView
        },
        {
            title: 'ویرایشگر تصویر',
            description: 'تصاویر خود را با دستورات متنی ویرایش، ترکیب یا تحلیل کنید.',
            icon: EditIcon,
            view: 'image-edit' as ActiveView
        },
        {
            title: 'تولید متن',
            description: 'متون خلاقانه تولید کنید، از شعر و داستان گرفته تا ایمیل و مقاله.',
            icon: TextIcon,
            view: 'text' as ActiveView
        },
        {
            title: 'سازنده وب‌سایت',
            description: 'وب‌سایت مورد نیاز خود را توصیف کنید تا هوش مصنوعی کد آن را برایتان بسازد.',
            icon: CodeIcon,
            view: 'website-builder' as ActiveView
        },
        {
            title: 'جستجوی هوشمند',
            description: 'پاسخ‌های به‌روز را از وب دریافت کنید که توسط هوش مصنوعی با ذکر منبع خلاصه‌سازی شده‌اند.',
            icon: SearchIcon,
            view: 'search' as ActiveView
        }
    ];

    const handleChatSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sessionStorage.setItem('initialChatMessage', input);
        setActiveView('chat');
    };

    return (
        <div className="flex flex-col h-full text-center animate-fade-in">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-100 logo-font">
                    Avesta AI
                </h1>
                <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                    به پلتفرم هوش مصنوعی اوستا خوش آمدید. دستیار چندمنظوره شما برای خلق محتوا، توسعه نرم‌افزار و فراتر از آن. کار را با پرسیدن یک سوال شروع کنید.
                </p>

                <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map(feature => (
                        <FeatureCard key={feature.view} {...feature} onClick={setActiveView} />
                    ))}
                </div>
            </div>

            {/* Chat Input Bar */}
            <div className="flex-shrink-0 w-full p-4 bg-gray-950/60 backdrop-blur-sm border-t border-gray-800/50">
                <form onSubmit={handleChatSubmit} className="max-w-3xl mx-auto flex items-center gap-2 md:gap-4">
                     <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="از اوستا بپرسید..."
                        className="flex-1 w-full p-3 sm:p-4 bg-gray-800/70 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-base sm:text-lg"
                    />
                    <button type="submit" className="p-3 sm:p-4 bg-indigo-600 rounded-full hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform active:scale-90" disabled={!input.trim()} aria-label="ارسال پیام">
                        <SendIcon />
                    </button>
                </form>
            </div>
        </div>
    );
};