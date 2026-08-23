import { t, type MessageKey } from '@/i18n'
import { askConfirm } from './confirm'
import { showScreen } from './nav'

export async function showPaywall(messageKey: MessageKey = 'proMoreTeams'): Promise<void> {
  const goSettings = await askConfirm({
    title: t('proRequiredTitle'),
    message: t(messageKey),
    confirmLabel: t('proOpenSettings'),
    cancelLabel: t('close'),
  })
  if (goSettings) showScreen('settings')
}
