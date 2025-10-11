<template>
  <div class="page-content product-category">
    <ElCard shadow="never">
      <template #header>
        <div class="card-header">
          <span>车型分类管理</span>
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
            <ElInput
              v-model="searchForm.name"
              placeholder="请输入分类名称"
              clearable
            />
          </ElCol>
          <ElCol :span="6">
            <ElSelect
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
            >
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
          default-expand-all
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
            <ElButton
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
              v-auth="'edit'"
            >
              编辑
            </ElButton>
            <ElButton
              type="primary"
              link
              size="small"
              @click="handleAddChild(row)"
              v-if="row.level === 1"
              v-auth="'add'"
            >
              添加子分类
            </ElButton>
            <ElButton
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
              v-auth="'delete'"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <ElFormItem label="上级分类" prop="parentId" v-if="formData.parentId">
          <ElInput v-model="parentCategoryName" disabled />
        </ElFormItem>
        <ElFormItem label="分类名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入分类名称" />
        </ElFormItem>
        <ElFormItem label="分类编码" prop="code">
          <ElInput
            v-model="formData.code"
            placeholder="系统自动生成"
            disabled
          />
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
        <ElButton type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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

// 表格数据
const tableData = ref([
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

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ],
  sort: [
    { required: true, message: '请输入排序', trigger: 'blur' }
  ]
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
    const nameMatch = !searchParams.name || item.name.toLowerCase().includes(searchParams.name.toLowerCase())
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
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (error) {
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

const handleAdd = (parentId: number = 0) => {
  resetForm()
  const level = parentId === 0 ? 1 : 2
  const parentItem = parentId > 0 ? findCategoryById(parentId) : null
  const parentCode = parentItem ? parentItem.code : ''
  
  formData.parentId = parentId
  formData.code = generateCategoryCode(parentCode, level) // 自动生成编码
  formData.sort = getNextSort(parentId) // 自动生成排序
  
  if (parentId > 0) {
    parentCategoryName.value = parentItem ? parentItem.name : ''
  }
  
  dialogTitle.value = parentId === 0 ? '新增一级分类' : '新增二级分类'
  dialogVisible.value = true
}

const handleAddChild = (row: any) => {
  resetForm()
  formData.parentId = row.id
  formData.code = generateCategoryCode(row.code, 2) // 自动生成子分类编码
  formData.sort = getNextSort(row.id) // 自动生成排序
  parentCategoryName.value = row.name
  dialogTitle.value = '新增子分类'
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
    
    await ElMessageBox.confirm(
      `确定要删除分类"${row.name}"吗？删除后不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    loading.value = true
    
    // 模拟删除API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
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
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (formData.id) {
      // 编辑模式：更新现有数据
      updateTableData(formData)
      ElMessage.success('更新成功')
    } else {
      // 新增模式：添加新数据
      addToTableData(formData)
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
    level: data.parentId === 0 ? 1 : 2,
    createTime: new Date().toLocaleString('zh-CN'),
    children: data.parentId === 0 ? [] : undefined,
    hasChildren: data.parentId === 0 ? false : false // 新增的分类默认没有子分类
  }
  
  if (data.parentId === 0) {
    // 一级分类
    tableData.value.push(newItem)
  } else {
    // 二级分类，找到父级并添加
    const parent = findCategoryById(data.parentId)
    if (parent) {
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(newItem)
      // 更新父级的hasChildren属性
      parent.hasChildren = true
    }
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

// 生成分类编码
const generateCategoryCode = (parentCode: string = '', level: number = 1) => {
  if (level === 1) {
    // 一级分类：品牌编码
    const brandCodes = ['AUDI', 'XPENG', 'BMW', 'BENZ', 'TESLA', 'BYD', 'NIO', 'LIXIANG']
    const existingCodes = tableData.value
      .filter(item => item.level === 1)
      .map(item => item.code.replace(/\d+$/, ''))
    
    // 找到未使用的品牌编码
    const availableCode = brandCodes.find(code => !existingCodes.includes(code))
    if (availableCode) {
      return `${availableCode}001`
    }
    
    // 如果预设编码都用完了，生成新的
    const timestamp = Date.now().toString().slice(-3)
    return `BRAND${timestamp}`
  } else {
    // 二级分类：在父级编码基础上递增
    if (!parentCode) return ''
    
    const siblingCodes = getAllCategories()
      .filter(item => item.parentId === formData.parentId && item.level === 2)
      .map(item => item.code)
    
    let maxNum = 0
    siblingCodes.forEach(code => {
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
  const siblings = getAllCategories().filter(item => item.parentId === parentId)
  const maxSort = siblings.length > 0 ? Math.max(...siblings.map(item => item.sort || 0)) : 0
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
    arr.forEach(item => {
      result.push(item)
      if (item.children) {
        flatten(item.children)
      }
    })
  }
  flatten(tableData.value)
  return result
}

const findParentCategory = (parentId: number) => {
  for (const item of tableData.value) {
    if (item.id === parentId) {
      return item
    }
  }
  return null
}
</script>

<style lang="scss" scoped>
.product-category {
  padding: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-form {
    margin-bottom: 20px;
  }

  .category-name {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .category-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    &.level-1 {
      font-weight: 600;
      color: #303133;
    }
    
    &.level-2 {
      font-weight: 500;
      color: #606266;
      padding-left: 10px;
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
  
  /* 自定义树形表格的展开图标样式 */
  :deep(.el-table__expand-icon) {
    display: none !important;
  }
  
  /* 为一级分类添加更明显的样式 */
  :deep(.el-table__row--level-0) {
    background-color: #fafafa;
    font-weight: 600;
  }
  
  :deep(.el-table__row--level-1) {
    background-color: #ffffff;
  }
  
  /* 调整树形表格的缩进 */
  :deep(.el-table__indent) {
    padding-left: 30px;
  }
}
</style>