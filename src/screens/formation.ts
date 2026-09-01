import { t } from '@/i18n'
import { askConfirm } from '@/ui/confirm'
import {
  almostReadyLineup,
  benchSlotCount,
  fieldSpotDefs,
  filterDefaultFormation,
  filterDefaultUnavailable,
  spotLabel,
  validateFormation,
} from '@/domain/formation'
import { ON_FIELD_COUNT, type FormationSpot } from '@/domain/types'
import { getCurrentTeam, pauseClock, saveDefaultFormation, startPreparedGame } from '@/state/store'
import { escapeHtml } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { notifyTutorialEvent, tutorialRunning } from '@/ui/tutorialBus'
import { clearGameDraft, getGameDraft } from './gameSetup'
import { fillTeamSelectors } from './shared'

type SlotKind = 'field' | 'bench' | 'unavailable'
type PlacedPlayer = { id: string; name: string; jersey: number }

let selectedPlayerId: string | null = null
let formationResize: ResizeObserver | null = null
let lastRailFits = { bench: 0, out: 0, total: 0 }

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

function isDesktopFormation(): boolean {
  return window.matchMedia('(min-width: 769px)').matches
}

function makeSideSlot(kind: 'bench' | 'unavailable', index: number): HTMLElement {
  const slot = document.createElement('div')
  slot.className = kind === 'bench' ? 'bench-slot' : 'unavailable-slot'
  slot.id = `${kind}-slot-${index}`
  slot.style.touchAction = 'none'
  slot.addEventListener('pointerdown', handleSlotPointer)
  return slot
}

function fitSlotCount(column: HTMLElement, slotSize: number, gap: number): number {
  const title = column.querySelector('h4')
  const titleH = title?.getBoundingClientRect().height ?? 20
  const styles = getComputedStyle(column)
  const pad = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
  const usable = column.clientHeight - titleH - pad - 4
  return Math.max(1, Math.floor((usable + gap) / (slotSize + gap)))
}

function collectPlaced(root: ParentNode, selector: string): PlacedPlayer[] {
  return [...root.querySelectorAll<HTMLElement>(selector)].flatMap((slot) => {
    const id = slot.dataset.playerId
    if (!id) return []
    const meta = playerMeta(id)
    return [{ id, name: meta.name, jersey: meta.jersey }]
  })
}

function paintInto(
  container: HTMLElement,
  kind: 'bench' | 'unavailable',
  count: number,
  startIndex: number,
  people: PlacedPlayer[],
): PlacedPlayer[] {
  container.replaceChildren()
  const leftover = [...people]
  for (let i = 0; i < count; i += 1) {
    const slot = makeSideSlot(kind, startIndex + i)
    container.appendChild(slot)
    const next = leftover.shift()
    if (next) paintSlot(slot, next.id, next.name, next.jersey)
  }
  return leftover
}

function layoutFormationRails(): void {
  if (isDesktopFormation()) return
  const benchCol = document.getElementById('bench-players')
  const outCol = document.getElementById('unavailable-players')
  const bench = document.getElementById('bench-slots')
  const overflow = document.getElementById('bench-overflow')
  const out = document.getElementById('unavailable-slots')
  const field = document.getElementById('formation-field')
  const team = getCurrentTeam()
  const draft = getGameDraft()
  if (!benchCol || !outCol || !bench || !overflow || !out || !team || !draft) return

  const gap = 4
  const benchTotal = benchSlotCount(draft.matchType, team.players.length)
  const wasHidden = overflow.hidden
  overflow.hidden = false
  const overflowWidth =
    field?.clientWidth ||
    overflow.clientWidth ||
    Math.max(0, (overflow.parentElement?.clientWidth ?? 0) - benchCol.offsetWidth - outCol.offsetWidth)
  const titleH = (benchCol.querySelector('h4')?.getBoundingClientRect().height ?? 20) + 4
  const railH = Math.max(0, benchCol.clientHeight - titleH)
  let tile = 48
  let benchFit = 1
  let perRow = 1
  for (const size of [52, 48, 44, 40, 36]) {
    const rail = Math.max(1, Math.floor((railH + gap) / (size + gap)))
    const row = Math.max(1, Math.floor((overflowWidth + gap) / (size + gap)))
    tile = size
    benchFit = rail
    perRow = row
    if (rail + row * 2 >= benchTotal) break
  }
  const outFit = fitSlotCount(outCol, tile, gap)
  const railCount = Math.min(benchFit, benchTotal)
  let overflowCount = Math.max(0, benchTotal - railCount)
  const overflowMax = Math.max(0, perRow * 2)
  if (overflowMax > 0) overflowCount = Math.min(overflowCount, overflowMax)
  const container = document.querySelector<HTMLElement>('#formation-setup .formation-container')
  if (container) container.style.setProperty('--bench-tile', `${tile}px`)
  if (
    lastRailFits.bench === railCount &&
    lastRailFits.out === outFit &&
    lastRailFits.total === benchTotal &&
    bench.childElementCount + overflow.childElementCount >= railCount + overflowCount &&
    !wasHidden
  ) {
    overflow.hidden = overflow.childElementCount === 0
    return
  }
  lastRailFits = { bench: railCount, out: outFit, total: benchTotal }

  const benchPeople = [
    ...collectPlaced(bench, '.bench-slot'),
    ...collectPlaced(overflow, '.bench-slot'),
  ]
  const outPeople = collectPlaced(out, '.unavailable-slot')
  paintInto(bench, 'bench', railCount, 1, benchPeople)
  const leftover = paintInto(
    overflow,
    'bench',
    overflowCount,
    railCount + 1,
    benchPeople.slice(railCount),
  )
  leftover.forEach((player) => {
    const slot = makeSideSlot('bench', overflow.childElementCount + railCount + 1)
    overflow.appendChild(slot)
    paintSlot(slot, player.id, player.name, player.jersey)
  })
  overflow.hidden = overflow.childElementCount === 0
  paintInto(out, 'unavailable', Math.max(outFit, outPeople.length), 1, outPeople)
}

function slotByPlayer(playerId: string): HTMLElement | null {
  return allSlots().find((slot) => slot.dataset.playerId === playerId) ?? null
}

function paintSlot(slot: HTMLElement, playerId: string | null, name = '', jersey = 0): void {
  const onField = slot.classList.contains('player-slot')
  const pos = slot.dataset.position ?? ''
  const posText = pos ? spotLabel(pos) : ''
  if (!playerId) {
    delete slot.dataset.playerId
    slot.classList.remove('occupied')
    slot.innerHTML = onField && posText ? `<span class="spot-label">${escapeHtml(posText)}</span>` : ''
    return
  }
  slot.dataset.playerId = playerId
  slot.classList.add('occupied')
  const nameHtml = `<span class="${onField ? 'player-name-field' : 'player-name-bench'}">${escapeHtml(name)}</span>`
  const numHtml = `<span class="jersey-num">${jersey}</span>`
  const posHtml = onField && posText ? `<span class="spot-pos">${escapeHtml(posText)}</span>` : ''
  slot.innerHTML = `<span class="player-number ${onField ? 'player-number-placed' : ''}" data-player-id="${playerId}">${
    onField ? `${posHtml}${numHtml}${nameHtml}` : `${nameHtml}${numHtml}`
  }</span>`
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
    if (!tappedId) return
    selectedPlayerId = tappedId
    slot.classList.add('tap-selected')
    slot.querySelector('.player-number')?.classList.add('tap-selected')
    return
  }
  if (tappedId === selectedPlayerId) {
    clearSelection()
    return
  }
  place(selectedPlayerId, slot)
  clearSelection()
  notifyFormationReadyIfValid()
}

function notifyFormationReadyIfValid(): void {
  if (!tutorialRunning()) return
  const draft = getGameDraft()
  if (!draft) return
  const { field } = readFormation()
  if (validateFormation(field, draft.matchType).ok) notifyTutorialEvent('formation-ready')
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
  document.getElementById('bench-overflow')?.replaceChildren()
  const overflow = document.getElementById('bench-overflow')
  if (overflow) overflow.hidden = true
  if (sidebar) sidebar.innerHTML = ''
  lastRailFits = { bench: 0, out: 0, total: 0 }

  const surface = document.createElement('div')
  surface.className = 'formation-field-surface'
  field.appendChild(surface)
  const desktop = isDesktopFormation()
  for (const spot of fieldSpotDefs(desktop)) {
    const slot = document.createElement('div')
    slot.className = `player-slot${spot.position === 'GK' ? ' gk-slot' : spot.position === 'SW' ? ' sw-slot' : ''}`
    slot.dataset.position = spot.position
    slot.style.position = 'absolute'
    slot.style.left = `${spot.x}%`
    slot.style.top = `${spot.y}%`
    paintSlot(slot, null)
    surface.appendChild(slot)
  }

  const living = new Set(team.players.map((p) => p.id))
  const defaults = filterDefaultFormation(team.defaultFormations[draft.matchType], living)
  const onField = new Set(defaults.map((d) => d.playerId))
  const outIds = new Set(
    filterDefaultUnavailable(team.defaultUnavailable[draft.matchType], living, onField),
  )
  for (const spot of defaults) {
    const slot = surface.querySelector<HTMLElement>(`[data-position="${spot.position}"]`)
    if (!slot) continue
    const meta = playerMeta(spot.playerId)
    paintSlot(slot, spot.playerId, meta.name, meta.jersey)
  }
  const remaining = team.players
    .filter((p) => !onField.has(p.id) && !outIds.has(p.id))
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  const outPlayers = team.players
    .filter((p) => outIds.has(p.id))
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)

  const sideSlotCount = benchSlotCount(draft.matchType, team.players.length)
  if (desktop) {
    for (let i = 0; i < sideSlotCount; i++) {
      bench.appendChild(makeSideSlot('bench', i + 1))
      unavailable.appendChild(makeSideSlot('unavailable', i + 1))
    }
    remaining.forEach((player, index) => {
      const slot = bench.children[index] as HTMLElement | undefined
      if (slot) paintSlot(slot, player.id, player.name, player.jerseyNumber)
    })
    outPlayers.forEach((player, index) => {
      const slot = unavailable.children[index] as HTMLElement | undefined
      if (slot) paintSlot(slot, player.id, player.name, player.jerseyNumber)
    })
  } else {
    surface.querySelectorAll<HTMLElement>('.player-slot').forEach((slot) => {
      slot.style.touchAction = 'none'
      slot.addEventListener('pointerdown', handleSlotPointer)
    })
    const seatOn = (
      kind: 'bench' | 'unavailable',
      player: { id: string; name: string; jerseyNumber: number },
    ): void => {
      if (slotByPlayer(player.id)) return
      const empty = [...document.querySelectorAll<HTMLElement>(`.${kind}-slot`)].find(
        (slot) => !slot.dataset.playerId,
      )
      if (empty) {
        paintSlot(empty, player.id, player.name, player.jerseyNumber)
        return
      }
      if (kind === 'bench') {
        const extra = document.getElementById('bench-overflow')
        if (!extra) return
        extra.hidden = false
        const slot = makeSideSlot('bench', extra.childElementCount + 100)
        extra.appendChild(slot)
        paintSlot(slot, player.id, player.name, player.jerseyNumber)
        return
      }
      const out = document.getElementById('unavailable-slots')
      if (!out) return
      const slot = makeSideSlot('unavailable', out.childElementCount + 1)
      out.appendChild(slot)
      paintSlot(slot, player.id, player.name, player.jerseyNumber)
    }
    const applyRails = () => {
      layoutFormationRails()
      remaining.forEach((player) => seatOn('bench', player))
      outPlayers.forEach((player) => seatOn('unavailable', player))
    }
    window.requestAnimationFrame(applyRails)
    formationResize?.disconnect()
    const row = document.querySelector('.formation-pitch-row')
    if (row) {
      formationResize = new ResizeObserver(() => layoutFormationRails())
      formationResize.observe(row)
    }
    clearSelection()
    return
  }

  surface.querySelectorAll<HTMLElement>('.player-slot').forEach((slot) => {
    slot.style.touchAction = 'none'
    slot.addEventListener('pointerdown', handleSlotPointer)
  })
  clearSelection()
}

export function seedTutorialFormation(): void {
  const draft = getGameDraft()
  const team = getCurrentTeam()
  if (!draft || !team) return
  const { field } = almostReadyLineup(team.players, draft.matchType)
  for (const spot of field) {
    const dest = document.querySelector<HTMLElement>(
      `#formation-field .player-slot[data-position="${spot.position}"]`,
    )
    if (!dest) continue
    place(spot.playerId, dest)
  }
  const saveDefault = document.getElementById('save-default-formation') as HTMLInputElement | null
  if (saveDefault) saveDefault.checked = false
  clearSelection()
}

function fillTutorialFormationIfShort(): void {
  const draft = getGameDraft()
  if (!draft) return
  const required = ON_FIELD_COUNT[draft.matchType]
  const gkSlot = document.querySelector<HTMLElement>(
    '#formation-field .player-slot[data-position="GK"]',
  )
  if (gkSlot && !gkSlot.dataset.playerId) {
    const team = getCurrentTeam()
    const gkId =
      team?.players.find((player) => player.position === 'GK' && slotByPlayer(player.id))?.id ??
      document.querySelector<HTMLElement>('.bench-slot[data-player-id]')?.dataset.playerId
    if (gkId) place(gkId, gkSlot)
  }
  while (readFormation().field.length < required) {
    const bench = document.querySelector<HTMLElement>('.bench-slot[data-player-id]')
    const empty = [...document.querySelectorAll<HTMLElement>('#formation-field .player-slot')].find(
      (slot) => !slot.dataset.playerId,
    )
    const id = bench?.dataset.playerId
    if (!id || !empty) break
    place(id, empty)
  }
}

export function bindFormation(): void {
  document.getElementById('save-formation')?.addEventListener('click', () => {
    const current = getGameDraft()
    if (!current) return showScreen('game-setup')
    const { field, unavailable } = readFormation()
    saveDefaultFormation(current.matchType, field, unavailable)
    showMessage(t('formationSaved'), 'success')
  })
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
  document.getElementById('back-from-formation')?.addEventListener('click', async () => {
    const ok = await askConfirm({
      title: t('leaveFormationTitle'),
      message: t('leaveFormation'),
      confirmLabel: t('confirm'),
      cancelLabel: t('cancel'),
    })
    if (!ok) return
    clearGameDraft()
    showScreen('game-setup')
  })
  document.getElementById('start-from-formation')?.addEventListener('click', () => {
    const draft = getGameDraft()
    if (!draft) return showScreen('game-setup')
    if (tutorialRunning()) fillTutorialFormationIfShort()
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
