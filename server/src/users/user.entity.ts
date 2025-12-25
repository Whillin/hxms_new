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

  @Column('text', {
    nullable: true,
    transformer: {
      to: (value?: string[] | null) => {
        if (!value || !Array.isArray(value)) return '[]'
        try {
          return JSON.stringify(value)
        } catch {
          return '[]'
        }
      },
      from: (value?: string | null) => {
        if (!value) return []
        const raw = String(value)
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : []
        } catch {
          const cleaned = raw.replace(/[\[\]"]+/g, '')
          const parts = cleaned
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter(Boolean)
          return parts
        }
      }
    }
  })
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
