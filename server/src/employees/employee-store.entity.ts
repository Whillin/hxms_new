import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('employee_store_links')
@Index('uniq_employee_store', ['employeeId', 'storeId'], { unique: true })
export class EmployeeStoreLink {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('idx_employee')
  @Column('int')
  employeeId!: number

  @Index('idx_store')
  @Column('int')
  storeId!: number

  @CreateDateColumn()
  createdAt!: Date
}
