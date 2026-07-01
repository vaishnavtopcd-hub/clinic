import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';
import {
  AttendanceStatus,
  EmployeeStatus,
  EmploymentType,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
} from '../common/enums';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/; // YYYY-MM

// ---- Employees (HR profile linked to a physiotherapist user) ----

export class CreateEmployeeDto {
  // The physiotherapist user account this staff record represents.
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class ListEmployeesQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

// ---- Attendance ----

export class MarkAttendanceDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAttendanceQuery extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

// ---- Leave ----

export class CreateLeaveDto {
  @IsUUID()
  employeeId: string;

  @IsEnum(LeaveType)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

export class ReviewLeaveDto {
  // Only APPROVED or REJECTED are valid review outcomes.
  @IsEnum(LeaveStatus)
  status: LeaveStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class ListLeaveQuery extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @IsOptional()
  @IsEnum(LeaveType)
  type?: LeaveType;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

// ---- Payroll ----

export class CreatePayrollDto {
  @IsUUID()
  employeeId: string;

  @Matches(MONTH, { message: 'periodMonth must be in YYYY-MM format' })
  periodMonth: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowances?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

export class UpdatePayrollDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowances?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListPayrollQuery extends PaginationQuery {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @Matches(MONTH, { message: 'periodMonth must be in YYYY-MM format' })
  periodMonth?: string;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

// ---- Reports ----

export class HrReportQuery {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Matches(MONTH, { message: 'month must be in YYYY-MM format' })
  month?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}
