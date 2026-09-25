import type { Locale } from '@/i18n'

export type ChangelogEntry = {
  version: string
  items: Record<Locale, string[]>
}

/** Newest first. Settings shows the first two. Update this when shipping an OTA. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.5.2',
    items: {
      en: [
        'Faster start-up: the PDF tools load only when you export a report. Screen readers now name the Back, Add player and Edit buttons, and dialogs close with Escape. Free version: adding a team you could not open now shows a clear message instead.',
      ],
      fr: [
        'Démarrage plus rapide : les outils PDF se chargent seulement quand vous exportez un rapport. Les lecteurs d’écran annoncent les boutons Retour, Ajouter un joueur et Modifier, et les fenêtres se ferment avec Échap. Version gratuite : ajouter une équipe impossible à ouvrir affiche maintenant un message clair.',
      ],
    },
  },
  {
    version: '2.5.1',
    items: {
      en: [
        'Export backup now works on iPhone and Android: choose Save to Files, Drive or email. Your data is better protected: a full phone no longer loses changes silently, and a safety copy restores your teams if the app’s storage is wiped.',
      ],
      fr: [
        'L’export de sauvegarde fonctionne maintenant sur iPhone et Android : choisissez Enregistrer dans Fichiers, Drive ou e-mail. Vos données sont mieux protégées : un téléphone plein ne perd plus de changements en silence, et une copie de sécurité restaure vos équipes si le stockage de l’app est effacé.',
      ],
    },
  },
  {
    version: '2.5.0',
    items: {
      en: [
        'Icons now show without internet at the field. Updates are verified before they install. Imported backup files are checked so a bad file cannot break the app.',
      ],
      fr: [
        'Les icônes s’affichent maintenant sans Internet au terrain. Les mises à jour sont vérifiées avant l’installation. Les fichiers de sauvegarde importés sont vérifiés pour qu’un fichier défectueux ne bloque pas l’app.',
      ],
    },
  },
  {
    version: '2.4.77',
    items: {
      en: [
        'Spectator: the player’s tile turns yellow then red (two yellows = send-off, shown in the report). After a red, no more actions. Place the player on the pitch before starting the clock.',
      ],
      fr: [
        'Spectateur : la tuile du joueur passe au jaune puis au rouge (deux jaunes = expulsion, visible dans le rapport). Après un rouge, plus d’actions. Placez le joueur sur le terrain avant de lancer le chronomètre.',
      ],
    },
  },
  {
    version: '2.4.76',
    items: {
      en: [
        'Live game: on iPhone the period sits over the score so it is not cut off. On Android, player names on the tiles are larger.',
      ],
      fr: [
        'Match en direct : sur iPhone, la période est au-dessus du score pour ne plus être coupée. Sur Android, les noms sur les tuiles sont plus grands.',
      ],
    },
  },
  {
    version: '2.4.75',
    items: {
      en: [
        'New game uses today’s date on the title row (no date picker). Spectator live: no Reset Sub; Opponent and Game Note share a row. Messages overlay briefly and do not block buttons, so Formation gets more pitch.',
      ],
      fr: [
        'Nouveau match : la date du jour est sur la ligne du titre (plus de calendrier). En direct spectateur : plus de Reset relève ; Adversaire et Note de match partagent une ligne. Les messages passent au-dessus, plus courts, et ne bloquent plus les boutons : le terrain de composition a plus de place.',
      ],
    },
  },
  {
    version: '2.4.74',
    items: {
      en: [
        'Formation pitch keeps its real shape on every phone. The grass is no longer stretched to fill the leftover space.',
      ],
      fr: [
        'Le terrain de composition garde ses vraies proportions sur tous les téléphones. L’herbe n’est plus étirée pour remplir l’espace restant.',
      ],
    },
  },
  {
    version: '2.4.73',
    items: {
      en: [
        'The second path is Spectator: follow one player. Replay coach and spectator tutorials sit in the center in Settings. Role switch stays on the home screen, not in Settings.',
      ],
      fr: [
        'Le second parcours s’appelle Spectateur : suivre un seul joueur. Revoir les tutoriels coach et spectateur est centré dans Réglages. Le changement de rôle reste sur l’accueil, plus dans Réglages.',
      ],
    },
  },
  {
    version: '2.4.72',
    items: {
      en: [
        'Tutorial Skip and Next sit in the center on both coach and spectator tours.',
        'The title bar and selected-team strip are the same height on every screen. Team Setup still lets you rename the team below that strip.',
      ],
      fr: [
        'Passer et Suivant du tutoriel sont centrés, pour le tour coach et le tour spectateur.',
        'La barre de titre et le bandeau d’équipe ont la même hauteur sur tous les écrans. En configuration d’équipe, le renommage reste sous ce bandeau.',
      ],
    },
  },
  {
    version: '2.4.71',
    items: {
      en: [
        'Interception is on the first screen when you tap a player. Stats cards, season, and the PDF say Intercept.',
        'Spectator home has two tabs: Home menu and Player stats. The phone stays in portrait. Coach live shows every tile without scrolling; Resume sits beside Start New Game. Labels say player, not kid.',
      ],
      fr: [
        'Interception est sur le premier écran quand vous touchez un joueur. Les cartes de stats, la saison et le PDF disent Interc.',
        'L’accueil spectateur a deux onglets : Menu d’accueil et Stats du joueur. Le téléphone reste en portrait. En direct coach, toutes les tuiles tiennent à l’écran ; Reprendre est à côté de Nouveau match. Les textes disent joueur, pas enfant.',
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
