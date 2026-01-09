
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

export type IntakeMode = 'VIN_LABEL' | 'REGISTRATION' | 'ENGINE_TAG' | 'FULL_INTAKE' | 'AUTO_DETECT' | 'BATCH_MODE';

export interface RegistrationData {
  ownerName?: string;
  address?: string;
  plate?: string;
  vin?: string;
  expirationDate?: string;
  vehicleMake?: string;
  vehicleYear?: string;
}

export interface EngineTagData {
  engineModel?: string;
  engineYear?: string;
  engineManufacturer?: string;
  familyName?: string; 
  serialNumber?: string;
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
  documentType?: 'VIN_LABEL' | 'REGISTRATION' | 'ENGINE_TAG' | 'ODOMETER' | 'UNKNOWN';
  egr?: string;
  scr?: string;
  twc?: string;
  nox?: string;
  sctc?: string;
  ecmPcm?: string;
  dpf?: string;
}

export interface IntakeSubmission {
  id: string;
  sessionId?: string; 
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
    batch?: string[];
  };
  extractedData: ExtractedTruckData | RegistrationData | EngineTagData | null;
  originalAiData?: any; 
  status: 'pending' | 'reviewed' | 'exported';
  mode: IntakeMode;
  driveDestination?: string;
  adminNotified?: boolean;
}

export interface CrmClient {
  id: string;
  clientName: string;
  phone?: string;
  email?: string;
  vin: string;
  plate?: string;
  make?: string;
  model?: string;
  year?: string;
  timestamp: number;
  status: 'New' | 'Testing' | 'Completed';
  notes?: string;
}

export interface HistoryItem {
  id: string;
  value: string;
  type: 'VIN' | 'ENTITY' | 'TRUCRS';
  timestamp: number;
  details?: any;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface User {
  email: string;
  history: HistoryItem[];
}

// Added missing interfaces for fleet and invoice management
export interface Truck {
  id: string;
  vin: string;
  nickname: string;
  status: 'COMPLIANT' | 'NOT_COMPLIANT' | 'UNKNOWN';
  lastChecked: number;
}

export interface Job {
  id: string;
  userId: string;
  clientName: string;
  status: 'Pending' | 'Completed' | 'Canceled';
  createdAt: number;
}

export interface Vehicle {
  id: string;
  vin: string;
  make?: string;
  model?: string;
  year?: string;
  plate?: string;
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
  result: string;
  resultMessage: string;
  amount: number;
}

export interface Invoice {
  id: string;
  date: string;
  dueDate: string;
  number: string;
  billTo: Contact;
  items: TestAppointment[];
  total: number;
}
