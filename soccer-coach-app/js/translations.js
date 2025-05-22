// A simpler, more direct approach to translations

// English translations
const EN = {
    // Main menu
    appTitle: 'Soccer Coach Tracker',
    teamSetup: 'Team Management',
    startNewGame: 'Start New Game',
    reports: 'Reports',
    settings: 'Settings',
    
    // Team setup
    teamSetupTitle: 'Team Management',
    teamName: 'Team Name',
    players: 'Players',
    enterTeamName: 'Enter team name',
    save: 'Save',
    addPlayer: 'Add Player',
    firstName: 'First Name:',
    jerseyNumber: 'Jersey Number:',
    enterPlayerName: 'Enter player\'s first name',
    cancel: 'Cancel',
    add: 'Add',
    edit: 'Edit',
    editPlayer: 'Edit Player',
    delete: 'Delete',
    teamNameSaved: 'Team name saved successfully',
    pleaseEnterTeamName: 'Please enter a team name',
    fillAllFields: 'Please fill in all required fields',
    duplicateJersey: 'A player with this jersey number already exists',
    
    // Game setup
    newGame: 'New Game',
    opponentTeamName: 'Opponent Team Name:',
    enterOpponentName: 'Enter opponent team name',
    gameDate: 'Game Date:',
    substitutionTimer: 'Substitution Timer (minutes):',
    startGame: 'Start Game',
    
    // Game tracking
    gameTime: 'Game Time:',
    substitution: 'Next Sub:',
    endGame: 'End Game',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    
    // Player actions
    recordAction: 'Record Action for',
    goal: 'Goal',
    assist: 'Assist',
    save: 'Save',
    block: 'Save', // For the blocking action during the game
    saveChanges: 'Save', // For saving changes in forms
    goalAllowed: 'Goal Allowed',
    
    // Goal/Assist dialogs
    wasThereAssist: 'Was there an assist?',
    noAssist: 'No Assist',
    whoScored: 'Who scored the goal?',
    
    // End game
    endGameConfirm: 'End Game',
    endGamePrompt: 'Are you sure you want to end the current game?',
    
    // Reports
    gameReports: 'Game Reports',
    noGames: 'No completed games yet',
    vs: 'vs',
    viewReport: 'View',
    exportAs: 'Export as',
    gameReport: 'Game Report',
    gameDetails: 'Game Details',
    date: 'Date:',
    teams: 'Teams:',
    opponent: 'Opponent:',
    finalScore: 'Final Score:',
    duration: 'Duration:',
    playerStats: 'Player Statistics',
    goals: 'Goals',
    assists: 'Assists',
    saves: 'Saves',
    goalsAllowed: 'Goals Allowed',
    close: 'Close',
    
    // Settings
    settingsTitle: 'Settings',
    language: 'Language',
    display: 'Display',
    light: 'Light',
    dark: 'Dark',
    defaultTimer: 'Default Timer',
    defaultTimerSetting: 'Default Substitution Time (minutes):',
    dataManagement: 'Data Management',
    exportTeamData: 'Export Team Data',
    importTeamData: 'Import Team Data',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully'
};

// French translations
const FR = {
    // Main menu
    appTitle: 'Soccer Coach Tracker',
    teamSetup: 'Gestion de l\'Équipe',
    startNewGame: 'Commencer un Nouveau Match',
    reports: 'Rapports',
    settings: 'Paramètres',
    
    // Team setup
    teamSetupTitle: 'Gestion de l\'Équipe',
    teamName: 'Nom de l\'Équipe',
    players: 'Joueurs',
    enterTeamName: 'Entrez le nom de l\'équipe',
    save: 'Enregistrer',
    addPlayer: 'Ajouter un Joueur',
    firstName: 'Prénom:',
    jerseyNumber: 'Numéro de Maillot:',
    enterPlayerName: 'Entrez le prénom du joueur',
    cancel: 'Annuler',
    add: 'Ajouter',
    edit: 'Modifier',
    editPlayer: 'Modifier le Joueur',
    delete: 'Supprimer',
    teamNameSaved: 'Nom d\'équipe enregistré avec succès',
    pleaseEnterTeamName: 'Veuillez entrer un nom d\'équipe',
    fillAllFields: 'Veuillez remplir tous les champs requis',
    duplicateJersey: 'Un joueur avec ce numéro de maillot existe déjà',
    
    // Game setup
    newGame: 'Nouveau Match',
    opponentTeamName: 'Nom de l\'Équipe Adverse:',
    enterOpponentName: 'Entrez le nom de l\'équipe adverse',
    gameDate: 'Date du Match:',
    substitutionTimer: 'Décompte pour les changements (minutes):',
    startGame: 'Commencer le Match',
    
    // Game tracking
    gameTime: 'Temps de Jeu:',
    substitution: 'Prochain changement:',
    endGame: 'Terminer le Match',
    start: 'Démarrer',
    pause: 'Pause',
    reset: 'Réinitialiser',
    
    // Player actions
    recordAction: 'Enregistrer une Action pour',
    goal: 'But',
    assist: 'Passe Décisive',
    save: 'Enregistrer',
    block: 'Arrêt',  // For the blocking action during the game (renamed from save)
    saveChanges: 'Enregistrer', // For saving changes in forms
    goalAllowed: 'But Encaissé',
    
    // Goal/Assist dialogs
    wasThereAssist: 'Y a-t-il eu une passe décisive?',
    noAssist: 'Pas de Passe Décisive',
    whoScored: 'Qui a marqué le but?',
    
    // End game
    endGameConfirm: 'Terminer le Match',
    endGamePrompt: 'Êtes-vous sûr de vouloir terminer le match en cours?',
    
    // Reports
    gameReports: 'Rapports de Match',
    noGames: 'Aucun match terminé pour l\'instant',
    vs: 'contre',
    viewReport: 'Voir',
    exportAs: 'Exporter en',
    gameReport: 'Rapport de Match',
    gameDetails: 'Détails du Match',
    date: 'Date:',
    teams: 'Équipes:',
    opponent: 'Adversaire:',
    finalScore: 'Score Final:',
    duration: 'Durée:',
    playerStats: 'Statistiques des Joueurs',
    goals: 'Buts',
    assists: 'Passes Décisives',
    saves: 'Arrêts',
    goalsAllowed: 'Buts Encaissés',
    close: 'Fermer',
    
    // Settings
    settingsTitle: 'Paramètres',
    language: 'Langue',
    display: 'Affichage',
    light: 'Clair',
    dark: 'Sombre',
    defaultTimer: 'Minuterie par Défaut',
    defaultTimerSetting: 'Temps de Remplacement par Défaut (minutes):',
    dataManagement: 'Gestion des Données',
    exportTeamData: 'Exporter les Données d\'Équipe',
    importTeamData: 'Importer les Données d\'Équipe',
    saveSettings: 'Enregistrer les Paramètres',
    settingsSaved: 'Paramètres enregistrés avec succès'
};

// Direct translation function using a global currentLanguage variable
let currentLanguage = 'fr'; // Default to French

function t(key) {
    const translations = currentLanguage === 'en' ? EN : FR;
    return translations[key] || key;
}

// Function to switch language
function setLanguage(lang) {
    if (lang === 'en' || lang === 'fr') {
        currentLanguage = lang;
        
        // Only apply translations if DOM is ready
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            applyTranslations();
        }
    }
}

// Function to get current language
function getLanguage() {
    return currentLanguage;
}

// Apply translations to the entire UI
function applyTranslations() {
    // Main menu
    document.querySelectorAll('.app-header h1').forEach(el => {
        // Only change app title on main screen to avoid changing all headers
        if (el.closest('#main-screen')) {
            el.textContent = t('appTitle');
        }
    });
    
    // Menu buttons
    const menuBtns = {
        'team-setup': { icon: 'people', key: 'teamSetup' },
        'game-setup': { icon: 'sports_soccer', key: 'startNewGame' },
        'reports': { icon: 'assessment', key: 'reports' },
        'settings': { icon: 'settings', key: 'settings' }
    };
    
    for (const [screen, data] of Object.entries(menuBtns)) {
        const btn = document.querySelector(`button[onclick="showScreen('${screen}')"]`);
        if (btn) {
            btn.innerHTML = `<span class="material-icons">${data.icon}</span>${t(data.key)}`;
        }
    }
    
    // Screen headers
    const screens = {
        'team-setup': 'teamSetupTitle',
        'game-setup': 'newGame',
        'reports': 'gameReports',
        'settings': 'settingsTitle'
    };
    
    for (const [screen, key] of Object.entries(screens)) {
        const header = document.querySelector(`#${screen} .app-header h1`);
        if (header) {
            header.textContent = t(key);
        }
    }
    
    // Team setup screen
    document.querySelector('.team-name-section h2')?.textContent = t('teamName');
    document.querySelector('#team-name-input')?.setAttribute('placeholder', t('enterTeamName'));
    document.querySelector('.team-name-edit button')?.textContent = t('save');
    const playersHeading = document.querySelector('#team-setup h2:nth-of-type(2)');
    if (playersHeading) {
        playersHeading.textContent = t('players');
    }
    
    // Player dialogs
    document.querySelector('#add-player-dialog h2')?.textContent = t('addPlayer');
    document.querySelector('label[for="player-name"]')?.textContent = t('firstName');
    document.querySelector('#player-name')?.setAttribute('placeholder', t('enterPlayerName'));
    document.querySelector('label[for="jersey-number"]')?.textContent = t('jerseyNumber');
    
    // Dialog buttons
    document.querySelectorAll('#add-player-dialog .dialog-buttons button').forEach((btn, i) => {
        btn.textContent = i === 0 ? t('cancel') : t('add');
    });
    
    // Edit player dialog
    document.querySelector('#edit-player-dialog h2')?.textContent = t('editPlayer');
    document.querySelectorAll('#edit-player-dialog .dialog-buttons button').forEach((btn, i) => {
        btn.textContent = i === 0 ? t('cancel') : t('save');
    });
    
    // Game setup
    document.querySelector('label[for="opponent-name"]')?.textContent = t('opponentTeamName');
    document.querySelector('#opponent-name')?.setAttribute('placeholder', t('enterOpponentName'));
    document.querySelector('label[for="game-date"]')?.textContent = t('gameDate');
    document.querySelector('label[for="substitution-time"]')?.textContent = t('substitutionTimer');
    document.querySelector('button[onclick="startGame()"]')?.textContent = t('startGame');
    
    // Game tracking
    const gameTimeEl = document.getElementById('game-time');
    if (gameTimeEl) {
        let timeValue = '00:00';
        // Extract the time value if it exists
        const parts = gameTimeEl.textContent.split(':');
        if (parts.length > 1) {
            timeValue = parts.slice(1).join(':').trim();
        }
        gameTimeEl.textContent = `${t('gameTime')} ${timeValue}`;
    }
    
    const subTimeEl = document.getElementById('sub-time');
    if (subTimeEl) {
        let timeValue = '06:00';
        // Extract the time value if it exists
        const parts = subTimeEl.textContent.split(':');
        if (parts.length > 1) {
            timeValue = parts.slice(1).join(':').trim();
        }
        subTimeEl.textContent = `${t('substitution')} ${timeValue}`;
    }
    
    // Timer buttons
    document.querySelector('.timer-controls button:nth-child(1)')?.textContent = t('start');
    document.querySelector('.timer-controls button:nth-child(2)')?.textContent = t('pause');
    document.querySelector('.timer-controls button:nth-child(3)')?.textContent = t('reset');
    document.querySelector('.end-game-btn')?.textContent = t('endGame');
    
    // Player action buttons
    const actionButtons = [
        { selector: 'button[onclick="handleGoalAction()"]', icon: 'sports_score', key: 'goal' },
        { selector: 'button[onclick="handleAssistAction()"]', icon: 'front_hand', key: 'assist' },
        { selector: 'button[onclick="recordAction(\'save\')"]', icon: 'back_hand', key: 'block' },
        { selector: 'button[onclick="recordAction(\'goal_allowed\')"]', icon: 'sports_soccer', key: 'goalAllowed' }
    ];
    
    actionButtons.forEach(action => {
        const btn = document.querySelector(action.selector);
        if (btn) {
            btn.innerHTML = `<span class="material-icons">${action.icon}</span>${t(action.key)}`;
        }
    });
    
    // Player action dialog
    const actionDialogTitle = document.querySelector('#player-action-dialog h2');
    if (actionDialogTitle) {
        const playerName = document.getElementById('action-player-name')?.textContent || '';
        actionDialogTitle.textContent = `${t('recordAction')} ${playerName}`;
    }
    
    // Goal/Assist dialogs
    document.querySelector('#assist-selection-dialog h2')?.textContent = t('wasThereAssist');
    document.querySelector('.no-assist-btn span:last-child')?.textContent = t('noAssist');
    document.querySelector('#assist-selection-dialog .dialog-buttons button')?.textContent = t('cancel');
    document.querySelector('#scorer-selection-dialog h2')?.textContent = t('whoScored');
    document.querySelector('#scorer-selection-dialog .dialog-buttons button')?.textContent = t('cancel');
    
    // End game dialog
    document.querySelector('#end-game-dialog h2')?.textContent = t('endGameConfirm');
    document.querySelector('#end-game-dialog p')?.textContent = t('endGamePrompt');
    document.querySelectorAll('#end-game-dialog .dialog-buttons button').forEach((btn, i) => {
        btn.textContent = i === 0 ? t('cancel') : t('endGameConfirm');
    });
    
    // Reports screen
    document.querySelector('#reports-list .empty-state')?.textContent = t('noGames');
    
    // Settings screen
    document.querySelector('#settings .settings-group:nth-of-type(1) h2')?.textContent = t('language');
    document.querySelector('#settings .settings-group:nth-of-type(2) h2')?.textContent = t('display');
    document.querySelector('.toggle-container span:first-child')?.textContent = t('light');
    document.querySelector('.toggle-container span:last-child')?.textContent = t('dark');
    document.querySelector('#settings .settings-group:nth-of-type(3) h2')?.textContent = t('defaultTimer');
    document.querySelector('label[for="default-timer"]')?.textContent = t('defaultTimerSetting');
    document.querySelector('#settings .settings-group:nth-of-type(4) h2')?.textContent = t('dataManagement');
    
    const dataButtons = [
        { selector: 'button[onclick="exportTeamData()"]', icon: 'file_download', key: 'exportTeamData' },
        { selector: 'button[onclick="importTeamData()"]', icon: 'file_upload', key: 'importTeamData' }
    ];
    
    dataButtons.forEach(button => {
        const btn = document.querySelector(button.selector);
        if (btn) {
            btn.innerHTML = `<span class="material-icons">${button.icon}</span>${t(button.key)}`;
        }
    });
    
    document.querySelector('button[onclick="saveSettings()"]')?.textContent = t('saveSettings');
}

// Export functions
window.t = t;
window.setLanguage = setLanguage;
window.getLanguage = getLanguage;
window.applyTranslations = applyTranslations;