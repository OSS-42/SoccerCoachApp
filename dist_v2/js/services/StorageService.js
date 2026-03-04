// StorageService - IndexedDB persistence layer
window.StorageService = {
    db: null,
    
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SoccerCoachDB', 2);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                // Create object stores
                if (!this.db.objectStoreNames.contains('team')) 
                    this.db.createObjectStore('team', { keyPath: 'id' });
                if (!this.db.objectStoreNames.contains('players')) 
                    this.db.createObjectStore('players', { keyPath: 'id' });
                if (!this.db.objectStoreNames.contains('games')) 
                    this.db.createObjectStore('games', { keyPath: 'id' });
                if (!this.db.objectStoreNames.contains('settings')) 
                    this.db.createObjectStore('settings', { keyPath: 'id' });
                if (!this.db.objectStoreNames.contains('tempState')) 
                    this.db.createObjectStore('tempState', { keyPath: 'id' });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                showMessage('Failed to initialize database', 'error');
                reject(event.target.error);
            };
        });
    },
    
    save() {
        if (!this.db) {
            showMessage('Database not initialized', 'error');
            return;
        }

        const transaction = this.db.transaction(['team', 'players', 'games', 'settings', 'tempState'], 'readwrite');
        const teamStore = transaction.objectStore('team');
        const playersStore = transaction.objectStore('players');
        const gamesStore = transaction.objectStore('games');
        const settingsStore = transaction.objectStore('settings');
        const tempStateStore = transaction.objectStore('tempState');

        // Validate data
        if (!appState.teamName || !Array.isArray(appState.players) || !Array.isArray(appState.games) || !appState.settings) {
            showMessage('Invalid data format for saving', 'error');
            return;
        }

        // Save team
        teamStore.put({ id: 'team', teamName: appState.teamName });

        // Clear and save players
        const clearPlayersRequest = playersStore.clear();
        clearPlayersRequest.onsuccess = () => {
            appState.players.forEach(player => {
                if (player.id && player.name && player.jerseyNumber !== undefined) {
                    playersStore.put(player);
                }
            });
        };

        // Clear and save games
        const clearGamesRequest = gamesStore.clear();
        clearGamesRequest.onsuccess = () => {
            appState.games.forEach(game => {
                if (game.id) {
                    gamesStore.put(game);
                }
            });
        };
        clearGamesRequest.onerror = (event) => {};

        // Save settings
        settingsStore.put({ id: 'settings', ...appState.settings });

        // Save temporary state (formation setup and current game)
        if (appState.formationTemp || appState.currentGame) {
            tempStateStore.put({
                id: 'tempState',
                formationTemp: appState.formationTemp || [],
                currentGame: appState.currentGame || null
            });
        }

        transaction.oncomplete = () => {};
        transaction.onerror = (event) => {
            showMessage('Failed to save data', 'error');
        };
    },
    
    load() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                appState.teamName = "My Team";
                appState.players = [];
                appState.games = [];
                appState.formationTemp = [];
                appState.currentGame = null;
                appState.settings = {
                    language: 'en',
                    defaultSubstitutionTime: null,
                    isSubstitutionDefaultChecked: false,
                    reusablePlayerIds: []
                };
                updateTeamNameUI();
                renderPlayersList();
                updatePlayerCounter();
                updateGameReportCounter();
                showMessage('IndexedDB not supported, using defaults', 'error');
                resolve();
                return;
            }

            this.initDB().then(() => {
                const transaction = this.db.transaction(['team', 'players', 'games', 'settings', 'tempState'], 'readonly');
                const teamStore = transaction.objectStore('team');
                const playersStore = transaction.objectStore('players');
                const gamesStore = transaction.objectStore('games');
                const settingsStore = transaction.objectStore('settings');
                const tempStateStore = transaction.objectStore('tempState');

                // Load team
                teamStore.get('team').onsuccess = (event) => {
                    const team = event.target.result;
                    appState.teamName = team ? team.teamName : "My Team";
                    updateTeamNameUI();
                };

                // Load players
                playersStore.getAll().onsuccess = (event) => {
                    appState.players = event.target.result || [];
                    updatePlayerCounter();
                };

                // Load games
                gamesStore.getAll().onsuccess = (event) => {
                    appState.games = event.target.result || [];
                    updateGameReportCounter();
                };

                // Load settings
                settingsStore.get('settings').onsuccess = (event) => {
                    const settings = event.target.result || {
                        language: 'en',
                        defaultSubstitutionTime: null,
                        isSubstitutionDefaultChecked: false,
                        reusablePlayerIds: []
                    };
                    appState.settings = settings;
                    initializeStyling();
                };

                // Load temporary state (formation setup and current game)
                tempStateStore.get('tempState').onsuccess = (event) => {
                    const tempState = event.target.result;
                    if (tempState) {
                        appState.formationTemp = tempState.formationTemp || [];
                        appState.currentGame = tempState.currentGame || null;
                    }
                };

                transaction.oncomplete = () => {
                    renderPlayersList();
                    resolve();
                };

                transaction.onerror = () => {
                    appState.teamName = "My Team";
                    appState.players = [];
                    appState.games = [];
                    appState.settings = {
                        language: 'en',
                        defaultSubstitutionTime: null,
                        isSubstitutionDefaultChecked: false,
                        reusablePlayerIds: []
                    };
                    appState.formationTemp = [];
                    appState.currentGame = null;
                    updateTeamNameUI();
                    renderPlayersList();
                    updatePlayerCounter();
                    updateGameReportCounter();
                    showMessage('Failed to load data, using defaults', 'error');
                    resolve();
                };
            }).catch((error) => {
                appState.teamName = "My Team";
                appState.players = [];
                appState.games = [];
                appState.settings = {
                    language: 'en',
                    defaultSubstitutionTime: null,
                    isSubstitutionDefaultChecked: false,
                    reusablePlayerIds: []
                };
                appState.formationTemp = [];
                appState.currentGame = null;
                updateTeamNameUI();
                renderPlayersList();
                updatePlayerCounter();
                updateGameReportCounter();
                showMessage('Database initialization failed, using defaults', 'error');
                resolve();
            });
        });
    }
};

// Maintain global db reference for backward compatibility in app.js
let db = null;
Object.defineProperty(window, 'dbProxy', {
    get: function() { return StorageService.db; },
    set: function(val) { StorageService.db = val; }
});
