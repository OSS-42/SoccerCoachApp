import { t } from '@/i18n'
import { statsFromActions } from '@/domain/actions'
import { TIMELINE_MARK_EVERY_MINUTES } from '@/domain/config'
import { formatClock } from '@/domain/clock'
import { periodGoalDeltas } from '@/domain/game'
import { formatPlayedDistribution, playedMinutesByPlayer, playedMinutesByPlayerPosition } from '@/domain/playingTime'
import { buildGoalsCardsEvents, buildShotTimeline, scheduledMinutes } from '@/domain/timeline'
import type { Game, Player, Team } from '@/domain/types'
import { escapeHtml } from '@/ui/dom'

const SHOT_BAR_GOAL_PX = 12
const SHOT_BAR_SHOT_PX = 8

function renderShotChart(game: Game): string {
  const duration = scheduledMinutes(game)
  const { user, opponent } = buildShotTimeline(game)
  const bars: string[] = ['<div class="timeline-center-line"></div>']
  for (const [minute, counts] of Object.entries(user)) {
    const left = (Number(minute) / duration) * 100
    const height = counts.goals * SHOT_BAR_GOAL_PX + counts.shots * SHOT_BAR_SHOT_PX
    bars.push(
      `<div class="timeline-bar user" style="left:${left}%;height:${height}px;" title="${counts.goals}G ${counts.shots}S"></div>`,
    )
    if (counts.goals > 0) {
      bars.push(`<div class="goal-indicator user-goal" style="left:${left}%;">⚽</div>`)
    }
  }
  for (const [minute, counts] of Object.entries(opponent)) {
    const left = (Number(minute) / duration) * 100
    const height = counts.goalsAllowed * SHOT_BAR_GOAL_PX + counts.saves * SHOT_BAR_SHOT_PX
    bars.push(
      `<div class="timeline-bar opponent" style="left:${left}%;height:${height}px;" title="${counts.goalsAllowed}GA ${counts.saves}S"></div>`,
    )
    if (counts.goalsAllowed > 0) {
      bars.push(`<div class="goal-indicator opponent-goal" style="left:${left}%;">⚽</div>`)
    }
  }
  const marks: string[] = []
  for (let m = 0; m <= duration; m += TIMELINE_MARK_EVERY_MINUTES) {
    marks.push(`<span>${m}'</span>`)
  }
  return `<div class="timeline-chart">
    <div class="timeline-bars-wrapper"><div class="timeline-bars">${bars.join('')}</div></div>
    <div class="timeline-scale">${marks.join('')}</div>
  </div>`
}

function renderScorers(game: Game, players: Player[]): string {
  const events = buildGoalsCardsEvents(game, players)
  const ours = events
    .filter((event) => event.type === 'goal' || (event.type === 'ownGoal' && !event.isOpponent))
    .map((event) => `${escapeHtml(event.playerName)} ${event.minute}'`)
  const theirs = events
    .filter((event) => event.type === 'goalAllowed' || (event.type === 'ownGoal' && event.isOpponent))
    .map((event) =>
      event.type === 'ownGoal'
        ? `${escapeHtml(event.playerName)} ${t('ownGoalShort')} ${event.minute}'`
        : `${escapeHtml(event.playerName)} ${event.minute}'`,
    )
  if (!ours.length && !theirs.length) return ''
  return `<div class="report-scorers">
    <div class="scorers-home">${ours.join('<br>') || '&nbsp;'}</div>
    <div class="scorers-away">${theirs.join('<br>') || '&nbsp;'}</div>
  </div>`
}

function renderLogEvent(
  event: ReturnType<typeof buildGoalsCardsEvents>[number],
  runningScore: string,
): string {
  const side = event.isOpponent ? 'is-away' : 'is-home'
  let body = ''
  if (event.type === 'substitution') {
    const off = event.relatedName || t('unknownPlayer')
    const pos = event.position ? ` <span class="log-pos">${escapeHtml(event.position)}</span>` : ''
    body = `<div class="log-sub">
      <div class="log-sub-in">${escapeHtml(event.playerName)}${pos}</div>
      <div class="log-sub-out">${escapeHtml(off)}</div>
    </div>`
  } else if (event.type === 'goal' || event.type === 'ownGoal' || event.type === 'goalAllowed') {
    const ball = event.type === 'ownGoal' ? '<span class="log-ball is-og">⚽</span>' : '<span class="log-ball">⚽</span>'
    const og = event.type === 'ownGoal' ? ` <span class="log-og">${t('ownGoalShort')}</span>` : ''
    const assist = event.assistName
      ? `<div class="log-assist">${escapeHtml(t('assistBy', { name: event.assistName }))}</div>`
      : ''
    body = `<div class="log-goal">${ball} ${escapeHtml(event.playerName)}${og} <span class="log-score">${escapeHtml(runningScore)}</span>${assist}</div>`
  } else if (event.type === 'yellow' || event.type === 'red') {
    const card = event.type === 'yellow' ? '<span class="log-card is-yellow"></span>' : '<span class="log-card is-red"></span>'
    body = `<div class="log-card-row">${escapeHtml(event.playerName)} ${card}</div>`
  } else {
    body = `<div class="log-injury">🏥 ${escapeHtml(event.playerName)}</div>`
  }
  return `<div class="match-log-row ${side}">
    <span class="match-log-min">${event.minute}'</span>
    <div class="match-log-home">${event.isOpponent ? '' : body}</div>
    <div class="match-log-away">${event.isOpponent ? body : ''}</div>
  </div>`
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function periodRingSvg(total: number, filled: number): string {
  const n = Math.max(1, total)
  const cx = 20
  const cy = 20
  const r = 15.2
  const sweep = 360 / n
  const gap = Math.min(14, sweep * 0.2)
  const arcs: string[] = []
  for (let i = 0; i < n; i += 1) {
    const start = -90 + i * sweep + gap / 2
    const end = -90 + (i + 1) * sweep - gap / 2
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, end)
    const large = end - start > 180 ? 1 : 0
    arcs.push(
      `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" class="${i < filled ? 'is-on' : 'is-off'}" />`,
    )
  }
  return `<svg class="period-ring" viewBox="0 0 40 40" aria-hidden="true">${arcs.join('')}</svg>`
}

function renderPeriodMark(total: number, filled: number, home: number, away: number): string {
  return `<div class="period-mark">
    ${periodRingSvg(total, filled)}
    <span class="period-mark-score">${home}–${away}</span>
  </div>`
}

function renderMatchLog(game: Game, players: Player[]): string {
  const events = buildGoalsCardsEvents(game, players)
  if (!events.length) {
    return `<div class="match-log"><div class="empty-state">${t('noEvents')}</div></div>`
  }
  const breaks: { minute: number }[] = []
  for (let i = 1; i < game.numPeriods; i += 1) {
    breaks.push({ minute: i * game.periodDuration })
  }
  const rows: string[] = []
  let bi = 0
  let home = 0
  let away = 0
  for (const event of events) {
    while (bi < breaks.length && event.minute > breaks[bi].minute) {
      rows.push(renderPeriodMark(game.numPeriods, bi + 1, home, away))
      bi += 1
    }
    if (event.type === 'goal' || (event.type === 'ownGoal' && !event.isOpponent)) home += 1
    if (event.type === 'goalAllowed' || (event.type === 'ownGoal' && event.isOpponent)) away += 1
    const score =
      event.type === 'goal' || event.type === 'ownGoal' || event.type === 'goalAllowed'
        ? `(${home}–${away})`
        : ''
    rows.push(renderLogEvent(event, score))
  }
  while (bi < breaks.length) {
    rows.push(renderPeriodMark(game.numPeriods, bi + 1, home, away))
    bi += 1
  }
  rows.push(renderPeriodMark(game.numPeriods, game.numPeriods, game.homeScore, game.awayScore))
  return `<div class="match-log">${rows.join('')}</div>`
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
      const who = action.actionType === 'game_note' ? t('gameNote') : (player?.name ?? t('gameNote'))
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

function metric(value: number, label: string, kind = ''): string {
  return `<div class="stat-metric ${kind} ${value === 0 ? 'is-zero' : ''}">
      <span class="stat-metric-value">${value === 0 ? '–' : value}</span>
      <span class="stat-metric-label">${escapeHtml(label)}</span>
    </div>`
}

export function buildReportDialogHtml(game: Game, team: Team): string {
  const periodLines = periodGoalDeltas(game)
    .map((p, i) => `<div class="period-score-line">${t('periodLine', { n: i + 1, home: p.home, away: p.away })}</div>`)
    .join('')
  const minutes = playedMinutesByPlayer(game)
  const minutesByPos = playedMinutesByPlayerPosition(game)
  const roster = [...team.players].sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  const playedRoster = roster.filter((player) => (minutes.get(player.id) ?? 0) > 0)
  const dnpRoster = roster.filter((player) => (minutes.get(player.id) ?? 0) === 0)
  const cards = playedRoster
    .map((player) => {
      const stats = statsFromActions(game.actions, player.id)
      const played = minutes.get(player.id) ?? 0
      const dist = formatPlayedDistribution(minutesByPos.get(player.id), played)
      return `<article class="report-stat-card">
        <header>
          <span class="stat-jersey">${player.jerseyNumber}</span>
          <span class="stat-card-name">${escapeHtml(player.name)}</span>
        </header>
        <p class="stat-played-line">${escapeHtml(dist)}</p>
        <div class="report-stat-grid">
          ${metric(stats.goals, t('statShortGoal'), 'stat-goal')}
          ${metric(stats.assists, t('statShortAssist'))}
          ${metric(stats.shotOnGoal, t('statShortShot'))}
          ${metric(stats.saves, t('statShortSave'))}
          ${metric(stats.blockedShot, t('statShortBlock'))}
          ${metric(stats.interceptions, t('statShortIntercept'))}
          ${metric(stats.goalsAllowed, t('goalsAllowedShort'), 'stat-against')}
          ${metric(stats.faults, t('statShortFoul'))}
          ${metric(stats.yellowCards, t('statShortYellow'), 'stat-yellow')}
          ${metric(stats.redCards, t('statShortRed'), 'stat-red')}
          ${metric(stats.ownGoals, t('ownGoalShort'))}
        </div>
      </article>`
    })
    .join('')
  const dnp = dnpRoster.length
    ? `<h3>${t('didNotPlay')}</h3>
      <div class="report-dnp">${dnpRoster
        .map(
          (player) =>
            `<span class="report-dnp-chip"><span class="stat-jersey">${player.jerseyNumber}</span>${escapeHtml(player.name)}</span>`,
        )
        .join('')}</div>`
    : ''
  return `
    <div class="report-toolbar">
      <button class="secondary-btn" id="close-open-report-top">${t('close')}</button>
    </div>
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
    <div class="report-header-info" id="report-header-info">
      <div>${escapeHtml(game.date)} · ${game.matchType} · ${formatClock(game.elapsedSeconds)}</div>
    </div>
    ${renderScorers(game, team.players)}
    <div class="report-section timeline-section">
      <h3>${t('shotsTimeline')}</h3>
      ${renderShotChart(game)}
    </div>
    <div class="report-section match-log-section">
      ${renderMatchLog(game, team.players)}
    </div>
    ${renderNotes(game, team.players)}
    <h3>${t('playerStatistics')}</h3>
    <div class="report-stat-cards">${cards}</div>
    ${dnp}
    <div class="report-actions">
      <button class="secondary-btn" id="print-open-report">${t('exportPdf')}</button>
      <button class="primary-btn" id="close-open-report">${t('close')}</button>
    </div>
  `
}
