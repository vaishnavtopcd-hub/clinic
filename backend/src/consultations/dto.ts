import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../common/enums';
import { PaginationQuery } from '../common/pagination';

export class MachineUsageDto {
  @IsUUID()
  machineId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClinicalNoteDto {
  @IsOptional() @IsString() assessment?: string;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) painScale?: number;
  @IsOptional() @IsString() rangeOfMotion?: string;
  @IsOptional() @IsString() exerciseAdvice?: string;
  @IsOptional() @IsString() therapistNotes?: string;
}

export class PaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

export class CreateConsultationDto {
  @IsUUID()
  patientId: string;

  // Optional: defaults to the logged-in physiotherapist.
  @IsOptional()
  @IsUUID()
  physiotherapistId?: string;

  @IsOptional()
  @IsString()
  consultationDate?: string;

  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatmentPlan?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClinicalNoteDto)
  clinicalNote?: ClinicalNoteDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineUsageDto)
  machineUsages?: MachineUsageDto[];

  @ValidateNested()
  @Type(() => PaymentDto)
  payment: PaymentDto;
}

/** Consultations are immutable history — only clinical edits before lock are
 *  out of scope for v1. We allow updating clinical note text but never the
 *  payment trail via this DTO. */
export class UpdateConsultationDto {
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatmentPlan?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClinicalNoteDto)
  clinicalNote?: ClinicalNoteDto;
}

export class UpdatePaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class ListConsultationsQuery extends PaginationQuery {
  @IsOptional() @IsUUID() patientId?: string;
  @IsOptional() @IsUUID() physiotherapistId?: string;
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
}
