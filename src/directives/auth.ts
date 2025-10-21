import { router } from '@/router'
import { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { storeToRefs } from 'pinia'

/**
 * 权限指令（后端控制模式可用）
 * 用法：
 * <el-button v-auth="'add'">按钮</el-button>
 */

interface AuthBinding extends DirectiveBinding {
  value: string
}

function checkAuthPermission(el: HTMLElement, binding: AuthBinding): void {
  // 优先使用用户信息中的按钮权限（后端返回）
  const userStore = useUserStore()
  const { info } = storeToRefs(userStore)
  const buttons: string[] = Array.isArray(info.value?.buttons)
    ? (info.value?.buttons as string[])
    : []

  const lower = String(binding.value).toLowerCase()
  const upper = String(binding.value).toUpperCase()
  const withPrefixUpper = `B_${upper}`
  const withPrefixLower = `b_${lower}`
  const candidates = [binding.value, lower, upper, withPrefixUpper, withPrefixLower]

  let hasPermission = false
  if (buttons.length) {
    hasPermission = buttons.some((mark) => candidates.includes(String(mark)))
  } else {
    // 回退：使用当前路由的权限列表（meta.authList）
    const authList = (router.currentRoute.value.meta.authList as Array<{ authMark: string }>) || []
    hasPermission = authList.some((item) => item.authMark === binding.value)
  }

  // 如果没有权限，移除元素
  if (!hasPermission) {
    removeElement(el)
  }
}

function removeElement(el: HTMLElement): void {
  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

const authDirective: Directive = {
  mounted: checkAuthPermission,
  updated: checkAuthPermission
}

export function setupAuthDirective(app: App): void {
  app.directive('auth', authDirective)
}
