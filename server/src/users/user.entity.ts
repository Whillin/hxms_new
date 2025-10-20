import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('varchar', { unique: true, length: 191 })
  userName!: string

  @Column('varchar', { length: 255 })
  passwordHash!: string

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
