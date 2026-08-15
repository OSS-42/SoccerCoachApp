export type ScreenId =
  | 'main-screen'
  | 'team-setup'
  | 'game-setup'
  | 'formation-setup'
  | 'game-tracking'
  | 'reports'
  | 'settings'

const listeners = new Map<ScreenId, () => void>()

export function onShow(id: ScreenId, fn: () => void): void {
  listeners.set(id, fn)
}

export function showScreen(id: ScreenId): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === id)
  })
  listeners.get(id)?.()
}
