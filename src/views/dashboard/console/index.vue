<template>
  <div class="console">
    <el-card class="art-custom-card" style="margin-bottom: 12px" v-if="showIncomplete">
      <div class="card-header">
        <div class="title">
          <h4>今日未完成填报</h4>
          <p>
            您的门店当日线上渠道填报未完成
            <span>已提交：{{ submittedCount }}/{{ total }}</span>
          </p>
        </div>
        <div>
          <el-badge is-dot type="danger" style="margin-right: 8px" />
          <el-button type="danger" @click="goDaily">立即前往</el-button>
        </div>
      </div>
    </el-card>
    <CardList></CardList>

    <el-row :gutter="20">
      <el-col :sm="24" :md="12" :lg="10">
        <ActiveUser />
      </el-col>
      <el-col :sm="24" :md="12" :lg="14">
        <SalesOverview />
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :sm="24" :md="24" :lg="12">
        <NewUser />
      </el-col>
      <el-col :sm="24" :md="12" :lg="6">
        <Dynamic />
      </el-col>
      <el-col :sm="24" :md="12" :lg="6">
        <TodoList />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
  import CardList from './widget/CardList.vue'
  import ActiveUser from './widget/ActiveUser.vue'
  import SalesOverview from './widget/SalesOverview.vue'
  import NewUser from './widget/NewUser.vue'
  import Dynamic from './widget/Dynamic.vue'
  import TodoList from './widget/TodoList.vue'
  import { useCommon } from '@/composables/useCommon'
  import { useUserStore } from '@/store/modules/user'
  import { fetchOnlineDailyTodayCompletion } from '@/api/channel'
  import { RoutesAlias } from '@/router/routesAlias'

  defineOptions({ name: 'Console' })

  useCommon().scrollToTop()

  const userStore = useUserStore()
  const showIncomplete = ref(false)
  const submittedCount = ref(0)
  const total = ref(0)

  const goDaily = () => {
    const router = useRouter()
    router.push(RoutesAlias.ChannelOnlineDaily)
  }

  onMounted(async () => {
    try {
      const roles = Array.isArray(userStore.info?.roles) ? userStore.info!.roles : []
      const isMgr =
        roles.includes('R_STORE_MANAGER') ||
        roles.includes('R_STORE_DIRECTOR') ||
        roles.includes('R_ADMIN') ||
        roles.includes('R_SUPER')
      const storeIdNum = Number(userStore.info?.storeId || 0)
      if (!isMgr || storeIdNum <= 0) return
      const res = await fetchOnlineDailyTodayCompletion({ storeId: storeIdNum })
      const data = (res as any)?.data || {}
      showIncomplete.value = !!data.incomplete
      submittedCount.value = Number(data.submittedCount || 0)
      total.value = Number(data.total || 0)
    } catch (e) {
      console.error('[Console] 加载今日完成度失败:', e)
    }
  })
</script>

<style lang="scss" scoped>
  @use './style';
</style>
