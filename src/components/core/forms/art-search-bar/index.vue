<!-- 表格搜索组件 -->
<!-- 支持常用表单组件、自定义组件、插槽、校验、隐藏表单项 -->
<!-- 写法同 ElementPlus 官方文档组件，把属性写在 props 里面就可以了 -->
<template>
  <section class="art-search-bar art-custom-card" :class="{ 'is-expanded': isExpanded }">
    <ElForm
      ref="formRef"
      :model="modelValue"
      :label-position="labelPosition"
      v-bind="{ ...$attrs }"
    >
      <ElRow class="search-form-row" :gutter="gutter">
        <ElCol
          v-for="item in visibleFormItems"
          :key="item.key"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="item.span || span"
          :xl="item.span || span"
        >
          <ElFormItem
            :label="item.label"
            :prop="item.key"
            :label-width="item.label ? item.labelWidth || labelWidth : undefined"
          >
            <slot :name="item.key" :item="item" :modelValue="modelValue">
              <component
                :is="getComponent(item)"
                v-model="modelValue[item.key]"
                v-bind="getProps(item)"
              >
                <!-- 下拉选择 -->
                <template v-if="item.type === 'select' && getOptions(item).length">
                  <el-option
                    v-for="option in getOptions(item)"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 复选框组 -->
                <template v-if="item.type === 'checkboxgroup' && getOptions(item).length">
                  <el-checkbox
                    v-for="option in getOptions(item)"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 单选框组 -->
                <template v-if="item.type === 'radiogroup' && getOptions(item).length">
                  <el-radio
                    v-for="option in getOptions(item)"
                    v-bind="option"
                    :key="option.value"
                  />
                </template>

                <!-- 动态插槽支持 -->
                <template v-for="(slotFn, slotName) in getSlots(item)" :key="slotName" #[slotName]>
                  <component :is="slotFn" />
                </template>
              </component>
            </slot>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :sm="24" :md="span" :lg="span" :xl="span" class="action-column">
          <div class="action-buttons-wrapper" :style="actionButtonsStyle">
            <div class="form-buttons">
              <el-button v-if="showReset" class="reset-button" @click="handleReset" v-ripple>
                {{ t('table.searchBar.reset') }}
              </el-button>
              <el-button
                v-if="showSearch"
                type="primary"
                class="search-button"
                @click="handleSearch"
                v-ripple
                :disabled="disabledSearch"
              >
                {{ t('table.searchBar.search') }}
              </el-button>
            </div>
            <div v-if="shouldShowExpandToggle" class="filter-toggle" @click="toggleExpand">
              <span>{{ expandToggleText }}</span>
              <div class="icon-wrapper">
                <el-icon>
                  <ArrowUpBold v-if="isExpanded" />
                  <ArrowDownBold v-else />
                </el-icon>
              </div>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </ElForm>
  </section>
</template>

<script setup lang="ts">
  import { ArrowUpBold, ArrowDownBold } from '@element-plus/icons-vue'
  import { useWindowSize } from '@vueuse/core'
  import { useI18n } from 'vue-i18n'
  import type { FormInstance } from 'element-plus'

  defineOptions({ name: 'ArtSearchBar' })

  const componentMap = {
    input: ElInput,
    number: ElInputNumber,
    select: ElSelect,
    switch: ElSwitch,
    checkbox: ElCheckbox,
    checkboxgroup: ElCheckboxGroup,
    radiogroup: ElRadioGroup,
    date: ElDatePicker,
    daterange: ElDatePicker,
    datetime: ElDatePicker,
    datetimerange: ElDatePicker
  }

  const { width } = useWindowSize()
  const { t } = useI18n()
  const isMobile = computed(() => width.value < 500)
  const formRef = useTemplateRef<FormInstance>('formRef')

  export interface SearchFormItem {
    key: string
    label: string
    labelWidth?: string | number
    type: keyof typeof componentMap | string | (() => VNode)
    hidden?: boolean
    span?: number
    options?: Record<string, any>
    props?: Record<string, any>
    slots?: Record<string, (() => any) | undefined>
    placeholder?: string
  }

  interface SearchFormProps {
    items: SearchFormItem[]
    span?: number
    gutter?: number
    labelPosition?: 'left' | 'right' | 'top'
    labelWidth?: string | number
    defaultExpanded?: boolean
    isExpand?: boolean
    showExpand?: boolean
    showReset?: boolean
    showSearch?: boolean
    disabledSearch?: boolean
  }

  const props = withDefaults(defineProps<SearchFormProps>(), {
    items: () => [],
    span: 6,
    gutter: 12,
    labelPosition: 'right',
    labelWidth: '70px',
    defaultExpanded: false,
    isExpand: false,
    showExpand: false,
    showReset: true,
    showSearch: true,
    disabledSearch: false
  })

  const modelValue = defineModel<Record<string, any>>({ default: {} })

  const rootProps = ['label', 'labelWidth', 'key', 'type', 'hidden', 'span', 'slots']

  const getProps = (item: SearchFormItem) => {
    if (item.props) return item.props
    const props = { ...item }
    rootProps.forEach((key) => delete (props as Record<string, any>)[key])
    return props
  }

  // 统一解析 options：支持 Ref/数组/对象映射/原始值
  const getOptions = (item: SearchFormItem) => {
    const raw = getProps(item)?.options as any
    if (!raw) return []
    const val = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
    const source = Array.isArray(val)
      ? val
      : val && typeof val === 'object'
        ? Object.entries(val).map(([value, label]) => ({ label, value }))
        : []
    return source.map((opt: any) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && ("label" in opt || "value" in opt)) {
        return opt
      }
      const label = opt?.name ?? opt?.text ?? String(opt)
      const value = opt?.value ?? opt?.name ?? opt?.text ?? String(opt)
      return { label, value, ...opt }
    })
  }

  const getSlots = (item: SearchFormItem) => {
    if (!item.slots) return {}
    const validSlots: Record<string, () => any> = {}
    Object.entries(item.slots).forEach(([key, slotFn]) => {
      if (slotFn) {
        validSlots[key] = slotFn
      }
    })
    return validSlots
  }

  const getComponent = (item: SearchFormItem) => {
    const { type } = item
    if (type && typeof item.type !== 'string') return type
    return componentMap[type as keyof typeof componentMap] || componentMap['input']
  }

  const visibleFormItems = computed(() => {
    const filteredItems = props.items.filter((item) => !item.hidden)
    const shouldShowLess = !props.isExpand && !isExpanded.value
    if (shouldShowLess) {
      const maxItemsPerRow = Math.floor(24 / props.span) - 1
      return filteredItems.slice(0, maxItemsPerRow)
    }
    return filteredItems
  })

  const isExpanded = ref(props.defaultExpanded)
  const expandToggleText = computed(() => (isExpanded.value ? t('table.searchBar.collapse') : t('table.searchBar.expand')))
  const shouldShowExpandToggle = computed(() => props.showExpand && props.items.length > 0)

  const actionButtonsStyle = computed(() => ({
    'justify-content': isMobile.value
      ? 'flex-end'
      : props.items.filter((item) => !item.hidden).length <= 2
        ? 'flex-start'
        : 'flex-end'
  }))

  const emit = defineEmits<{ reset: []; search: [] }>()
  const handleReset = () => {
    formRef.value?.resetFields()
    Object.assign(
      modelValue.value,
      Object.fromEntries(props.items.map(({ key }) => [key, undefined]))
    )
    emit('reset')
  }

  const handleSearch = () => {
    emit('search')
  }

  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
  }
</script>

<style lang="scss" scoped>
  .art-search-bar {
    .search-form-row {
      display: flex;
      flex-wrap: wrap;
    }
    .action-column {
      flex: 1;
      max-width: 100%;
      .action-buttons-wrapper {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        margin-bottom: 12px;
      }
      .form-buttons {
        display: flex;
        gap: 8px;
      }
      .filter-toggle {
        display: flex;
        align-items: center;
        margin-left: 10px;
        line-height: 32px;
        color: var(--main-color);
        cursor: pointer;
        transition: color 0.2s ease;
        &:hover {
          color: var(--ElColor-primary);
        }
        span { font-size: 14px; user-select: none; }
        .icon-wrapper { display: flex; align-items: center; margin-left: 4px; font-size: 14px; transition: transform 0.2s ease; }
      }
    }
  }
</style>
