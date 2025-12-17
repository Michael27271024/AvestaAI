import React from 'react';
import type { FC } from 'react';
import type { ActiveView } from '../types';
import {
    HomeIcon,
    ChatIcon,
    VoiceIcon,
    TextIcon,
    DocumentIcon,
    ImageIcon,
    EditIcon,
    VideoIcon,
    ImageToVideoIcon,
    SearchIcon,
    CodeIcon,
    CodeBracketsIcon,
    GamepadIcon,
    AndroidIcon,
    XIcon,
    MusicIcon
} from './icons/FeatureIcons';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
    {
        title: 'عمومی',
        items: [
            { id: 'welcome', label: 'خانه', icon: HomeIcon },
            { id: 'chat', label: 'چت', icon: ChatIcon },
            { id: 'voice-chat', label: 'چت صوتی', icon: VoiceIcon },
            { id: 'search', label: 'جستجوی هوشمند', icon: SearchIcon },
        ],
    },
    {
        title: 'تولید محتوا',
        items: [
            { id: 'text', label: 'تولید متن', icon: TextIcon },
            { id: 'document', label: 'دستیار اسناد', icon: DocumentIcon },
            { id: 'image-gen', label: 'تولید تصویر', icon: ImageIcon },
            { id: 'image-edit', label: 'ویرایشگر تصویر', icon: EditIcon },
            { id: 'video-gen', label: 'تولید ویدیو', icon: VideoIcon },
            { id: 'image-to-video', label: 'متحرک سازی عکس', icon: ImageToVideoIcon },
        ]
    },
    {
        title: 'موسیقی و صدا',
        items: [
            { id: 'songwriter-assistant', label: 'دستیار ترانه‌سرا', icon: TextIcon },
            { id: 'audio-gen', label: 'تولید صدا (TTS)', icon: VoiceIcon },
            { id: 'song-identifier', label: 'تشخیص آهنگ از ویدیو', icon: SearchIcon },
            { id: 'song-search', label: 'جستجو و پخش آهنگ', icon: MusicIcon },
        ]
    },
    {
        title: 'ابزارهای توسعه',
        items: [
            { id: 'code-assistant', label: 'دستیار کدنویسی', icon: CodeBracketsIcon },
            { id: 'website-builder', label: 'سازنده وب‌سایت', icon: CodeIcon },
            { id: 'game-builder', label: 'سازنده بازی', icon: GamepadIcon },
            { id: 'android-builder', label: 'سازنده اپ اندروید', icon: AndroidIcon },
        ]
    }
];


export const Sidebar: FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const NavLink: FC<{ id: ActiveView, label: string, icon: FC<{className?: string}> }> = ({ id, label, icon: Icon }) => (
        <button
          onClick={() => setActiveView(id)}
          className={`flex items-center w-full p-3 rounded-lg text-right transition-colors text-sm ${
            activeView === id
              ? 'bg-indigo-600/30 text-indigo-200'
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
          }`}
        >
          <Icon className="w-5 h-5 ml-3 flex-shrink-0" />
          <span className="flex-1">{label}</span>
        </button>
      );

    const sidebarContent = (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-200 logo-font">Avesta AI</h1>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden p-1 text-gray-400 hover:text-white"
                    aria-label="بستن سایدبار"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            </div>
            <nav className="flex-1 p-4 overflow-y-auto">
                {navItems.map(section => (
                    <div key={section.title} className="mb-6">
                        <h2 className="px-3 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">{section.title}</h2>
                        <div className="space-y-1">
                            {section.items.map(item => <NavLink key={item.id} id={item.id as ActiveView} label={item.label} icon={item.icon} />)}
                        </div>
                    </div>
                ))}
            </nav>
        </div>
    );
    
    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 right-0 w-64 h-full z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64 flex-shrink-0 ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
};
