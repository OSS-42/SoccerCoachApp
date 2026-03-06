/**
 * StatisticsService.js
 * Handles all player statistics calculations, date filtering, and statistics rendering
 * Version: 1.9.81
 */

const StatisticsService = {
    /**
     * Calculate player statistics for a given date range
     * @param {string} startDate - Optional start date (YYYY-MM-DD format)
     * @param {string} endDate - Optional end date (YYYY-MM-DD format)
     * @returns {Object} Player statistics indexed by player ID
     */
    calculatePlayerStatistics(startDate = null, endDate = null) {
        const playerStats = {};
        
        // Initialize stats for all players in current team
        const teamPlayers = window.getTeamPlayers ? window.getTeamPlayers() : [];
        teamPlayers.forEach(player => {
            playerStats[player.id] = {
                name: player.name,
                jerseyNumber: player.jerseyNumber,
                gamesPlayed: 0,
                missedGames: 0,
                lateToGame: 0,
                goals: 0,
                assists: 0,
                saves: 0,
                goalsAllowed: 0,
                passes: 0,
                shots: 0,
                blocks: 0,
                fouls: 0,
                yellowCards: 0,
                redCards: 0,
                ownGoals: 0
            };
        });
        
        // Sum up stats from all completed games in current team
        const teamGames = window.getTeamGames ? window.getTeamGames() : [];
        let completedGames = teamGames.filter(game => game.isCompleted);
        
        // Apply date filtering if provided
        if (startDate || endDate) {
            completedGames = completedGames.filter(game => {
                if (!game.date) return false;
                const gameDate = new Date(game.date);
                
                if (startDate && gameDate < new Date(startDate)) return false;
                if (endDate && gameDate > new Date(endDate)) return false;
                
                return true;
            });
        }
        
        if (completedGames && completedGames.length > 0) {
            completedGames.forEach((game, index) => {
                if (game.actions && game.actions.length > 0) {
                    // Track which players played in this game
                    const playersInGame = new Set();
                    
                    game.actions.forEach(action => {
                        if (action.playerId && playerStats[action.playerId]) {
                            playersInGame.add(action.playerId);
                            
                            switch (action.actionType) {
                                case 'goal':
                                    playerStats[action.playerId].goals++;
                                    break;
                                case 'assist':
                                    playerStats[action.playerId].assists++;
                                    break;
                                case 'save':
                                    playerStats[action.playerId].saves++;
                                    break;
                                case 'goal_allowed':
                                    playerStats[action.playerId].goalsAllowed++;
                                    break;
                                case 'pass':
                                    playerStats[action.playerId].passes++;
                                    break;
                                case 'shot':
                                    playerStats[action.playerId].shots++;
                                    break;
                                case 'blocked_shot':
                                    playerStats[action.playerId].blocks++;
                                    break;
                                case 'foul':
                                    playerStats[action.playerId].fouls++;
                                    break;
                                case 'yellow_card':
                                    playerStats[action.playerId].yellowCards++;
                                    break;
                                case 'red_card':
                                    playerStats[action.playerId].redCards++;
                                    break;
                                case 'own_goal':
                                    if (action.playerId) {
                                        playerStats[action.playerId].ownGoals++;
                                    }
                                    break;
                            }
                        }
                    });
                    
                    // Update games played count based on formation data
                    // Players are considered to have played if they were in starting formation or subs
                    if (game.formation && game.formation.length > 0) {
                        game.formation.forEach(player => {
                            if (player.playerId && playerStats[player.playerId]) {
                                playersInGame.add(player.playerId);
                            }
                        });
                    }
                    
                    // Also include substitute players
                    if (game.substitutePlayers && game.substitutePlayers.length > 0) {
                        game.substitutePlayers.forEach(playerId => {
                            if (playerStats[playerId]) {
                                playersInGame.add(playerId);
                            }
                        });
                    }
                    
                    // Count missed games for unavailable players
                    if (game.unavailablePlayers && game.unavailablePlayers.length > 0) {
                        game.unavailablePlayers.forEach(playerId => {
                            if (playerStats[playerId]) {
                                playerStats[playerId].missedGames++;
                            }
                        });
                    }
                    
                    // Count late to game actions (only when explicitly marked)
                    if (game.actions && game.actions.length > 0) {
                        const lateActions = game.actions.filter(action => action.actionType === 'late_to_game');
                        lateActions.forEach(action => {
                            if (action.playerId && playerStats[action.playerId]) {
                                playerStats[action.playerId].lateToGame++;
                            }
                        });
                    }
                    
                    // Update games played count
                    playersInGame.forEach(playerId => {
                        if (playerStats[playerId]) {
                            playerStats[playerId].gamesPlayed++;
                        }
                    });
                }
            });
        }
        
        return playerStats;
    },

    /**
     * Clear date filter and re-render statistics
     */
    clearDateFilter() {
        document.getElementById('stats-start-date').value = '';
        document.getElementById('stats-end-date').value = '';
        this.renderPlayerStatistics();
    },

    /**
     * Update statistics period info display and reports counter
     * @param {string} startDate - Optional start date (YYYY-MM-DD format)
     * @param {string} endDate - Optional end date (YYYY-MM-DD format)
     * @param {Array} filteredGames - Array of games to count
     */
    updateStatsPeriodInfo(startDate, endDate, filteredGames) {
        const periodInfoElement = document.getElementById('stats-period-info');
        const reportsCounterElement = document.getElementById('stats-reports-counter');
        const controlsRow2 = document.querySelector('.stats-controls-row-2');
        
        if (!periodInfoElement || !reportsCounterElement) return;
        
        // Update period description
        let periodText;
        if (startDate || endDate) {
            periodText = 'Games from ';
            if (startDate && endDate) {
                periodText += `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
            } else if (startDate) {
                periodText += `${new Date(startDate).toLocaleDateString()} onwards`;
            } else if (endDate) {
                periodText += `start to ${new Date(endDate).toLocaleDateString()}`;
            }
        } else {
            periodText = 'All completed games';
        }
        
        periodInfoElement.textContent = periodText;
        
        // Set data attribute for mobile pseudo-element
        if (controlsRow2) {
            controlsRow2.setAttribute('data-period-info', periodText);
        }
        
        // Count all completed games (they all have reports)
        const totalGames = filteredGames.length;
        const gamesWithReports = totalGames; // All completed games have reports
        
        // Update reports counter
        if (totalGames === 0) {
            reportsCounterElement.innerHTML = '';
        } else if (gamesWithReports === totalGames) {
            reportsCounterElement.innerHTML = `
                <span>Reports:</span>
                <span class="reports-counter-badge">${gamesWithReports}/${totalGames}</span>
            `;
        } else {
            reportsCounterElement.innerHTML = `
                <span>Reports:</span>
                <span class="reports-counter-warning">${gamesWithReports}/${totalGames}</span>
                <span style="color: #ff9800; font-size: 12px;">${totalGames - gamesWithReports} missing</span>
            `;
        }
    },

    /**
     * Render player statistics table
     */
    renderPlayerStatistics() {
        const container = document.getElementById('player-statistics-container');
        if (!container) return;
        
        // Get date filter values
        const startDate = document.getElementById('stats-start-date')?.value || null;
        const endDate = document.getElementById('stats-end-date')?.value || null;
        
        const playerStats = this.calculatePlayerStatistics(startDate, endDate);
        
        // Check if we have completed games (considering date filter)
        const teamGames = window.getTeamGames ? window.getTeamGames() : [];
        let completedGames = teamGames.filter(game => game.isCompleted);
        if (startDate || endDate) {
            completedGames = completedGames.filter(game => {
                if (!game.date) return false;
                const gameDate = new Date(game.date);
                if (startDate && gameDate < new Date(startDate)) return false;
                if (endDate && gameDate > new Date(endDate)) return false;
                return true;
            });
        }
        const hasCompletedGames = completedGames && completedGames.length > 0;
        const teamPlayers = window.getTeamPlayers ? window.getTeamPlayers() : [];
        
        // Update period info and reports counter
        this.updateStatsPeriodInfo(startDate, endDate, completedGames);
        
        if (!hasCompletedGames || teamPlayers.length === 0) {
            container.innerHTML = `
                <div class="no-stats-message">
                    ${teamPlayers.length === 0 
                        ? 'No players added to the team yet.' 
                        : 'No completed games yet. Statistics will appear after completing games.'}
                </div>
            `;
            return;
        }
        
        // Sort players by jersey number
        const sortedPlayers = Object.values(playerStats)
            .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
        
        // Build table HTML
        let tableHTML = `
            <table class="statistics-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Games</th>
                        <th><span class="material-icons stat-icon-small">sports_soccer</span></th>
                        <th><span class="stat-emoji">👟</span></th>
                        <th><span class="material-icons stat-icon-small">back_hand</span></th>
                        <th><img src="img/red-soccer.png" width="16" height="16" alt="Goals" class="stat-icon-img"></th>
                        <th>Passes</th>
                        <th>Shots</th>
                        <th>Blocks</th>
                        <th>Fouls</th>
                        <th><span class="yellow-card-icon">🟨</span></th>
                        <th><span class="red-card-icon">🟥</span></th>
                        <th>OG</th>
                        <th>Missed</th>
                        <th>Late</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedPlayers.forEach(player => {
            tableHTML += `
                <tr>
                    <td>${player.jerseyNumber}</td>
                    <td>${player.name.charAt(0).toUpperCase() + player.name.slice(1).toLowerCase()}</td>
                    <td>${player.gamesPlayed}</td>
                    <td><span class="material-icons stat-icon-small">sports_soccer</span> ${player.goals}</td>
                    <td><span class="stat-emoji">👟</span> ${player.assists}</td>
                    <td><span class="material-icons stat-icon-small">back_hand</span> ${player.saves}</td>
                    <td><img src="img/red-soccer.png" width="16" height="16" alt="Goals Allowed" class="stat-icon-img"> ${player.goalsAllowed}</td>
                    <td>${player.passes}</td>
                    <td>${player.shots}</td>
                    <td>${player.blocks}</td>
                    <td>${player.fouls}</td>
                    <td><span class="yellow-card-icon">🟨</span> ${player.yellowCards}</td>
                    <td><span class="red-card-icon">🟥</span> ${player.redCards}</td>
                    <td>${player.ownGoals}</td>
                    <td>${player.missedGames}</td>
                    <td>${player.lateToGame}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }
};

// Expose globally
window.StatisticsService = StatisticsService;
