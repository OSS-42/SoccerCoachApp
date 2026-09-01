export type ScreenId =
  | 'ota-screen'
  | 'intro-screen'
  | 'role-screen'
  | 'main-screen'
  | 'parent-home'
  | 'team-setup'
  | 'game-setup'
  | 'formation-setup'
  | 'game-tracking'
  | 'reports'
  | 'settings'

const listeners = new Map<ScreenId, () => void>()
const afterShow = new Set<(id: ScreenId) => void>()

export function onShow(id: ScreenId, fn: () => void): void {
  listeners.set(id, fn)
}

export function onAfterShow(fn: (id: ScreenId) => void): () => void {
  afterShow.add(fn)
  return () => afterShow.delete(fn)
}

export function activeScreenId(): ScreenId {
  return (document.querySelector('.screen.active')?.id as ScreenId) ?? 'main-screen'
}

export function showScreen(
  id: ScreenId,
  opts: { history?: 'push' | 'replace' | 'none' } = {},
): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === id)
  })
  listeners.get(id)?.()
  afterShow.forEach((fn) => fn(id))
  const mode = opts.history ?? 'push'
  if (mode === 'push') history.pushState({ screen: id }, '')
  if (mode === 'replace') history.replaceState({ screen: id }, '')
}

export function bindHistoryNavigation(onLeave: (from: ScreenId) => boolean): void {
  window.addEventListener('popstate', (event) => {
    const from = activeScreenId()
    if (onLeave(from)) {
      history.pushState({ screen: from }, '')
      return
    }
    const next = (event.state?.screen as ScreenId | undefined) ?? 'main-screen'
    showScreen(next, { history: 'none' })
  })
}
