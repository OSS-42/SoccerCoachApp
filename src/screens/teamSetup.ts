import { t } from '@/i18n'
import { calculateSeasonStats } from '@/domain/stats'
import { askConfirm } from '@/ui/confirm'
import { PLAYER_POSITIONS, type PlayerPosition } from '@/domain/types'
import {
  addPlayerToTeam,
  addTeam,
  deleteCurrentTeam,
  deletePlayers,
  editPlayerOnTeam,
  getCurrentTeam,
  renameTeam,
} from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { fillTeamSelectors } from './shared'

function fillPositionSelect(select: HTMLSelectElement, selected?: string): void {
  select.innerHTML = PLAYER_POSITIONS.map(
    (pos) => `<option value="${pos}" ${pos === selected ? 'selected' : ''}>${pos}</option>`,
  ).join('')
}

function selectedPlayerIds(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>('.player-checkbox:checked')].map(
    (box) => box.dataset.playerId ?? '',
  )
}

export function renderTeamSetup(): void {
  fillTeamSelectors()
  const team = getCurrentTeam()
  const list = document.getElementById('players-list')
  if (!list) return
  if (!team || team.players.length === 0) {
    list.innerHTML = `<div class="empty-state">${t('noPlayers')}</div>`
    return
  }
  const anyChecked = selectedPlayerIds().length > 0
  list.innerHTML = ''
  for (const player of [...team.players].sort((a, b) => a.jerseyNumber - b.jerseyNumber)) {
    const item = document.createElement('div')
    item.className = 'player-item'
    item.innerHTML = `
      <div class="jersey-number">${player.jerseyNumber}</div>
      <div class="player-info">
        <div class="player-name">
          <div>${escapeHtml(player.name)}</div>
          <div style="font-size:0.75rem;color:#666;">(${escapeHtml(player.position)})</div>
        </div>
      </div>
      <div class="player-actions">
        <button class="player-action-btn" data-edit="${player.id}" ${anyChecked ? 'disabled' : ''}>
          <span class="material-icons">edit</span>
        </button>
        <input type="checkbox" class="player-checkbox" data-player-id="${player.id}" />
      </div>
    `
    list.appendChild(item)
  }
}

function renderStats(): void {
  const team = getCurrentTeam()
  const container = document.getElementById('player-statistics-container')
  if (!container || !team) return
  const start = (document.getElementById('stats-start-date') as HTMLInputElement).value || null
  const end = (document.getElementById('stats-end-date') as HTMLInputElement).value || null
  const rows = calculateSeasonStats(team.players, team.games, start, end)
  if (!team.players.length) {
    container.innerHTML = `<div class="no-stats-message">${t('noPlayersStats')}</div>`
    return
  }
  if (!team.games.some((g) => g.isCompleted)) {
    container.innerHTML = `<div class="no-stats-message">${t('noGamesStats')}</div>`
    return
  }
  const cell = (value: number, kind = ''): string =>
    `<td class="stat-num ${kind} ${value === 0 ? 'is-zero' : ''}">${value === 0 ? '–' : value}</td>`
  const chip = (icon: string, value: number, label: string, kind = ''): string =>
    `<div class="stat-chip ${kind} ${value === 0 ? 'is-zero' : ''}">
      <span class="stat-chip-icon">${icon}</span>
      <span class="stat-chip-value">${value === 0 ? '–' : value}</span>
      <span class="stat-chip-label">${label}</span>
    </div>`
  const cardChips = (row: {
    gamesPlayed: number
    goals: number
    assists: number
    saves: number
    goalsAllowed: number
    shots: number
    blocks: number
    fouls: number
    yellowCards: number
    redCards: number
    ownGoals: number
    missedGames: number
    lateToGame: number
  }): string =>
    `<div class="stat-chip-grid">
      ${chip('📅', row.gamesPlayed, t('games'))}
      ${chip('⚽', row.goals, t('action.goal'), 'stat-goal')}
      ${chip('👟', row.assists, t('action.assist'))}
      ${chip('🧤', row.saves, t('action.save'))}
      ${chip('🔴', row.goalsAllowed, t('goalsAllowedShort'), 'stat-against')}
      ${chip('🎯', row.shots, t('action.shot_on_goal'))}
      ${chip('🛡', row.blocks, t('action.blocked_shot'))}
      ${chip('🚩', row.fouls, t('action.fault'))}
      ${chip('🟨', row.yellowCards, t('action.yellow_card'), 'stat-yellow')}
      ${chip('🟥', row.redCards, t('action.red_card'), 'stat-red')}
      ${chip('⚽', row.ownGoals, t('ownGoalShort'))}
      ${chip('🚫', row.missedGames, t('missedGames'))}
      ${chip('🕐', row.lateToGame, t('lateToGame'))}
    </div>`
  const totals = rows.reduce(
    (sum, row) => ({
      gamesPlayed: sum.gamesPlayed + row.gamesPlayed,
      goals: sum.goals + row.goals,
      assists: sum.assists + row.assists,
      saves: sum.saves + row.saves,
      goalsAllowed: sum.goalsAllowed + row.goalsAllowed,
      shots: sum.shots + row.shots,
      blocks: sum.blocks + row.blocks,
      fouls: sum.fouls + row.fouls,
      yellowCards: sum.yellowCards + row.yellowCards,
      redCards: sum.redCards + row.redCards,
      ownGoals: sum.ownGoals + row.ownGoals,
      missedGames: sum.missedGames + row.missedGames,
      lateToGame: sum.lateToGame + row.lateToGame,
    }),
    {
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      saves: 0,
      goalsAllowed: 0,
      shots: 0,
      blocks: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
      missedGames: 0,
      lateToGame: 0,
    },
  )
  container.innerHTML = `
    <div class="season-stats-cards">
      <article class="season-stat-card is-totals">
        <header>
          <span class="stat-card-name">${t('totals')}</span>
        </header>
        ${cardChips(totals)}
      </article>
      ${rows
        .map(
          (row) => `<article class="season-stat-card">
            <header>
              <span class="stat-jersey">${row.jerseyNumber}</span>
              <span class="stat-card-name">${escapeHtml(row.name)}</span>
            </header>
            ${cardChips(row)}
          </article>`,
        )
        .join('')}
    </div>
    <div class="season-stats-table-wrap">
    <table class="season-stats-table">
      <thead>
        <tr>
          <th class="stat-pin">#</th>
          <th class="stat-pin stat-name">${t('name')}</th>
          <th title="${t('games')}">${t('games')}</th>
          <th title="${t('action.goal')}">⚽</th>
          <th title="${t('action.assist')}">👟</th>
          <th title="${t('action.save')}">🧤</th>
          <th title="${t('action.goal_allowed')}">${t('goalsAllowedShort')}</th>
          <th title="${t('action.shot_on_goal')}">🎯</th>
          <th title="${t('action.blocked_shot')}">🛡</th>
          <th title="${t('action.fault')}">🚩</th>
          <th title="${t('action.yellow_card')}">🟨</th>
          <th title="${t('action.red_card')}">🟥</th>
          <th title="${t('action.own_goal')}">${t('ownGoalShort')}</th>
          <th title="${t('missedGames')}">🚫</th>
          <th title="${t('lateToGame')}">🕐</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>
              <td class="stat-pin"><span class="stat-jersey">${row.jerseyNumber}</span></td>
              <td class="stat-pin stat-name">${escapeHtml(row.name)}</td>
              ${cell(row.gamesPlayed)}
              ${cell(row.goals, 'stat-goal')}
              ${cell(row.assists)}
              ${cell(row.saves)}
              ${cell(row.goalsAllowed, 'stat-against')}
              ${cell(row.shots)}
              ${cell(row.blocks)}
              ${cell(row.fouls)}
              ${cell(row.yellowCards, 'stat-yellow')}
              ${cell(row.redCards, 'stat-red')}
              ${cell(row.ownGoals)}
              ${cell(row.missedGames)}
              ${cell(row.lateToGame)}
            </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr>
          <td class="stat-pin" colspan="2">${t('totals')}</td>
          ${cell(totals.gamesPlayed)}
          ${cell(totals.goals, 'stat-goal')}
          ${cell(totals.assists)}
          ${cell(totals.saves)}
          ${cell(totals.goalsAllowed, 'stat-against')}
          ${cell(totals.shots)}
          ${cell(totals.blocks)}
          ${cell(totals.fouls)}
          ${cell(totals.yellowCards, 'stat-yellow')}
          ${cell(totals.redCards, 'stat-red')}
          ${cell(totals.ownGoals)}
          ${cell(totals.missedGames)}
          ${cell(totals.lateToGame)}
        </tr>
      </tfoot>
    </table>
    </div>
  `
}

export function bindTeamSetup(): void {
  fillPositionSelect(document.getElementById('player-position') as HTMLSelectElement)
  fillPositionSelect(document.getElementById('edit-position') as HTMLSelectElement)

  document.getElementById('open-add-player')?.addEventListener('click', () => {
    toggleDialog('add-player-dialog', true)
  })
  document.getElementById('cancel-add-player')?.addEventListener('click', () => {
    toggleDialog('add-player-dialog', false)
  })
  document.getElementById('confirm-add-player')?.addEventListener('click', () => {
    const name = (document.getElementById('player-name') as HTMLInputElement).value
    const jersey = Number((document.getElementById('jersey-number') as HTMLInputElement).value)
    const position = (document.getElementById('player-position') as HTMLSelectElement)
      .value as PlayerPosition
    const result = addPlayerToTeam(name, jersey, position)
    showMessage(result.message, result.ok ? 'success' : 'error')
    if (result.ok) {
      ;(document.getElementById('player-name') as HTMLInputElement).value = ''
      ;(document.getElementById('jersey-number') as HTMLInputElement).value = ''
      toggleDialog('add-player-dialog', false)
    }
  })

  document.getElementById('save-team-name')?.addEventListener('click', () => {
    const result = renameTeam((document.getElementById('team-name-input') as HTMLInputElement).value)
    showMessage(result.message, result.ok ? 'success' : 'error')
  })
  document.getElementById('add-team-btn')?.addEventListener('click', () => {
    const name = window.prompt(t('newTeamPrompt'))
    if (!name) return
    const result = addTeam(name)
    showMessage(result.message, result.ok ? 'success' : 'error')
  })
  document.getElementById('delete-team-btn')?.addEventListener('click', () => {
    const team = getCurrentTeam()
    if (!team) return
    if (!window.confirm(t('deleteTeamAsk', { name: team.name }))) return
    const result = deleteCurrentTeam()
    showMessage(result.message, result.ok ? 'success' : 'error')
  })

  document.getElementById('players-list')?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const editId = target.closest<HTMLElement>('[data-edit]')?.dataset.edit
    if (!editId) return
    const player = getCurrentTeam()?.players.find((p) => p.id === editId)
    if (!player) return
    ;(document.getElementById('edit-player-id') as HTMLInputElement).value = player.id
    ;(document.getElementById('edit-player-name') as HTMLInputElement).value = player.name
    ;(document.getElementById('edit-jersey-number') as HTMLInputElement).value = String(
      player.jerseyNumber,
    )
    fillPositionSelect(document.getElementById('edit-position') as HTMLSelectElement, player.position)
    toggleDialog('edit-player-dialog', true)
  })
  document.getElementById('players-list')?.addEventListener('change', async (event) => {
    if (!(event.target as HTMLElement).classList.contains('player-checkbox')) return
    const ids = selectedPlayerIds()
    if (!ids.length) {
      renderTeamSetup()
      return
    }
    const ok = await askConfirm({
      title: t('confirmDeleteTitle'),
      message: t('deletePlayersAsk', { count: ids.length }),
      confirmLabel: t('confirmDelete'),
      cancelLabel: t('cancel'),
    })
    if (ok) {
      const result = deletePlayers(ids)
      showMessage(result.message, result.ok ? 'success' : 'error')
    } else {
      renderTeamSetup()
    }
  })
  document.getElementById('cancel-edit-player')?.addEventListener('click', () => {
    toggleDialog('edit-player-dialog', false)
  })
  document.getElementById('confirm-edit-player')?.addEventListener('click', () => {
    const id = (document.getElementById('edit-player-id') as HTMLInputElement).value
    const result = editPlayerOnTeam(
      id,
      (document.getElementById('edit-player-name') as HTMLInputElement).value,
      Number((document.getElementById('edit-jersey-number') as HTMLInputElement).value),
      (document.getElementById('edit-position') as HTMLSelectElement).value as PlayerPosition,
    )
    showMessage(result.message, result.ok ? 'success' : 'error')
    if (result.ok) toggleDialog('edit-player-dialog', false)
  })

  document.querySelectorAll<HTMLButtonElement>('[data-team-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.teamTab
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn))
      document.getElementById('players-tab-content')?.classList.toggle('active', tab === 'players')
      document
        .getElementById('statistics-tab-content')
        ?.classList.toggle('active', tab === 'statistics')
      if (tab === 'statistics') renderStats()
    })
  })
  document.getElementById('stats-start-date')?.addEventListener('change', renderStats)
  document.getElementById('stats-end-date')?.addEventListener('change', renderStats)
  document.getElementById('clear-stats-filter')?.addEventListener('click', () => {
    ;(document.getElementById('stats-start-date') as HTMLInputElement).value = ''
    ;(document.getElementById('stats-end-date') as HTMLInputElement).value = ''
    renderStats()
  })
}
