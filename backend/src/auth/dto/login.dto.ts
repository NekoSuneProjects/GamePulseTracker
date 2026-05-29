import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier!: string; // username or email

  @IsString()
  @MinLength(1)
  password!: string;

  /** 6-digit TOTP code, required only if the user has 2FA enabled. */
  @IsOptional()
  @IsString()
  totp?: string;
}
