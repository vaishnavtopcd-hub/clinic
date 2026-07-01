import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Optional: create the first clinic admin together with the clinic.
  // All three must be supplied together (validated in the service).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  adminName?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  adminPassword?: string;
}

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Branding/theme for a clinic. Only the primary colour is configurable today,
 * but the shape is deliberately open so logo, secondary colour and favicon can
 * be added later without changing the endpoint contract.
 */
export class UpdateClinicThemeDto {
  // 6-digit hex colour, e.g. #7c4ee6 (the clinic's primary brand colour).
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'primaryColor must be a 6-digit hex colour, e.g. #7c4ee6',
  })
  primaryColor: string;

  // Optional logo image URL shown in the sidebar. Empty string clears it.
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
