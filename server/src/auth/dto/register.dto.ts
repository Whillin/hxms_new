import { IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator'
export class RegisterDto {
  @IsOptional()
  @IsString()
  userName?: string
  @IsOptional()
  @IsString()
  username?: string
  @IsString()
  @IsNotEmpty()
  name!: string
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\\d{9}$/)
  phone!: string
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
