<template>
  <div class="login register">
    <LoginLeftView></LoginLeftView>
    <div class="right-wrap">
      <div class="header">
        <ArtLogo class="icon" />
        <h1>{{ systemName }}</h1>
      </div>
      <div class="login-wrap">
        <div class="form">
          <h3 class="title">{{ $t('register.title') }}</h3>
          <p class="sub-title">{{ $t('register.subTitle') }}</p>
          <ElForm ref="formRef" :model="formData" :rules="rules" label-position="top">
            <ElFormItem prop="username">
              <ElInput
                v-model.trim="formData.username"
                :placeholder="$t('register.placeholder[0]')"
              />
            </ElFormItem>

            <ElFormItem prop="name">
              <ElInput v-model.trim="formData.name" placeholder="请输入姓名" />
            </ElFormItem>

            <ElFormItem prop="phone">
              <ElInput v-model.trim="formData.phone" placeholder="请输入手机号" />
            </ElFormItem>

            <ElFormItem prop="password">
              <ElInput
                v-model.trim="formData.password"
                :placeholder="$t('register.placeholder[1]')"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <ElFormItem prop="confirmPassword">
              <ElInput
                v-model.trim="formData.confirmPassword"
                :placeholder="$t('register.placeholder[2]')"
                type="password"
                autocomplete="off"
                @keyup.enter="register"
                show-password
              />
            </ElFormItem>

            <ElFormItem prop="agreement">
              <ElCheckbox v-model="formData.agreement">
                {{ $t('register.agreeText') }}
                <router-link
                  style="color: var(--main-color); text-decoration: none"
                  to="/privacy-policy"
                  >{{ $t('register.privacyPolicy') }}</router-link
                >
              </ElCheckbox>
            </ElFormItem>

            <div style="margin-top: 15px">
              <ElButton
                class="register-btn"
                type="primary"
                @click="register"
                :loading="loading"
                v-ripple
              >
                {{ $t('register.submitBtnText') }}
              </ElButton>
            </div>

            <div class="footer">
              <p>
                {{ $t('register.hasAccount') }}
                <router-link :to="RoutesAlias.Login">{{ $t('register.toLogin') }}</router-link>
              </p>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { RoutesAlias } from '@/router/routesAlias'
  import type { FormInstance, FormRules } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/store/modules/user'
  import { fetchRegister, fetchGetUserInfo } from '@/api/auth'
  import { HttpError } from '@/utils/http/error'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'Register' })

  const { t } = useI18n()

  const router = useRouter()
  const formRef = ref<FormInstance>()
  const userStore = useUserStore()

  const systemName = AppConfig.systemInfo.name

  const loading = ref(false)
  const formData = reactive({
    username: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreement: false
  })

  const rules = reactive<FormRules>({
    username: [
      { required: true, message: t('register.rules.username[0]'), trigger: 'blur' },
      { min: 3, max: 20, message: t('register.rules.username[1]'), trigger: 'blur' }
    ],
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
    ],
    password: [
      { required: true, message: t('register.rules.password[0]'), trigger: 'blur' },
      { min: 6, message: t('register.rules.password[1]'), trigger: 'blur' }
    ],
    confirmPassword: [
      { required: true, message: t('register.rules.confirmPassword[0]'), trigger: 'blur' },
      {
        validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
          if (!value) return callback(new Error(t('register.rules.confirmPassword[0]')))
          if (value !== formData.password)
            return callback(new Error(t('register.rules.confirmPassword[1]')))
          callback()
        },
        trigger: 'blur'
      }
    ],
    agreement: [
      {
        validator: (_rule: any, value: boolean, callback: (error?: Error) => void) => {
          if (!value) return callback(new Error(t('register.rules.agreement')))
          callback()
        },
        trigger: 'change'
      }
    ]
  })

  const register = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      loading.value = true

      const { username, password, name, phone } = formData
      const { token, refreshToken } = await fetchRegister({ username, password, name, phone })

      if (!token) throw new Error('Register failed - no token received')

      userStore.setToken(token, refreshToken)
      const userInfo = await fetchGetUserInfo()
      userStore.setUserInfo(userInfo)
      userStore.setLoginStatus(true)

      ElMessage.success('注册成功，已自动登录')
      router.push('/')
    } catch (error) {
      if (error instanceof HttpError) {
        // 后端返回的业务错误已由拦截器处理弹窗/消息
      } else {
        ElMessage.error('注册失败，请稍后重试')
        console.error('[Register] Unexpected error:', error)
      }
    } finally {
      loading.value = false
    }
  }
</script>

<style lang="scss" scoped>
  @use '../login/index' as login;
  @use './index' as register;
</style>
