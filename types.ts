
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

export interface ExtractedTruckData {
  vin?: string;
  licensePlate?: string;
  mileage?: string;
  registeredOwner?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  engineFamilyName?: string;
  engineManufacturer?: string;
  engineModel?: string;
  engineYear?: string;
  eclCondition?: string;
  dotNumber?: string;
  inspectionDate?: string;
  inspectionLocation?: string;
}

export interface Job {
  id: string;
  userId: string;
  jobName: string;
  jobDate: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'pending' | 'processing' | 'review' | 'approved' | 'exported';
  vehicleCount: number;
  createdAt: number;
  exportedAt: number | null;
  vehicles: Vehicle[];
  sheetRowIds?: string[];
}

export interface Vehicle {
  id: string;
  jobId: string;
  vin: string;
  vinValid: boolean;
  licensePlate: string;
  companyName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  mileage: string;
  eclCondition: "clear" | "faded" | "damaged" | "missing";
  engineFamilyName: string;
  engineManufacturer: string;
  engineModel: string;
  engineYear: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  gvwr: string;
  testResult: "pass" | "fail" | "pending";
  testDate: number;
  photoUrls: {
    vinPlate?: string;
    licensePlate?: string;
    odometer?: string;
    eclLabel?: string;
    exterior?: string[];
  };
  confidence: "high" | "medium" | "low";
  manualEdits?: string[];
}

export interface Truck {
  id: string;
  vin: string;
  nickname: string;
  status: 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';
  lastChecked: number;
}

export interface HotLead {
  id: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  fleetSize: string;
  status: 'HOT' | 'WARM' | 'COLD';
  zone: string;
  source: string;
  smsTemplate: string;
}

export interface Lead extends HotLead {}

export interface HistoryItem {
  id: string;
  value: string;
  type: 'VIN' | 'ENTITY' | 'TRUCRS';
  timestamp: number;
  details?: any;
}

export interface User {
  email: string;
  history: HistoryItem[];
}
