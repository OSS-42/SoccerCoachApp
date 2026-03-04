// PlayerService - Player management business logic
window.PlayerService = {
    
    /**
     * Validate player input
     * @returns {Object} {valid: boolean, error: string|null}
     */
    validatePlayer(name, jerseyNumber, position) {
        if (!name || !jerseyNumber || !position) {
            return { valid: false, error: 'Please fill in all required fields, including position' };
        }
        
        const jersey = Number(jerseyNumber);
        if (isNaN(jersey) || jersey < 0) {
            return { valid: false, error: 'Jersey number must be a valid positive number' };
        }
        
        if (appState.players.some(p => p.jerseyNumber === jersey)) {
            return { valid: false, error: 'A player with this jersey number already exists' };
        }
        
        return { valid: true, error: null };
    },
    
    /**
     * Create a new player object
     */
    createPlayer(name, jerseyNumber, position) {
        let playerId;
        if (appState.settings.reusablePlayerIds && appState.settings.reusablePlayerIds.length > 0) {
            playerId = appState.settings.reusablePlayerIds.shift();
        } else {
            do {
                playerId = Math.floor(Math.random() * 1000000).toString();
            } while (appState.players.some(p => p.id === playerId));
        }
        
        return {
            id: playerId,
            name: name.trim(),
            jerseyNumber: Number(jerseyNumber),
            position,
            stats: {
                goals: 0,
                assists: 0,
                saves: 0,
                goalsAllowed: 0,
                yellowCards: 0,
                redCards: 0
            }
        };
    },
    
    /**
     * Add player to app state
     */
    addPlayerToState(player) {
        appState.players.push(player);
        return player;
    },
    
    /**
     * Remove player from app state
     */
    removePlayerFromState(playerId) {
        const playerIndex = appState.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const player = appState.players[playerIndex];
            
            // Add player ID to reusable IDs pool
            if (!appState.settings.reusablePlayerIds) {
                appState.settings.reusablePlayerIds = [];
            }
            appState.settings.reusablePlayerIds.push(player.id);
            
            // Remove from roster
            appState.players.splice(playerIndex, 1);
            return player;
        }
        return null;
    },
    
    /**
     * Get player by ID
     */
    getPlayerById(playerId) {
        return appState.players.find(p => p.id === playerId);
    },
    
    /**
     * Find player by jersey number
     */
    findPlayerByJerseyNumber(jerseyNumber) {
        return appState.players.find(p => p.jerseyNumber === Number(jerseyNumber));
    },
    
    /**
     * Update player details
     */
    updatePlayer(playerId, updates) {
        const player = this.getPlayerById(playerId);
        if (!player) return null;
        
        // Validate jersey number uniqueness if attempting to change it
        if (updates.jerseyNumber && updates.jerseyNumber !== player.jerseyNumber) {
            if (appState.players.some(p => p.id !== playerId && p.jerseyNumber === Number(updates.jerseyNumber))) {
                return { error: 'A player with this jersey number already exists' };
            }
        }
        
        Object.assign(player, updates);
        return player;
    },
    
    /**
     * Get all players
     */
    getAllPlayers() {
        return appState.players;
    },
    
    /**
     * Get player count
     */
    getPlayerCount() {
        return appState.players.length;
    }
};
