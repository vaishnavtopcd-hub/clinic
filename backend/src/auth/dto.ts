import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

/** Self-service profile edit — a user may update their own contact details and
 *  photo, but never role/email/clinic (those stay admin-managed). */
export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() specialization?: string;
  // Base64 data URL (client downscales before upload).
  @IsOptional() @IsString() photoUrl?: string;
}
