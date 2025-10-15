import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  userName?: string

  @IsString()
  username?: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
