export type ActiveView = 'welcome' | 'chat' | 'text' | 'image-gen' | 'image-edit' | 'search' | 'document' | 'voice-chat' | 'website-builder' | 'game-builder' | 'android-builder' | 'code-assistant';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  mediaPreviews?: {
    url: string;
    type: 'image' | 'video' | 'audio';
  }[];
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
