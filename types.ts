export enum AppView {
  HOME = 'HOME',
  ASSISTANT = 'ASSISTANT',
  ANALYZE = 'ANALYZE',
  TOOLS = 'TOOLS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface ImageGenerationConfig {
  aspectRatio: string;
  size: string;
}

export enum AnalysisType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export interface HistoryItem {
  id: string;
  value: string;
  type: 'VIN' | 'ENTITY' | 'TRUCRS';
  timestamp: number;
}

export interface User {
  email: string;
  history: HistoryItem[];
}

export interface Lead {
  id: string;
  timestamp: number;
  companyName: string;
  phone: string;
  dot: string;
  location: string;
  industry: string;
  emailDraft: string;
  blogDraft: string;
}