<template>
  <ElDialog v-model="visibleModel" :title="title" width="620px">
    <ElForm ref="formRef" :model="formModel" :rules="rules" label-width="100px">
      <ElFormItem label="姓名"
        ><ElInput v-model="formModel.name" placeholder="请输入姓名"
      /></ElFormItem>
      <ElFormItem label="手机号"
        ><ElInput v-model="formModel.phone" placeholder="请输入手机号"
      /></ElFormItem>
      <ElFormItem label="岗位">
        <ElSelect v-model="formModel.role" placeholder="选择岗位">
          <ElOption
            v-for="opt in roleOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </ElSelect>
      </ElFormItem>
      <!-- 单一部门字段（品牌/区域/门店级联），根据岗位限制层级 -->
      <ElFormItem label="部门" prop="departmentPath">
        <ElCascader
          v-model="departmentPath"
          :options="deptOptions"
          :props="{ checkStrictly: true, emitPath: true }"
          placeholder="请选择部门"
          style="width: 100%"
          clearable
        />
      </ElFormItem>
      <ElFormItem label="性别">
        <ElSelect v-model="formModel.gender" placeholder="选择性别">
          <ElOption label="男" value="male" />
          <ElOption label="女" value="female" />
          <ElOption label="其他" value="other" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="formModel.status" placeholder="在职/离职">
          <ElOption label="在职" value="1" />
          <ElOption label="离职" value="2" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="入职时间">
        <ElDatePicker
          v-model="formModel.hireDate"
          type="date"
          placeholder="选择日期"
          style="width: 100%"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElSpace>
        <ElButton @click="visibleModel = false">取消</ElButton>
        <ElButton type="primary" @click="onSubmit">确定</ElButton>
      </ElSpace>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { EMPLOYEE_ROLE_LABELS, getRoleRequiredLevel } from '@/utils/employee'
  import { fetchGetDepartmentList } from '@/api/system-manage'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElButton,
    ElSpace,
    ElDatePicker,
    ElCascader
  } from 'element-plus'

  defineOptions({ name: 'EmployeeDialog' })

  type DialogType = 'add' | 'edit'
  const props = defineProps<{
    visible: boolean
    type: DialogType
    employeeData: Record<string, any>
  }>()
  const emit = defineEmits<{
    (e: 'update:visible', v: boolean): void
    (e: 'submit', payload: Record<string, any>): void
  }>()

  const visibleModel = computed({
    get: () => props.visible,
    set: (v: boolean) => emit('update:visible', v)
  })

  const formModel = ref<Record<string, any>>({})
  const formRef = ref<FormInstance>()
  watch(
    () => props.employeeData,
    (v) => {
      formModel.value = { ...(v || {}) }
      // 当编辑已有数据时，初始化部门路径
      const path: number[] = []
      if (v && typeof v.brandId !== 'undefined') path.push(Number(v.brandId))
      if (v && typeof v.regionId !== 'undefined') path.push(Number(v.regionId))
      if (v && typeof v.storeId !== 'undefined') path.push(Number(v.storeId))
      departmentPath.value = path.length ? path : undefined
    },
    { immediate: true }
  )

  const title = computed(() => (props.type === 'add' ? '新增员工' : '编辑员工'))

  // 部门树与级联
  const deptTree = ref<any[]>([])
  const idMap = ref<Record<number, any>>({})
  const pendingInitData = ref<Record<string, any> | undefined>(undefined)
  const buildIdMap = (nodes: any[]) => {
    const walk = (n: any) => {
      idMap.value[n.id] = n
      if (Array.isArray(n.children)) n.children.forEach(walk)
    }
    nodes.forEach(walk)
  }

  const requiredLevel = computed(() => getRoleRequiredLevel(formModel.value?.role))

  const buildDeptOptions = (nodes: any[], level?: 'brand' | 'region' | 'store') => {
    const allowTypes = level === 'brand' ? ['brand'] : level === 'region' ? ['region'] : ['store']
    const mapNode = (n: any): any => ({
      value: n.id,
      label: n.name,
      disabled:
        n.type === 'department' ||
        n.type === 'group' ||
        (!allowTypes.includes(n.type) && ['brand', 'region', 'store'].includes(n.type)),
      children: Array.isArray(n.children) ? n.children.map(mapNode) : undefined
    })
    return nodes.map(mapNode)
  }

  const deptOptions = computed(() => buildDeptOptions(deptTree.value, requiredLevel.value))

  const departmentPath = ref<number[] | undefined>(undefined)
  // 查找目标ID的完整路径（包含中间层级）
  const findPathById = (nodes: any[], targetId: number): number[] | undefined => {
    const stack: number[] = []
    const dfs = (arr: any[]): boolean => {
      for (const n of arr) {
        stack.push(n.id)
        if (n.id === targetId) return true
        if (Array.isArray(n.children) && dfs(n.children)) return true
        stack.pop()
      }
      return false
    }
    if (Array.isArray(nodes) && dfs(nodes)) return [...stack]
    return undefined
  }

  // 规则：按岗位层级动态校验，仅一个部门字段
  const rules: FormRules = {
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
    role: [{ required: true, message: '请选择岗位', trigger: 'change' }],
    departmentPath: [
      {
        validator: (_rule, _val, cb) => {
          const level = requiredLevel.value
          if (!departmentPath.value?.length) return cb(new Error('请选择部门'))
          const lastId = departmentPath.value[departmentPath.value.length - 1]
          const node = idMap.value[lastId]
          if (!node) return cb(new Error('请选择部门'))
          if (level === 'brand' && node.type !== 'brand') return cb(new Error('请选择品牌层级'))
          if (level === 'region' && node.type !== 'region') return cb(new Error('请选择区域层级'))
          if (level === 'store' && node.type !== 'store') return cb(new Error('请选择门店层级'))
          cb()
        },
        trigger: 'change'
      }
    ]
  }

  // 加载部门树
  const loadDeptTree = async () => {
    try {
      const res = await fetchGetDepartmentList({})
      const tree = Array.isArray(res as any) ? (res as any) : []
      deptTree.value = tree
      buildIdMap(tree)
      // 树加载后尝试基于当前员工数据初始化路径
      const data = pendingInitData.value || props.employeeData
      if (data) {
        const targetId =
          typeof data?.storeId !== 'undefined'
            ? Number(data.storeId)
            : typeof data?.regionId !== 'undefined'
              ? Number(data.regionId)
              : typeof data?.brandId !== 'undefined'
                ? Number(data.brandId)
                : undefined
        if (typeof targetId === 'number') {
          const path = findPathById(deptTree.value, targetId)
          departmentPath.value = path && path.length ? path : undefined
        }
      }
    } catch {
      deptTree.value = []
      idMap.value = {}
    }
  }
  onMounted(loadDeptTree)

  // 当部门或岗位变化时，联动过滤岗位或填充 brand/region/store
  const roleOptions = computed(() => {
    // 如果已选部门，则根据层级过滤岗位
    const lastId = departmentPath.value?.[departmentPath.value.length - 1]
    const node = lastId ? idMap.value[lastId] : undefined
    const level =
      node?.type === 'brand'
        ? 'brand'
        : node?.type === 'region'
          ? 'region'
          : node?.type === 'store'
            ? 'store'
            : undefined
    const filterByLevel = (level?: 'brand' | 'region' | 'store') => {
      const allowed: Record<'brand' | 'region' | 'store', string[]> = {
        brand: ['R_BRAND_GM', 'R_ADMIN'],
        region: ['R_REGION_GM'],
        store: [
          'R_STORE_DIRECTOR',
          'R_STORE_MANAGER',
          'R_FRONT_DESK',
          'R_SALES_MANAGER',
          'R_SALES',
          'R_APPOINTMENT',
          'R_TECH',
          'R_FINANCE',
          'R_HR'
        ]
      }
      const keys = level ? allowed[level] : Object.keys(EMPLOYEE_ROLE_LABELS)
      return keys.map((k) => ({ value: k, label: EMPLOYEE_ROLE_LABELS[k] }))
    }
    return filterByLevel(level)
  })

  watch(
    () => departmentPath.value,
    () => {
      // 映射到 brandId/regionId/storeId
      formModel.value.brandId = undefined
      formModel.value.regionId = undefined
      formModel.value.storeId = undefined
      if (!departmentPath.value?.length) return
      for (const id of departmentPath.value) {
        const node = idMap.value[id]
        if (!node) continue
        if (node.type === 'brand') formModel.value.brandId = id
        if (node.type === 'region') formModel.value.regionId = id
        if (node.type === 'store') formModel.value.storeId = id
      }
    },
    { deep: true }
  )

  const onSubmit = async () => {
    try {
      await formRef.value?.validate()
      emit('submit', { ...formModel.value })
    } catch {
      // 校验失败时不提交
    }
  }
</script>

<style scoped></style>
