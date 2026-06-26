export type Role =
  | 'SUPER_ADMIN'
  | 'CLINIC_ADMIN'
  | 'PHYSIOTHERAPIST'
  | 'FRONTEND_OFFICER'
  | 'HR';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PAID' | 'DUE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  department?: string;
  photoUrl?: string;
  role: Role;
  clinicId: string | null;
  specialization?: string;
  permissions?: string[];
  clinic?: { id: string; name: string } | null;
}

export const ROLES: Role[] = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'PHYSIOTHERAPIST',
  'FRONTEND_OFFICER',
  'HR',
];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_ADMIN: 'Clinic Admin',
  PHYSIOTHERAPIST: 'Physiotherapist',
  FRONTEND_OFFICER: 'Frontend Officer',
  HR: 'HR',
};

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

export interface ClinicAdmin {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  /** Clinic Admin accounts assigned to this clinic (from the list endpoint). */
  admins?: ClinicAdmin[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  department?: string;
  photoUrl?: string;
  role: Role;
  clinicId: string | null;
  specialization?: string;
  isActive: boolean;
  createdAt?: string;
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

export type ComplaintStatus =
  | 'OPEN'
  | 'UNDER_INSPECTION'
  | 'RESOLVED'
  | 'REJECTED';
export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  UNDER_INSPECTION: 'Under Inspection',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export interface MachineComplaint {
  id: string;
  clinicId: string;
  machineId: string;
  machine?: Machine;
  machineName: string;
  title: string;
  description: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  reportedById?: string | null;
  reportedBy?: { id: string; name: string };
  inspectedById?: string | null;
  inspectedBy?: { id: string; name: string };
  inspectionNotes?: string;
  inspectedAt?: string | null;
  resolution?: string;
  resolvedAt?: string | null;
  createdAt: string;
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
  clinic?: Clinic;
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

export interface DashboardTrendPoint {
  /** YYYY-MM */
  month: string;
  /** Short month label, e.g. "Jan" */
  label: string;
  revenue: number;
  patients: number;
  consultations: number;
}

export interface PatientPaymentSummary {
  totalFees: number;
  totalPaid: number;
  totalDue: number;
  lastPaymentDate: string | null;
}

// ---- HR module ----

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
export type LeaveType = 'CASUAL' | 'SICK' | 'PAID' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollStatus = 'PAID' | 'UNPAID';

export interface Employee {
  id: string;
  clinicId: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string; specialization?: string };
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  designation?: string;
  employmentType: EmploymentType;
  dateOfJoining?: string;
  baseSalary: number;
  status: EmployeeStatus;
  address?: string;
  createdAt: string;
  clinic?: { id: string; name: string };
}

/** A physiotherapist user account that can be linked to a staff record. */
export interface Physiotherapist {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
}

export interface Attendance {
  id: string;
  clinicId: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  clinicId: string;
  employeeId: string;
  employee?: Employee;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
  createdAt: string;
}

export interface Payroll {
  id: string;
  clinicId: string;
  employeeId: string;
  employee?: Employee;
  periodMonth: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  paidAt?: string | null;
  notes?: string;
  createdAt: string;
}

export interface StaffPerformance {
  hasEmployment: boolean;
  consultations: {
    total: number;
    today: number;
    totalPatients: number;
    todaysPatients: number;
    lastDate: string | null;
  };
  attendance: {
    present: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    workingDays: number;
    history: Attendance[];
  };
  leave: {
    total: number;
    approved: number;
    pending: number;
    records: LeaveRequest[];
  };
}

export interface HrSummary {
  range: { from: string; to: string; month: string };
  employees: {
    total: number;
    active: number;
    inactive: number;
    byType: { type: EmploymentType; count: number }[];
  };
  attendance: {
    byStatus: { status: AttendanceStatus; count: number }[];
    total: number;
  };
  leave: {
    byStatus: { status: LeaveStatus; count: number }[];
    pending: number;
  };
  payroll: {
    month: string;
    paidCount: number;
    unpaidCount: number;
    paidAmount: number;
    unpaidAmount: number;
    totalAmount: number;
  };
}
