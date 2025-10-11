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
        <ElTableColumn prop="image" label="车型图片" width="100">
          <template #default="{ row }">
            <ElImage
              :src="row.image"
              :preview-src-list="[row.image]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              preview-teleported
            />
          </template>
        </ElTableColumn>
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
          :total="filteredTableData.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </ElCard>

    <!-- 车型详情对话框 -->
    <ElDialog v-model="detailVisible" title="车型详情" width="800px">
      <div v-if="currentProduct" class="product-detail">
        <ElRow :gutter="20">
          <ElCol :span="8">
            <ElImage
              :src="currentProduct.image"
              fit="cover"
              style="width: 100%; height: 200px; border-radius: 8px"
            />
          </ElCol>
          <ElCol :span="16">
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
          </ElCol>
        </ElRow>
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
            <ElFormItem label="指导价" prop="price">
              <ElInput
                v-model="addForm.price"
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
            <ElFormItem label="车型图片">
              <div class="image-upload-section">
                <ElRadioGroup v-model="imageUploadType" @change="handleImageTypeChange">
                  <ElRadio label="url">URL链接</ElRadio>
                  <ElRadio label="upload">本地上传</ElRadio>
                </ElRadioGroup>

                <div v-if="imageUploadType === 'url'" class="mt-2">
                  <ElInput v-model="addForm.image" placeholder="请输入车型图片URL" />
                </div>

                <div v-else class="mt-2">
                  <ElUpload
                    class="image-uploader"
                    action="#"
                    :show-file-list="false"
                    :before-upload="beforeImageUpload"
                    :http-request="handleImageUpload"
                  >
                    <img v-if="addForm.image" :src="addForm.image" class="uploaded-image" />
                    <ElIcon v-else class="image-uploader-icon"><Plus /></ElIcon>
                  </ElUpload>
                  <div class="upload-tip">支持 jpg、png 格式，大小不超过 2MB</div>
                </div>
              </div>
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
                v-model="form.price"
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
            <ElFormItem label="原价">
              <ElInput
                v-model="form.originalPrice"
                placeholder="请输入原价"
                type="number"
                min="0"
                step="0.01"
              >
                <template #prepend>¥</template>
              </ElInput>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="库存">
              <ElInput v-model="form.stock" placeholder="请输入库存数量" type="number" min="0" />
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

  defineOptions({ name: 'ProductManagement' })

  // 响应式数据
  const loading = ref(false)
  const detailVisible = ref(false)
  const currentProduct = ref(null)

  // 搜索表单
  const searchForm = reactive({
    name: '',
    categoryId: '',
    status: ''
  })

  // 搜索参数（实际用于筛选的参数）
  const searchParams = reactive({
    name: '',
    categoryId: '',
    status: ''
  })

  // 搜索触发标志
  const searchTriggered = ref(false)

  // 分页数据
  const pagination = reactive({
    current: 1,
    size: 20,
    total: 0
  })

  // 分类选项改为使用共享Store（使用 storeToRefs 确保响应式）
  const categoryStore = useProductCategoryStore()
  const { flatList } = storeToRefs(categoryStore)
  const flatCategoryOptions = flatList

  // 表格数据
  const tableData = ref([
    {
      id: 1,
      name: '奥迪A4L 2024款 40 TFSI 时尚动感型',
      categoryId: 2,
      categoryName: '奥迪 - CKD(ICE)',
      brandName: '奥迪',
      price: 329800,
      engineType: 'ICE',
      sales: 1280,
      status: 1,
      image: 'https://picsum.photos/200/200?random=1',
      description: '奥迪A4L，经典豪华轿车，搭载2.0T涡轮增压发动机，动力强劲，操控精准。',
      createTime: '2024-01-15 10:30:00'
    },
    {
      id: 2,
      name: '奥迪e-tron GT 2024款 quattro',
      categoryId: 3,
      categoryName: '奥迪 - NEV',
      brandName: '奥迪',
      price: 1068800,
      engineType: 'NEV',
      sales: 156,
      status: 1,
      image: 'https://picsum.photos/200/200?random=2',
      description: '奥迪e-tron GT，纯电动高性能轿跑，续航里程超过400公里，零百加速3.9秒。',
      createTime: '2024-01-15 11:00:00'
    },
    {
      id: 3,
      name: '奥迪Q7 2024款 45 TFSI quattro',
      categoryId: 4,
      categoryName: '奥迪 - FBU',
      brandName: '奥迪',
      price: 699800,
      engineType: 'ICE',
      sales: 890,
      status: 1,
      image: 'https://picsum.photos/200/200?random=3',
      description: '奥迪Q7，大型豪华SUV，进口车型，配置丰富，空间宽敞。',
      createTime: '2024-01-15 12:00:00'
    },
    {
      id: 4,
      name: '小鹏P7 2024款 706G',
      categoryId: 6,
      categoryName: '小鹏 - NEV',
      brandName: '小鹏',
      price: 249900,
      engineType: 'NEV',
      sales: 2340,
      status: 1,
      image: 'https://picsum.photos/200/200?random=4',
      description: '小鹏P7，智能纯电轿跑，续航里程706公里，搭载XPILOT自动驾驶辅助系统。',
      createTime: '2024-01-15 13:00:00'
    },
    {
      id: 5,
      name: '小鹏G9 2024款 702 Max',
      categoryId: 6,
      categoryName: '小鹏 - NEV',
      brandName: '小鹏',
      price: 359900,
      status: 0,
      engineType: 'NEV',
      sales: 1560,
      image: 'https://picsum.photos/200/200?random=5',
      description: '小鹏G9，智能纯电SUV，续航里程702公里，配备800V高压快充技术。',
      createTime: '2024-01-15 14:00:00'
    }
  ])

  // 计算属性 - 筛选后的表格数据
  const filteredTableData = computed(() => {
    // 如果没有触发搜索，显示原始数据
    if (!searchTriggered.value) {
      return tableData.value
    }

    let filtered = [...tableData.value]

    // 按名称筛选
    if (searchParams.name) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchParams.name.toLowerCase())
      )
    }

    // 按分类筛选
    if (searchParams.categoryId) {
      filtered = filtered.filter((item) => item.categoryId === searchParams.categoryId)
    }

    // 按状态筛选
    if (searchParams.status !== '') {
      filtered = filtered.filter((item) => item.status === searchParams.status)
    }

    return filtered
  })

  // 生命周期
  onMounted(() => {
    loadData()
  })

  // 方法
  const loadData = async () => {
    loading.value = true
    try {
      // 这里应该调用实际的API
      // const response = await getProductList({
      //   ...searchForm,
      //   current: pagination.current,
      //   size: pagination.size
      // })
      // tableData.value = response.data.records
      // pagination.total = response.data.total

      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 500))
      pagination.total = tableData.value.length
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
  }

  const handleReset = () => {
    // 重置搜索表单
    searchForm.name = ''
    searchForm.categoryId = ''
    searchForm.status = ''
    // 重置搜索参数
    searchParams.name = ''
    searchParams.categoryId = ''
    searchParams.status = ''
    // 重置搜索触发标志
    searchTriggered.value = false
  }

  const handleAdd = () => {
    // 创建新增车型对话框
    addDialogVisible.value = true
    resetAddForm()
  }

  // 新增车型相关数据
  const addDialogVisible = ref(false)
  const dialogVisible = ref(false)
  const dialogTitle = ref('新增车型')
  const isEdit = ref(false)
  const currentEditId = ref(null)
  const imageUploadType = ref('url') // 图片上传类型：url 或 upload
  const addFormRef = ref()
  interface ProductAddForm {
    name: string
    categoryId: number | null
    brandName: string
    price: string
    engineType: 'ICE' | 'NEV'
    description: string
    image: string
    status: number
  }
  const addForm = reactive<ProductAddForm>({
    name: '',
    categoryId: null,
    brandName: '',
    price: '',
    engineType: 'ICE',
    description: '',
    image: '',
    status: 1
  })

  // 编辑表单数据
  interface ProductEditForm {
    name: string
    categoryId: number | null
    price: string
    originalPrice: string
    stock: string
    status: number
    description: string
    images: string[]
  }
  const form = reactive<ProductEditForm>({
    name: '',
    categoryId: null,
    price: '',
    originalPrice: '',
    stock: '',
    status: 1,
    description: '',
    images: []
  })

  const addFormRules = {
    name: [{ required: true, message: '请输入车型名称', trigger: 'blur' }],
    categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
    price: [
      { required: true, message: '请输入指导价', trigger: 'blur' },
      { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入正确的价格格式', trigger: 'blur' }
    ],
    engineType: [{ required: true, message: '请选择动力类型', trigger: 'change' }]
  }

  const resetAddForm = () => {
    addForm.name = ''
    addForm.categoryId = null
    addForm.brandName = ''
    addForm.price = ''
    addForm.engineType = 'ICE'
    addForm.description = ''
    addForm.image = ''
    addForm.status = 1
    addFormRef.value?.clearValidate()
  }

  const handleAddSubmit = async () => {
    try {
      await addFormRef.value?.validate()

      // 获取选中分类的品牌信息
      const selectedCategory = flatCategoryOptions.value.find(
        (cat) => cat.id === addForm.categoryId
      )
      if (selectedCategory) {
        addForm.brandName = selectedCategory.brandName
      }

      // 这里应该调用实际的API
      // await addProduct(addForm)

      // 模拟添加到表格数据
      const newProduct = {
        id: Date.now(),
        name: addForm.name,
        categoryId: addForm.categoryId ?? 0,
        categoryName: selectedCategory?.name || '',
        brandName: addForm.brandName,
        price: parseFloat(addForm.price),
        engineType: addForm.engineType,
        sales: 0,
        status: addForm.status,
        image: addForm.image || 'https://picsum.photos/200/200?random=' + Date.now(),
        description: addForm.description,
        createTime: new Date().toLocaleString('zh-CN')
      }

      tableData.value.unshift(newProduct)

      ElMessage.success('新增车型成功')
      addDialogVisible.value = false
      resetAddForm()
    } catch {
      console.error('新增车型失败')
    }
  }

  const handleView = (row: any) => {
    currentProduct.value = row
    detailVisible.value = true
  }

  // 图片上传类型切换
  const handleImageTypeChange = (type: string) => {
    if (type === 'upload') {
      addForm.image = ''
    }
  }

  // 图片上传前的验证
  const beforeImageUpload = (file: File) => {
    const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
    const isLt2M = file.size / 1024 / 1024 < 2

    if (!isJPG) {
      ElMessage.error('上传图片只能是 JPG/PNG 格式!')
      return false
    }
    if (!isLt2M) {
      ElMessage.error('上传图片大小不能超过 2MB!')
      return false
    }
    return true
  }

  // 处理图片上传
  const handleImageUpload = (options: any) => {
    const file = options.file

    // 创建 FileReader 来读取文件
    const reader = new FileReader()
    reader.onload = (e) => {
      addForm.image = e.target?.result as string
      ElMessage.success('图片上传成功')
    }
    reader.readAsDataURL(file)

    return Promise.resolve()
  }

  // 重置编辑表单
  const resetEditForm = () => {
    form.name = ''
    form.categoryId = null
    form.price = ''
    form.originalPrice = ''
    form.stock = ''
    form.status = 1
    form.description = ''
    form.images = []
    isEdit.value = false
    currentEditId.value = null
  }

  // 处理编辑提交
  const handleEditSubmit = () => {
    if (!form.name) {
      ElMessage.warning('请输入车型名称')
      return
    }

    // 找到要编辑的数据
    const index = tableData.value.findIndex((item) => item.id === currentEditId.value)
    if (index > -1) {
      // 更新数据
      const selectedCategory = flatCategoryOptions.value.find((cat) => cat.id === form.categoryId)
      tableData.value[index] = {
        ...tableData.value[index],
        name: form.name,
        categoryId: form.categoryId,
        categoryName: selectedCategory?.name || '',
        price: parseFloat(form.price) || 0,
        originalPrice: parseFloat(form.originalPrice) || 0,
        stock: parseInt(form.stock) || 0,
        status: form.status,
        description: form.description
      }

      ElMessage.success('编辑车型成功')
      dialogVisible.value = false
      resetEditForm()
    }
  }

  const handleEdit = (row: any) => {
    // 设置编辑模式
    isEdit.value = true
    dialogTitle.value = '编辑车型'

    // 填充表单数据
    form.name = row.name
    form.categoryId = row.categoryId
    form.price = row.price
    form.originalPrice = row.originalPrice
    form.stock = row.stock
    form.status = row.status
    form.description = row.description
    form.images = row.images || []

    // 保存当前编辑的行ID
    currentEditId.value = row.id

    // 显示对话框
    dialogVisible.value = true
  }

  const handleDelete = async (row: any) => {
    try {
      await ElMessageBox.confirm(`确定要删除车型"${row.name}"吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      // 从表格数据中删除该项
      const index = tableData.value.findIndex((item) => item.id === row.id)
      if (index > -1) {
        tableData.value.splice(index, 1)
        ElMessage.success('删除成功')
      }
    } catch {
      // 用户取消删除
    }
  }

  const handleStatusChange = async (row: any) => {
    try {
      // 这里应该调用更新状态API
      // await updateProductStatus(row.id, row.status)

      ElMessage.success(`车型已${row.status === 1 ? '上架' : '下架'}`)
    } catch {
      // 恢复原状态
      row.status = row.status === 1 ? 0 : 1
      ElMessage.error('状态更新失败')
    }
  }

  const handleBatchExport = () => {
    if (filteredTableData.value.length === 0) {
      ElMessage.warning('当前无可导出的数据')
      return
    }
    ElMessage.info('导出当前筛选结果功能开发中...')
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

    .image-upload-section {
      .mt-2 {
        margin-top: 8px;
      }

      .image-uploader {
        :deep(.el-upload) {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 148px;
          height: 148px;
          overflow: hidden;
          cursor: pointer;
          border: 1px dashed var(--el-border-color);
          border-radius: 6px;
          transition: var(--el-transition-duration-fast);

          &:hover {
            border-color: var(--el-color-primary);
          }
        }

        .image-uploader-icon {
          font-size: 28px;
          color: #8c939d;
          text-align: center;
        }

        .uploaded-image {
          display: block;
          width: 148px;
          height: 148px;
          object-fit: cover;
        }
      }

      .upload-tip {
        margin-top: 4px;
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
</style>
