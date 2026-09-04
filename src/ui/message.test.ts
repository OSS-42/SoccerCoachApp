/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hideMessage, showMessage } from './message'

describe('message ribbon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div id="message-ribbon" class="message-ribbon hidden" style="display:none">
        <span id="message-text"></span>
        <button class="close-btn" id="close-message">×</button>
      </div>
    `
  })

  afterEach(() => {
    hideMessage()
    vi.useRealTimers()
  })

  it('shows then hides the ribbon without changing screen layout class', () => {
    showMessage('Choose a format', 'error')
    const ribbon = document.getElementById('message-ribbon')
    expect(ribbon?.classList.contains('hidden')).toBe(false)
    expect(ribbon?.textContent).toContain('Choose a format')
    hideMessage()
    expect(ribbon?.classList.contains('hidden')).toBe(true)
  })
})
