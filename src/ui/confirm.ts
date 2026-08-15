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
