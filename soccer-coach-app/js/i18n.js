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
        'saveSettings': 'Save Settings',
        'settingsSaved': 'Settings saved successfully'
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
        'saveSettings': 'Enregistrer les Paramètres',
        'settingsSaved': 'Paramètres enregistrés avec succès'
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