import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('varchar', { length: 191 })
  roleName!: string

  @Index('uniq_role_code', { unique: true })
  @Column('varchar', { length: 100, unique: true })
  roleCode!: string

  @Column('varchar', { length: 255 })
  description!: string

  @Column('tinyint', { default: true })
  enabled!: boolean

  // 与前端类型保持一致的字段名
  @CreateDateColumn()
  createTime!: Date

  @UpdateDateColumn()
  updateTime!: Date
}
