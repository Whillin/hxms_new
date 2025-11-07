import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('varchar', { unique: true, length: 191 })
  userName!: string

  @Column('varchar', { length: 255 })
  passwordHash!: string

  // 个人资料相关字段
  @Column('varchar', { length: 191, nullable: true })
  email?: string

  @Column('varchar', { length: 100, nullable: true })
  nickname?: string

  @Column('varchar', { length: 255, nullable: true })
  address?: string

  @Column('text', { nullable: true })
  bio?: string

  @Column('varchar', { length: 255, nullable: true })
  avatar?: string

  @Column('simple-json', { nullable: true })
  roles!: string[]

  @Column('tinyint', { default: true })
  enabled!: boolean

  @Column('int', { nullable: true, unique: true })
  employeeId?: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
