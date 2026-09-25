/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toggleDialog } from './dom'

beforeEach(() => {
  document.body.innerHTML = `
    <button id="opener">Open</button>
    <div id="note-dialog" class="dialog">
      <div class="dialog-content">
        <h2>Add note</h2>
        <textarea id="note-text"></textarea>
        <button id="cancel-note">Cancel</button>
        <button id="save-note">Save</button>
      </div>
    </div>`
})

describe('toggleDialog accessibility', () => {
  it('marks the dialog as a labelled modal and focuses it without focusing the text field', () => {
    document.getElementById('opener')!.focus()
    toggleDialog('note-dialog', true)
    const dialog = document.getElementById('note-dialog')!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Add note')
    expect(document.activeElement).toBe(dialog)
    toggleDialog('note-dialog', false)
  })

  it('Escape presses the dialog’s own cancel button', () => {
    toggleDialog('note-dialog', true)
    const cancel = vi.fn(() => toggleDialog('note-dialog', false))
    document.getElementById('cancel-note')!.addEventListener('click', cancel)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(document.getElementById('note-dialog')!.classList.contains('active')).toBe(false)
  })

  it('returns focus to the control that opened the dialog', () => {
    const opener = document.getElementById('opener')!
    opener.focus()
    toggleDialog('note-dialog', true)
    toggleDialog('note-dialog', false)
    expect(document.activeElement).toBe(opener)
  })

  it('still announces open/close for the tutorial overlay', () => {
    const seen: unknown[] = []
    document.addEventListener('actionpitch:dialog', (e) => seen.push((e as CustomEvent).detail))
    toggleDialog('note-dialog', true)
    toggleDialog('note-dialog', false)
    expect(seen).toEqual([
      { id: 'note-dialog', open: true },
      { id: 'note-dialog', open: false },
    ])
  })
})
