
export type ActiveView = 'welcome' | 'chat' | 'text' | 'image-gen' | 'image-edit' | 'search' | 'document' | 'voice-chat' | 'website-builder' | 'game-builder' | 'android-builder' | 'code-assistant' | 'video-gen' | 'image-to-video' | 'songwriter-assistant' | 'audio-gen' | 'song-identifier' | 'song-search';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  mediaPreviews?: {
    url: string;
    type: 'image' | 'video' | 'audio';
  }[];
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: TextGenerationModel;
  createdAt: number;
}

export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  };
}

export interface CodeFile {
  name: string;
  content: string;
  language: string;
}

export type TextGenerationModel = 'gemini-flash-lite-latest' | 'gemini-flash-latest' | 'gemini-2.5-flash' | 'gemini-3-pro-preview' | 'gemini-3-flash-preview';
export type ImageGenerationModel = 'imagen-4.0-generate-001' | 'imagen-3.0-generate-001' | 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
export type ImageEditingModel = 'gemini-2.5-flash-image';
export type VideoGenerationModel = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';

export type TTSVoice = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';
