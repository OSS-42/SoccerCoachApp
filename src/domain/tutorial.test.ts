import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TUTORIAL,
  TUTORIAL_COACH_REV,
  shouldShowChangelog,
  shouldShowTutorial,
} from './tutorial'

describe('tutorial flags', () => {
  it('shows the coach tutorial until that revision is completed', () => {
    expect(shouldShowTutorial('coach', DEFAULT_TUTORIAL)).toBe(true)
    expect(shouldShowTutorial('coach', { coachRev: TUTORIAL_COACH_REV, parentRev: null })).toBe(false)
    expect(shouldShowTutorial('parent', { coachRev: TUTORIAL_COACH_REV, parentRev: null })).toBe(true)
  })

  it('does not show a changelog on a brand-new save', () => {
    expect(shouldShowChangelog(null, '2.4.66', DEFAULT_TUTORIAL)).toBe(false)
  })

  it('shows a changelog after an app version bump if they already used the app', () => {
    expect(
      shouldShowChangelog('2.4.65', '2.4.66', { coachRev: 1, parentRev: null }),
    ).toBe(true)
    expect(
      shouldShowChangelog('2.4.66', '2.4.66', { coachRev: 1, parentRev: null }),
    ).toBe(false)
    expect(
      shouldShowChangelog(null, '2.4.66', { coachRev: 1, parentRev: null }),
    ).toBe(true)
  })
})
