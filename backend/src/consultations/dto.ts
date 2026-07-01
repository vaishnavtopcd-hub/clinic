import { Type } from 'class-transformer';
import {
  Allow,
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

class MachineUsageDto {
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

class TemplateValueDto {
  @IsString() fieldId: string;
  @IsString() label: string;
  @IsString() type: string;
  // Arbitrary entered value (string | number | boolean | string[]).
  @IsOptional() @Allow() value?: unknown;
}

class ClinicalNoteDto {
  @IsOptional() @IsString() assessment?: string;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) painScale?: number;
  @IsOptional() @IsString() rangeOfMotion?: string;
  @IsOptional() @IsString() exerciseAdvice?: string;
  @IsOptional() @IsString() therapistNotes?: string;

  // Dynamic template selection + snapshotted values.
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsString() templateName?: string;
  @IsOptional() @Type(() => Number) @IsInt() templateVersion?: number;

  // Full point-in-time snapshot of the template's field definitions. Kept as an
  // opaque array (no @Type) so the complete field structure passes through the
  // whitelisting pipe untouched.
  @IsOptional() @IsArray() templateSnapshot?: unknown[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateValueDto)
  templateValues?: TemplateValueDto[];
}

class PaymentDto {
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
