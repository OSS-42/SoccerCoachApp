import { t } from '@/i18n'
import { statsFromActions } from '@/domain/actions'
import { playedMinutesByPlayer } from '@/domain/playingTime'
import { formatClock } from '@/domain/clock'
import { periodGoalDeltas } from '@/domain/game'
import {
  buildGoalsCardsEvents,
  buildShotTimeline,
  scheduledMinutes,
} from '@/domain/timeline'
import type { Game, Player } from '@/domain/types'
import { getCurrentTeam, selectTeam } from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { fillTeamSelectors } from './shared'

function renderShotChart(game: Game): string {
  const duration = scheduledMinutes(game)
  const { user, opponent } = buildShotTimeline(game)
  const bars: string[] = ['<div class="timeline-center-line"></div>']
  for (const [minute, counts] of Object.entries(user)) {
    const left = (Number(minute) / duration) * 100
    const height = counts.goals * 12 + counts.shots * 8
    bars.push(
      `<div class="timeline-bar user" style="left:${left}%;height:${height}px;background:linear-gradient(to top,#4CAF50,#8BC34A);" title="${counts.goals}G ${counts.shots}S"></div>`,
    )
    if (counts.goals > 0) {
      bars.push(`<div class="goal-indicator user-goal" style="left:${left}%;">⚽</div>`)
    }
  }
  for (const [minute, counts] of Object.entries(opponent)) {
    const left = (Number(minute) / duration) * 100
    const height = counts.goalsAllowed * 12 + counts.saves * 8
    bars.push(
      `<div class="timeline-bar opponent" style="left:${left}%;height:${height}px;background:linear-gradient(to top,#FF5252,#2196F3);" title="${counts.goalsAllowed}GA ${counts.saves}S"></div>`,
    )
    if (counts.goalsAllowed > 0) {
      bars.push(`<div class="goal-indicator opponent-goal" style="left:${left}%;">⚽</div>`)
    }
  }
  const marks: string[] = []
  for (let m = 0; m <= duration; m += 15) {
    marks.push(`<span>${m}'</span>`)
  }
  return `<div class="timeline-chart">
    <div class="timeline-bars-wrapper"><div class="timeline-bars">${bars.join('')}</div></div>
    <div class="timeline-scale" style="display:flex;justify-content:space-between;font-size:11px;color:#666;">${marks.join('')}</div>
  </div>`
}

function renderGoalsCards(game: Game, players: Player[]): string {
  const events = buildGoalsCardsEvents(game, players)
  if (!events.length) {
    return `<div class="goals-cards-list"><div class="empty-state">${t('noEvents')}</div></div>`
  }
  const items = events
    .map((event) => {
      if (event.type === 'goal') {
        return `<div class="goals-cards-item goal-item" style="justify-content:flex-start;">
          <div class="item-icon">⚽</div>
          <div class="item-number">#${event.scoreIndex}</div>
          <div class="item-details">
            <div class="item-player">${escapeHtml(event.playerName)}</div>
            ${event.assistName ? `<div class="item-assist">${t('assistBy', { name: event.assistName })}</div>` : ''}
          </div>
          <div class="item-time">${event.minute}'</div>
        </div>`
      }
      if (event.type === 'goalAllowed') {
        return `<div class="goals-cards-item goal-allowed-item" style="justify-content:flex-end;flex-direction:row-reverse;">
          <div class="item-icon">⚽</div>
          <div class="item-number">#${event.scoreIndex}</div>
          <div class="item-details" style="text-align:right;"><div class="item-player">${escapeHtml(event.playerName)}</div></div>
          <div class="item-time">${event.minute}'</div>
        </div>`
      }
      if (event.type === 'substitution') {
        return `<div class="goals-cards-item substitution-item" style="justify-content:flex-start;">
          <div class="item-icon">🔄</div>
          <div class="item-details"><div class="item-player">${escapeHtml(
            t('subOnFor', {
              on: event.playerName,
              off: event.relatedName || t('unknownPlayer'),
            }),
          )}</div></div>
          <div class="item-time">${event.minute}'</div>
        </div>`
      }
      const icon = event.type === 'yellow' ? '🟨' : event.type === 'red' ? '🟥' : '🏥'
      return `<div class="goals-cards-item ${event.type}-item" style="justify-content:flex-start;">
        <div class="item-icon">${icon}</div>
        <div class="item-details"><div class="item-player">${escapeHtml(event.playerName)}</div></div>
        <div class="item-time">${event.minute}'</div>
      </div>`
    })
    .join('')
  return `<div class="goals-cards-list">${items}</div>`
}

function renderNotes(game: Game, players: Player[]): string {
  const notes = game.actions.filter(
    (action) =>
      (action.actionType === 'game_note' || action.actionType === 'note') && Boolean(action.noteText?.trim()),
  )
  if (!notes.length) return ''
  const items = notes
    .map((action) => {
      const minute = Math.floor(action.gameSecond / 60)
      const player = players.find((p) => p.id === action.playerId)
      const who =
        action.actionType === 'game_note' ? t('gameNote') : (player?.name ?? t('gameNote'))
      return `<div class="report-note-item">
        <span class="report-note-meta">${minute}' · ${escapeHtml(who)}</span>
        <p class="report-note-text">${escapeHtml(action.noteText ?? '')}</p>
      </div>`
    })
    .join('')
  return `<div class="report-section report-notes">
    <h3>${t('notes')}</h3>
    ${items}
  </div>`
}

export function renderReports(): void {
  fillTeamSelectors()
  const team = getCurrentTeam()
  const list = document.getElementById('reports-list')
  if (!list || !team) return
  const games = team.games.filter((g) => g.isCompleted).sort((a, b) => b.date.localeCompare(a.date))
  if (!games.length) {
    list.innerHTML = `<div class="empty-state">${t('noReports')}</div>`
    return
  }
  list.innerHTML = ''
  for (const game of games) {
    const item = document.createElement('div')
    item.className = 'report-item'
    item.innerHTML = `
      <div class="report-meta">
        <span class="report-date">${escapeHtml(game.date)}</span>
        <span class="report-teams">${escapeHtml(team.name)} vs ${escapeHtml(game.opponentName)}</span>
      </div>
      <span class="report-score">${game.homeScore}–${game.awayScore}</span>
      <div class="report-actions">
        <button class="secondary-btn" data-view="${game.id}">${t('viewReport')}</button>
        <button class="secondary-btn" data-print="${game.id}">${t('pdf')}</button>
      </div>
    `
    list.appendChild(item)
  }
}

export function viewReport(gameId: string): void {
  const team = getCurrentTeam()
  const game = team?.games.find((g) => g.id === gameId)
  const dialog = document.getElementById('report-dialog-content')
  if (!team || !game || !dialog) {
    showMessage(t('reportMissing'), 'error')
    return
  }
  const periodLines = periodGoalDeltas(game)
    .map((p, i) => `<div class="period-score-line">${t('periodLine', { n: i + 1, home: p.home, away: p.away })}</div>`)
    .join('')
  const chip = (icon: string, value: number, label: string, kind = ''): string =>
    `<div class="stat-chip ${kind} ${value === 0 ? 'is-zero' : ''}">
      <span class="stat-chip-icon">${icon}</span>
      <span class="stat-chip-value">${value === 0 ? '–' : value}</span>
      <span class="stat-chip-label">${label}</span>
    </div>`
  const minutes = playedMinutesByPlayer(game)
  const rows = [...team.players]
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
    .map((player) => {
      const stats = statsFromActions(game.actions, player.id)
      const played = minutes.get(player.id) ?? 0
      return `<tr>
        <td>${player.jerseyNumber}</td>
        <td>${escapeHtml(player.name)}</td>
        <td>${played === 0 ? '–' : `${played}'`}</td>
        <td>${stats.goals}</td><td>${stats.assists}</td><td>${stats.saves}</td>
        <td>${stats.goalsAllowed}</td><td>${stats.shotOnGoal}</td><td>${stats.blockedShot}</td>
        <td>${stats.faults}</td><td>${stats.yellowCards}</td><td>${stats.redCards}</td>
        <td>${stats.ownGoals}</td>
      </tr>`
    })
    .join('')
  const cards = [...team.players]
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
    .map((player) => {
      const stats = statsFromActions(game.actions, player.id)
      const played = minutes.get(player.id) ?? 0
      return `<article class="report-stat-card">
        <header>
          <span class="stat-jersey">${player.jerseyNumber}</span>
          <span class="stat-card-name">${escapeHtml(player.name)}</span>
          <span class="stat-played">${played === 0 ? '–' : `${played}'`}</span>
        </header>
        <div class="stat-chip-grid">
          ${chip('⏱', played, t('playedMinutes'))}
          ${chip('⚽', stats.goals, t('action.goal'), 'stat-goal')}
          ${chip('👟', stats.assists, t('action.assist'))}
          ${chip('🧤', stats.saves, t('action.save'))}
          ${chip('🔴', stats.goalsAllowed, t('goalsAllowedShort'), 'stat-against')}
          ${chip('🎯', stats.shotOnGoal, t('action.shot_on_goal'))}
          ${chip('🛡', stats.blockedShot, t('action.blocked_shot'))}
          ${chip('🚩', stats.faults, t('action.fault'))}
          ${chip('🟨', stats.yellowCards, t('action.yellow_card'), 'stat-yellow')}
          ${chip('🟥', stats.redCards, t('action.red_card'), 'stat-red')}
          ${chip('⚽', stats.ownGoals, t('ownGoalShort'))}
        </div>
      </article>`
    })
    .join('')
  dialog.innerHTML = `
    <div class="report-header-score">
      <div class="team-section team-left">
        <div class="team-name">${escapeHtml(team.name)}</div>
        <div class="team-score">${game.homeScore}</div>
      </div>
      <div class="period-scores">${periodLines || `<div class="period-score-line">${t('ftScore', { home: game.homeScore, away: game.awayScore })}</div>`}</div>
      <div class="team-section team-right">
        <div class="team-name">${escapeHtml(game.opponentName)}</div>
        <div class="team-score">${game.awayScore}</div>
      </div>
    </div>
    <div class="report-header-info">
      <div>${escapeHtml(game.date)} · ${game.matchType} · ${formatClock(game.elapsedSeconds)}</div>
    </div>
    <div class="report-section timeline-section">
      <h3>${t('shotsTimeline')}</h3>
      ${renderShotChart(game)}
    </div>
    <div class="report-section goals-cards-section">
      ${renderGoalsCards(game, team.players)}
    </div>
    ${renderNotes(game, team.players)}
    <h3>${t('playerStatistics')}</h3>
    <div class="report-stat-cards">${cards}</div>
    <div class="report-table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>#</th><th>${t('name')}</th><th>${t('playedShort')}</th><th>⚽</th><th>👟</th><th>🧤</th><th>GA</th>
            <th>🎯</th><th>🛡</th><th>🚩</th><th>🟨</th><th>🟥</th><th>OG</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="report-actions">
      <button class="secondary-btn" id="print-open-report">${t('exportPdf')}</button>
      <button class="primary-btn" id="close-open-report">${t('close')}</button>
    </div>
  `
  document.getElementById('close-open-report')?.addEventListener('click', () => {
    toggleDialog('report-dialog', false)
  })
  document.getElementById('print-open-report')?.addEventListener('click', () => printReport(gameId))
  toggleDialog('report-dialog', true)
}

function printReport(gameId: string): void {
  const content = document.getElementById('report-dialog-content')
  if (!content) return
  const clone = content.cloneNode(true) as HTMLElement
  clone.querySelector('.report-stat-cards')?.remove()
  clone.querySelectorAll<HTMLElement>('.report-table-container').forEach((el) => {
    el.style.display = 'block'
  })
  const popup = window.open('', '_blank')
  if (!popup) {
    showMessage(t('popupBlocked'), 'error')
    return
  }
  popup.document.write(`<!DOCTYPE html><html><head><title>Game Report ${gameId}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ddd;padding:6px;text-align:left}</style></head><body>
    ${clone.innerHTML}<script>window.onload=function(){window.print()}<\/script></body></html>`)
  popup.document.close()
}

export function bindReports(): void {
  document.getElementById('reports-list')?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const view = target.closest<HTMLElement>('[data-view]')?.dataset.view
    const print = target.closest<HTMLElement>('[data-print]')?.dataset.print
    if (view) viewReport(view)
    if (print) {
      viewReport(print)
      window.setTimeout(() => printReport(print), 50)
    }
  })
  document.getElementById('reports-team-selector')?.addEventListener('change', (event) => {
    selectTeam((event.target as HTMLSelectElement).value)
  })
  window.addEventListener('sca:view-report', (event) => {
    viewReport((event as CustomEvent<string>).detail)
  })
}
