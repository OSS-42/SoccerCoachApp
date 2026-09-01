export const TUTORIAL_COACH_REV = 4
export const TUTORIAL_PARENT_REV = 3

export type TutorialState = {
  coachRev: number | null
  parentRev: number | null
}

export const DEFAULT_TUTORIAL: TutorialState = {
  coachRev: null,
  parentRev: null,
}

export type TutorialRole = 'coach' | 'parent'

export function shouldShowTutorial(role: TutorialRole, tutorial: TutorialState): boolean {
  const rev = role === 'parent' ? tutorial.parentRev : tutorial.coachRev
  const expected = role === 'parent' ? TUTORIAL_PARENT_REV : TUTORIAL_COACH_REV
  return rev !== expected
}

/** First-ever session: no changelog. After an OTA, show it once. */
export function shouldShowChangelog(
  seenVersion: string | null,
  appVersion: string,
  tutorial: TutorialState,
): boolean {
  if (seenVersion === appVersion) return false
  const usedApp = tutorial.coachRev != null || tutorial.parentRev != null || seenVersion != null
  return usedApp
}

export function emptyTutorial(): TutorialState {
  return { ...DEFAULT_TUTORIAL }
}
