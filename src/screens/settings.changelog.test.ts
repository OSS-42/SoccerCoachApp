/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { bindSettings } from './settings'

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? ''

describe('settings changelog dialog', () => {
  beforeEach(() => {
    document.body.innerHTML = body
    bindSettings()
  })

  it('opens the last two versions', () => {
    document.getElementById('open-changelog')?.click()
    const dialog = document.getElementById('changelog-dialog')
    const list = document.getElementById('changelog-list')
    expect(dialog?.classList.contains('active')).toBe(true)
    expect(list?.querySelectorAll('.changelog-entry')).toHaveLength(2)
    expect(list?.textContent).toContain('v2.4.60')
    expect(list?.textContent).toContain('v2.4.59')
  })

  it('groups tips under the live and formation screens', () => {
    const live = document.querySelector('#tips-dialog [data-i18n="tipScreenLive"]')
    const formation = document.querySelector('#tips-dialog [data-i18n="tipScreenFormation"]')
    expect(live?.textContent).toContain('Live game')
    expect(formation?.textContent).toContain('Formation Setup')
    expect(live?.closest('.tips-block')?.querySelector('[data-i18n="tipLiveChange"]')).toBeTruthy()
    expect(formation?.closest('.tips-block')?.querySelector('[data-i18n="tipFormation"]')).toBeTruthy()
  })
})
