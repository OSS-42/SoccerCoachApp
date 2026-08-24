import type { Locale } from '@/i18n'

export type ChangelogEntry = {
  version: string
  items: Record<Locale, string[]>
}

/** Newest first. Settings shows the first two. Update this when shipping an OTA. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.4.57',
    items: {
      en: [
        'Coach or Parent after the intro. Parent mode follows one kid: pitch slots, tap for actions, double-tap to move.',
        'Parent live: Home +1 asks if the kid made the last pass. Opponent +1 is their goal. Kid-only report and PDF.',
      ],
      fr: [
        'Coach ou Parent après l’intro. Le mode parent suit un enfant : places sur le terrain, toucher pour une action, double-toucher pour déplacer.',
        'En direct parent : Dom. +1 demande si l’enfant a fait la dernière passe. Adv. +1 est leur but. Rapport et PDF centrés sur l’enfant.',
      ],
    },
  },
  {
    version: '2.4.56',
    items: {
      en: [
        'PDF export on Android now opens the share sheet so you can save or send the report.',
      ],
      fr: [
        'L’export PDF sur Android ouvre le menu de partage pour enregistrer ou envoyer le rapport.',
      ],
    },
  },
  {
    version: '2.4.55',
    items: {
      en: [
        'Settings: Change log shows what changed in the last two versions.',
        'How to use tips now say which screen they apply to (Live game vs Formation Setup).',
      ],
      fr: [
        'Réglages : le journal des versions montre les deux dernières mises à jour.',
        'Le mode d’emploi précise l’écran concerné (Match en direct vs Composition).',
      ],
    },
  },
  {
    version: '2.4.54',
    items: {
      en: [
        'Live game: tap a player for actions, double-tap to substitute.',
        'Double-tap the same player again to cancel a substitution.',
      ],
      fr: [
        'Match en direct : touchez un joueur pour une action, double-touchez pour un changement.',
        'Double-touchez le même joueur pour annuler un changement.',
      ],
    },
  },
  {
    version: '2.4.53',
    items: {
      en: [
        'Substitution timer now appears on the live screen when set in Settings or New Game.',
        'PDF reports can be shared from the Android app.',
      ],
      fr: [
        'Le minuteur de relèves s’affiche en direct s’il est réglé dans Réglages ou Nouveau match.',
        'Les rapports PDF peuvent être partagés depuis l’application Android.',
      ],
    },
  },
]

export function recentChangelog(count = 2): ChangelogEntry[] {
  return CHANGELOG.slice(0, count)
}
