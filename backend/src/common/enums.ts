export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  FRONTEND_OFFICER = 'FRONTEND_OFFICER',
  HR = 'HR',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PAID = 'PAID',
  DUE = 'DUE',
}

// ---- HR module ----

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
}

export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PayrollStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

// ---- Machine complaints / inspection ----

export enum ComplaintStatus {
  OPEN = 'OPEN',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ComplaintSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// ---- Clinical note templates ----

/**
 * Configurable field types for dynamic clinical-note templates. New types can
 * be appended here and handled in the renderer without touching the schema
 * (template fields are stored as JSONB).
 */
export enum NoteFieldType {
  SINGLE_LINE_TEXT = 'SINGLE_LINE_TEXT',
  MULTI_LINE_TEXT = 'MULTI_LINE_TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DROPDOWN = 'DROPDOWN',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  MULTI_SELECT = 'MULTI_SELECT',
  TOGGLE = 'TOGGLE',
  FILE_UPLOAD = 'FILE_UPLOAD',
}
