export type LiveRole = 'field' | 'bench'

export type CoachLiveTap =
  | { action: 'arm' }
  | { action: 'cancel' }
  | { action: 'swap' }
  | { action: 'retarget' }
  | { action: 'schedule-actions' }

export type ParentLiveTap =
  | { action: 'arm' }
  | { action: 'cancel' }
  | { action: 'move' }
  | { action: 'schedule-actions' }
  | { action: 'ignore' }

/**
 * Live-game tile tap:
 * - Double-tap arms switch mode.
 * - While armed, a single tap swaps, retargets, or cancels. Actions never open.
 * - While idle, a single tap schedules the action panel.
 */
export function coachLiveTap(input: {
  pendingId: string | null
  pendingRole: LiveRole | null
  playerId: string
  role: LiveRole
  doubleTap: boolean
}): CoachLiveTap {
  if (input.pendingId) {
    if (input.playerId === input.pendingId) return { action: 'cancel' }
    if (input.pendingRole && input.pendingRole !== input.role) return { action: 'swap' }
    return { action: 'retarget' }
  }
  if (input.doubleTap) return { action: 'arm' }
  return { action: 'schedule-actions' }
}

/**
 * Parent live pitch:
 * - Double-tap the kid to arm move mode.
 * - While armed, tap another slot/bench to move, or tap the kid to cancel.
 * - Actions never open while armed.
 */
export function parentLiveTap(input: {
  moveArmed: boolean
  onKid: boolean
  doubleTap: boolean
}): ParentLiveTap {
  if (input.onKid) {
    if (input.moveArmed) return { action: 'cancel' }
    if (input.doubleTap) return { action: 'arm' }
    return { action: 'schedule-actions' }
  }
  if (input.moveArmed) return { action: 'move' }
  return { action: 'ignore' }
}
