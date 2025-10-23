import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 商品分类（层级：品牌/系列/分类等，采用父子关系） */
@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id!: number

  /** 父分类ID，根节点为 null */
  @Index('idx_parent')
  @Column('int', { nullable: true })
  parentId?: number | null

  /** 分类名称（同一父分类下唯一） */
  @Column('varchar', { length: 100 })
  name!: string

  /** 便于前端或 SEO 的标识（可选） */
  @Column('varchar', { length: 120, nullable: true })
  slug?: string

  /** 物化路径，例如 "/1/3/5"，用于快速筛选 */
  @Index('idx_path')
  @Column('varchar', { length: 255, nullable: true })
  path?: string

  /** 层级深度（根=0） */
  @Column('int', { default: 0 })
  level!: number

  /** 排序（同层级内） */
  @Column('int', { default: 0 })
  sortOrder!: number

  /** 状态：active/disabled */
  @Index('idx_status')
  @Column('varchar', { length: 20, default: 'active' })
  status!: 'active' | 'disabled'

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}