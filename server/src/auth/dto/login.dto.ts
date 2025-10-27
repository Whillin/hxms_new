import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator'
export class LoginDto {
  @IsOptional()
  @IsString()
  userName?: string
  @IsOptional()
  @IsString()
  username?: string
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
