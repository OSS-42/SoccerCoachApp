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

export function toggleDialog(id: string, open: boolean): void {
  const dialog = optionalEl(id)
  if (!dialog) return
  dialog.style.display = open ? 'flex' : 'none'
  dialog.classList.toggle('active', open)
}
