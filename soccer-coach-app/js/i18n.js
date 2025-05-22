// Language translations
const translations = {
    // English translations
    'en': {
        // Main menu
        'appTitle': 'Soccer Coach Tracker',
        'teamSetup': 'Team Setup',
        'startNewGame': 'Start New Game',
        'reports': 'Reports',
        'settings': 'Settings',
        
        // Team setup
        'teamSetupTitle': 'Team Setup',
        'teamName': 'Team Name',
        'players': 'Players',
        'enterTeamName': 'Enter team name',
        'save': 'Save',
        'addPlayer': 'Add Player',
        'firstName': 'First Name:',
        'jerseyNumber': 'Jersey Number:',
        'enterPlayerName': 'Enter player\'s first name',
        'cancel': 'Cancel',
        'add': 'Add',
        'edit': 'Edit',
        'delete': 'Delete',
        'teamNameSaved': 'Team name saved successfully',
        'pleaseEnterTeamName': 'Please enter a team name',
        'fillAllFields': 'Please fill in all required fields',
        'duplicateJersey': 'A player with this jersey number already exists',
        
        // Game setup
        'newGame': 'New Game',
        'opponentTeamName': 'Opponent Team Name:',
        'enterOpponentName': 'Enter opponent team name',
        'gameDate': 'Game Date:',
        'substitutionTimer': 'Substitution Timer (minutes):',
        'startGame': 'Start Game',
        
        // Game tracking
        'gameTime': 'Game Time:',
        'substitution': 'Substitution:',
        'endGame': 'End Game',
        'start': 'Start',
        'pause': 'Pause',
        'reset': 'Reset',
        
        // Player actions
        'recordAction': 'Record Action for',
        'goal': 'Goal',
        'assist': 'Assist',
        'save': 'Save',
        'goalAllowed': 'Goal Allowed',
        
        // Goal/Assist dialogs
        'wasThereAssist': 'Was there an assist?',
        'noAssist': 'No Assist',
        'whoScored': 'Who scored the goal?',
        
        // End game
        'endGameConfirm': 'End Game',
        'endGamePrompt': 'Are you sure you want to end the current game?',
        
        // Reports
        'gameReports': 'Game Reports',
        'noGames': 'No completed games yet',
        'vs': 'vs',
        'viewReport': 'View',
        'exportAs': 'Export as',
        'gameReport': 'Game Report',
        'gameDetails': 'Game Details',
        'date': 'Date:',
        'opponent': 'Opponent:',
        'finalScore': 'Final Score:',
        'playerStats': 'Player Statistics',
        'goals': 'Goals',
        'assists': 'Assists',
        'saves': 'Saves',
        'goalsAllowed': 'Goals Allowed',
        'close': 'Close',
        
        // Settings
        'settingsTitle': 'Settings',
        'language': 'Language',
        'display': 'Display',
        'light': 'Light',
        'dark': 'Dark',
        'defaultTimer': 'Default Timer',
        'defaultTimerSetting': 'Default Substitution Time (minutes):',
        'dataManagement': 'Data Management',
        'exportTeamData': 'Export Team Data',
        'importTeamData': 'Import Team Data',
        'saveSettings': 'Save Settings'
    },
    
    // French translations
    'fr': {
        // Main menu
        'appTitle': 'Suivi d\'Entraîneur de Football',
        'teamSetup': 'Configuration de l\'Équipe',
        'startNewGame': 'Commencer un Nouveau Match',
        'reports': 'Rapports',
        'settings': 'Paramètres',
        
        // Team setup
        'teamSetupTitle': 'Configuration de l\'Équipe',
        'teamName': 'Nom de l\'Équipe',
        'players': 'Joueurs',
        'enterTeamName': 'Entrez le nom de l\'équipe',
        'save': 'Enregistrer',
        'addPlayer': 'Ajouter un Joueur',
        'firstName': 'Prénom:',
        'jerseyNumber': 'Numéro de Maillot:',
        'enterPlayerName': 'Entrez le prénom du joueur',
        'cancel': 'Annuler',
        'add': 'Ajouter',
        'edit': 'Modifier',
        'delete': 'Supprimer',
        'teamNameSaved': 'Nom d\'équipe enregistré avec succès',
        'pleaseEnterTeamName': 'Veuillez entrer un nom d\'équipe',
        'fillAllFields': 'Veuillez remplir tous les champs requis',
        'duplicateJersey': 'Un joueur avec ce numéro de maillot existe déjà',
        
        // Game setup
        'newGame': 'Nouveau Match',
        'opponentTeamName': 'Nom de l\'Équipe Adverse:',
        'enterOpponentName': 'Entrez le nom de l\'équipe adverse',
        'gameDate': 'Date du Match:',
        'substitutionTimer': 'Minuterie de Remplacement (minutes):',
        'startGame': 'Commencer le Match',
        
        // Game tracking
        'gameTime': 'Temps de Jeu:',
        'substitution': 'Remplacement:',
        'endGame': 'Terminer le Match',
        'start': 'Démarrer',
        'pause': 'Pause',
        'reset': 'Réinitialiser',
        
        // Player actions
        'recordAction': 'Enregistrer une Action pour',
        'goal': 'But',
        'assist': 'Passe Décisive',
        'save': 'Arrêt',
        'goalAllowed': 'But Encaissé',
        
        // Goal/Assist dialogs
        'wasThereAssist': 'Y a-t-il eu une passe décisive?',
        'noAssist': 'Pas de Passe Décisive',
        'whoScored': 'Qui a marqué le but?',
        
        // End game
        'endGameConfirm': 'Terminer le Match',
        'endGamePrompt': 'Êtes-vous sûr de vouloir terminer le match en cours?',
        
        // Reports
        'gameReports': 'Rapports de Match',
        'noGames': 'Aucun match terminé pour l\'instant',
        'vs': 'contre',
        'viewReport': 'Voir',
        'exportAs': 'Exporter en',
        'gameReport': 'Rapport de Match',
        'gameDetails': 'Détails du Match',
        'date': 'Date:',
        'opponent': 'Adversaire:',
        'finalScore': 'Score Final:',
        'playerStats': 'Statistiques des Joueurs',
        'goals': 'Buts',
        'assists': 'Passes Décisives',
        'saves': 'Arrêts',
        'goalsAllowed': 'Buts Encaissés',
        'close': 'Fermer',
        
        // Settings
        'settingsTitle': 'Paramètres',
        'language': 'Langue',
        'display': 'Affichage',
        'light': 'Clair',
        'dark': 'Sombre',
        'defaultTimer': 'Minuterie par Défaut',
        'defaultTimerSetting': 'Temps de Remplacement par Défaut (minutes):',
        'dataManagement': 'Gestion des Données',
        'exportTeamData': 'Exporter les Données d\'Équipe',
        'importTeamData': 'Importer les Données d\'Équipe',
        'saveSettings': 'Enregistrer les Paramètres'
    },
    
    // Spanish translations
    'es': {
        // Main menu
        'appTitle': 'Seguimiento de Entrenador de Fútbol',
        'teamSetup': 'Configuración del Equipo',
        'startNewGame': 'Iniciar Nuevo Partido',
        'reports': 'Informes',
        'settings': 'Ajustes',
        
        // Team setup
        'teamSetupTitle': 'Configuración del Equipo',
        'teamName': 'Nombre del Equipo',
        'players': 'Jugadores',
        'enterTeamName': 'Ingrese el nombre del equipo',
        'save': 'Guardar',
        'addPlayer': 'Añadir Jugador',
        'firstName': 'Nombre:',
        'jerseyNumber': 'Número de Camiseta:',
        'enterPlayerName': 'Ingrese el nombre del jugador',
        'cancel': 'Cancelar',
        'add': 'Añadir',
        'edit': 'Editar',
        'delete': 'Eliminar',
        'teamNameSaved': 'Nombre del equipo guardado con éxito',
        'pleaseEnterTeamName': 'Por favor, ingrese un nombre de equipo',
        'fillAllFields': 'Por favor complete todos los campos requeridos',
        'duplicateJersey': 'Ya existe un jugador con este número de camiseta',
        
        // Game setup
        'newGame': 'Nuevo Partido',
        'opponentTeamName': 'Nombre del Equipo Contrario:',
        'enterOpponentName': 'Ingrese el nombre del equipo contrario',
        'gameDate': 'Fecha del Partido:',
        'substitutionTimer': 'Temporizador de Sustitución (minutos):',
        'startGame': 'Iniciar Partido',
        
        // Game tracking
        'gameTime': 'Tiempo de Juego:',
        'substitution': 'Sustitución:',
        'endGame': 'Finalizar Partido',
        'start': 'Iniciar',
        'pause': 'Pausar',
        'reset': 'Reiniciar',
        
        // Player actions
        'recordAction': 'Registrar Acción para',
        'goal': 'Gol',
        'assist': 'Asistencia',
        'save': 'Atajada',
        'goalAllowed': 'Gol Concedido',
        
        // Goal/Assist dialogs
        'wasThereAssist': '¿Hubo una asistencia?',
        'noAssist': 'Sin Asistencia',
        'whoScored': '¿Quién marcó el gol?',
        
        // End game
        'endGameConfirm': 'Finalizar Partido',
        'endGamePrompt': '¿Está seguro de que desea finalizar el partido actual?',
        
        // Reports
        'gameReports': 'Informes de Partidos',
        'noGames': 'Aún no hay partidos completados',
        'vs': 'vs',
        'viewReport': 'Ver',
        'exportAs': 'Exportar como',
        'gameReport': 'Informe del Partido',
        'gameDetails': 'Detalles del Partido',
        'date': 'Fecha:',
        'opponent': 'Oponente:',
        'finalScore': 'Resultado Final:',
        'playerStats': 'Estadísticas de Jugadores',
        'goals': 'Goles',
        'assists': 'Asistencias',
        'saves': 'Atajadas',
        'goalsAllowed': 'Goles Concedidos',
        'close': 'Cerrar',
        
        // Settings
        'settingsTitle': 'Ajustes',
        'language': 'Idioma',
        'display': 'Pantalla',
        'light': 'Claro',
        'dark': 'Oscuro',
        'defaultTimer': 'Temporizador Predeterminado',
        'defaultTimerSetting': 'Tiempo de Sustitución Predeterminado (minutos):',
        'dataManagement': 'Gestión de Datos',
        'exportTeamData': 'Exportar Datos del Equipo',
        'importTeamData': 'Importar Datos del Equipo',
        'saveSettings': 'Guardar Ajustes'
    }
};

// Function to get translation
function translate(key, language) {
    if (!language || !translations[language]) {
        language = 'fr'; // Default to French if language not found
    }
    
    if (translations[language][key]) {
        return translations[language][key];
    }
    
    // Fallback to French if translation not found
    return translations['fr'][key] || key;
}

// Export the translate function
window.translate = translate;