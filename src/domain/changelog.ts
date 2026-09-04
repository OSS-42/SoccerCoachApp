import type { Locale } from '@/i18n'

export type ChangelogEntry = {
  version: string
  items: Record<Locale, string[]>
}

/** Newest first. Settings shows the first two. Update this when shipping an OTA. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.4.71',
    items: {
      en: [
        'Interception is on the first screen when you tap a player. Stats cards, season, and the PDF say Intercept.',
        'Parent home has two tabs: Home menu and Player stats. The phone stays in portrait. Coach live shows every tile without scrolling; Resume sits beside Start New Game. Labels say player, not kid.',
      ],
      fr: [
        'Interception est sur le premier écran quand vous touchez un joueur. Les cartes de stats, la saison et le PDF disent Interc.',
        'L’accueil parent a deux onglets : Menu d’accueil et Stats du joueur. Le téléphone reste en portrait. En direct coach, toutes les tuiles tiennent à l’écran ; Reprendre est à côté de Nouveau match. Les textes disent joueur, pas enfant.',
      ],
    },
  },
  {
    version: '2.4.70',
    items: {
      en: [
        'Opening splash plays straight into the intro video — no play-button flash. The clip loads during the update check.',
      ],
      fr: [
        'L’écran d’ouverture enchaîne directement sur la vidéo d’intro, sans l’icône lecture. Le clip se charge pendant la vérification de mise à jour.',
      ],
    },
  },
  {
    version: '2.4.69',
    items: {
      en: [
        'Periods follow Stop, not the clock: a 21st-minute action stays in the period until you confirm; after confirm, new actions are the next period.',
        'Coach tour: season stats, then delete the practice report. Replay opens the Players tab. Parent reports are back, with the same report → stats → delete steps. Formation: tap the leftover player, then any empty spot — extra taps do not cancel.',
      ],
      fr: [
        'Les périodes suivent Stop, pas le chrono : une action à la 21e minute reste dans la période jusqu’à confirmation ; ensuite, les nouvelles actions sont la période suivante.',
        'Tour coach : stats de saison, puis suppression du rapport d’entraînement. Rejouer ouvre l’onglet Joueurs. Les rapports parent reviennent, avec les mêmes étapes. Composition : touchez le joueur restant, puis n’importe quelle place vide — les autres touches n’annulent pas.',
      ],
    },
  },
  {
    version: '2.4.68',
    items: {
      en: [
        'Tour highlights cut a hole in the dimmer so you can see the control (player stats card, reports, formation). Coach tour uses DEMO TEAM for the practice match. Parent practice match is 9v9 (3 periods).',
      ],
      fr: [
        'Le tour perce un trou dans l’assombrissement pour voir le contrôle (carte de stats, rapports, composition). Le tour coach utilise DEMO TEAM pour l’entraînement. Le match parent d’entraînement est en 9v9 (3 périodes).',
      ],
    },
  },
  {
    version: '2.4.67',
    items: {
      en: [
        'Parent tour: type the player’s name before Save. Only the highlighted control works, so the steps stay in order.',
      ],
      fr: [
        'Tour parent : saisissez le prénom avant Enregistrer. Seul le contrôle mis en avant fonctionne, pour garder les étapes dans l’ordre.',
      ],
    },
  },
  {
    version: '2.4.66',
    items: {
      en: [
        'First-launch tour for coaches and parents. Skip anytime; replay from Settings. After an update, a short What’s new — the tour only runs again if how you use the app changed.',
        'Coach practice match is 9v9: place one leftover player, start the clock, record a goal, end each period (then Play again), opponent goal, then end the game and delete that training report.',
      ],
      fr: [
        'Tour de prise en main pour coach et parent. Vous pouvez passer à tout moment ; revoir depuis Réglages. Après une mise à jour, un court « Nouveautés » — le tour ne reprend que si l’usage de l’app a changé.',
        'Match d’entraînement coach en 9v9 : placez le joueur restant, lancez le chrono, un but, fin de chaque période (puis Play), but adverse, puis fin du match et suppression de ce rapport d’entraînement.',
      ],
    },
  },
  {
    version: '2.4.65',
    items: {
      en: [
        'Hints on formation and live: tap to place or switch players (no dragging). Empty Team B no longer appears in the list.',
      ],
      fr: [
        'Les écrans composition et match en direct expliquent le placement et les changements par toucher (pas de glisser). L’équipe B vide n’apparaît plus dans la liste.',
      ],
    },
  },
  {
    version: '2.4.64',
    items: {
      en: [
        'Coach formation: Save keeps the lineup (including unavailable) without starting the game.',
        'Parent kickoff: a prompt to position the player, then one tap on a slot (no double-tap).',
      ],
      fr: [
        'Composition coach : Enregistrer garde le onze (et les absents) sans lancer le match.',
        'Coup d’envoi parent : un message pour placer le joueur, puis un toucher sur une place (sans double-toucher).',
      ],
    },
  },
  {
    version: '2.4.63',
    items: {
      en: [
        'Parent live: tapping Assist also adds 1 to the team score (teammate goal). French copy uses “passe décisive”.',
      ],
      fr: [
        'En direct parent : une passe décisive ajoute aussi 1 au score (but d’un coéquipier). Le texte dit « passe décisive ».',
      ],
    },
  },
  {
    version: '2.4.62',
    items: {
      en: [
        'Parent home: jersey, position, and Save on one row. New game is its own card. Saved player name replaces “player” in labels and tips. Parent pitch keeps the field aspect ratio.',
      ],
      fr: [
        'Accueil parent : n°, poste et Enregistrer sur une ligne. Nouveau match en carte. Le nom remplace « joueur » dans les textes. Le terrain parent garde ses proportions.',
      ],
    },
  },
  {
    version: '2.4.61',
    items: {
      en: [
        'Live game: double-tap to enter switch mode, then tap once to complete or cancel. The action list stays closed while switching.',
      ],
      fr: [
        'Match en direct : double-touchez pour le mode changement, puis touchez une fois pour confirmer ou annuler. La liste d’actions reste fermée pendant le changement.',
      ],
    },
  },
  {
    version: '2.4.60',
    items: {
      en: [
        'Interception is a live action on the pitch, with the same pills on reports, season stats, and PDF.',
      ],
      fr: [
        'Interception est une action en direct sur le terrain, avec les mêmes pastilles sur les rapports, les stats et le PDF.',
      ],
    },
  },
  {
    version: '2.4.59',
    items: {
      en: [
        'Coach and Parent homes share the same bottom Switch button. Parent home: no extra title; date sits beside “Player starting”.',
      ],
      fr: [
        'Les accueil Coach et Parent ont le bouton d’échange en bas. Accueil parent : plus de titre ; la date est à côté de « Joueur titulaire ».',
      ],
    },
  },
  {
    version: '2.4.58',
    items: {
      en: [
        'Parent home always shows the player stats card. Smaller “starts on the field” checkbox. Swap arrows on Coach/Parent switch.',
      ],
      fr: [
        'L’écran parent affiche toujours la carte de stats. Case « titulaire » plus petite. Flèches d’échange sur le bouton Coach/Parent.',
      ],
    },
  },
  {
    version: '2.4.57',
    items: {
      en: [
        'Coach or Parent after the intro. Parent mode follows one player: pitch slots, tap for actions, double-tap to move.',
        'Parent live: Home +1 asks if the player made the last pass. Opponent +1 is their goal. Player-only report and PDF.',
      ],
      fr: [
        'Coach ou Parent après l’intro. Le mode parent suit un joueur : places sur le terrain, toucher pour une action, double-toucher pour déplacer.',
        'En direct parent : Dom. +1 demande si le joueur a fait la dernière passe. Adv. +1 est leur but. Rapport et PDF centrés sur le joueur.',
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
