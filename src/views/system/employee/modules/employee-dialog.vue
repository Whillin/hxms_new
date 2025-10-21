<template>
  <ElDialog v-model="visibleModel" :title="title" width="620px">
    <ElForm ref="formRef" :model="formModel" :rules="rules" label-width="100px">
      <ElFormItem label="姓名" prop="name"
        ><ElInput v-model="formModel.name" placeholder="请输入姓名"
      /></ElFormItem>
      <ElFormItem label="手机号" prop="phone"
        ><ElInput v-model="formModel.phone" placeholder="请输入手机号"
      /></ElFormItem>
      <ElFormItem label="岗位" prop="role">
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
          :props="cascaderProps"
          placeholder="请选择部门"
          style="width: 100%"
          clearable
        />
      </ElFormItem>
      <ElFormItem label="性别" prop="gender">
        <ElSelect v-model="formModel.gender" placeholder="选择性别">
          <ElOption label="男" value="male" />
          <ElOption label="女" value="female" />
          <ElOption label="其他" value="other" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态" prop="status">
        <ElSelect v-model="formModel.status" placeholder="在职/离职">
          <ElOption label="在职" value="1" />
          <ElOption label="离职" value="2" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="入职时间" prop="hireDate">
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
  import { nextTick } from 'vue'

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
  const departmentPath = ref<number[] | number[][] | undefined>(undefined)
  watch(
    () => props.employeeData,
    (v) => {
      formModel.value = { ...(v || {}) }
      // 当编辑已有数据时，初始化部门路径（优先使用 departmentId，其次 store/region/brand）
      const path: number[] | undefined = (() => {
        const targetId =
          typeof v?.departmentId !== 'undefined'
            ? Number(v.departmentId)
            : typeof v?.storeId !== 'undefined'
              ? Number(v.storeId)
              : typeof v?.regionId !== 'undefined'
                ? Number(v.regionId)
                : typeof v?.brandId !== 'undefined'
                  ? Number(v.brandId)
                  : undefined
        if (typeof targetId === 'number' && !Number.isNaN(targetId)) {
          const p = findPathById(deptTree.value, targetId)
          return p && p.length ? p : undefined
        }
        const legacy: number[] = []
        if (v && typeof v.brandId !== 'undefined') legacy.push(Number(v.brandId))
        if (v && typeof v.regionId !== 'undefined') legacy.push(Number(v.regionId))
        if (v && typeof v.storeId !== 'undefined') legacy.push(Number(v.storeId))
        return legacy.length ? legacy : undefined
      })()
      nextTick(() => {
        departmentPath.value = path
      })
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
  const DEPARTMENT_REQUIRED_ROLES = new Set(['R_SALES_MANAGER', 'R_SALES', 'R_APPOINTMENT'])
  const isDepartmentRole = computed(() =>
    DEPARTMENT_REQUIRED_ROLES.has(String(formModel.value?.role || ''))
  )

  // 计算级联选择器属性：门店层级支持多选（销售经理不支持多选）
  const cascaderProps = computed(() => {
    const base = { checkStrictly: true, emitPath: true } as any
    return requiredLevel.value === 'store' && !isDepartmentRole.value
      ? { ...base, multiple: true }
      : base
  })

  // 当岗位变化时，若已选部门层级不匹配则自动清空，避免误选
  watch(
    () => requiredLevel.value,
    (level) => {
      const normalizePaths = (): number[][] => {
        const v: any = departmentPath.value
        if (!v) return []
        if (Array.isArray(v) && Array.isArray(v[0])) return v as number[][]
        if (Array.isArray(v)) return [v as number[]]
        return []
      }
      const paths = normalizePaths()
      if (!paths.length) return
      const expectType = isDepartmentRole.value
        ? 'department'
        : level === 'brand'
          ? 'brand'
          : level === 'region'
            ? 'region'
            : 'store'
      // 检查所有路径最后节点类型是否匹配
      const mismatch = paths.some((p) => {
        const lastId = p[p.length - 1]
        const node = idMap.value[lastId]
        return node && node.type !== expectType
      })
      if (mismatch) {
        departmentPath.value = undefined
        formModel.value.brandId = undefined
        formModel.value.regionId = undefined
        formModel.value.storeId = undefined
        formModel.value.storeIds = undefined
        formModel.value.departmentId = undefined
      }
    }
  )

  const buildDeptOptions = (nodes: any[], level?: 'brand' | 'region' | 'store') => {
    const allowTypes = level === 'brand' ? ['brand'] : level === 'region' ? ['region'] : ['store']
    const mapNode = (n: any): any => ({
      value: n.id,
      label: n.name,
      disabled:
        n.type === 'group' ||
        (!isDepartmentRole.value && n.type === 'department') ||
        (!allowTypes.includes(n.type) && ['brand', 'region', 'store'].includes(n.type)),
      children: Array.isArray(n.children) ? n.children.map(mapNode) : undefined
    })
    return nodes.map(mapNode)
  }

  const deptOptions = computed(() => buildDeptOptions(deptTree.value, requiredLevel.value))

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
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      {
        validator: (_r, _v, cb) => {
          const v = String(formModel.value?.phone || '')
          if (!/^1[3-9]\d{9}$/.test(v)) return cb(new Error('手机号格式不正确'))
          cb()
        },
        trigger: 'blur'
      }
    ],
    role: [{ required: true, message: '请选择岗位', trigger: 'change' }],
    gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    hireDate: [{ required: true, message: '请选择入职时间', trigger: 'change' }],
    departmentPath: [
      {
        validator: (_rule, _val, cb) => {
          const level = requiredLevel.value
          const normalizePaths = (): number[][] => {
            const v: any = departmentPath.value
            if (!v) return []
            if (Array.isArray(v) && Array.isArray(v[0])) return v as number[][]
            if (Array.isArray(v)) return [v as number[]]
            return []
          }
          const paths = normalizePaths()
          if (!paths.length) return cb(new Error('请选择部门'))
          const lastNodeType = (p: number[]) => {
            const lastId = p[p.length - 1]
            const node = idMap.value[lastId]
            return node?.type
          }
          if (isDepartmentRole.value) {
            const type = lastNodeType(paths[0])
            if (type !== 'department') return cb(new Error('该岗位需选择门店下的小组'))
            return cb()
          }
          if (level === 'store') {
            const bad = paths.some((p) => lastNodeType(p) !== 'store')
            if (bad) return cb(new Error('请选择门店层级'))
            return cb()
          } else if (level === 'brand' || level === 'region') {
            const first = paths[0]
            const type = lastNodeType(first)
            if (level === 'brand' && type !== 'brand') return cb(new Error('请选择品牌层级'))
            if (level === 'region' && type !== 'region') return cb(new Error('请选择区域层级'))
            return cb()
          }
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
          typeof data?.departmentId !== 'undefined'
            ? Number(data.departmentId)
            : typeof data?.storeId !== 'undefined'
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

  // 当部门或岗位变化时，联动过滤岗位或填充 brand/region/store/department
  const roleOptions = computed(() => {
    const normalizePaths = (): number[][] => {
      const v: any = departmentPath.value
      if (!v) return []
      if (Array.isArray(v) && Array.isArray(v[0])) return v as number[][]
      if (Array.isArray(v)) return [v as number[]]
      return []
    }
    const paths = normalizePaths()
    const lastId = paths[0]?.[paths[0].length - 1]
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
      // 映射到 brandId/regionId/storeId/storeIds/departmentId
      formModel.value.brandId = undefined
      formModel.value.regionId = undefined
      formModel.value.storeId = undefined
      formModel.value.storeIds = undefined
      formModel.value.departmentId = undefined
      const normalizePaths = (): number[][] => {
        const v: any = departmentPath.value
        if (!v) return []
        if (Array.isArray(v) && Array.isArray(v[0])) return v as number[][]
        if (Array.isArray(v)) return [v as number[]]
        return []
      }
      const paths = normalizePaths()
      if (!paths.length) return
      // 用第一条路径填充品牌/区域/门店/小组
      for (const id of paths[0]) {
        const node = idMap.value[id]
        if (!node) continue
        if (node.type === 'brand') formModel.value.brandId = id
        if (node.type === 'region') formModel.value.regionId = id
        if (node.type === 'store') formModel.value.storeId = id
        if (node.type === 'department') formModel.value.departmentId = id
      }
      // 收集所有选中路径的门店ID集合（仅当末尾为 store 时）
      const storeIds: number[] = []
      for (const p of paths) {
        const lastId = p[p.length - 1]
        const node = idMap.value[lastId]
        if (node?.type === 'store') storeIds.push(lastId)
      }
      if (storeIds.length) formModel.value.storeIds = storeIds
    },
    { deep: true }
  )

  const onSubmit = async () => {
    try {
      await formRef.value?.validate()
      const payload = { ...formModel.value }
      // 规范化日期为 YYYY-MM-DD
      if (payload.hireDate) {
        const d = new Date(payload.hireDate)
        payload.hireDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      emit('submit', payload)
    } catch {
      // 校验失败时不提交
    }
  }
</script>

<style scoped></style>
