export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node as T
}

export function optionalEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const DIALOG_TOGGLE_EVENT = 'actionpitch:dialog'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const openDialogs: { dialog: HTMLElement; returnFocus: HTMLElement | null }[] = []
let keyHandlerBound = false

function visibleFocusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => !node.hidden && node.getClientRects().length > 0,
  )
}

function markAsModal(dialog: HTMLElement): void {
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.tabIndex = -1
  const title = dialog.querySelector<HTMLElement>('h1, h2, h3')
  if (title) {
    if (!title.id) title.id = `${dialog.id}-title`
    dialog.setAttribute('aria-labelledby', title.id)
  }
}

function onDialogKey(event: KeyboardEvent): void {
  const top = openDialogs[openDialogs.length - 1]?.dialog
  if (!top) return
  if (event.key === 'Escape') {
    // Use the dialog's own cancel/close button so callers (askConfirm, …) resolve normally.
    const dismiss = top.querySelector<HTMLElement>('[id^="cancel-"], [id^="close-"], [id$="-cancel"]')
    if (dismiss) {
      event.preventDefault()
      dismiss.click()
    }
    return
  }
  if (event.key !== 'Tab') return
  const items = visibleFocusables(top)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  const outside = active === top || !top.contains(active)
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault()
    first.focus()
  }
}

export function toggleDialog(id: string, open: boolean): void {
  const dialog = optionalEl(id)
  if (!dialog) return
  dialog.style.display = open ? 'flex' : 'none'
  dialog.classList.toggle('active', open)
  if (!keyHandlerBound) {
    document.addEventListener('keydown', onDialogKey)
    keyHandlerBound = true
  }
  const index = openDialogs.findIndex((entry) => entry.dialog === dialog)
  if (open && index < 0) {
    markAsModal(dialog)
    const active = document.activeElement
    openDialogs.push({ dialog, returnFocus: active instanceof HTMLElement ? active : null })
    // Focus the dialog itself, not its first input, so phones don't pop the keyboard.
    if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true })
  } else if (!open && index >= 0) {
    const [{ returnFocus }] = openDialogs.splice(index, 1)
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }
  document.dispatchEvent(new CustomEvent(DIALOG_TOGGLE_EVENT, { detail: { id, open } }))
}
