import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserService } from './user.service'
import { User } from './user.entity'
import { Employee } from '../employees/employee.entity'

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee])],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
