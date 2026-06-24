import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQuery } from '../common/pagination';
import { ComplaintSeverity, ComplaintStatus } from '../common/enums';

export class CreateMachineComplaintDto {
  @IsUUID()
  machineId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  // Super admin only: the clinic to file the complaint under.
  @IsOptional()
  @IsUUID()
  clinicId?: string;
}

export class UpdateMachineComplaintDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  inspectionNotes?: string;

  @IsOptional()
  @IsString()
  resolution?: string;
}

export class ListMachineComplaintsQuery extends PaginationQuery {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @IsOptional()
  @IsUUID()
  machineId?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}
