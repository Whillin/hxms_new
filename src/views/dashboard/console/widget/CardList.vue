<template>
  <el-row :gutter="20" class="card-list">
    <el-col v-for="(item, index) in dataList" :key="index" :sm="12" :md="6" :lg="6">
      <div class="card art-custom-card">
        <span class="des subtitle">{{ item.des }}</span>
        <ArtCountTo class="number box-title" :target="item.num" :duration="1300" />
        <div class="change-box">
          <span class="change-text">较上周</span>
          <span
            class="change"
            :class="[item.change.indexOf('+') === -1 ? 'text-danger' : 'text-success']"
          >
            {{ item.change }}
          </span>
        </div>
        <i class="iconfont-sys" v-html="item.icon"></i>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
  import { reactive, onMounted } from 'vue'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetClueWeeklyVisitCount, fetchGetClueWeeklyClickCount } from '@/api/clue'
  import { fetchOnlineDailyWeeklyTotal } from '@/api/channel'
  import { fetchGetCustomerNewWeekCount } from '@/api/customer'

  const dataList = reactive([
    {
      des: '总访问次数',
      icon: '&#xe721;',
      startVal: 0,
      duration: 1000,
      num: 9120,
      change: '+20%'
    },
    {
      des: '在线访客数',
      icon: '&#xe724;',
      startVal: 0,
      duration: 1000,
      num: 182,
      change: '+10%'
    },
    {
      des: '点击量',
      icon: '&#xe7aa;',
      startVal: 0,
      duration: 1000,
      num: 9520,
      change: '-12%'
    },
    {
      des: '新用户',
      icon: '&#xe82a;',
      startVal: 0,
      duration: 1000,
      num: 156,
      change: '+30%'
    }
  ])

  onMounted(async () => {
    try {
      const userStore = useUserStore()
      const storeIdNum = Number(userStore.info?.storeId || 0)
      const storeParam = storeIdNum > 0 ? { storeId: storeIdNum } : undefined

      const newWeek = await fetchGetCustomerNewWeekCount(storeParam as any)
      dataList[3].num = Number((newWeek as any)?.count ?? dataList[3].num)
      {
        const vres = await fetchGetClueWeeklyVisitCount(storeParam as any)
        dataList[0].num = Number((vres as any)?.count ?? dataList[0].num)
        const vcp = Number((vres as any)?.changePercent ?? 0)
        dataList[0].change = `${vcp >= 0 ? '+' : ''}${vcp}%`
      }
      {
        const ores = await fetchOnlineDailyWeeklyTotal(storeParam as any)
        dataList[1].num = Number((ores as any)?.count ?? dataList[1].num)
        const ocp = Number((ores as any)?.changePercent ?? 0)
        dataList[1].change = `${ocp >= 0 ? '+' : ''}${ocp}%`
      }
      {
        const cres = await fetchGetClueWeeklyClickCount(storeParam as any)
        dataList[2].num = Number((cres as any)?.count ?? dataList[2].num)
        const ccp = Number((cres as any)?.changePercent ?? 0)
        dataList[2].change = `${ccp >= 0 ? '+' : ''}${ccp}%`
      }
    } catch (e) {
      console.error('[CardList] 加载周度数据失败:', e)
    }
  })
</script>

<style lang="scss" scoped>
  .card-list {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    background-color: transparent !important;

    .art-custom-card {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 140px;
      padding: 0 18px;
      list-style: none;
      transition: all 0.3s ease;

      $icon-size: 52px;

      .iconfont-sys {
        position: absolute;
        top: 0;
        right: 20px;
        bottom: 0;
        width: $icon-size;
        height: $icon-size;
        margin: auto;
        overflow: hidden;
        font-size: 22px;
        line-height: $icon-size;
        color: var(--el-color-primary) !important;
        text-align: center;
        background-color: var(--el-color-primary-light-9);
        border-radius: 12px;
      }

      .des {
        display: block;
        height: 14px;
        font-size: 14px;
        line-height: 14px;
      }

      .number {
        display: block;
        margin-top: 10px;
        font-size: 28px;
        font-weight: 400;
      }

      .change-box {
        display: flex;
        align-items: center;
        margin-top: 10px;

        .change-text {
          display: block;
          font-size: 13px;
          color: var(--art-text-gray-600);
        }

        .change {
          display: block;
          margin-left: 5px;
          font-size: 13px;
          font-weight: bold;

          &.text-success {
            color: var(--el-color-success);
          }

          &.text-danger {
            color: var(--el-color-danger);
          }
        }
      }
    }
  }

  .dark {
    .card-list {
      .art-custom-card {
        .iconfont-sys {
          background-color: #232323 !important;
        }
      }
    }
  }
</style>
