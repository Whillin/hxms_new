import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FollowUpRecord {
  id: string
  opportunityId: string
  opportunityName?: string
  content: string
  followResult: string
  nextContactTime: string
  status: string
  method: string
  createdAt: string
}

const formatDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const isSameDay = (a: string, b: string) => {
  if (!a || !b) return false
  const da = a.split(' ')[0]
  const db = b.split(' ')[0]
  return da === db
}

export const useOpportunityFollowStore = defineStore(
  'opportunityFollowStore',
  () => {
    // 全局跟进记录
    const records = ref<FollowUpRecord[]>([])

    // 今日需要跟进的商机ID集合（基于下次联系时间的日期）
    const todayOpportunityIds = computed(() => {
      const today = formatDate(new Date())
      const ids = new Set<string>()
      records.value.forEach((r) => {
        if (isSameDay(r.nextContactTime, `${today} 00:00:00`)) {
          ids.add(r.opportunityId)
        }
      })
      return ids
    })

    // 添加跟进记录（自动生成缺失的 id / createdAt）
    const addRecord = (payload: Partial<FollowUpRecord>) => {
      const now = new Date()
      const record: FollowUpRecord = {
        id: payload.id || `F${Date.now()}`,
        opportunityId: String(payload.opportunityId || ''),
        opportunityName: payload.opportunityName || '',
        content: payload.content || '',
        followResult: payload.followResult || '',
        nextContactTime: payload.nextContactTime || `${formatDate(now)} 00:00:00`,
        status: payload.status || '跟进中',
        method: payload.method || '电话',
        createdAt:
          payload.createdAt ||
          `${formatDate(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      }
      records.value = [record, ...records.value]
    }

    // 批量添加（用于后续可能的初始化场景）
    const addBatch = (list: FollowUpRecord[]) => {
      if (Array.isArray(list) && list.length) {
        records.value = [...list, ...records.value]
      }
    }

    // 删除记录
    const deleteRecord = (id: string) => {
      const idx = records.value.findIndex((r) => r.id === id)
      if (idx >= 0) records.value.splice(idx, 1)
    }

    // 获取指定商机的记录
    const getByOpportunityId = (opportunityId: string) => {
      return records.value.filter((r) => r.opportunityId === opportunityId)
    }

    return {
      records,
      todayOpportunityIds,
      addRecord,
      addBatch,
      deleteRecord,
      getByOpportunityId
    }
  },
  {
    persist: {
      key: 'opportunityFollow',
      storage: localStorage
    }
  }
)
