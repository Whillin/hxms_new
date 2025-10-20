import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type Gender = 'male' | 'female' | 'other'
export type EmpStatus = '1' | '2'

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('varchar', { length: 191 })
  name!: string

  @Column('varchar', { length: 20, unique: true })
  phone!: string

  @Column('varchar', { length: 10 })
  gender!: Gender

  @Column('varchar', { length: 10 })
  status!: EmpStatus

  @Column('varchar', { length: 50 })
  role!: string

  @Column('int', { nullable: true })
  brandId?: number

  @Column('int', { nullable: true })
  regionId?: number

  @Column('int', { nullable: true })
  storeId?: number

  // 存储为 YYYY-MM-DD 字符串，便于前端直接显示
  @Column('varchar', { length: 10 })
  hireDate!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}