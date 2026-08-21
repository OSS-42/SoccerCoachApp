import { toggleDialog } from './dom'

export function askConfirm(options: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}): Promise<boolean> {
  const dialog = document.getElementById('app-confirm-dialog')
  const title = document.getElementById('app-confirm-title')
  const message = document.getElementById('app-confirm-message')
  const okBtn = document.getElementById('app-confirm-ok')
  const cancelBtn = document.getElementById('app-confirm-cancel')
  if (!dialog || !title || !message || !okBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(options.message))
  }

  title.textContent = options.title
  message.textContent = options.message
  okBtn.textContent = options.confirmLabel
  cancelBtn.textContent = options.cancelLabel
  toggleDialog('app-confirm-dialog', true)

  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      okBtn.removeEventListener('click', onOk)
      cancelBtn.removeEventListener('click', onCancel)
      dialog.removeEventListener('click', onBackdrop)
      toggleDialog('app-confirm-dialog', false)
      resolve(ok)
    }
    const onOk = () => finish(true)
    const onCancel = () => finish(false)
    const onBackdrop = (event: Event) => {
      if (event.target === dialog) finish(false)
    }
    okBtn.addEventListener('click', onOk)
    cancelBtn.addEventListener('click', onCancel)
    dialog.addEventListener('click', onBackdrop)
  })
}

export function askPrompt(options: {
  title: string
  message?: string
  placeholder?: string
  value?: string
  confirmLabel: string
  cancelLabel: string
  multiline?: boolean
}): Promise<string | null> {
  const dialog = document.getElementById('app-prompt-dialog')
  const title = document.getElementById('app-prompt-title')
  const message = document.getElementById('app-prompt-message')
  const input = document.getElementById('app-prompt-input') as HTMLInputElement | null
  const area = document.getElementById('app-prompt-area') as HTMLTextAreaElement | null
  const okBtn = document.getElementById('app-prompt-ok')
  const cancelBtn = document.getElementById('app-prompt-cancel')
  if (!dialog || !title || !okBtn || !cancelBtn || !input || !area) {
    return Promise.resolve(window.prompt(options.message ?? options.title))
  }

  title.textContent = options.title
  if (message) {
    message.textContent = options.message ?? ''
    message.hidden = !options.message
  }
  const field = options.multiline ? area : input
  const hidden = options.multiline ? input : area
  hidden.hidden = true
  field.hidden = false
  field.value = options.value ?? ''
  field.placeholder = options.placeholder ?? ''
  okBtn.textContent = options.confirmLabel
  cancelBtn.textContent = options.cancelLabel
  toggleDialog('app-prompt-dialog', true)
  window.setTimeout(() => field.focus(), 50)

  return new Promise((resolve) => {
    const finish = (value: string | null) => {
      okBtn.removeEventListener('click', onOk)
      cancelBtn.removeEventListener('click', onCancel)
      field.removeEventListener('keydown', onKey)
      dialog.removeEventListener('click', onBackdrop)
      toggleDialog('app-prompt-dialog', false)
      resolve(value)
    }
    const onOk = () => {
      const text = field.value.trim()
      finish(text || null)
    }
    const onCancel = () => finish(null)
    const onKey = (event: Event) => {
      const key = (event as KeyboardEvent).key
      if (key === 'Enter' && !options.multiline) {
        event.preventDefault()
        onOk()
      }
      if (key === 'Escape') onCancel()
    }
    const onBackdrop = (event: Event) => {
      if (event.target === dialog) finish(null)
    }
    okBtn.addEventListener('click', onOk)
    cancelBtn.addEventListener('click', onCancel)
    field.addEventListener('keydown', onKey)
    dialog.addEventListener('click', onBackdrop)
  })
}
