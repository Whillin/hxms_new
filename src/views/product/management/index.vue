<template>
  <div class="page-content product-management">
    <ElCard shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ $t('menus.product.management') }}</span>
          <ElButton type="primary" @click="handleAdd" v-auth="'add'">
            <ElIcon><Plus /></ElIcon>
            新增车型
          </ElButton>
        </div>
      </template>

      <!-- 搜索表单 -->
      <div class="search-form">
        <ElRow :gutter="20">
          <ElCol :span="5">
            <ElInput
              v-model="searchForm.name"
              placeholder="请输入车型名称"
              clearable
              @keyup.enter="handleSearch"
            />
          </ElCol>
          <ElCol :span="5">
            <ElSelect v-model="searchForm.categoryId" placeholder="请选择商品分类" clearable>
              <ElOption
                v-for="category in flatCategoryOptions"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </ElSelect>
          </ElCol>
          <ElCol :span="4">
            <ElSelect v-model="searchForm.status" placeholder="请选择状态" clearable>
              <ElOption label="上架" :value="1" />
              <ElOption label="下架" :value="0" />
            </ElSelect>
          </ElCol>
          <ElCol :span="10">
            <ElButton type="primary" @click="handleSearch">
              <ElIcon><Search /></ElIcon>
              查询
            </ElButton>
            <ElButton @click="handleReset">
              <ElIcon><Refresh /></ElIcon>
              重置
            </ElButton>
            <ElButton
              type="success"
              @click="handleBatchExport"
              v-auth="'export'"
              :disabled="filteredTableData.length === 0"
            >
              <ElIcon><Download /></ElIcon>
              导出
            </ElButton>
          </ElCol>
        </ElRow>
      </div>

      <!-- 数据表格 -->
      <ElTable v-loading="loading" :data="filteredTableData" style="width: 100%; margin-top: 20px">
        <ElTableColumn type="index" label="序号" width="60" />

        <ElTableColumn prop="name" label="车型名称" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="categoryName" label="商品分类" width="150" />
        <ElTableColumn prop="price" label="指导价" width="120">
          <template #default="{ row }">
            <span class="price">¥{{ row.price.toLocaleString() }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="engineType" label="动力类型" width="100">
          <template #default="{ row }">
            <ElTag :type="row.engineType === 'NEV' ? 'success' : 'primary'">
              {{ row.engineType }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="sales" label="销量" width="80" />
        <ElTableColumn prop="status" label="状态" width="80">
          <template #default="{ row }">
            <ElSwitch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createTime" label="创建时间" width="160" />
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" link size="small" @click="handleView(row)"> 查看 </ElButton>
            <ElButton type="primary" link size="small" @click="handleEdit(row)" v-auth="'edit'">
              编辑
            </ElButton>
            <ElButton type="danger" link size="small" @click="handleDelete(row)" v-auth="'delete'">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <ElPagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </ElCard>

    <!-- 车型详情对话框 -->
    <ElDialog v-model="detailVisible" title="车型详情" width="800px">
      <div v-if="currentProduct" class="product-detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="车型名称">{{ currentProduct.name }}</ElDescriptionsItem>
          <ElDescriptionsItem label="商品分类">{{
            currentProduct.categoryName
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="指导价"
            >¥{{ currentProduct.price.toLocaleString() }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="动力类型">
            <ElTag :type="currentProduct.engineType === 'NEV' ? 'success' : 'primary'">
              {{ currentProduct.engineType }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="销量">{{ currentProduct.sales }}</ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="currentProduct.status === 1 ? 'success' : 'danger'">
              {{ currentProduct.status === 1 ? '上架' : '下架' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间" :span="2">{{
            currentProduct.createTime
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <div style="margin-top: 20px">
          <h4>车型描述</h4>
          <p>{{ currentProduct.description || '暂无描述' }}</p>
        </div>
      </div>
    </ElDialog>

    <!-- 新增车型对话框 -->
    <ElDialog v-model="addDialogVisible" title="新增车型" width="600px" @close="resetAddForm">
      <ElForm ref="addFormRef" :model="addForm" :rules="addFormRules" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="车型名称" prop="name">
              <ElInput
                v-model="addForm.name"
                placeholder="请输入车型名称"
                maxlength="100"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="商品分类" prop="categoryId">
              <ElSelect
                v-model="addForm.categoryId"
                placeholder="请选择商品分类"
                style="width: 100%"
              >
                <ElOption
                  v-for="category in flatCategoryOptions"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                  :disabled="category.status === 0"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="指导价" prop="price">
              <ElInput
                v-model.number="addForm.price"
                placeholder="请输入指导价"
                type="number"
                min="0"
                step="0.01"
              >
                <template #prepend>¥</template>
              </ElInput>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="动力类型" prop="engineType">
              <ElSelect
                v-model="addForm.engineType"
                placeholder="请选择动力类型"
                style="width: 100%"
              >
                <ElOption label="内燃机(ICE)" value="ICE" />
                <ElOption label="新能源(NEV)" value="NEV" />
                <ElOption label="混合动力(HEV)" value="HEV" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="状态">
              <ElSwitch
                v-model="addForm.status"
                :active-value="1"
                :inactive-value="0"
                active-text="上架"
                inactive-text="下架"
              />
            </ElFormItem>
          </ElCol>

          <ElCol :span="24">
            <ElFormItem label="车型描述">
              <ElInput
                v-model="addForm.description"
                type="textarea"
                :rows="3"
                placeholder="请输入车型描述（可选）"
                maxlength="500"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="addDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleAddSubmit">确定</ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- 编辑车型对话框 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="resetEditForm">
      <ElForm :model="form" label-width="100px">
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="车型名称">
              <ElInput
                v-model="form.name"
                placeholder="请输入车型名称"
                maxlength="100"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="商品分类">
              <ElSelect v-model="form.categoryId" placeholder="请选择商品分类" style="width: 100%">
                <ElOption
                  v-for="category in flatCategoryOptions"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="指导价">
              <ElInput
                v-model.number="form.price"
                placeholder="请输入指导价"
                type="number"
                min="0"
                step="0.01"
              >
                <template #prepend>¥</template>
              </ElInput>
            </ElFormItem>
          </ElCol>

          <ElCol :span="12">
            <ElFormItem label="动力类型">
              <ElSelect v-model="form.engineType" placeholder="请选择动力类型" style="width: 100%">
                <ElOption label="内燃机(ICE)" value="ICE" />
                <ElOption label="新能源(NEV)" value="NEV" />
                <ElOption label="混合动力(HEV)" value="HEV" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="状态">
              <ElSwitch
                v-model="form.status"
                :active-value="1"
                :inactive-value="0"
                active-text="上架"
                inactive-text="下架"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="车型描述">
              <ElInput
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入车型描述（可选）"
                maxlength="500"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>

      <template #footer>
        <div class="dialog-footer">
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleEditSubmit">确定</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { useProductCategoryStore } from '@/store/modules/productCategory'
  import { storeToRefs } from 'pinia'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Search, Refresh, Download } from '@element-plus/icons-vue'
  import {
    fetchGetProductList,
    fetchSaveProduct,
    fetchDeleteProduct,
    fetchGetProductsCategories
  } from '@/api/product'

  defineOptions({ name: 'ProductManagement' })

  // 定义产品行类型，确保详情对话框安全访问属性
  interface ProductRow {
    id: number
    name: string
    engineType: 'ICE' | 'NEV' | 'HEV' | string
    brandName: string
    categoryId?: number
    categoryName: string
    price: number
    sales: number
    status: number
    description: string
    createTime: string
  }

  // 响应式数据
  const loading = ref(false)
  const detailVisible = ref(false)
  const currentProduct = ref<ProductRow | null>(null)

  // 搜索表单
  const searchForm = reactive({
    name: '',
    categoryId: '',
    status: ''
  })

  // 分页数据
  const pagination = reactive({
    current: 1,
    size: 20,
    total: 0
  })

  // 分类选项
  const categoryStore = useProductCategoryStore()
  const { flatList } = storeToRefs(categoryStore)
  const flatCategoryOptions = flatList

  // 表格数据改为后端返回
  const tableData = ref<any[]>([])

  // 后端驱动的表格数据（不再做本地筛选）
  const filteredTableData = computed(() => tableData.value)

  // 编辑弹窗与表单（补充缺失的状态与方法）
  const dialogVisible = ref(false)
  const dialogTitle = ref('编辑车型')
  const currentEditId = ref<number | null>(null)
  const form = reactive({
    name: '',
    categoryId: undefined as number | undefined,
    engineType: undefined as 'ICE' | 'NEV' | 'HEV' | undefined,
    price: undefined as number | undefined,
    status: 1,
    description: ''
  })

  const resetEditForm = () => {
    currentEditId.value = null
    dialogTitle.value = '编辑车型'
    form.name = ''
    form.categoryId = undefined
    form.engineType = undefined
    form.price = undefined
    form.status = 1
    form.description = ''
  }

  const handleEdit = (row: any) => {
    currentEditId.value = Number(row.id)
    dialogTitle.value = '编辑车型'
    Object.assign(form, {
      name: row.name || '',
      categoryId: typeof row.categoryId === 'number' ? row.categoryId : undefined,
      engineType: ['ICE', 'NEV', 'HEV'].includes(String(row.engineType))
        ? (row.engineType as 'ICE' | 'NEV' | 'HEV')
        : undefined,
      price: typeof row.price === 'number' ? row.price : undefined,
      status: typeof row.status === 'number' ? row.status : 1,
      description: row.description || ''
    })
    dialogVisible.value = true
  }

  const handleView = (row: any) => {
    currentProduct.value = row
    detailVisible.value = true
  }

  // 生命周期与数据加载（恢复丢失的方法）
  onMounted(async () => {
    await categoryStore.loadFromApi()
    await loadData()
  })

  // 将后端 ProductModel 映射到表格行（填充演示字段）
  const mapToRow = (m: any) => ({
    id: m.id,
    name: m.name,
    // 优先使用后端的 engineType；无则从 series 推断
    engineType: m.engineType
      ? String(m.engineType).toUpperCase()
      : String(m.series || '')
            .toUpperCase()
            .includes('NEV')
        ? 'NEV'
        : 'ICE',
    brandName: m.brand || '',
    categoryId: undefined,
    // 分类名等待后续补充（通过查询关联分类IDs然后映射名称）
    categoryName: '',
    price: Number(m.price ?? 0),
    sales: Number(m.sales ?? 0),
    status: Number(m.status ?? 1),
    description: '',
    createTime: m.createdAt ? new Date(m.createdAt).toLocaleString('zh-CN') : ''
  })

  // 批量补充分类名称（逐个请求已关联分类IDs，然后映射到名称）
  const enrichCategoryNames = async (rows: any[]) => {
    const flat = flatCategoryOptions.value || []
    const idToName = (id?: number) => flat.find((c: any) => c.id === id)?.name || ''
    try {
      const ids = rows.map((r) => Number(r.id))
      const mapping = await fetchGetProductsCategories(ids)
      rows.forEach((row) => {
        const arr = Array.isArray((mapping as any)[row.id]) ? (mapping as any)[row.id] : []
        row.categoryId = arr[0]
        row.categoryName = arr
          .map((cid: number) => idToName(cid))
          .filter(Boolean)
          .join(' / ')
      })
    } catch (err) {
      void err
    }
  }

  // 方法
  const loadData = async () => {
    loading.value = true
    try {
      const result = await fetchGetProductList({
        current: pagination.current,
        size: pagination.size,
        name: searchForm.name || undefined,
        categoryId: typeof searchForm.categoryId === 'number' ? searchForm.categoryId : undefined,
        status: typeof searchForm.status === 'number' ? searchForm.status : undefined,
        includeChildren: false
      })
      tableData.value = (result.records || []).map(mapToRow)
      // 补充分类名称显示
      await enrichCategoryNames(tableData.value)
      pagination.total = result.total || 0
    } catch {
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 图片类型切换（避免未定义事件处理）
  const addDialogVisible = ref(false)
  const addFormRef = ref<any>(null)
  const addForm = reactive({
    name: '',
    categoryId: undefined as number | undefined,
    engineType: '',
    price: undefined as number | undefined,
    status: 1,
    description: ''
  })
  const addFormRules = {
    name: [{ required: true, message: '请输入车型名称', trigger: 'blur' }],
    categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
    engineType: [{ required: true, message: '请选择动力类型', trigger: 'change' }]
  }

  const resetAddForm = () => {
    addFormRef.value?.clearValidate?.()
    addForm.name = ''
    addForm.categoryId = undefined
    addForm.engineType = ''
    addForm.price = undefined
    addForm.status = 1
    addForm.description = ''
  }

  const handleAdd = async () => {
    // 懒加载分类：若首次打开且无选项，则尝试加载
    if (!flatCategoryOptions.value || flatCategoryOptions.value.length === 0) {
      try {
        await categoryStore.loadFromApi()
      } catch {
        ElMessage.error('分类加载失败')
      }
    }
    addDialogVisible.value = true
  }

  const handleSearch = () => {
    pagination.current = 1
    loadData()
  }

  const handleReset = () => {
    searchForm.name = ''
    searchForm.categoryId = ''
    searchForm.status = ''
    pagination.current = 1
    loadData()
  }

  // 批量导出当前列表到CSV
  const handleBatchExport = () => {
    const rows = (filteredTableData.value || []) as ProductRow[]
    const headers = [
      'ID',
      '车型名称',
      '动力类型',
      '品牌',
      '分类',
      '指导价',
      '销量',
      '状态',
      '创建时间'
    ]
    const csvLines = [headers.join(',')]
    rows.forEach((r) => {
      const values = [
        r.id,
        r.name,
        r.engineType,
        r.brandName,
        r.categoryName,
        r.price,
        r.sales,
        r.status === 1 ? '上架' : '下架',
        r.createTime
      ]
      const line = values.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      csvLines.push(line)
    })
    const blob = new Blob(['\ufeff' + csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `产品列表_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddSubmit = async () => {
    try {
      await addFormRef.value?.validate()
      const selectedCategory = flatCategoryOptions.value.find(
        (cat) => cat.id === addForm.categoryId
      )
      const brandName = selectedCategory?.brandName || ''
      const seriesName = selectedCategory?.categoryName || ''

      await fetchSaveProduct(
        {
          name: addForm.name,
          brand: brandName,
          series: seriesName,
          ...(addForm.engineType
            ? { engineType: addForm.engineType as 'ICE' | 'NEV' | 'HEV' }
            : {}),
          price: typeof addForm.price === 'number' ? addForm.price : 0,
          status: typeof addForm.status === 'number' ? addForm.status : 1,
          categories: addForm.categoryId ? [addForm.categoryId] : []
        },
        { showSuccessMessage: true }
      )

      ElMessage.success('新增车型成功')
      addDialogVisible.value = false
      resetAddForm()
      // 保存后刷新列表
      await loadData()
    } catch (e) {
      console.error('新增车型失败', e)
    }
  }

  const handleEditSubmit = async () => {
    if (!form.name) {
      ElMessage.warning('请输入车型名称')
      return
    }

    const selectedCategory = flatCategoryOptions.value.find((cat) => cat.id === form.categoryId)
    const brandName = selectedCategory?.brandName || ''
    const seriesName = selectedCategory?.categoryName || ''

    try {
      await fetchSaveProduct(
        {
          id: currentEditId.value as number,
          name: form.name,
          brand: brandName,
          series: seriesName,
          ...(form.engineType ? { engineType: form.engineType as 'ICE' | 'NEV' | 'HEV' } : {}),
          price: typeof form.price === 'number' ? form.price : 0,
          status: typeof form.status === 'number' ? form.status : 1,
          categories: form.categoryId ? [form.categoryId] : []
        },
        { showSuccessMessage: true }
      )
      ElMessage.success('编辑车型成功')
      dialogVisible.value = false
      resetEditForm()
      await loadData()
    } catch {
      ElMessage.error('编辑车型失败')
    }
  }

  const handleDelete = async (row: any) => {
    try {
      await ElMessageBox.confirm(`确定要删除车型"${row.name}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      await fetchDeleteProduct(row.id, { showSuccessMessage: true })
      await loadData()
    } catch {
      // 用户取消或删除失败
    }
  }

  const handleStatusChange = async (row: any) => {
    try {
      await fetchSaveProduct(
        { id: row.id, name: row.name, status: row.status },
        { showSuccessMessage: true }
      )
      ElMessage.success('状态已更新')
    } catch {
      ElMessage.error('状态更新失败，已还原')
      row.status = row.status === 1 ? 0 : 1
    }
  }

  const handleSizeChange = (size: number) => {
    pagination.size = size
    pagination.current = 1
    loadData()
  }

  const handleCurrentChange = (current: number) => {
    pagination.current = current
    loadData()
  }
</script>

<style lang="scss" scoped>
  .product-management {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .search-form {
      margin-bottom: 20px;
    }

    .price {
      font-weight: bold;
      color: #f56c6c;
    }

    .pagination-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }

    .product-detail {
      h4 {
        margin: 0 0 10px;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 0;
        line-height: 1.6;
        color: var(--el-text-color-regular);
      }
    }
  }
</style>
