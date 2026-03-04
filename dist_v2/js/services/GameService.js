// GameService - Core game state and lifecycle management
window.GameService = {
    
    /**
     * Create a new game object
     */
    createGame(config) {
        const gameId = 'game_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        return {
            id: gameId,
            matchType: config.matchType || '11v11',
            opponentName: config.opponentName || 'Opponent',
            formation: config.formation || [],
            substitutes: config.substitutes || [],
            substitutePlayers: config.substitutePlayers || [],
            unavailablePlayers: config.unavailablePlayers || [],
            activePlayers: config.activePlayers || [],
            homeScore: config.homeScore || 0,
            awayScore: config.awayScore || 0,
            actions: [],
            date: new Date().toISOString(),
            startTime: new Date(),
            isCompleted: false,
            totalGameTime: 0,
            numPeriods: config.numPeriods || 2,
            periodDuration: config.periodDuration || 45,
            gameSummary: ''
        };
    },
    
    /**
     * Initialize a new game from formation data
     */
    initializeGameFromFormation(matchType, opponentName, formation, substitutes, substitutePlayers, unavailablePlayers, numPeriods, periodDuration) {
        const activePlayers = [
            ...formation.map(f => f.playerId),
            ...substitutePlayers
        ].filter(Boolean);
        
        const game = this.createGame({
            matchType,
            opponentName,
            formation: formation.map(f => ({ 
                playerId: f.playerId, 
                x: f.x, 
                y: f.y 
            })),
            substitutes: substitutes.map(p => p.playerId).filter(Boolean),
            substitutePlayers,
            unavailablePlayers,
            activePlayers,
            numPeriods,
            periodDuration
        });
        
        return game;
    },
    
    /**
     * Add action to current game
     */
    addActionToGame(actionType, playerId = null, gameMinute = 0, details = {}) {
        if (!appState.currentGame) {
            return { error: 'No active game' };
        }
        
        const action = {
            actionType,
            playerId,
            gameMinute: Number(gameMinute),
            timestamp: Date.now(),
            ...details
        };
        
        if (!appState.currentGame.actions) {
            appState.currentGame.actions = [];
        }
        
        appState.currentGame.actions.push(action);
        return action;
    },
    
    /**
     * End game and return game summary
     */
    completeGame(gameSummary = '') {
        if (!appState.currentGame) {
            return { error: 'No active game to end' };
        }
        
        appState.currentGame.isCompleted = true;
        appState.currentGame.gameSummary = gameSummary;
        appState.currentGame.totalGameTime = Math.floor((Date.now() - appState.currentGame.startTime) / 1000);
        
        const completedGame = appState.currentGame;
        appState.games.push(completedGame);
        appState.currentGame = null;
        appState.formationTemp = [];
        
        return completedGame;
    },
    
    /**
     * Get current active game
     */
    getCurrentGame() {
        return appState.currentGame;
    },
    
    /**
     * Update game score
     */
    updateScore(homeScore, awayScore) {
        if (!appState.currentGame) {
            return { error: 'No active game' };
        }
        
        appState.currentGame.homeScore = Number(homeScore);
        appState.currentGame.awayScore = Number(awayScore);
        return appState.currentGame;
    },
    
    /**
     * Get all completed games
     */
    getCompletedGames(filterFn = null) {
        const games = appState.games.filter(g => g.isCompleted);
        return filterFn ? games.filter(filterFn) : games;
    },
    
    /**
     * Get game by ID
     */
    getGameById(gameId) {
        return appState.games.find(g => g.id === gameId);
    },
    
    /**
     * Get game count
     */
    getGameCount() {
        return appState.games.filter(g => g.isCompleted).length;
    }
};
