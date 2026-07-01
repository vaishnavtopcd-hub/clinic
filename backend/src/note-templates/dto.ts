import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { NoteFieldType } from '../common/enums';

class TemplateFieldOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

class TemplateFieldValidationDto {
  @IsOptional() @Type(() => Number) min?: number;
  @IsOptional() @Type(() => Number) max?: number;
  @IsOptional() @Type(() => Number) minLength?: number;
  @IsOptional() @Type(() => Number) maxLength?: number;
  @IsOptional() @IsString() pattern?: string;
}

export class TemplateFieldDto {
  // Stable id; generated server-side when omitted.
  @IsOptional() @IsString() id?: string;

  @IsEnum(NoteFieldType)
  type: NoteFieldType;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional() @IsString() placeholder?: string;

  // Arbitrary default (string | number | boolean | string[]); @Allow keeps it
  // through the whitelisting ValidationPipe without constraining the type.
  @IsOptional() @Allow() defaultValue?: unknown;

  @IsOptional() @IsBoolean() required?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldOptionDto)
  options?: TemplateFieldOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateFieldValidationDto)
  validation?: TemplateFieldValidationDto;
}

export class CreateNoteTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];
}

export class UpdateNoteTemplateDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];
}
