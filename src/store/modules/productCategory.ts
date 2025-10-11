import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CategoryNode {
  id: number
  name: string
  code?: string
  parentId: number
  level: number
  sort?: number
  status?: number
  description?: string
  createTime?: string
  hasChildren?: boolean
  children?: CategoryNode[]
}

export const useProductCategoryStore = defineStore(
  'productCategoryStore',
  () => {
    // 分类树数据（与分类管理页一致的示例数据）
    const tree = ref<CategoryNode[]>([
      {
        id: 1,
        name: '奥迪',
        code: 'AUDI001',
        parentId: 0,
        level: 1,
        sort: 1,
        status: 1,
        description: '奥迪汽车品牌分类',
        createTime: '2024-01-15 10:30:00',
        hasChildren: true,
        children: [
          {
            id: 2,
            name: 'CKD(ICE)',
            code: 'AUDI001001',
            parentId: 1,
            level: 2,
            sort: 1,
            status: 1,
            description: '奥迪CKD内燃机车型',
            createTime: '2024-01-15 10:35:00',
            hasChildren: false
          },
          {
            id: 3,
            name: 'NEV',
            code: 'AUDI001002',
            parentId: 1,
            level: 2,
            sort: 2,
            status: 1,
            description: '奥迪新能源车型',
            createTime: '2024-01-15 10:40:00',
            hasChildren: false
          },
          {
            id: 4,
            name: 'FBU',
            code: 'AUDI001003',
            parentId: 1,
            level: 2,
            sort: 3,
            status: 1,
            description: '奥迪FBU车型',
            createTime: '2024-01-15 10:45:00',
            hasChildren: false
          }
        ]
      },
      {
        id: 5,
        name: '小鹏',
        code: 'XPENG001',
        parentId: 0,
        level: 1,
        sort: 2,
        status: 1,
        description: '小鹏汽车品牌分类',
        createTime: '2024-01-15 11:00:00',
        hasChildren: true,
        children: [
          {
            id: 6,
            name: 'NEV',
            code: 'XPENG001001',
            parentId: 5,
            level: 2,
            sort: 1,
            status: 1,
            description: '小鹏新能源车型',
            createTime: '2024-01-15 11:05:00',
            hasChildren: false
          }
        ]
      }
    ])

    const flatList = computed(() => {
      const res: {
        id: number
        name: string
        brandName: string
        categoryName: string
        status?: number
      }[] = []
      tree.value.forEach((brand) => {
        const children = brand.children || []
        if (children.length > 0) {
          children.forEach((child) => {
            res.push({
              id: child.id,
              name: `${brand.name} - ${child.name}`,
              brandName: brand.name,
              categoryName: child.name,
              status: child.status
            })
          })
        } else {
          // 品牌无子分类时，直接提供品牌供选择
          res.push({
            id: brand.id,
            name: brand.name,
            brandName: brand.name,
            categoryName: '',
            status: brand.status
          })
        }
      })
      return res
    })

    // 添加/更新/删除，供分类管理页调用以同步管理页选项
    const addCategory = (
      node: Omit<CategoryNode, 'id' | 'createTime' | 'children' | 'hasChildren'>
    ) => {
      const newNode: CategoryNode = {
        ...node,
        id: Date.now(),
        createTime: new Date().toLocaleString('zh-CN'),
        children: node.level === 1 ? [] : undefined,
        hasChildren: node.level === 1 ? false : false
      }
      if (node.parentId === 0) {
        // 新增品牌，默认不可展开（hasChildren=false），但 children 为空数组，ElTable 使用 children/hasChildren 判断
        newNode.hasChildren = false
        newNode.children = []
        tree.value.push(newNode)
      } else {
        const parent = findById(node.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(newNode)
          parent.hasChildren = true
        }
      }
      return newNode
    }

    const updateCategory = (data: CategoryNode) => {
      const cascadeChildrenStatus = (children: CategoryNode[], status: number) => {
        for (const child of children) {
          child.status = status
          if (child.children && child.children.length > 0) {
            cascadeChildrenStatus(child.children, status)
          }
        }
      }

      const walk = (arr: CategoryNode[]): boolean => {
        for (let i = 0; i < arr.length; i++) {
          const node = arr[i]
          if (node.id === data.id) {
            arr[i] = { ...node, ...data }
            // 若更新的是品牌（level=1）并且状态发生变化，则级联到子分类
            if (
              typeof data.status !== 'undefined' &&
              node.level === 1 &&
              node.children &&
              node.children.length > 0
            ) {
              cascadeChildrenStatus(node.children, data.status)
            }
            return true
          }
          if (node.children && walk(node.children)) return true
        }
        return false
      }
      walk(tree.value)
    }

    const removeCategory = (id: number) => {
      const walk = (arr: CategoryNode[]): boolean => {
        for (let i = 0; i < arr.length; i++) {
          const node = arr[i]
          if (node.id === id) {
            arr.splice(i, 1)
            return true
          }
          if (node.children && walk(node.children)) {
            // 子节点删除后，若 children 为空则同步 hasChildren=false
            if (node.children.length === 0) node.hasChildren = false
            return true
          }
        }
        return false
      }
      walk(tree.value)
    }

    const findById = (id: number) => {
      const walk = (arr: CategoryNode[]): CategoryNode | null => {
        for (const item of arr) {
          if (item.id === id) return item
          if (item.children) {
            const f = walk(item.children)
            if (f) return f
          }
        }
        return null
      }
      return walk(tree.value)
    }

    return {
      tree,
      flatList,
      addCategory,
      updateCategory,
      removeCategory,
      findById
    }
  },
  {
    persist: {
      key: 'productCategory',
      storage: localStorage
    }
  }
)
