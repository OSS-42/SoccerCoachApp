import { jsPDF } from 'jspdf'
import { t } from '@/i18n'
import { statsFromActions } from './actions'
import { formatClock, periodEndMarksBefore, remainingPeriodEndMarks } from './clock'
import { periodGoalDeltas } from './game'
import { formatPlayedDistribution, playedMinutesByPlayer, playedMinutesByPlayerPosition } from './playingTime'
import { buildGoalsCardsEvents, buildShotTimeline, scheduledMinutes } from './timeline'
import type { Game, LiveStats, Player, Team } from './types'

type MetricKey = {
  [K in keyof LiveStats]: LiveStats[K] extends number ? K : never
}[keyof LiveStats]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2

const INK: [number, number, number] = [17, 19, 24]
const MUTED: [number, number, number] = [90, 90, 90]
const MINT: [number, number, number] = [200, 239, 212]
const ROSE: [number, number, number] = [254, 202, 202]
const YELLOW: [number, number, number] = [253, 230, 138]
const PEACH: [number, number, number] = [245, 198, 179]
const CARD: [number, number, number] = [247, 248, 247]
const GREEN: [number, number, number] = [76, 175, 80]
const RED: [number, number, number] = [229, 57, 53]
const LINE: [number, number, number] = [200, 205, 200]

type RGB = [number, number, number]

function pdfSafe(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
}

function fileSafe(value: string): string {
  return (
    pdfSafe(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_.-]+|[_.-]+$/g, '') || 'opponent'
  )
}

export function reportPdfFileName(game: Game): string {
  return `report-${game.date || 'match'}-vs-${fileSafe(game.opponentName)}.pdf`
}

type Doc = {
  pdf: jsPDF
  y: number
}

function ensure(doc: Doc, height: number): void {
  if (doc.y + height <= PAGE_H - MARGIN) return
  doc.pdf.addPage()
  doc.y = MARGIN
}

function setFill(pdf: jsPDF, color: RGB): void {
  pdf.setFillColor(...color)
}

function setText(pdf: jsPDF, color: RGB): void {
  pdf.setTextColor(...color)
}

function fit(pdf: jsPDF, text: string, maxWidth: number): string {
  const value = pdfSafe(text)
  if (pdf.getTextWidth(value) <= maxWidth) return value
  let cut = value
  while (cut.length > 1 && pdf.getTextWidth(`${cut}...`) > maxWidth) cut = cut.slice(0, -1)
  return `${cut}...`
}

function heading(doc: Doc, label: string): void {
  ensure(doc, 10)
  doc.pdf.setFont('helvetica', 'bold')
  doc.pdf.setFontSize(12)
  setText(doc.pdf, INK)
  doc.pdf.text(pdfSafe(label), MARGIN, doc.y + 5)
  doc.y += 9
}

function reportNotes(game: Game, players: Player[]): { minute: number; who: string; text: string }[] {
  return game.actions
    .filter(
      (action) =>
        (action.actionType === 'game_note' || action.actionType === 'note') &&
        Boolean(action.noteText?.trim()),
    )
    .map((action) => {
      const player = players.find((p) => p.id === action.playerId)
      return {
        minute: Math.floor(action.gameSecond / 60),
        who: action.actionType === 'game_note' ? t('gameNote') : (player?.name ?? t('gameNote')),
        text: action.noteText?.trim() ?? '',
      }
    })
}

function drawScoreHeader(doc: Doc, game: Game, teamName: string): void {
  const h = 34
  ensure(doc, h + 8)
  const pdf = doc.pdf
  const x = MARGIN
  const y = doc.y
  setFill(pdf, MINT)
  pdf.roundedRect(x, y, CONTENT_W, h, 3, 3, 'F')

  const col = CONTENT_W / 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  setText(pdf, INK)
  pdf.text(fit(pdf, teamName, col - 6), x + col / 2, y + 8, { align: 'center' })
  pdf.text(fit(pdf, game.opponentName, col - 6), x + col * 2.5, y + 8, { align: 'center' })

  pdf.setFontSize(22)
  pdf.text(String(game.homeScore), x + col / 2, y + 24, { align: 'center' })
  pdf.text(String(game.awayScore), x + col * 2.5, y + 24, { align: 'center' })

  const periods = periodGoalDeltas(game)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const lines = periods.length
    ? periods.map((p, i) => t('periodLine', { n: i + 1, home: p.home, away: p.away }))
    : [t('ftScore', { home: game.homeScore, away: game.awayScore })]
  const lineH = 4
  let ly = y + h / 2 - ((lines.length - 1) * lineH) / 2
  for (const line of lines) {
    pdf.text(pdfSafe(line), x + col * 1.5, ly, { align: 'center' })
    ly += lineH
  }
  doc.y += h + 4

  pdf.setFontSize(9)
  setText(pdf, MUTED)
  pdf.text(
    pdfSafe(`${game.date}  ·  ${game.matchType}  ·  ${formatClock(game.elapsedSeconds)}`),
    x,
    doc.y + 4,
  )
  doc.y += 10
}

function drawTimeline(doc: Doc, game: Game): void {
  heading(doc, t('shotsTimeline'))
  const chartH = 28
  const scaleH = 6
  ensure(doc, chartH + scaleH + 4)
  const pdf = doc.pdf
  const x = MARGIN
  const y = doc.y
  const w = CONTENT_W
  setFill(pdf, CARD)
  pdf.roundedRect(x, y, w, chartH, 2, 2, 'F')

  const midY = y + chartH / 2
  pdf.setDrawColor(...LINE)
  pdf.setLineWidth(0.3)
  pdf.line(x + 2, midY, x + w - 2, midY)

  const duration = scheduledMinutes(game)
  const { user, opponent } = buildShotTimeline(game)
  const barW = Math.max(1.6, Math.min(2.8, w / Math.max(duration, 1) * 0.55))
  const maxBar = chartH / 2 - 3

  const xAt = (minute: number): number => x + 4 + (minute / duration) * (w - 8)

  for (const [minute, counts] of Object.entries(user)) {
    const cx = xAt(Number(minute))
    const h = Math.min(maxBar, counts.goals * 5 + counts.shots * 3.2)
    if (h <= 0) continue
    setFill(pdf, GREEN)
    pdf.rect(cx - barW / 2, midY - h, barW, h, 'F')
    if (counts.goals > 0) {
      pdf.circle(cx, midY - h - 1.4, 1.2, 'F')
    }
  }
  for (const [minute, counts] of Object.entries(opponent)) {
    const cx = xAt(Number(minute))
    const h = Math.min(maxBar, counts.goalsAllowed * 5 + counts.saves * 3.2)
    if (h <= 0) continue
    setFill(pdf, RED)
    pdf.rect(cx - barW / 2, midY, barW, h, 'F')
    if (counts.goalsAllowed > 0) {
      pdf.circle(cx, midY + h + 1.4, 1.2, 'F')
    }
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  setText(pdf, MUTED)
  for (let m = 0; m <= duration; m += 15) {
    pdf.text(`${m}'`, xAt(m), y + chartH + 4, { align: 'center' })
  }
  if (duration % 15 !== 0) {
    pdf.text(`${duration}'`, xAt(duration), y + chartH + 4, { align: 'center' })
  }
  doc.y += chartH + scaleH + 4
}

function eventLine(event: ReturnType<typeof buildGoalsCardsEvents>[number], score: string): string[] {
  if (event.type === 'substitution') {
    const pos = event.position ? ` (${event.position})` : ''
    return [`> ${event.playerName}${pos}`, `< ${event.relatedName ?? ''}`]
  }
  if (event.type === 'ownGoal') return [`${event.playerName} OG ${score}`]
  if (event.type === 'goal' || event.type === 'goalAllowed') {
    const assist = event.assistName ? [`Assist: ${event.assistName}`] : []
    return [`Goal ${event.playerName} ${score}`, ...assist]
  }
  if (event.type === 'yellow') return [`Y  ${event.playerName}`]
  if (event.type === 'red') return [`R  ${event.playerName}`]
  return [event.playerName]
}

function drawPeriodRingPdf(
  pdf: jsPDF,
  cx: number,
  cy: number,
  r: number,
  total: number,
  filled: number,
): void {
  const n = Math.max(1, total)
  const sweep = (2 * Math.PI) / n
  const gap = Math.min(0.28, sweep * 0.18)
  pdf.setLineWidth(0.7)
  pdf.setLineCap('round')
  for (let i = 0; i < n; i += 1) {
    const a0 = -Math.PI / 2 + i * sweep + gap / 2
    const a1 = -Math.PI / 2 + (i + 1) * sweep - gap / 2
    pdf.setDrawColor(...(i < filled ? INK : LINE))
    const steps = 10
    for (let s = 0; s < steps; s += 1) {
      const t0 = a0 + ((a1 - a0) * s) / steps
      const t1 = a0 + ((a1 - a0) * (s + 1)) / steps
      pdf.line(cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1))
    }
  }
}

function drawPeriodMarkPdf(doc: Doc, total: number, filled: number, home: number, away: number): void {
  ensure(doc, 16)
  const cx = PAGE_W / 2
  const cy = doc.y + 8
  drawPeriodRingPdf(doc.pdf, cx, cy, 6.2, total, filled)
  doc.pdf.setFont('helvetica', 'bold')
  doc.pdf.setFontSize(8)
  setText(doc.pdf, INK)
  doc.pdf.text(`${home}-${away}`, cx, cy + 1.1, { align: 'center' })
  doc.y += 16
}

function drawMatchLog(doc: Doc, game: Game, players: Player[]): void {
  const events = buildGoalsCardsEvents(game, players)
  if (!events.length) return
  heading(doc, t('matchLog'))
  const pdf = doc.pdf
  const minX = MARGIN
  const homeX = MARGIN + 12
  const awayX = PAGE_W - MARGIN
  const colW = (CONTENT_W - 16) / 2
  let shownPeriod = 1
  let home = 0
  let away = 0
  for (const event of events) {
    const marks = periodEndMarksBefore(shownPeriod, event.period)
    for (const filled of marks.filled) {
      drawPeriodMarkPdf(doc, game.numPeriods, filled, home, away)
    }
    shownPeriod = marks.shownPeriod
    if (event.type === 'goal' || (event.type === 'ownGoal' && !event.isOpponent)) home += 1
    if (event.type === 'goalAllowed' || (event.type === 'ownGoal' && event.isOpponent)) away += 1
    const score =
      event.type === 'goal' || event.type === 'ownGoal' || event.type === 'goalAllowed'
        ? `(${home}-${away})`
        : ''
    const lines = eventLine(event, score).map(pdfSafe)
    const h = Math.max(6, lines.length * 4.2 + 2)
    ensure(doc, h)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setText(pdf, MUTED)
    pdf.text(`${event.minute}'`, minX, doc.y + 4)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    setText(pdf, event.isOpponent ? RED : INK)
    let ty = doc.y + 4
    for (const line of lines) {
      if (event.isOpponent) pdf.text(fit(pdf, line, colW), awayX, ty, { align: 'right' })
      else pdf.text(fit(pdf, line, colW), homeX, ty)
      ty += 4.2
    }
    doc.y += h
  }
  for (const filled of remainingPeriodEndMarks(shownPeriod, game.numPeriods)) {
    drawPeriodMarkPdf(doc, game.numPeriods, filled, home, away)
  }
  drawPeriodMarkPdf(doc, game.numPeriods, game.numPeriods, game.homeScore, game.awayScore)
}

function drawNotes(doc: Doc, game: Game, players: Player[]): void {
  const notes = reportNotes(game, players)
  if (!notes.length) return
  heading(doc, t('notes'))
  const pdf = doc.pdf
  for (const note of notes) {
    const meta = pdfSafe(`${note.minute}' · ${note.who}`)
    const lines = pdf.splitTextToSize(pdfSafe(note.text), CONTENT_W - 10) as string[]
    const h = 8 + lines.length * 4.2
    ensure(doc, h + 2)
    setFill(pdf, PEACH)
    pdf.roundedRect(MARGIN, doc.y, CONTENT_W, h, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setText(pdf, INK)
    pdf.text(meta, MARGIN + 4, doc.y + 4.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    let ty = doc.y + 9
    for (const line of lines) {
      pdf.text(line, MARGIN + 4, ty)
      ty += 4.2
    }
    doc.y += h + 2
  }
  doc.y += 2
}

function metricFill(kind: string, value: number): RGB | null {
  if (value === 0) return null
  if (kind === 'against' || kind === 'red') return ROSE
  if (kind === 'yellow') return YELLOW
  return MINT
}

function drawPlayers(doc: Doc, game: Game, players: Player[]): void {
  const pdf = doc.pdf
  const minutes = playedMinutesByPlayer(game)
  const minutesByPos = playedMinutesByPlayerPosition(game)
  const metrics: { key: MetricKey; label: string; kind: string }[] = [
    { key: 'goals', label: t('statShortGoal'), kind: 'goal' },
    { key: 'assists', label: t('statShortAssist'), kind: '' },
    { key: 'shotOnGoal', label: t('statShortShot'), kind: '' },
    { key: 'saves', label: t('statShortSave'), kind: '' },
    { key: 'blockedShot', label: t('statShortBlock'), kind: '' },
    { key: 'interceptions', label: t('statShortIntercept'), kind: '' },
    { key: 'goalsAllowed', label: t('goalsAllowedShort'), kind: 'against' },
    { key: 'faults', label: t('statShortFoul'), kind: '' },
    { key: 'yellowCards', label: t('statShortYellow'), kind: 'yellow' },
    { key: 'redCards', label: t('statShortRed'), kind: 'red' },
    { key: 'ownGoals', label: t('ownGoalShort'), kind: '' },
  ]
  const cols = 5
  const gap = 1.6
  const cellW = (CONTENT_W - 8 - gap * (cols - 1)) / cols
  const cellH = 9
  const headerH = 16
  const metricRows = Math.ceil(metrics.length / cols)
  const cardH = 6 + headerH + cellH * metricRows + gap * Math.max(0, metricRows - 1) + 4

  const roster = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  const playedRoster = roster.filter((player) => (minutes.get(player.id) ?? 0) > 0)
  const dnpRoster = roster.filter((player) => (minutes.get(player.id) ?? 0) === 0)
  if (playedRoster.length) heading(doc, t('playerStatistics'))
  for (const player of playedRoster) {
    ensure(doc, cardH)
    const stats = statsFromActions(game.actions, player.id)
    const played = minutes.get(player.id) ?? 0
    const dist = formatPlayedDistribution(minutesByPos.get(player.id), played)
    const y = doc.y
    setFill(pdf, CARD)
    pdf.roundedRect(MARGIN, y, CONTENT_W, cardH, 2.5, 2.5, 'F')

    setFill(pdf, MINT)
    pdf.roundedRect(MARGIN + 3, y + 3, 8, 7, 1.5, 1.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    setText(pdf, INK)
    pdf.text(String(player.jerseyNumber), MARGIN + 7, y + 7.6, { align: 'center' })
    pdf.setFontSize(11)
    pdf.text(fit(pdf, player.name, CONTENT_W - 12), MARGIN + 13, y + 7.8)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    setText(pdf, MUTED)
    const distLines = played === 0 ? ['-'] : (pdf.splitTextToSize(dist, CONTENT_W - 16) as string[])
    let dy = y + 13.2
    for (const line of distLines) {
      pdf.text(line, MARGIN + 13, dy)
      dy += 3.4
    }

    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = MARGIN + 4 + col * (cellW + gap)
      const cy = y + 3 + headerH + 1 + row * (cellH + gap)
      const value = stats[metric.key]
      const fill = metricFill(metric.kind, value)
      if (fill) {
        setFill(pdf, fill)
        pdf.roundedRect(cx, cy, cellW, cellH, 1.4, 1.4, 'F')
      }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      setText(pdf, value === 0 ? MUTED : INK)
      pdf.text(value === 0 ? '-' : String(value), cx + cellW / 2, cy + 3.6, { align: 'center' })
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6)
      pdf.text(fit(pdf, metric.label, cellW - 2), cx + cellW / 2, cy + 7.2, { align: 'center' })
    }
    doc.y += cardH + 2.2
  }
  if (!dnpRoster.length) return
  heading(doc, t('didNotPlay'))
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, MUTED)
  const names = dnpRoster.map((player) => `#${player.jerseyNumber} ${player.name}`).join('   ')
  const wrap = pdf.splitTextToSize(pdfSafe(names), CONTENT_W) as string[]
  for (const line of wrap) {
    ensure(doc, 5)
    pdf.text(line, MARGIN, doc.y + 4)
    doc.y += 5
  }
}

export function buildGameReportPdf(game: Game, team: Team): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const doc: Doc = { pdf, y: MARGIN }
  drawScoreHeader(doc, game, team.name)
  drawTimeline(doc, game)
  drawMatchLog(doc, game, team.players)
  drawNotes(doc, game, team.players)
  drawPlayers(doc, game, team.players)
  return pdf
}
