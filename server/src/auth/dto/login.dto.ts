import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsString()
  userName?: string

  @IsString()
  username?: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
