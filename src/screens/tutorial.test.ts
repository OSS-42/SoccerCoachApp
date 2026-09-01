/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bindTutorialOverlay, isTutorialOverlayOpen } from '@/ui/tutorialOverlay'
import { TUTORIAL_COACH_REV } from '@/domain/tutorial'
import { getSave } from '@/state/store'
import {
  isTutorialActive,
  skipTutorial,
  startTutorial,
  tutorialPlan,
} from './tutorial'

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? ''

describe('tutorial plan', () => {
  it('walks coach live as play, goal, period, play, yellow, period, play, opponent goal', () => {
    const live = tutorialPlan('coach')
      .filter((step) => step.id.startsWith('live'))
      .map((step) => step.wait)
    expect(live).toEqual(['play', 'goal', 'period', 'play', 'yellow', 'period', 'play', 'opp-goal'])
  })

  it('adds a player then shows how to delete them', () => {
    const plan = tutorialPlan('coach')
    const add = plan.findIndex((step) => step.id === 'addPlayer')
    expect(plan[add]).toMatchObject({ wait: 'player-added' })
    expect(plan[add + 1]).toMatchObject({ id: 'deletePlayer', wait: 'player-deleted' })
  })

  it('lets the coach place the leftover player before highlighting Start Game', () => {
    const plan = tutorialPlan('coach')
    const place = plan.findIndex((step) => step.id === 'formation')
    expect(plan[place]).toMatchObject({ screen: 'formation-setup', wait: 'formation-ready' })
    expect(plan[place + 1]).toMatchObject({ id: 'formationStart', wait: 'screen' })
  })

  it('ends the match, shows the report, then deletes the practice game', () => {
    const plan = tutorialPlan('coach')
    const end = plan.findIndex((step) => step.id === 'endGame')
    expect(plan[end]).toMatchObject({ screen: 'game-tracking', wait: 'screen' })
    expect(plan[end + 1]).toMatchObject({ id: 'reportsHere', screen: 'reports' })
    expect(plan[end + 2]).toMatchObject({ id: 'deleteReport', wait: 'report-deleted' })
    expect(plan[end + 3]).toMatchObject({ id: 'stats', screen: 'team-setup' })
  })

  it('lets the parent edit the kid form before saving', () => {
    const kid = tutorialPlan('parent').find((step) => step.id === 'kid')
    expect(kid).toMatchObject({ wait: 'kid-saved' })
  })

  it('walks parent live like coach after placing the kid', () => {
    const plan = tutorialPlan('parent')
    expect(plan.find((step) => step.id === 'place')?.wait).toBe('kid-moved')
    expect(
      plan.filter((step) => step.id.startsWith('live')).map((step) => step.wait),
    ).toEqual(['play', 'goal', 'period', 'play', 'yellow', 'period', 'play', 'opp-goal'])
  })
})

describe('tutorial overlay', () => {
  beforeEach(() => {
    const mem: Record<string, string> = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => mem[key] ?? null,
        setItem: (key: string, value: string) => {
          mem[key] = value
        },
        removeItem: (key: string) => {
          delete mem[key]
        },
        clear: () => {
          for (const key of Object.keys(mem)) delete mem[key]
        },
      },
    })
    document.body.innerHTML = body
    bindTutorialOverlay()
  })

  afterEach(() => {
    skipTutorial()
  })

  it('opens on the home screen and skip marks that role done', () => {
    startTutorial('coach')
    expect(isTutorialActive()).toBe(true)
    expect(isTutorialOverlayOpen()).toBe(true)
    expect(document.getElementById('tutorial-title')?.textContent).toContain('Welcome')
    document.getElementById('tutorial-skip')?.click()
    expect(isTutorialActive()).toBe(false)
    expect(isTutorialOverlayOpen()).toBe(false)
    expect(getSave().tutorial.coachRev).toBe(TUTORIAL_COACH_REV)
  })

  it('Start then Next moves from welcome to the team-setup highlight', () => {
    startTutorial('coach')
    document.getElementById('tutorial-next')?.click()
    expect(document.getElementById('tutorial-title')?.textContent).toContain('Your team')
    expect(document.getElementById('tutorial-spot')?.hidden).toBe(false)
  })
})
