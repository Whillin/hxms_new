import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserService } from './user.service'
import { User } from './user.entity'
import { Employee } from '../employees/employee.entity'
import { Role } from '../roles/role.entity'

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee, Role])],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
