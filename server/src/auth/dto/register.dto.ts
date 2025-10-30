import { IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'

export class RegisterDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim()))
  userName?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value == null ? undefined : String(value).trim()))
  username?: string

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  name!: string

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  @Matches(/^1[3-9]\d{9}$/)
  phone!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Transform(({ value }) => String(value ?? '').trim())
  password!: string
}
