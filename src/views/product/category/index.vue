<template>
  <div class="page-content product-category">
    <ElCard shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t('menus.product.category') }}</span>
          <ElButton type="primary" @click="handleAdd" v-auth="'add'">
            <ElIcon><Plus /></ElIcon>
            新增分类
          </ElButton>
        </div>
      </template>

      <!-- 搜索表单 -->
      <div class="search-form">
        <ElRow :gutter="20">
          <ElCol :span="6">
            <ElInput v-model="searchForm.name" placeholder="请输入分类名称" clearable />
          </ElCol>
          <ElCol :span="6">
            <ElSelect v-model="searchForm.status" placeholder="请选择状态" clearable>
              <ElOption label="启用" :value="1" />
              <ElOption label="禁用" :value="0" />
            </ElSelect>
          </ElCol>
          <ElCol :span="12">
            <ElButton type="primary" @click="handleSearch">
              <ElIcon><Search /></ElIcon>
              查询
            </ElButton>
            <ElButton @click="handleReset">
              <ElIcon><Refresh /></ElIcon>
              重置
            </ElButton>
          </ElCol>
        </ElRow>
      </div>

      <!-- 数据表格 -->
      <ElTable
        v-loading="loading"
        :data="filteredTableData"
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        :default-expand-all="false"
        border
        style="width: 100%"
      >
        <ElTableColumn prop="name" label="分类名称" min-width="250">
          <template #default="{ row }">
            <div class="category-name" :class="`level-${row.level}`">
              <ElIcon v-if="row.level === 1" class="category-icon brand-icon"><Shop /></ElIcon>
              <ElIcon v-else class="category-icon sub-icon"><Discount /></ElIcon>
              <span class="name-text">{{ row.name }}</span>
              <ElTag v-if="row.level === 1" size="small" type="info" class="level-tag">品牌</ElTag>
              <ElTag v-else size="small" type="primary" class="level-tag">子分类</ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="code" label="分类编码" width="150" />
        <ElTableColumn prop="sort" label="排序" width="100" />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createTime" label="创建时间" width="180" />
        <ElTableColumn label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" link size="small" @click="handleEdit(row)" v-auth="'edit'">
              编辑
            </ElButton>
            <ElButton type="danger" link size="small" @click="handleDelete(row)" v-auth="'delete'">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="handleDialogClose">
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <ElFormItem label="上级分类" prop="parentId">
          <ElSelect
            v-model="formData.parentId"
            placeholder="选择父级（留空为一级）"
            clearable
            style="width: 100%"
            :disabled="!!formData.id"
            @clear="formData.parentId = 0"
          >
            <ElOption :label="'无父级'" :value="0" />
            <ElOption
              v-for="brand in brandOptions"
              :key="brand.id"
              :label="brand.name"
              :value="brand.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="分类名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入分类名称" />
        </ElFormItem>
        <ElFormItem label="分类编码" prop="code">
          <ElInput v-model="formData.code" placeholder="系统自动生成" disabled />
        </ElFormItem>
        <ElFormItem label="排序" prop="sort">
          <ElInputNumber v-model="formData.sort" :min="0" :max="999" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElRadioGroup v-model="formData.status">
            <ElRadio :label="1">启用</ElRadio>
            <ElRadio :label="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="描述" prop="description">
          <ElInput
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit" :loading="submitLoading"> 确定 </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useProductCategoryStore } from '@/store/modules/productCategory'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Search, Refresh, Shop, Discount } from '@element-plus/icons-vue'

  defineOptions({ name: 'ProductCategory' })

  // 响应式数据
  const loading = ref(false)
  const submitLoading = ref(false)
  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  const parentCategoryName = ref('')
  const searchTriggered = ref(false) // 搜索触发标志

  // 搜索表单
  const searchForm = reactive({
    name: '',
    status: ''
  })

  // 搜索参数（实际用于筛选的参数）
  const searchParams = reactive({
    name: '',
    status: ''
  })

  // 表格数据（接入共享Store，使用 storeToRefs 保证响应式）
  const categoryStore = useProductCategoryStore()
  const { tree } = storeToRefs(categoryStore)
  const tableData = tree
  // 一级分类选项（品牌）
  const brandOptions = computed(() =>
    tableData.value
      .filter((item: any) => item.level === 1)
      .map((b: any) => ({ id: b.id, name: b.name, code: b.code }))
  )

  // 表单数据
  const formData = reactive({
    id: null,
    name: '',
    code: '',
    sort: 0,
    status: 1,
    parentId: 0,
    description: ''
  })

  // 父级变化时自动生成编码与排序（仅新增时）
  watch(
    () => formData.parentId,
    (newVal) => {
      if (!formData.id) {
        const parent = newVal ? findCategoryById(Number(newVal)) : null
        const level = newVal ? 2 : 1
        formData.code = generateCategoryCode(parent ? parent.code : '', level, formData.name)
        formData.sort = getNextSort(newVal ? Number(newVal) : 0)
        parentCategoryName.value = parent?.name || ''
      }
    }
  )

  // 名称变化时，如果是新增且为一级分类，则根据名称生成编码
  watch(
    () => formData.name,
    (newName) => {
      if (!formData.id && Number(formData.parentId) === 0) {
        formData.code = generateCategoryCode('', 1, newName)
      }
    }
  )

  // 表单验证规则
  const formRules = {
    name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
    sort: [{ required: true, message: '请输入排序', trigger: 'blur' }]
  }

  const formRef = ref()

  // 生命周期
  onMounted(() => {
    loadData()
  })

  // 计算属性 - 筛选后的表格数据
  const filteredTableData = computed(() => {
    // 如果没有触发搜索或搜索条件为空，显示所有数据
    if (!searchTriggered.value || (!searchParams.name && searchParams.status === '')) {
      return tableData.value
    }

    return filterTreeData(tableData.value, (item) => {
      const nameMatch =
        !searchParams.name || item.name.toLowerCase().includes(searchParams.name.toLowerCase())
      const statusMatch = searchParams.status === '' || item.status === searchParams.status
      return nameMatch && statusMatch
    })
  })

  // 递归筛选树形数据
  const filterTreeData = (data: any[], predicate: (item: any) => boolean): any[] => {
    return data.reduce((acc, item) => {
      const itemMatches = predicate(item)
      const children = item.children ? filterTreeData(item.children, predicate) : []

      // 如果当前项匹配或有匹配的子项，则包含此项
      if (itemMatches || children.length > 0) {
        acc.push({
          ...item,
          children: children.length > 0 ? children : item.children
        })
      }

      return acc
    }, [])
  }
  const loadData = async () => {
    loading.value = true
    try {
      // 这里应该调用实际的API
      // const response = await getCategoryList(searchForm)
      // tableData.value = response.data

      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch {
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  const handleSearch = () => {
    // 将搜索表单的值复制到搜索参数中
    Object.assign(searchParams, searchForm)
    // 设置搜索触发标志
    searchTriggered.value = true
    console.log('执行搜索:', searchParams)
  }

  const handleReset = () => {
    // 重置搜索表单
    searchForm.name = ''
    searchForm.status = ''
    // 重置搜索参数
    searchParams.name = ''
    searchParams.status = ''
    // 重置搜索触发标志
    searchTriggered.value = false
    console.log('重置搜索条件')
  }

  const handleAdd = () => {
    resetForm()
    formData.parentId = 0
    formData.code = generateCategoryCode('', 1)
    formData.sort = getNextSort(0)
    dialogTitle.value = '新增分类'
    dialogVisible.value = true
  }

  const handleEdit = (row: any) => {
    dialogTitle.value = '编辑分类'
    // 深拷贝数据，避免直接修改原数据
    Object.assign(formData, {
      id: row.id,
      name: row.name,
      code: row.code,
      sort: row.sort,
      status: row.status,
      parentId: row.parentId,
      description: row.description
    })

    if (row.parentId && row.parentId > 0) {
      // 查找父级分类名称
      const parent = findCategoryById(row.parentId)
      parentCategoryName.value = parent ? parent.name : ''
    } else {
      parentCategoryName.value = ''
    }

    dialogVisible.value = true
  }

  const handleDelete = async (row: any) => {
    try {
      // 检查是否有子分类
      if (row.children && row.children.length > 0) {
        ElMessage.warning('该分类下还有子分类，请先删除子分类')
        return
      }

      await ElMessageBox.confirm(`确定要删除分类"${row.name}"吗？删除后不可恢复！`, '删除确认', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      })

      loading.value = true

      // 模拟删除API调用
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 从数据中删除该项
      removeFromTableData(row.id)

      ElMessage.success('删除成功')
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败，请重试')
      }
    } finally {
      loading.value = false
    }
  }

  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      submitLoading.value = true

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (formData.id) {
        // 编辑模式：更新现有数据
        updateTableData(formData)
        ElMessage.success('更新成功')
      } else {
        // 新增模式：根据是否选择父级，添加一级或二级
        addToTableData({
          ...formData,
          parentId: Number(formData.parentId) || 0,
          level: formData.parentId && Number(formData.parentId) > 0 ? 2 : 1
        })
        ElMessage.success('创建成功')
      }

      dialogVisible.value = false
    } catch (error) {
      if (error !== 'validation-failed') {
        ElMessage.error('操作失败，请重试')
      }
    } finally {
      submitLoading.value = false
    }
  }

  // 添加数据到表格
  const addToTableData = (data: any) => {
    const newItem = {
      ...data,
      id: Date.now(), // 临时ID，实际应该由后端返回
      level: data.level ?? (data.parentId === 0 ? 1 : 2),
      createTime: new Date().toLocaleString('zh-CN'),
      children: data.parentId === 0 ? [] : undefined,
      hasChildren: data.parentId === 0 ? false : false // 新增的分类默认没有子分类
    }

    // 同步到共享Store（让车型管理页下拉即时刷新）
    if (newItem.parentId === 0) {
      categoryStore.addCategory({
        name: newItem.name,
        parentId: 0,
        level: 1,
        code: newItem.code,
        sort: newItem.sort,
        status: newItem.status,
        description: newItem.description
      })
    } else {
      categoryStore.addCategory({
        name: newItem.name,
        parentId: newItem.parentId,
        level: 2,
        code: newItem.code,
        sort: newItem.sort,
        status: newItem.status,
        description: newItem.description
      })
    }
  }

  // 更新表格数据
  const updateTableData = (data: any) => {
    const updateInArray = (arr: any[]): boolean => {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id === data.id) {
          // 保留原有的children和其他系统字段
          arr[i] = {
            ...arr[i],
            ...data,
            id: data.id // 确保ID不变
          }
          return true
        }
        if (arr[i].children && updateInArray(arr[i].children)) {
          return true
        }
      }
      return false
    }
    updateInArray(tableData.value)
    // 同步到共享Store
    categoryStore.updateCategory({
      id: data.id,
      name: data.name,
      parentId: data.parentId,
      level: data.parentId === 0 ? 1 : 2,
      code: data.code,
      sort: data.sort,
      status: data.status,
      description: data.description,
      hasChildren: undefined
    } as any)
    // 若为一级分类且禁用，级联禁用其子分类
    if (data.parentId === 0 && data.status === 0) {
      const brand = findCategoryById(data.id)
      if (brand?.children?.length) {
        brand.children.forEach((child: any) => {
          child.status = 0
          categoryStore.updateCategory({
            id: child.id,
            name: child.name,
            parentId: child.parentId,
            level: 2,
            code: child.code,
            sort: child.sort,
            status: 0,
            description: child.description
          } as any)
        })
      }
    }
  }

  // 从表格数据中删除项目
  const removeFromTableData = (id: number) => {
    const removeFromArray = (arr: any[]): boolean => {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          arr.splice(i, 1)
          return true
        }
        if (arr[i].children && removeFromArray(arr[i].children)) {
          return true
        }
      }
      return false
    }
    removeFromArray(tableData.value)
    // 同步到共享Store
    categoryStore.removeCategory(id)
  }

  const handleDialogClose = () => {
    resetForm()
  }

  const resetForm = () => {
    formData.id = null
    formData.name = ''
    formData.code = ''
    formData.sort = 0
    formData.status = 1
    formData.parentId = 0
    formData.description = ''
    parentCategoryName.value = ''

    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  // 将中文品牌名转为英文前缀（常见品牌映射，未匹配时尝试提取英文字符）
  const toEnglishPrefix = (name: string = '') => {
    const map: Record<string, string> = {
      小米: 'XIAOMI',
      比亚迪: 'BYD',
      蔚来: 'NIO',
      理想: 'LIXIANG',
      极氪: 'ZEEKR',
      吉利: 'GEELY',
      大众: 'VOLKSWAGEN',
      丰田: 'TOYOTA',
      本田: 'HONDA',
      宝马: 'BMW',
      奔驰: 'BENZ',
      奥迪: 'AUDI',
      特斯拉: 'TESLA',
      小鹏: 'XPENG',
      长城: 'GREATWALL',
      奇瑞: 'CHERY',
      福特: 'FORD',
      日产: 'NISSAN',
      现代: 'HYUNDAI',
      长安: 'CHANGAN',
      广汽: 'GAC'
    }
    if (!name) return ''
    if (map[name]) return map[name]
    // 提取已有英文字符作为前缀
    const ascii = (name || '').replace(/[^A-Za-z]/g, '')
    return ascii ? ascii.toUpperCase() : ''
  }

  // 生成分类编码
  const generateCategoryCode = (parentCode: string = '', level: number = 1, name: string = '') => {
    if (level === 1) {
      // 一级分类：根据名称英文前缀 + 两位序号
      const prefix = toEnglishPrefix(name)
      if (prefix) {
        const level1 = getAllCategories().filter((item) => item.level === 1)
        // 找到相同前缀的最大序号（两位）
        let maxNum = 0
        level1.forEach((item) => {
          const match = item.code.match(new RegExp(`^${prefix}(\\d{2})$`))
          if (match) {
            const num = parseInt(match[1])
            if (num > maxNum) maxNum = num
          }
        })
        const nextNum = (maxNum + 1).toString().padStart(2, '0')
        return `${prefix}${nextNum}`
      }
      // 名称为空或无法转换英文时，回退到通用前缀
      const existingCodes = tableData.value
        .filter((item) => item.level === 1)
        .map((item) => item.code)
      let maxNum = 0
      existingCodes.forEach((code) => {
        const match = code.match(/BRAND(\d{2})$/)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNum) maxNum = num
        }
      })
      const nextNum = (maxNum + 1).toString().padStart(2, '0')
      return `BRAND${nextNum}`
    } else {
      // 二级分类：在父级编码基础上递增
      if (!parentCode) return ''

      const siblingCodes = getAllCategories()
        .filter((item) => item.parentId === formData.parentId && item.level === 2)
        .map((item) => item.code)

      let maxNum = 0
      siblingCodes.forEach((code) => {
        const match = code.match(/(\d{3})$/)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNum) maxNum = num
        }
      })

      const nextNum = (maxNum + 1).toString().padStart(3, '0')
      return `${parentCode}${nextNum}`
    }
  }

  // 获取下一个排序号
  const getNextSort = (parentId: number = 0) => {
    const siblings = getAllCategories().filter((item) => item.parentId === parentId)
    const maxSort = siblings.length > 0 ? Math.max(...siblings.map((item) => item.sort || 0)) : 0
    return maxSort + 1
  }

  // 查找分类
  const findCategoryById = (id: number): any => {
    const findInArray = (arr: any[]): any => {
      for (const item of arr) {
        if (item.id === id) return item
        if (item.children) {
          const found = findInArray(item.children)
          if (found) return found
        }
      }
      return null
    }
    return findInArray(tableData.value)
  }

  // 获取所有分类（扁平化）
  const getAllCategories = () => {
    const result: any[] = []
    const flatten = (arr: any[]) => {
      arr.forEach((item) => {
        result.push(item)
        if (item.children) {
          flatten(item.children)
        }
      })
    }
    flatten(tableData.value)
    return result
  }

  // 移除未使用的辅助函数以避免未使用变量告警
</script>

<style lang="scss" scoped>
  .product-category {
    padding: 20px;

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .search-form {
      margin-bottom: 20px;
    }

    .category-name {
      display: inline-flex;
      gap: 8px;
      align-items: center;

      .category-icon {
        margin-right: 8px;
        font-size: 16px;
      }

      &.level-1 {
        font-weight: 600;
        color: #303133;
      }

      &.level-2 {
        padding-left: 10px;
        font-weight: 500;
        color: #606266;
      }
    }

    .brand-icon {
      color: #409eff;
    }

    .sub-icon {
      color: #67c23a;
    }

    .name-text {
      flex: 1;
    }

    .level-tag {
      margin-left: 8px;
    }

    /* 展开箭头显示在左侧（Element Plus 默认在左侧），确保不被隐藏 */
    :deep(.el-table__expand-icon) {
      display: inline-flex !important;
      margin-right: 6px;
      vertical-align: middle;
    }

    /* 为一级分类添加更明显的样式 */
    :deep(.el-table__row--level-0) {
      font-weight: 600;
      background-color: #fafafa;
    }

    :deep(.el-table__row--level-1) {
      background-color: #fff;
    }

    /* 调整树形表格的缩进 */
    :deep(.el-table__indent) {
      padding-left: 30px;
    }
  }
</style>
