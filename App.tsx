import React, { useState, useCallback } from 'react';
import type { FC } from 'react';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { Chat } from './components/Chat';
import { TextGenerator } from './components/TextGenerator';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageEditor } from './components/ImageEditor';
import { GroundedSearch } from './components/GroundedSearch';
import { DocumentAssistant } from './components/DocumentAssistant';
import { VoiceChat } from './components/VoiceChat';
import { WebsiteBuilder } from './components/WebsiteBuilder';
import { GameBuilder } from './components/GameBuilder';
import { AndroidAppBuilder } from './components/AndroidAppBuilder';
import { CodeAssistant } from './components/CodeAssistant';
import type { ActiveView } from './types';
import { MenuIcon } from './components/icons/FeatureIcons';

const App: FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile when a new view is selected
  };

  const renderActiveView = useCallback(() => {
    switch (activeView) {
      case 'welcome':
        return <Welcome setActiveView={handleSetActiveView} />;
      case 'chat':
        return <Chat />;
      case 'voice-chat':
        return <VoiceChat />;
      case 'text':
        return <TextGenerator />;
      case 'document':
        return <DocumentAssistant />;
      case 'image-gen':
        return <ImageGenerator />;
      case 'image-edit':
        return <ImageEditor />;
      case 'search':
        return <GroundedSearch />;
      case 'website-builder':
        return <WebsiteBuilder />;
      case 'game-builder':
        return <GameBuilder />;
      case 'android-builder':
        return <AndroidAppBuilder />;
      case 'code-assistant':
        return <CodeAssistant />;
      default:
        return <Welcome setActiveView={handleSetActiveView} />;
    }
  }, [activeView]);

  return (
    <div className="flex h-screen bg-gray-950/50 text-gray-100 overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={handleSetActiveView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden">
        <div className={`flex items-center justify-between gap-4 ${activeView !== 'welcome' ? 'mb-6' : ''} flex-shrink-0`}>
          <h1 className={`text-2xl md:text-3xl font-bold text-gray-200 order-2 lg:order-1 logo-font ${activeView === 'welcome' ? 'invisible' : ''}`}>
              Avesta AI
          </h1>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 z-30 order-1 lg:order-2"
            aria-label="باز کردن سایدبار"
          >
            <MenuIcon />
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto rounded-2xl shadow-2xl flex flex-col ${activeView !== 'welcome' ? 'bg-gray-900/50 border border-gray-700/50 p-4 sm:p-6' : ''}`}>
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
};

export default App;