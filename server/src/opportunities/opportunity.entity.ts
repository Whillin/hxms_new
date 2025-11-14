import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

export type OpportunityStatus = '跟进中' | '已战败' | '已成交'

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn()
  id!: number

  /** 可读编码（可选），如 OP-20250101-0001 */
  @Index('idx_opp_code', { unique: false })
  @Column('varchar', { length: 50, nullable: true })
  opportunityCode?: string | null

  /** 客户关联与冗余信息 */
  @Index('idx_customer')
  @Column('int', { nullable: true })
  customerId?: number | null

  @Column('varchar', { length: 50 })
  customerName!: string

  @Column('varchar', { length: 20 })
  customerPhone!: string

  /** 商机状态与级别 */
  @Index('idx_status')
  @Column('varchar', { length: 10, default: '跟进中' })
  status!: OpportunityStatus

  @Index('idx_level')
  @Column('varchar', { length: 2, default: 'C' })
  opportunityLevel!: 'H' | 'A' | 'B' | 'C' | 'O'

  /** 关注车型与行为标记（冗余） */
  @Column('int', { nullable: true })
  focusModelId?: number | null

  @Column('varchar', { length: 100, nullable: true })
  focusModelName?: string | null

  @Column('tinyint', { default: false })
  testDrive!: boolean

  @Column('tinyint', { default: false })
  bargaining!: boolean

  /** 归属顾问（所有者）与组织维度 */
  @Index('idx_owner')
  @Column('int', { nullable: true })
  ownerId?: number | null

  @Column('varchar', { length: 50, nullable: true })
  ownerName?: string | null

  @Index('idx_store')
  @Column('int')
  storeId!: number

  @Index('idx_region')
  @Column('int', { nullable: true })
  regionId?: number | null

  @Index('idx_brand')
  @Column('int', { nullable: true })
  brandId?: number | null

  @Index('idx_department')
  @Column('int', { nullable: true })
  departmentId?: number | null

  /** 所有者当时所属部门（便于“下属/小组”筛选） */
  @Index('idx_owner_dept')
  @Column('int', { nullable: true })
  ownerDepartmentId?: number | null

  /** 开始与最近来访日期（字符串 YYYY-MM-DD） */
  @Index('idx_open_date')
  @Column('varchar', { length: 10 })
  openDate!: string

  @Index('idx_latest_visit')
  @Column('varchar', { length: 10 })
  latestVisitDate!: string

  /** 渠道冗余字段（便于列表筛选） */
  @Column('varchar', { length: 20, default: '线下' })
  channelCategory!: string

  @Column('varchar', { length: 50, default: '自然到店' })
  businessSource!: string

  @Column('varchar', { length: 50, nullable: true })
  channelLevel1?: string | null

  @Column('varchar', { length: 50, nullable: true })
  channelLevel2?: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
