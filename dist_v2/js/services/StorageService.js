/**
 * StorageService - IndexedDB persistence layer with async/await
 * Version: 1.9.80
 * Modernized from callback-based to async/await patterns
 */

// Safe wrapper for error logging - showMessage may not be defined at service init time
window._StorageErrorLog = function(msg) {
    if (typeof showMessage === 'function') {
        showMessage(msg, 'error');
    } else {
        console.error('[StorageService]', msg);
    }
};

window.StorageService = {
    db: null,
    
    /**
     * Helper: Convert IndexedDB request to Promise
     * @param {IDBRequest} request - The IndexedDB request to wrap
     * @returns {Promise} Resolves with request.result or rejects on error
     */
    _requestToPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Helper: Wait for transaction to complete
     * @param {IDBTransaction} transaction - The transaction to monitor
     * @returns {Promise} Resolves when transaction completes
     */
    _transactionToPromise(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    /**
     * Initialize IndexedDB database asynchronously
     * @returns {Promise<IDBDatabase>} Resolves with database instance
     */
    async initDB() {
        try {
            const request = indexedDB.open('SoccerCoachDB', 2);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('team')) 
                    db.createObjectStore('team', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('players')) 
                    db.createObjectStore('players', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('games')) 
                    db.createObjectStore('games', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('settings')) 
                    db.createObjectStore('settings', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('tempState')) 
                    db.createObjectStore('tempState', { keyPath: 'id' });
            };

            this.db = await this._requestToPromise(request);
            return this.db;
        } catch (error) {
            _StorageErrorLog('Failed to initialize database');
            throw error;
        }
    },

    /**
     * Save application state to IndexedDB asynchronously
     * @returns {Promise} Resolves when save completes
     */
    async save() {
        try {
            if (!this.db) {
                _StorageErrorLog('Database not initialized');
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
                _StorageErrorLog('Invalid data format for saving');
                return;
            }

            // Save team
            teamStore.put({ id: 'team', teamName: appState.teamName });

            // Clear and save players
            await this._requestToPromise(playersStore.clear());
            appState.players.forEach(player => {
                if (player.id && player.name && player.jerseyNumber !== undefined) {
                    playersStore.put(player);
                }
            });

            // Clear and save games
            await this._requestToPromise(gamesStore.clear());
            appState.games.forEach(game => {
                if (game.id) {
                    gamesStore.put(game);
                }
            });

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

            // Wait for transaction to complete
            await this._transactionToPromise(transaction);
        } catch (error) {
            _StorageErrorLog('Failed to save data: ' + (error?.message || 'Unknown error'));
            throw error;
        }
    },

    /**
     * Load application state from IndexedDB asynchronously
     * @returns {Promise} Resolves when load completes
     */
    async load() {
        try {
            if (!window.indexedDB) {
                this._setDefaults();
                updateTeamNameUI();
                renderPlayersList();
                updatePlayerCounter();
                updateGameReportCounter();
                _StorageErrorLog('IndexedDB not supported, using defaults');
                return;
            }

            await this.initDB();

            const transaction = this.db.transaction(['team', 'players', 'games', 'settings', 'tempState'], 'readonly');
            const teamStore = transaction.objectStore('team');
            const playersStore = transaction.objectStore('players');
            const gamesStore = transaction.objectStore('games');
            const settingsStore = transaction.objectStore('settings');
            const tempStateStore = transaction.objectStore('tempState');

            // Load all data in parallel using Promise.all
            const [teamData, playersData, gamesData, settingsData, tempStateData] = await Promise.all([
                this._requestToPromise(teamStore.get('team')),
                this._requestToPromise(playersStore.getAll()),
                this._requestToPromise(gamesStore.getAll()),
                this._requestToPromise(settingsStore.get('settings')),
                this._requestToPromise(tempStateStore.get('tempState'))
            ]);

            // Apply loaded data to appState
            appState.teamName = teamData?.teamName || "My Team";
            appState.players = playersData || [];
            appState.games = gamesData || [];
            appState.settings = settingsData || this._getDefaultSettings();
            appState.formationTemp = tempStateData?.formationTemp || [];
            appState.currentGame = tempStateData?.currentGame || null;

            // Update UI
            updateTeamNameUI();
            renderPlayersList();
            updatePlayerCounter();
            updateGameReportCounter();
            initializeStyling();

            // Sync global db for backward compatibility
            window.db = this.db;

        } catch (error) {
            _StorageErrorLog('Failed to load data: ' + (error?.message || 'Unknown error'));
            this._setDefaults();
            updateTeamNameUI();
            renderPlayersList();
            updatePlayerCounter();
            updateGameReportCounter();
            
            // Sync global db even on error
            if (this.db) window.db = this.db;
        }
    },

    /**
     * Reset application state to defaults
     * @private
     */
    _setDefaults() {
        appState.teamName = "My Team";
        appState.players = [];
        appState.games = [];
        appState.formationTemp = [];
        appState.currentGame = null;
        appState.settings = this._getDefaultSettings();
    },

    /**
     * Get default settings object
     * @private
     * @returns {Object} Default settings
     */
    _getDefaultSettings() {
        return {
            language: 'en',
            defaultSubstitutionTime: null,
            isSubstitutionDefaultChecked: false,
            reusablePlayerIds: []
        };
    }
};

// appState is now guaranteed to be loaded before this script via StateInit.js
