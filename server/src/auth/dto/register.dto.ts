import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator'

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  userName?: string

  @IsString()
  username?: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/)
  phone!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
