/**
 * GamePlayScreen.js
 * Encapsulates game play screen rendering and game action tracking
 */

const GamePlayScreen = {
    /**
     * Render the game play screen with player actions and game status
     */
    renderGameplayContent() {
        const containerElement = document.getElementById('game-actions-container');
        if (!containerElement) return;

        containerElement.innerHTML = '';

        if (!appState.currentGame) {
            containerElement.innerHTML = '<div class="empty-state">No active game</div>';
            return;
        }

        const game = appState.currentGame;

        // Render game header with score
        const header = document.createElement('div');
        header.className = 'game-header';
        header.innerHTML = `
            <div class="game-score">
                <span class="team-name">${appState.teamName}</span>
                <span class="score">${game.homeScore} - ${game.awayScore}</span>
                <span class="opponent-name">${game.opponentName}</span>
            </div>
            <div class="game-time">
                <span id="game-time-display">${this._formatGameTime(game.gameTime || 0)}</span>
            </div>
        `;
        containerElement.appendChild(header);

        // Render action log if available
        if (game.actions && game.actions.length > 0) {
            const actionLog = document.createElement('div');
            actionLog.className = 'action-log';
            
            game.actions.slice(-10).reverse().forEach(action => {
                const actionItem = document.createElement('div');
                actionItem.className = 'action-item';
                const player = appState.players.find(p => p.id === action.playerId);
                const playerName = player ? player.name : 'Unknown';
                actionItem.innerHTML = `
                    <span class="action-time">${action.gameMinute}'</span>
                    <span class="action-player">${playerName}</span>
                    <span class="action-type">${formatActionType(action.actionType)}</span>
                `;
                actionLog.appendChild(actionItem);
            });
            
            containerElement.appendChild(actionLog);
        }
    },

    /**
     * Update game timer display
     */
    updateGameTimer() {
        const display = document.getElementById('game-time-display');
        if (display && appState.currentGame) {
            display.textContent = this._formatGameTime(appState.currentGame.gameTime || 0);
        }
    },

    /**
     * Format game time in MM:SS format
     * @private
     * @param {number} seconds - Total seconds elapsed
     * @returns {string} Formatted time string
     */
    _formatGameTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// Expose globally
window.GamePlayScreen = GamePlayScreen;
