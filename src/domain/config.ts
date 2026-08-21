/**
 * Product and runtime constants.
 * Storage keys stay on the original `soccerCoachApp*` ids so existing
 * browsers keep their saves after the ActionPitch rename.
 */
export const APP_NAME = 'ActionPitch'

/** Keep in lockstep with package.json — Vite injects this at build time. */
export const APP_VERSION: string = __APP_VERSION__

export const SAVE_VERSION = 2
export const MAX_TEAMS = 2

export const LEGACY_SAVE_KEY = 'soccerCoachApp2'
export const LEGACY_SAVE_KEY_V1 = 'soccerCoachApp'
export const SAVE_KEY = 'soccerCoachApp.v2'
export const SAVE_BACKUP_KEY = 'soccerCoachApp.v2.bak'

export const DEMO_TEAM_ID = 't-demo'

export const DEFAULT_SUB_MINUTES = 6
export const JERSEY_MIN = 0
export const JERSEY_MAX = 99
export const NOTE_MAX_LENGTH = 200
export const YELLOWS_FOR_RED = 2
export const EXTRA_TIME_PERIODS = 2

export const ELEVEN_V11_PERIODS = 2
export const ELEVEN_V11_OFFICIAL_MINUTES = 45
export const ELEVEN_V11_FRIENDLY_MINUTES = 40

export const DOUBLE_TAP_MS = 320
export const CLOCK_TICK_MS = 1000
export const CLOCK_PERSIST_EVERY_TICKS = 10
export const EDGE_SWIPE_PX = 18
export const MESSAGE_ERROR_MS = 7000
export const MESSAGE_OK_MS = 5000
export const TIMELINE_MARK_EVERY_MINUTES = 15

export const VIEW_REPORT_EVENT = 'actionpitch:view-report'
export const BACKUP_FILE_PREFIX = 'actionpitch-backup'
