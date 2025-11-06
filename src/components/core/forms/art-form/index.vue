<!-- 表单组件 -->
<!-- 支持常用表单组件、自定义组件、插槽、校验、隐藏表单项 -->
<!-- 写法同 ElementPlus 官方文档组件，把属性写在 props 里面就可以了 -->
<template>
  <section class="art-form">
    <ElForm
      ref="formRef"
      :model="modelValue"
      :label-position="labelPosition"
      v-bind="{ ...$attrs }"
    >
      <ElRow class="form-row" :gutter="gutter">
        <ElCol
          v-for="item in visibleFormItems"
          :key="item.key"
          :xs="24"
          :sm="item.span === 24 ? 24 : 12"
          :md="item.span === 24 ? 24 : 8"
          :lg="item.span || span"
          :xl="item.span || span"
        >
          <!-- 分组标题/分隔线（不参与表单校验与 v-model） -->
          <template v-if="item.type === 'divider'">
            <ElDivider class="art-form-divider" v-bind="getProps(item)">
              <span class="art-form-divider__title">{{ item.label }}</span>
            </ElDivider>
          </template>

          <!-- 常规表单项 -->
          <template v-else>
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
                    <ElCheckbox
                      v-for="option in getOptions(item)"
                      v-bind="option"
                      :key="option.value"
                    />
                  </template>

                  <!-- 单选框组 -->
                  <template v-if="item.type === 'radiogroup' && getOptions(item).length">
                    <ElRadio
                      v-for="option in getOptions(item)"
                      v-bind="option"
                      :key="option.value"
                    />
                  </template>

                  <!-- 动态插槽支持 -->
                  <template
                    v-for="(slotFn, slotName) in getSlots(item)"
                    :key="slotName"
                    #[slotName]
                  >
                    <component :is="slotFn" />
                  </template>
                </component>
              </slot>
            </ElFormItem>
          </template>
        </ElCol>
        <ElCol :xs="24" :sm="24" :md="span" :lg="span" :xl="span" class="action-column">
          <div class="action-buttons-wrapper" :style="actionButtonsStyle">
            <div class="form-buttons">
              <ElButton v-if="showReset" class="reset-button" @click="handleReset" v-ripple>
                {{ t('table.form.reset') }}
              </ElButton>
              <ElButton
                v-if="showSubmit"
                type="primary"
                class="submit-button"
                @click="handleSubmit"
                v-ripple
                :disabled="disabledSubmit"
              >
                {{ t('table.form.submit') }}
              </ElButton>
            </div>
          </div>
        </ElCol>
      </ElRow>
    </ElForm>
  </section>
</template>

<script setup lang="ts">
  import { useWindowSize } from '@vueuse/core'
  import { useI18n } from 'vue-i18n'
  import type { FormInstance } from 'element-plus'
  import {
    ElInput,
    ElInputNumber,
    ElSelect,
    ElSwitch,
    ElCheckbox,
    ElCheckboxGroup,
    ElRadioGroup,
    ElDatePicker,
    ElRate,
    ElSlider,
    ElCascader,
    ElTimePicker,
    ElTimeSelect,
    ElTreeSelect,
    ElDivider
  } from 'element-plus'

  defineOptions({ name: 'ArtForm' })

  const componentMap = {
    input: ElInput, // 输入框
    number: ElInputNumber, // 数字输入框
    select: ElSelect, // 选择器
    switch: ElSwitch, // 开关
    checkbox: ElCheckbox, // 复选框
    checkboxgroup: ElCheckboxGroup, // 复选框组
    radiogroup: ElRadioGroup, // 单选框组
    date: ElDatePicker, // 日期选择器
    daterange: ElDatePicker, // 日期范围选择器
    datetime: ElDatePicker, // 日期时间选择器
    datetimerange: ElDatePicker, // 日期时间范围选择器
    rate: ElRate, // 评分
    slider: ElSlider, // 滑块
    cascader: ElCascader, // 级联选择器
    timepicker: ElTimePicker, // 时间选择器
    timeselect: ElTimeSelect, // 时间选择
    treeselect: ElTreeSelect, // 树选择器
    divider: ElDivider // 分隔线/分组标题
  }

  const { width } = useWindowSize()
  const { t } = useI18n()
  const isMobile = computed(() => width.value < 500)

  const formInstance = useTemplateRef<FormInstance>('formRef')

  // 表单项配置
  export interface FormItem {
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

  interface FormProps {
    items: FormItem[]
    span?: number
    gutter?: number
    labelPosition?: 'left' | 'right' | 'top'
    labelWidth?: string | number
    buttonLeftLimit?: number
    showReset?: boolean
    showSubmit?: boolean
    disabledSubmit?: boolean
  }

  const props = withDefaults(defineProps<FormProps>(), {
    items: () => [],
    span: 6,
    gutter: 12,
    labelPosition: 'right',
    labelWidth: '70px',
    buttonLeftLimit: 2,
    showReset: true,
    showSubmit: true,
    disabledSubmit: false
  })

  interface FormEmits {
    reset: []
    submit: []
  }

  const emit = defineEmits<FormEmits>()

  const modelValue = defineModel<Record<string, any>>({ default: {} })

  const rootProps = ['label', 'labelWidth', 'key', 'type', 'hidden', 'span', 'slots']

  const getProps = (item: FormItem) => {
    if (item.props) return item.props
    const props = { ...item }
    rootProps.forEach((key) => delete (props as Record<string, any>)[key])
    return props
  }

  // 统一解析 options：支持 Ref/数组/对象映射/原始值
  const getOptions = (item: FormItem) => {
    const raw = getProps(item)?.options as any
    if (!raw) return []
    // 如果是 Ref 或 ComputedRef，取其 value
    const val = raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
    // 支持对象映射：{ value: label }
    const source = Array.isArray(val)
      ? val
      : val && typeof val === 'object'
        ? Object.entries(val).map(([value, label]) => ({ label, value }))
        : []
    // 归一化为 {label, value}
    return source.map((opt: any) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && ('label' in opt || 'value' in opt)) {
        return opt
      }
      const label = opt?.name ?? opt?.text ?? String(opt)
      const value = opt?.value ?? opt?.name ?? opt?.text ?? String(opt)
      return { label, value, ...opt }
    })
  }

  // 获取插槽
  const getSlots = (item: FormItem) => {
    if (!item.slots) return {}
    const validSlots: Record<string, () => any> = {}
    Object.entries(item.slots).forEach(([key, slotFn]) => {
      if (slotFn) {
        validSlots[key] = slotFn
      }
    })
    return validSlots
  }

  // 组件
  const getComponent = (item: FormItem) => {
    const { type } = item
    if (type && typeof item.type !== 'string') return type
    return componentMap[type as keyof typeof componentMap] || componentMap['input']
  }

  const visibleFormItems = computed(() => {
    return props.items.filter((item) => !item.hidden)
  })

  const actionButtonsStyle = computed(() => ({
    'justify-content': isMobile.value
      ? 'flex-end'
      : props.items.filter((item) => !item.hidden).length <= props.buttonLeftLimit
        ? 'flex-start'
        : 'flex-end'
  }))

  const handleReset = () => {
    formInstance.value?.resetFields()
    Object.assign(
      modelValue.value,
      Object.fromEntries(props.items.map(({ key }) => [key, undefined]))
    )
    emit('reset')
  }

  const handleSubmit = () => {
    emit('submit')
  }

  defineExpose({
    ref: formInstance,
    validate: (...args: any[]) => formInstance.value?.validate(...args),
    reset: handleReset
  })

  const { span, gutter, labelPosition, labelWidth } = toRefs(props)
</script>

<style lang="scss" scoped>
  .art-form {
    .form-row {
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

        span {
          font-size: 14px;
          user-select: none;
        }

        .icon-wrapper {
          display: flex;
          align-items: center;
          margin-left: 4px;
          font-size: 14px;
          transition: transform 0.2s ease;
        }
      }
    }
  }

  @media (width <= 768px) {
    .art-form {
      padding: 16px 16px 0;

      .action-column {
        .action-buttons-wrapper {
          flex-direction: column;
          gap: 8px;
          align-items: stretch;

          .form-buttons {
            justify-content: center;
          }

          .filter-toggle {
            justify-content: center;
            margin-left: 0;
          }
        }
      }
    }
  }
</style>
