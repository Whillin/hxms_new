<template>
  <div class="page-content user">
    <div class="content">
      <div class="left-wrap">
        <div class="user-wrap box-style">
          <img class="bg" src="@imgs/user/bg.webp" />
          <img class="avatar" src="@imgs/user/avatar.webp" />
          <h2 class="name">{{ form.realName || userInfo.userName }}</h2>

          <div class="outer-info">
            <div>
              <i class="iconfont-sys">&#xe72e;</i>
              <span>{{ userInfo.email || '-' }}</span>
            </div>
            <div>
              <i class="iconfont-sys">&#xe608;</i>
              <span>{{ getRoleLabel(ext.position) || '-' }}</span>
            </div>
            <div>
              <i class="iconfont-sys">&#xe736;</i>
              <span>{{ form.address || '-' }}</span>
            </div>
            <div>
              <i class="iconfont-sys">&#xe811;</i>
              <span>{{ ext.orgPath || '-' }}</span>
            </div>
          </div>

          <!-- 个人介绍 -->
          <div class="intro">
            <p class="intro-title">个人介绍</p>
            <p class="intro-text">{{ form.des || '-' }}</p>
          </div>
        </div>

        <!-- <el-carousel class="gallery" height="160px"
          :interval="5000"
          indicator-position="none"
        >
          <el-carousel-item class="item" v-for="item in galleryList" :key="item">
            <img :src="item"/>
          </el-carousel-item>
        </el-carousel> -->
      </div>
      <div class="right-wrap">
        <div class="info box-style">
          <h1 class="title">基本设置</h1>

          <ElForm
            :model="form"
            class="form"
            ref="ruleFormRef"
            :rules="rules"
            label-width="86px"
            label-position="top"
          >
            <ElRow>
              <ElFormItem label="姓名" prop="realName">
                <el-input v-model="form.realName" :disabled="true" />
              </ElFormItem>
              <ElFormItem label="性别" prop="sex" class="right-input">
                <ElSelect v-model="form.sex" placeholder="Select" :disabled="!isEdit">
                  <ElOption
                    v-for="item in options"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </ElSelect>
              </ElFormItem>
            </ElRow>

            <ElRow>
              <ElFormItem label="昵称" prop="nikeName">
                <ElInput v-model="form.nikeName" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem label="邮箱" prop="email" class="right-input">
                <ElInput v-model="form.email" :disabled="!isEdit" />
              </ElFormItem>
            </ElRow>

            <ElRow>
              <ElFormItem label="手机" prop="mobile">
                <ElInput v-model="form.mobile" :disabled="true" />
              </ElFormItem>
              <ElFormItem label="地址" prop="address" class="right-input">
                <ElCascader
                  v-model="addressSelect"
                  :options="regionData"
                  :props="addressProps"
                  :disabled="!isEdit"
                  filterable
                  clearable
                  @change="handleAddressChange"
                />
              </ElFormItem>
            </ElRow>

            <ElFormItem label="个人介绍" prop="des" :style="{ height: '130px' }">
              <ElInput type="textarea" :rows="4" v-model="form.des" :disabled="!isEdit" />
            </ElFormItem>

            <div class="el-form-item-right">
              <ElButton type="primary" style="width: 90px" v-ripple @click="edit">
                {{ isEdit ? '保存' : '编辑' }}
              </ElButton>
            </div>
          </ElForm>
        </div>

        <div class="info box-style" style="margin-top: 20px">
          <h1 class="title">更改密码</h1>

          <ElForm :model="pwdForm" class="form" label-width="86px" label-position="top">
            <ElFormItem label="当前密码" prop="password">
              <ElInput
                v-model="pwdForm.password"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <ElFormItem label="新密码" prop="newPassword">
              <ElInput
                v-model="pwdForm.newPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <ElFormItem label="确认新密码" prop="confirmPassword">
              <ElInput
                v-model="pwdForm.confirmPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <div class="el-form-item-right">
              <ElButton type="primary" style="width: 90px" v-ripple @click="editPwd">
                {{ isEditPwd ? '保存' : '编辑' }}
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { fetchGetProfile, fetchSaveProfile, fetchChangePassword } from '@/api/user-center'
  import { fetchGetUserInfo } from '@/api/auth'
  import { regionData } from 'element-china-area-data'
  import { getRoleLabel } from '@/utils/employee'

  defineOptions({ name: 'UserCenter' })

  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)

  const isEdit = ref(false)
  const isEditPwd = ref(false)
  const date = ref('')
  const form = reactive({
    realName: '',
    nikeName: '',
    email: '',
    mobile: '',
    address: '',
    sex: '2',
    des: ''
  })

  // 扩展信息（非表单保存字段）
  const ext = reactive({
    position: '',
    orgPath: ''
  })

  const pwdForm = reactive({
    password: '',
    newPassword: '',
    confirmPassword: ''
  })

  const ruleFormRef = ref<FormInstance>()

  const rules = reactive<FormRules>({
    realName: [
      { required: true, message: '请输入姓名', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ],
    nikeName: [
      { required: true, message: '请输入昵称', trigger: 'blur' },
      { min: 2, max: 50, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ],
    email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
    mobile: [{ required: true, message: '请输入手机号码', trigger: 'blur' }],
    address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
    sex: [{ required: true, message: '请选择性别', trigger: 'change' }]
  })

  const options = [
    {
      value: '1',
      label: '男'
    },
    {
      value: '2',
      label: '女'
    }
  ]

  // 标签区块已移除

  // 地址选择（省/市/区），保存为字符串
  const addressSelect = ref<string[]>([])
  const addressProps = { value: 'label', label: 'label', children: 'children' }

  const handleAddressChange = (val: string[]) => {
    form.address = (val || []).join(' ')
  }

  onMounted(async () => {
    getDate()
    await loadProfile()
  })

  const loadProfile = async () => {
    try {
      const res = await fetchGetProfile()
      // 后端字段 nickName -> 前端表单 nikeName
      form.realName = res.realName || ''
      form.nikeName = (res as any).nickName || ''
      form.email = res.email || ''
      form.mobile = res.mobile || ''
      form.address = res.address || ''
      form.sex = String(res.sex || '2')
      form.des = res.des || ''
      // 左侧信息卡额外字段
      ext.position = (res as any).position || ''
      ext.orgPath = (res as any).orgPath || ''
      // 尝试填充地址选择（如果能拆分出省市区）
      addressSelect.value = form.address ? form.address.split(/\s+|\//).filter(Boolean) : []
    } catch {
      // ignore
    }
  }

  const getDate = () => {
    const d = new Date()
    const h = d.getHours()
    let text = ''

    if (h >= 6 && h < 9) {
      text = '早上好'
    } else if (h >= 9 && h < 11) {
      text = '上午好'
    } else if (h >= 11 && h < 13) {
      text = '中午好'
    } else if (h >= 13 && h < 18) {
      text = '下午好'
    } else if (h >= 18 && h < 24) {
      text = '晚上好'
    } else if (h >= 0 && h < 6) {
      text = '很晚了，早点睡'
    }

    date.value = text
  }

  const edit = async () => {
    if (!isEdit.value) {
      isEdit.value = true
      return
    }
    // 保存
    if (!ruleFormRef.value) return
    await ruleFormRef.value.validate(async (valid) => {
      if (!valid) return
      try {
        const payload: Api.UserCenter.SaveProfileParams = {
          realName: form.realName,
          nickName: form.nikeName,
          email: form.email,
          mobile: form.mobile,
          address: form.address,
          sex: Number(form.sex || 2),
          des: form.des
        }
        await fetchSaveProfile(payload)
        // 刷新用户信息（用于左侧卡片邮箱等）
        const info = await fetchGetUserInfo()
        userStore.setUserInfo(info)
        isEdit.value = false
      } catch {
        // 错误提示由请求拦截器处理
      }
    })
  }

  const editPwd = async () => {
    if (!isEditPwd.value) {
      isEditPwd.value = true
      return
    }
    // 保存密码
    if (!pwdForm.password && !pwdForm.newPassword && !pwdForm.confirmPassword) {
      // 未修改任何内容，直接退出编辑
      isEditPwd.value = false
      ElMessage.info('未修改密码')
      return
    }
    if (!pwdForm.password || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      ElMessage.error('请填写完整的密码信息')
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      ElMessage.error('两次输入的新密码不一致')
      return
    }
    try {
      await fetchChangePassword({ password: pwdForm.password, newPassword: pwdForm.newPassword })
      isEditPwd.value = false
      // 清空表单
      pwdForm.password = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
    } catch {
      // 错误提示由请求拦截器处理
    }
  }
</script>

<style lang="scss">
  .user {
    .icon {
      width: 1.4em;
      height: 1.4em;
      overflow: hidden;
      vertical-align: -0.15em;
      fill: currentcolor;
    }
  }
</style>

<style lang="scss" scoped>
  .page-content {
    width: 100%;
    height: 100%;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;

    $box-radius: calc(var(--custom-radius) + 4px);

    .box-style {
      border: 1px solid var(--art-border-color);
    }

    .content {
      position: relative;
      display: flex;
      justify-content: space-between;
      margin-top: 10px;

      .left-wrap {
        width: 450px;
        margin-right: 25px;

        .user-wrap {
          position: relative;
          height: auto;
          min-height: 520px;
          padding: 35px 40px 24px;
          overflow: hidden;
          text-align: center;
          background: var(--art-main-bg-color);
          border-radius: $box-radius;

          .bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 200px;
            object-fit: cover;
          }

          .avatar {
            position: relative;
            z-index: 10;
            width: 80px;
            height: 80px;
            margin-top: 120px;
            object-fit: cover;
            border: 2px solid #fff;
            border-radius: 50%;
          }

          .name {
            margin-top: 16px;
            font-size: 24px;
            font-weight: 400;
          }

          .des {
            margin-top: 20px;
            font-size: 14px;
          }

          .outer-info {
            width: 320px;
            margin: auto;
            margin-top: 20px;
            text-align: left;

            > div {
              margin-top: 10px;
              line-height: 20px;

              span {
                margin-left: 8px;
                font-size: 14px;
              }
            }
          }

          .intro {
            width: 320px;
            margin: 14px auto 0;
            padding: 10px 12px;
            text-align: left;
            background: var(--art-main-bg-color);
            border: 1px solid var(--art-border-color);
            border-radius: 6px;

            .intro-title {
              margin: 0 0 8px;
              font-size: 14px;
              color: var(--art-text-gray-800);
            }

            .intro-text {
              margin: 0;
              font-size: 14px;
              color: var(--art-gray-800);
              white-space: pre-wrap;
              word-break: break-word;
              line-height: 20px;
            }
          }
        }

        .gallery {
          margin-top: 25px;
          border-radius: 10px;

          .item {
            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          }
        }
      }

      .right-wrap {
        flex: 1;
        overflow: hidden;
        border-radius: $box-radius;

        .info {
          background: var(--art-main-bg-color);
          border-radius: $box-radius;

          .title {
            padding: 15px 25px;
            font-size: 20px;
            font-weight: 400;
            color: var(--art-text-gray-800);
            border-bottom: 1px solid var(--art-border-color);
          }

          .form {
            box-sizing: border-box;
            padding: 30px 25px;

            > .el-row {
              .el-form-item {
                width: calc(50% - 10px);
              }

              .el-input,
              .el-select {
                width: 100%;
              }
            }

            .right-input {
              margin-left: 20px;
            }

            .el-form-item-right {
              display: flex;
              align-items: center;
              justify-content: end;

              .el-button {
                width: 110px !important;
              }
            }
          }
        }
      }
    }
  }

  @media only screen and (max-width: $device-ipad-vertical) {
    .page-content {
      .content {
        display: block;
        margin-top: 5px;

        .left-wrap {
          width: 100%;
        }

        .right-wrap {
          width: 100%;
          margin-top: 15px;
        }
      }
    }
  }
</style>
