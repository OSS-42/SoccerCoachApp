export type TutorialEvent =
  | 'goal'
  | 'yellow'
  | 'opp-goal'
  | 'sub'
  | 'kid-moved'
  | 'kid-saved'
  | 'report-selected'
  | 'report-deleted'
  | 'formation-ready'
  | 'play'
  | 'period'
  | 'player-added'
  | 'player-selected'
  | 'player-deleted'
export type TutorialLiveGate = 'goal' | 'yellow' | 'opp-goal' | 'switch' | null

type Handler = (event: TutorialEvent) => void

let handler: Handler | null = null
let liveGate: TutorialLiveGate = null
let running = false

export function setTutorialEventHandler(next: Handler | null): void {
  handler = next
}

export function notifyTutorialEvent(event: TutorialEvent): void {
  handler?.(event)
}

export function setTutorialLiveGate(next: TutorialLiveGate): void {
  liveGate = next
}

export function tutorialLiveGate(): TutorialLiveGate {
  return liveGate
}

export function setTutorialRunning(on: boolean): void {
  running = on
}

export function tutorialRunning(): boolean {
  return running
}
