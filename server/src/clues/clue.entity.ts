import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 线索实体（门店维度，可扩展到区域/品牌） */
@Entity('clues')
export class Clue {
  @PrimaryGeneratedColumn()
  id!: number

  /** 到店日期（YYYY-MM-DD） */
  @Column('varchar', { length: 10 })
  visitDate!: string

  /** 进店/离店时间（HH:mm） */
  @Column('varchar', { length: 10, nullable: true })
  enterTime?: string
  @Column('varchar', { length: 10, nullable: true })
  leaveTime?: string

  /** 接待时长(分钟)与到店人数 */
  @Column('int', { default: 0 })
  receptionDuration!: number
  @Column('int', { default: 1 })
  visitorCount!: number

  /** 接待情况与销售顾问 */
  @Column('varchar', { length: 20, default: 'sales' })
  receptionStatus!: 'sales' | 'none' | 'noNeed'
  @Column('varchar', { length: 50, nullable: true })
  salesConsultant?: string

  /** 客户基础信息（冗余，用于列表搜索/展示） */
  @Column('varchar', { length: 50 })
  customerName!: string
  @Column('varchar', { length: 20 })
  customerPhone!: string
  /** 关联客户ID（规范化） */
  @Column('int', { nullable: true })
  customerId?: number

  /** 到店事宜、是否加微、到店分类 */
  @Column('varchar', { length: 20, default: '看车' })
  visitPurpose!: '看车' | '维保' | '提车' | '续保' | '咨询' | '拜访'
  // 是否加微
  @Column('tinyint', { default: false, name: 'isAddWeChat' })
  isAddWeChat!: boolean
  @Column('varchar', { length: 10, default: '首次' })
  visitCategory!: '首次' | '再次'

  /** 关注/成交车型（名称与可选ID） */
  @Column('int', { nullable: true })
  focusModelId?: number
  @Column('varchar', { length: 100, nullable: true })
  focusModelName?: string
  @Column('tinyint', { default: false })
  testDrive!: boolean
  @Column('tinyint', { default: false })
  bargaining!: boolean
  @Column('tinyint', { default: false })
  dealDone!: boolean
  @Column('int', { nullable: true })
  dealModelId?: number
  @Column('varchar', { length: 100, nullable: true })
  dealModelName?: string

  /** 渠道与来源（冗余字段） */
  @Column('varchar', { length: 20, default: '自然到店' })
  businessSource!: string
  @Column('varchar', { length: 10, default: '线下' })
  channelCategory!: string
  @Column('varchar', { length: 50, nullable: true })
  channelLevel1?: string
  @Column('varchar', { length: 50, nullable: true })
  channelLevel2?: string
  /** 关联渠道ID（规范化） */
  @Column('int', { nullable: true })
  channelId?: number
  @Column('varchar', { length: 100, nullable: true })
  convertOrRetentionModel?: string
  @Column('varchar', { length: 50, nullable: true })
  referrer?: string
  @Column('int', { default: 1 })
  contactTimes!: number

  /** 商机级别：H/A/B/C */
  @Column('varchar', { length: 5 })
  opportunityLevel!: 'H' | 'A' | 'B' | 'C'

  /** 客户画像 */
  @Column('varchar', { length: 10, default: '未知' })
  userGender!: '男' | '女' | '未知'
  @Column('int', { default: 0 })
  userAge!: number
  @Column('varchar', { length: 10, default: '首购' })
  buyExperience!: '首购' | '换购' | '增购'
  @Column('varchar', { length: 50, nullable: true })
  userPhoneModel?: string
  @Column('varchar', { length: 50, nullable: true })
  currentBrand?: string
  @Column('varchar', { length: 50, nullable: true })
  currentModel?: string
  @Column('int', { default: 0 })
  carAge!: number
  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  mileage!: number
  @Column('varchar', { length: 120, nullable: true })
  livingArea?: string

  /** 快照字段（创建/保存时写入，后续不随主数据变化） */
  @Column('json', { nullable: true })
  customerSnapshot?: {
    id?: number
    name?: string
    phone?: string
    gender?: '男' | '女' | '未知'
    age?: number
    buyExperience?: '首购' | '换购' | '增购'
    phoneModel?: string
    currentBrand?: string
    currentModel?: string
    carAge?: number
    mileage?: number
    livingArea?: string
    storeId?: number
  }

  @Column('json', { nullable: true })
  channelSnapshot?: {
    id?: number
    category?: string
    businessSource?: string
    level1?: string
    level2?: string
    compoundKey?: string
  }

  @Column('json', { nullable: true })
  productSnapshot?: {
    focus?: { id?: number; name?: string }
    deal?: { id?: number; name?: string }
  }

  /** 归属门店/区域/品牌（列表过滤用） */
  @Index('idx_brand')
  @Column('int', { nullable: true })
  brandId?: number

  @Index('idx_region')
  @Column('int', { nullable: true })
  regionId?: number

  @Index('idx_store')
  @Column('int')
  storeId!: number

  /** 可选：小组维度（销售经理） */
  @Column('int', { nullable: true })
  departmentId?: number

  /** 创建人（员工ID），用于“本人”范围过滤 */
  @Index('idx_created_by')
  @Column('int', { nullable: true })
  createdBy?: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
