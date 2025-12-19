
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

export type TextGenerationModel = 
  | 'gemini-3-pro-preview' 
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro-preview'
  | 'gemini-2.5-flash-preview'
  | 'gemini-2.0-pro-preview'
  | 'gemini-2.0-flash-preview'
  | 'gemini-flash-lite-latest' 
  | 'gemini-flash-latest';

export type ImageGenerationModel = 
  | 'gemini-3-pro-image-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro-preview'
  | 'gemini-2.5-flash-image' 
  | 'gemini-2.0-pro-preview'
  | 'gemini-2.0-flash-preview'
  | 'imagen-4.0-generate-001' 
  | 'imagen-3.0-generate-001';

export type ImageEditingModel = 
  | 'gemini-3-pro-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro-preview'
  | 'gemini-2.5-flash-image' 
  | 'gemini-2.0-pro-preview'
  | 'gemini-2.0-flash-preview';

export type VideoGenerationModel = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';

export type TTSVoice = 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';
