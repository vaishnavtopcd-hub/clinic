export type Role = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'PHYSIOTHERAPIST';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PAID' | 'DUE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  clinicId: string | null;
  specialization?: string;
  permissions?: string[];
  clinic?: { id: string; name: string } | null;
}

export interface PermissionCatalog {
  groups: { group: string; permissions: { key: string; label: string }[] }[];
  configurableRoles: Role[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  clinicId: string | null;
  specialization?: string;
  isActive: boolean;
  clinic?: Clinic;
}

export interface Patient {
  id: string;
  clinicId: string;
  patientCode: string;
  fullName: string;
  age?: number;
  gender?: Gender;
  dob?: string;
  bloodGroup?: string;
  phone: string;
  altPhone?: string;
  address?: string;
  emergencyContact?: string;
  createdAt: string;
}

export interface Machine {
  id: string;
  clinicId: string | null;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ClinicalNote {
  id: string;
  assessment?: string;
  findings?: string;
  painScale?: number;
  rangeOfMotion?: string;
  exerciseAdvice?: string;
  therapistNotes?: string;
}

export interface MachineUsage {
  id: string;
  machineId: string;
  machineName: string;
  durationMinutes: number;
  notes?: string;
}

export interface Payment {
  id: string;
  consultationFee: number;
  amountPaid: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string | null;
}

export interface Consultation {
  id: string;
  clinicId: string;
  patientId: string;
  physiotherapistId: string;
  consultationDate: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  patient?: Patient;
  physiotherapist?: User;
  clinicalNote?: ClinicalNote;
  machineUsages?: MachineUsage[];
  payment?: Payment;
}

export interface DashboardSummary {
  totalPatients: number;
  todaysPatients: number;
  todaysConsultations: number;
  activePhysiotherapists: number;
  todaysRevenue: number;
  outstandingDue: number;
  recentPatients: Patient[];
  recentConsultations: Consultation[];
}

export interface PaymentDashboard {
  todaysCollection: number;
  totalRevenue: number;
  totalDue: number;
  pendingPayments: number;
}

export interface PatientPaymentSummary {
  totalFees: number;
  totalPaid: number;
  totalDue: number;
  lastPaymentDate: string | null;
}
