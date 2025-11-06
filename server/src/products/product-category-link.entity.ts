import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm'

/** 商品与分类的多对多关联 */
@Entity('product_category_links')
export class ProductCategoryLink {
  @PrimaryGeneratedColumn()
  id!: number

  @Index('uniq_product_category', { unique: true })
  @Column('int')
  productId!: number

  @Column('int')
  categoryId!: number

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
