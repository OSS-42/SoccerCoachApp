import type { AppTheme } from '@/domain/types'

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

export function isTheme(value: string): value is AppTheme {
  return value === 'dark' || value === 'light'
}
