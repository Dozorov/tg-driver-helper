export interface Driver {
  id: number;
  telegram_id: number;
  full_name: string;
  phone_number: string;
  cdl_number: string;
  cdl_expiry_date: string;
  dot_medical_certificate: string;
  dot_medical_expiry_date: string;
  driver_photo_url: string;
  cdl_photo_url?: string;
  dot_medical_photo_url?: string;
  status: DriverStatus;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export enum DriverStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface OnboardingStep {
  step: number;
  name: string;
  completed: boolean;
  data?: any;
}

export interface AdvancePaymentRequest {
  id: number;
  driver_id: number;
  amount: number;
  reason: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface VacationRequest {
  id: number;
  driver_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface BotContext {
  driver?: Driver;
  currentStep?: number;
  onboardingData?: Partial<Driver>;
  waitingForDocument?: string;
}

export interface AIAnalysisResult {
  confidence: number;
  extractedData: any;
  isValid: boolean;
  suggestions?: string[];
} 