import { en } from './en'
import { fr } from './fr'

export type Locale = 'en' | 'fr'
export type MessageKey = keyof typeof en

const tables: Record<Locale, Record<MessageKey, string>> = { en, fr }

let locale: Locale = 'en'

export function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return lang.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function getLocale(): Locale {
  return locale
}

export function setLocale(next: Locale): void {
  locale = next
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next
  }
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text = tables[locale][key] ?? en[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export function actionLabel(type: string): string {
  const key = `action.${type}` as MessageKey
  return key in en ? t(key) : type
}

export function applyDomTranslations(root: ParentNode = document): void {
  if (typeof document !== 'undefined') {
    document.title = t('appTitle')
    document.documentElement.lang = locale
  }
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n as MessageKey | undefined
    if (key) node.textContent = t(key)
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((node) => {
    const key = node.dataset.i18nPlaceholder as MessageKey | undefined
    if (key && 'placeholder' in node) {
      ;(node as HTMLInputElement).placeholder = t(key)
    }
  })
}

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'fr'
}
