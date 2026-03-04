// ActionService - Game action recording and management
window.ActionService = {
    
    /**
     * Define valid action types
     */
    VALID_ACTIONS: [
        'goal',
        'assist',
        'save',
        'goal_allowed',
        'shot_on_goal',
        'yellow_card',
        'red_card',
        'fault',
        'blocked_shot',
        'late_to_game',
        'own_goal',
        'note'
    ],
    
    /**
     * Validate action type
     */
    isValidAction(actionType) {
        return this.VALID_ACTIONS.includes(actionType);
    },
    
    /**
     * Record an action in current game
     */
    recordAction(actionType, playerId = null, gameMinute = 0, additionalData = {}) {
        // Validation
        if (!this.isValidAction(actionType)) {
            return { error: `Invalid action type: ${actionType}` };
        }
        
        if (!appState.currentGame) {
            return { error: 'No active game' };
        }
        
        if (playerId && !PlayerService.getPlayerById(playerId)) {
            return { error: `Player not found: ${playerId}` };
        }
        
        // Create action record
        const action = {
            actionType,
            playerId,
            gameMinute: Number(gameMinute),
            timestamp: Date.now(),
            ...additionalData
        };
        
        // Add to game
        if (!appState.currentGame.actions) {
            appState.currentGame.actions = [];
        }
        appState.currentGame.actions.push(action);
        
        return action;
    },
    
    /**
     * Get actions for current game
     */
    getActionsForGame(gameId = null) {
        const game = gameId ? GameService.getGameById(gameId) : appState.currentGame;
        return game ? (game.actions || []) : [];
    },
    
    /**
     * Get actions by type
     */
    getActionsByType(actionType, gameId = null) {
        const actions = this.getActionsForGame(gameId);
        return actions.filter(a => a.actionType === actionType);
    },
    
    /**
     * Get actions for a specific player
     */
    getActionsForPlayer(playerId, gameId = null) {
        const actions = this.getActionsForGame(gameId);
        return actions.filter(a => a.playerId === playerId);
    },
    
    /**
     * Remove an action from the current game
     */
    removeAction(actionIndex) {
        if (!appState.currentGame || !appState.currentGame.actions) {
            return { error: 'No active game or actions' };
        }
        
        if (actionIndex < 0 || actionIndex >= appState.currentGame.actions.length) {
            return { error: 'Action index out of range' };
        }
        
        const removed = appState.currentGame.actions.splice(actionIndex, 1);
        return removed[0];
    },
    
    /**
     * Update an action
     */
    updateAction(actionIndex, updates) {
        if (!appState.currentGame || !appState.currentGame.actions) {
            return { error: 'No active game or actions' };
        }
        
        if (actionIndex < 0 || actionIndex >= appState.currentGame.actions.length) {
            return { error: 'Action index out of range' };
        }
        
        const action = appState.currentGame.actions[actionIndex];
        Object.assign(action, updates);
        return action;
    },
    
    /**
     * Get action count by type
     */
    getActionCount(actionType, gameId = null) {
        return this.getActionsByType(actionType, gameId).length;
    },
    
    /**
     * Get last N actions
     */
    getLastActions(count = 10, gameId = null) {
        const actions = this.getActionsForGame(gameId);
        return actions.slice(Math.max(0, actions.length - count));
    }
};
