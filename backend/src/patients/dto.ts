import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../common/enums';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  altPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdatePatientDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(150) age?: number;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() emergencyContact?: string;
}
