import { t } from '@/i18n'
import { benchSlotCount, fieldSpotDefs, filterDefaultFormation, validateFormation } from '@/domain/formation'
import type { FormationSpot } from '@/domain/types'
import { getCurrentTeam, pauseClock, startPreparedGame } from '@/state/store'
import { escapeHtml } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { clearGameDraft, getGameDraft } from './gameSetup'
import { fillTeamSelectors } from './shared'

type SlotKind = 'field' | 'bench' | 'unavailable'

let selectedPlayerId: string | null = null

function slotKind(el: Element): SlotKind | null {
  if (el.classList.contains('player-slot')) return 'field'
  if (el.classList.contains('bench-slot')) return 'bench'
  if (el.classList.contains('unavailable-slot')) return 'unavailable'
  return null
}

function allSlots(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>('.player-slot, .bench-slot, .unavailable-slot'),
  ]
}

function slotByPlayer(playerId: string): HTMLElement | null {
  return allSlots().find((slot) => slot.dataset.playerId === playerId) ?? null
}

function paintSlot(slot: HTMLElement, playerId: string | null, name = '', jersey = 0): void {
  if (!playerId) {
    slot.innerHTML = ''
    delete slot.dataset.playerId
    slot.classList.remove('occupied')
    return
  }
  const onField = slot.classList.contains('player-slot')
  slot.dataset.playerId = playerId
  slot.classList.add('occupied')
  slot.innerHTML = `<span class="player-number ${onField ? 'player-number-placed' : ''}" data-player-id="${playerId}"><span class="jersey-num">${jersey}</span><span class="${onField ? 'player-name-field' : 'player-name-bench'}">${escapeHtml(name)}</span></span>`
}

function playerMeta(playerId: string): { name: string; jersey: number } {
  const player = getCurrentTeam()?.players.find((p) => p.id === playerId)
  return { name: player?.name ?? '', jersey: player?.jerseyNumber ?? 0 }
}

function readFormation(): { field: FormationSpot[]; unavailable: string[] } {
  const field: FormationSpot[] = []
  const unavailable: string[] = []
  document.querySelectorAll<HTMLElement>('.player-slot[data-player-id]').forEach((slot) => {
    field.push({
      playerId: slot.dataset.playerId!,
      position: slot.dataset.position ?? '',
      x: parseFloat(slot.style.left) || 50,
      y: parseFloat(slot.style.top) || 50,
    })
  })
  document.querySelectorAll<HTMLElement>('.unavailable-slot[data-player-id]').forEach((slot) => {
    unavailable.push(slot.dataset.playerId!)
  })
  return { field, unavailable }
}

function place(playerId: string, slot: HTMLElement): void {
  const previous = slotByPlayer(playerId)
  const displaced = slot.dataset.playerId
  if (previous) paintSlot(previous, null)
  const meta = playerMeta(playerId)
  paintSlot(slot, playerId, meta.name, meta.jersey)
  if (displaced && displaced !== playerId) {
    const emptyBench = [...document.querySelectorAll<HTMLElement>('.bench-slot')].find(
      (s) => !s.dataset.playerId,
    )
    if (emptyBench) {
      const other = playerMeta(displaced)
      paintSlot(emptyBench, displaced, other.name, other.jersey)
    }
  }
}

function clearSelection(): void {
  selectedPlayerId = null
  document.querySelectorAll('.tap-selected').forEach((n) => n.classList.remove('tap-selected'))
}

function handleSlotPointer(event: PointerEvent): void {
  event.preventDefault()
  const slot = (event.currentTarget as HTMLElement).closest<HTMLElement>(
    '.player-slot, .bench-slot, .unavailable-slot',
  )
  if (!slot || !slotKind(slot)) return
  const tappedId = slot.dataset.playerId ?? null
  if (!selectedPlayerId) {
    if (!tappedId) {
      showMessage(t('tapOccupied'), 'warning')
      return
    }
    selectedPlayerId = tappedId
    slot.querySelector('.player-number')?.classList.add('tap-selected')
    showMessage(t('playerSelected', { jersey: playerMeta(tappedId).jersey }), 'info')
    return
  }
  if (tappedId === selectedPlayerId) {
    clearSelection()
    return
  }
  place(selectedPlayerId, slot)
  clearSelection()
}

export function renderFormation(): void {
  fillTeamSelectors()
  const draft = getGameDraft()
  const team = getCurrentTeam()
  const field = document.getElementById('formation-field')
  const bench = document.getElementById('bench-slots')
  const unavailable = document.getElementById('unavailable-slots')
  const sidebar = document.getElementById('player-list')
  if (!field || !bench || !unavailable || !team || !draft) {
    if (!draft) showScreen('game-setup')
    return
  }

  field.innerHTML = ''
  bench.innerHTML = ''
  unavailable.innerHTML = ''
  if (sidebar) sidebar.innerHTML = ''

  const surface = document.createElement('div')
  surface.className = 'formation-field-surface'
  field.appendChild(surface)
  const desktop = window.matchMedia('(min-width: 769px)').matches
  for (const spot of fieldSpotDefs(desktop)) {
    const slot = document.createElement('div')
    slot.className = `player-slot${spot.position === 'GK' ? ' gk-slot' : spot.position === 'SW' ? ' sw-slot' : ''}`
    slot.dataset.position = spot.position
    slot.style.position = 'absolute'
    slot.style.left = `${spot.x}%`
    slot.style.top = `${spot.y}%`
    surface.appendChild(slot)
  }

  const sideSlotCount = benchSlotCount(draft.matchType, team.players.length)
  for (let i = 0; i < sideSlotCount; i++) {
    const slot = document.createElement('div')
    slot.className = 'bench-slot'
    slot.id = `bench-slot-${i + 1}`
    bench.appendChild(slot)
  }
  for (let i = 0; i < sideSlotCount; i++) {
    const slot = document.createElement('div')
    slot.className = 'unavailable-slot'
    slot.id = `unavailable-slot-${i + 1}`
    unavailable.appendChild(slot)
  }

  const living = new Set(team.players.map((p) => p.id))
  const defaults = filterDefaultFormation(team.defaultFormations[draft.matchType], living)
  const used = new Set(defaults.map((d) => d.playerId))
  for (const spot of defaults) {
    const slot = surface.querySelector<HTMLElement>(`[data-position="${spot.position}"]`)
    if (!slot) continue
    const meta = playerMeta(spot.playerId)
    paintSlot(slot, spot.playerId, meta.name, meta.jersey)
  }
  const remaining = team.players
    .filter((p) => !used.has(p.id))
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  remaining.forEach((player, index) => {
    const slot = bench.children[index] as HTMLElement | undefined
    if (slot) paintSlot(slot, player.id, player.name, player.jerseyNumber)
  })

  allSlots().forEach((slot) => {
    slot.style.touchAction = 'none'
    slot.addEventListener('pointerdown', handleSlotPointer)
  })
  clearSelection()
}

export function bindFormation(): void {
  document.getElementById('clear-formation')?.addEventListener('click', () => {
    const occupied = [
      ...document.querySelectorAll<HTMLElement>(
        '.player-slot[data-player-id], .unavailable-slot[data-player-id]',
      ),
    ]
    for (const slot of occupied) {
      const playerId = slot.dataset.playerId
      if (!playerId) continue
      const empty = [...document.querySelectorAll<HTMLElement>('.bench-slot')].find(
        (s) => !s.dataset.playerId,
      )
      if (!empty) continue
      const meta = playerMeta(playerId)
      paintSlot(slot, null)
      paintSlot(empty, playerId, meta.name, meta.jersey)
    }
  })
  document.getElementById('back-from-formation')?.addEventListener('click', () => {
    if (window.confirm(t('leaveFormation'))) {
      clearGameDraft()
      showScreen('game-setup')
    }
  })
  document.getElementById('start-from-formation')?.addEventListener('click', () => {
    const draft = getGameDraft()
    if (!draft) return showScreen('game-setup')
    const { field, unavailable } = readFormation()
    const valid = validateFormation(field, draft.matchType)
    if (!valid.ok) {
      return showMessage(
        valid.reason === 'gk'
          ? t('formationNeedGk')
          : t('formationCount', {
              required: valid.required,
              matchType: draft.matchType,
              selected: valid.selected,
            }),
        'error',
      )
    }
    const saveDefault = (document.getElementById('save-default-formation') as HTMLInputElement)
      .checked
    const result = startPreparedGame(
      {
        ...draft,
        opponentName: draft.opponentName,
        formation: field,
        unavailablePlayers: unavailable,
      },
      saveDefault,
    )
    if (!result.ok) return showMessage(result.message, 'error')
    clearGameDraft()
    pauseClock()
    showScreen('game-tracking')
  })
}
