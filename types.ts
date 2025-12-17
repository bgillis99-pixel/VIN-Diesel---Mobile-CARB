
export enum AppView {
  HOME = 'HOME',
  ASSISTANT = 'ASSISTANT',
  ANALYZE = 'ANALYZE',
  GARAGE = 'GARAGE',
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
  details?: any;
}

export interface Truck {
  id: string;
  vin: string;
  nickname: string;
  status: 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';
  lastChecked: number;
  note?: string;
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

export interface HotLead {
  id: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  fleetSize: string;
  status: 'HOT' | 'WARM' | 'COLD';
  zone: string; // e.g., "Hot (<50mi)"
  smsTemplate: string;
  source: string;
}

export interface RegistrationData {
  vin: string;
  licensePlate: string;
  year: string;
  make: string;
  model: string;
  gvwr: string;
  ownerName: string;
  address: string;
  expirationDate: string;
}

export interface Submission {
  id: string;
  timestamp: number;
  dateStr: string;
  type: 'VIN_CHECK' | 'ENGINE_TAG' | 'REGISTRATION';
  summary: string;
  details: any;
  coordinates: { lat: number, lng: number } | null;
  status: 'NEW' | 'REVIEWED' | 'ARCHIVED';
}
