
export enum AppView {
  LANDING = 'LANDING',
  HOME = 'HOME',
  ASSISTANT = 'ASSISTANT',
  ANALYZE = 'ANALYZE',
  GARAGE = 'GARAGE',
  TOOLS = 'TOOLS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  INTAKE = 'INTAKE',
  INVOICE = 'INVOICE'
}

export interface AIAnalyticsReport {
  summary: string;
  marketingStrategy: string;
  whatsWorking: string[];
  suggestedActions: string[];
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface Contact {
  name: string;
  company: string;
  address: string;
  cityState: string;
  phone: string;
  email: string;
}

export interface TestAppointment {
  id: string;
  testName: string;
  testDate: string;
  testId: string;
  eVin: string;
  userVin: string;
  plate: string;
  comment: string;
  result: 'PASS' | 'FAIL';
  resultMessage: string;
  amount: number;
}

export interface Invoice {
  id: string;
  date: string;
  billTo: Contact;
  items: TestAppointment[];
  balanceDue: number;
}

export interface ImageGenerationConfig {
  aspectRatio: string;
  size: string;
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
  confidence?: 'high' | 'medium' | 'low';
}

export interface IntakeSubmission {
  id: string;
  clientName: string;
  timestamp: number;
  photos: {
    vin: string | null;
    plate: string | null;
    odometer: string | null;
    ecl: string | null;
    engine: string | null;
    exterior: string | null;
    registration: string | null;
  };
  extractedData: ExtractedTruckData | null;
  status: 'pending' | 'reviewed' | 'exported';
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
}

export interface Vehicle {
  id: string;
  jobId: string;
  vin: string;
  vinValid: boolean;
  nhtsaSuccess: boolean;
  licensePlate: string;
  companyName: string;
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
}

export interface Truck {
  id: string;
  vin: string;
  nickname: string;
  status: 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';
  lastChecked: number;
}

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

export interface Lead {
  company: string | null;
  phone: string | null;
  dotNumber: string | null;
  location: string | null;
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
