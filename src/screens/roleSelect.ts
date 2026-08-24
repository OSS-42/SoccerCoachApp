import { getRole, hasChosenRole, setRole } from '@/state/store'
import { showScreen, type ScreenId } from '@/ui/nav'

export function homeForRole(): ScreenId {
  return getRole() === 'parent' ? 'parent-home' : 'main-screen'
}

export function goToRoleHome(history: 'push' | 'replace' = 'replace'): void {
  showScreen(homeForRole(), { history })
}

export function goAfterIntro(): void {
  if (!hasChosenRole()) {
    showScreen('role-screen', { history: 'replace' })
    return
  }
  goToRoleHome('replace')
}

export function bindRoleSelect(): void {
  document.getElementById('pick-role-coach')?.addEventListener('click', () => {
    setRole('coach')
    goToRoleHome('replace')
  })
  document.getElementById('pick-role-parent')?.addEventListener('click', () => {
    setRole('parent')
    goToRoleHome('replace')
  })
}
