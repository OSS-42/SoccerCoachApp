import { jsPDF } from 'jspdf'
import { t } from '@/i18n'
import { formatPlayedDistribution } from './playingTime'
import {
  CARD,
  CONTENT_W,
  INK,
  LINE,
  MARGIN,
  MINT,
  MUTED,
  PAGE_H,
  PEACH,
  ROSE,
  YELLOW,
  addPromoFooter,
  fileSafe,
  fit,
  pdfSafe,
  setFill,
  setText,
  type PdfOptions,
  type RGB,
} from './reportPdf'
import {
  calculateSeasonStats,
  seasonMetrics,
  seasonRecord,
  seasonTotals,
  type SeasonCounts,
  type SeasonMetricKind,
} from './stats'
import type { Team } from './types'

export type SeasonRange = { start: string | null; end: string | null }

const GAP = 4
const COLS = 3
const CARD_W = (CONTENT_W - GAP * (COLS - 1)) / COLS
const CARD_H = 50
const PLAYER_GRID_COLS = 4
const TEAM_GRID_COLS = 7
const CELL_H = 8

const KIND_TINT: Partial<Record<SeasonMetricKind, RGB>> = {
  'stat-goal': MINT,
  'stat-against': PEACH,
  'stat-yellow': YELLOW,
  'stat-red': ROSE,
}

export function seasonPdfFileName(team: Team, range: SeasonRange): string {
  const span = range.start || range.end ? `${range.start ?? 'start'}-${range.end ?? 'today'}` : 'all'
  return `season-${fileSafe(team.name)}-${span}.pdf`
}

function rangeLabel(range: SeasonRange): string {
  if (range.start && range.end) return t('dateRange', { from: range.start, to: range.end })
  if (range.start) return t('fromDate', { date: range.start })
  if (range.end) return t('untilDate', { date: range.end })
  return t('allGames')
}

/** Grid of metric cells (value over label), tinted like the Statistics tab when non-zero. */
function drawMetrics(pdf: jsPDF, counts: SeasonCounts, x: number, y: number, width: number, cols: number): void {
  const cellW = width / cols
  seasonMetrics(counts).forEach((metric, index) => {
    const cx = x + (index % cols) * cellW
    const cy = y + Math.floor(index / cols) * CELL_H
    const tint = metric.value > 0 ? KIND_TINT[metric.kind] : undefined
    if (tint) {
      setFill(pdf, tint)
      pdf.roundedRect(cx + 0.6, cy + 0.4, cellW - 1.2, CELL_H - 0.8, 1.2, 1.2, 'F')
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setText(pdf, metric.value > 0 ? INK : MUTED)
    pdf.text(metric.value > 0 ? String(metric.value) : '-', cx + cellW / 2, cy + 3.9, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(5.8)
    setText(pdf, MUTED)
    pdf.text(fit(pdf, metric.label, cellW - 1.5), cx + cellW / 2, cy + 6.9, { align: 'center' })
  })
}

function drawHeader(pdf: jsPDF, team: Team, range: SeasonRange): number {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  setText(pdf, INK)
  pdf.text(fit(pdf, team.name, CONTENT_W - 50), MARGIN, MARGIN + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, MUTED)
  pdf.text(pdfSafe(`${t('seasonStatsTitle')}  ·  ${rangeLabel(range)}`), MARGIN, MARGIN + 12)
  pdf.setFontSize(7)
  pdf.text(pdfSafe(t('generatedOn', { date: new Date().toISOString().slice(0, 10) })), MARGIN + CONTENT_W, MARGIN + 6, {
    align: 'right',
  })
  return MARGIN + 17
}

function drawTeamCard(pdf: jsPDF, team: Team, range: SeasonRange, totals: SeasonCounts, y: number): number {
  const pad = 4
  const rows = Math.ceil(seasonMetrics(totals).length / TEAM_GRID_COLS)
  const h = pad + 7 + 6 + rows * CELL_H + pad
  setFill(pdf, MINT)
  pdf.roundedRect(MARGIN, y, CONTENT_W, h, 3, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  setText(pdf, INK)
  pdf.text(pdfSafe(t('totals')), MARGIN + pad, y + pad + 4.5)
  pdf.text(totals.minutesPlayed > 0 ? `${totals.minutesPlayed}'` : '-', MARGIN + CONTENT_W - pad, y + pad + 4.5, {
    align: 'right',
  })
  const record = seasonRecord(team.games, range.start, range.end)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.text(
    pdfSafe(
      t('recordLine', {
        played: record.played,
        w: record.wins,
        d: record.draws,
        l: record.losses,
        gf: record.goalsFor,
        ga: record.goalsAgainst,
      }),
    ),
    MARGIN + pad,
    y + pad + 10.5,
  )
  setFill(pdf, [255, 255, 255])
  const gridY = y + pad + 13
  pdf.roundedRect(MARGIN + pad - 1, gridY - 0.5, CONTENT_W - 2 * pad + 2, rows * CELL_H + 1, 2, 2, 'F')
  drawMetrics(pdf, totals, MARGIN + pad, gridY, CONTENT_W - 2 * pad, TEAM_GRID_COLS)
  return y + h + GAP + 1
}

function drawPlayerCard(
  pdf: jsPDF,
  row: ReturnType<typeof calculateSeasonStats>[number],
  x: number,
  y: number,
): void {
  const pad = 3
  setFill(pdf, CARD)
  pdf.setDrawColor(...LINE)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(x, y, CARD_W, CARD_H, 2.5, 2.5, 'FD')

  setFill(pdf, MINT)
  pdf.circle(x + pad + 3.2, y + pad + 3.2, 3.2, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  setText(pdf, INK)
  pdf.text(String(row.jerseyNumber), x + pad + 3.2, y + pad + 4.3, { align: 'center' })
  pdf.setFontSize(9.5)
  pdf.text(fit(pdf, row.name, CARD_W - pad * 2 - 9), x + pad + 8.5, y + pad + 4.5)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.3)
  setText(pdf, MUTED)
  const played =
    row.minutesPlayed > 0 ? formatPlayedDistribution(row.minutesByPosition, row.minutesPlayed) : '-'
  const lines = pdf.splitTextToSize(pdfSafe(played), CARD_W - pad * 2) as string[]
  const shown = lines.length > 2 ? [lines[0], fit(pdf, `${lines[1]} ${lines[2]}`, CARD_W - pad * 2)] : lines
  pdf.text(shown, x + pad, y + pad + 10.2)

  drawMetrics(pdf, row, x + pad - 0.5, y + pad + 15, CARD_W - pad * 2 + 1, PLAYER_GRID_COLS)
}

/** Season stats as shown in Team → Statistics: team card on top, player cards in a 3-column grid. */
export function buildSeasonStatsPdf(team: Team, range: SeasonRange, options: PdfOptions = {}): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const rows = calculateSeasonStats(team.players, team.games, range.start, range.end)
  let y = drawHeader(pdf, team, range)
  y = drawTeamCard(pdf, team, range, seasonTotals(rows, team.games, range.start, range.end), y)
  rows.forEach((row, index) => {
    const col = index % COLS
    if (col === 0 && index > 0) y += CARD_H + GAP
    if (col === 0 && y + CARD_H > PAGE_H - MARGIN) {
      pdf.addPage()
      y = MARGIN
    }
    drawPlayerCard(pdf, row, MARGIN + col * (CARD_W + GAP), y)
  })
  if (options.promo ?? true) addPromoFooter(pdf)
  return pdf
}
