import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 每日线上渠道分配（按员工/角色维度分配当日渠道线索） */
@Entity('online_channel_daily_allocation')
export class OnlineChannelDailyAllocation {
  @PrimaryGeneratedColumn()
  id!: number

  /** 关联每日填报记录ID */
  @Index('idx_alloc_daily')
  @Column('int')
  dailyId!: number

  /** 被分配的员工ID（邀约/顾问/销售经理等） */
  @Index('idx_alloc_employee')
  @Column('int')
  employeeId!: number

  /** 分配条数（≥0） */
  @Column('int', { default: 0 })
  count!: number

  /** 操作人 */
  @Column('int', { nullable: true })
  createdBy?: number

  @Column('int', { nullable: true })
  updatedBy?: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  /** 唯一键：dailyId + employeeId，保证同一人一天仅一条 */
  @Index('uniq_alloc_daily_emp', { unique: true })
  @Column('varchar', { length: 120, unique: true })
  uniqueKey!: string
}
