import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export type DeptType = 'group' | 'brand' | 'region' | 'store' | 'department'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number

  @Column('varchar', { length: 191 })
  name!: string

  @Column('varchar', { length: 50 })
  type!: DeptType

  @Column('int', { nullable: true })
  parentId?: number

  @Column('varchar', { length: 50, nullable: true })
  code?: string

  @Column('tinyint', { default: true })
  enabled!: boolean

  @CreateDateColumn()
  createTime!: Date
}
