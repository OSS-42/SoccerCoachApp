/**
 * ReportService.js
 * Handles game report generation, display, and export functionality
 */

const ReportService = {
    /**
     * Display detailed game report in a dialog
     * @param {string} gameId - ID of the game to report on
     */
    viewReport(gameId) {
        // Try to get game from team games first
        let game = null;
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : null;
        if (Array.isArray(teamGames)) {
            game = teamGames.find(g => g.id === gameId);
        }
        
        // Fallback to legacy appState.games for old reports
        if (!game && appState && Array.isArray(appState.games)) {
            game = appState.games.find(g => g.id === gameId);
        }
        
        if (!game) {
            console.error('Game not found:', gameId);
            showMessage('Game report not found', 'error');
            return;
        }

        let reportDialog = document.getElementById('detailed-report-dialog');
        if (!reportDialog) {
            reportDialog = document.createElement('div');
            reportDialog.id = 'detailed-report-dialog';
            reportDialog.className = 'dialog';
            document.getElementById('app').appendChild(reportDialog);
        }

        const gameDate = new Date(game.date).toDateString();
        const gameTime = game.startTime ? new Date(game.startTime).toLocaleTimeString([], { timeStyle: 'short' }) : '';
        const gameDuration = game.totalGameTime 
            ? `${Math.floor(game.totalGameTime / 60)} minutes`
            : game.numPeriods && game.periodDuration
            ? `${Math.floor(game.numPeriods * game.periodDuration / 60)} minutes`
            : 'N/A';

        const playerActions = {};
        const teamPlayers = typeof getTeamPlayers === 'function' ? getTeamPlayers() : (appState && appState.players ? appState.players : []);
        (game.activePlayers || []).forEach(playerId => {
            const player = teamPlayers.find(p => p.id === playerId);
            if (player) {
                playerActions[playerId] = {
                    name: player.name,
                    jerseyNumber: player.jerseyNumber,
                    goals: [],
                    assists: 0,
                    saves: 0,
                    goalsAllowed: 0,
                    shotOnGoal: 0,
                    yellowCards: [],
                    redCards: [],
                    lateToGame: false,
                    faults: 0,
                    blockedShots: 0,
                    ownGoals: 0,
                    missedGames: 0
                };
            }
        });

        const ownGoals = [];
        (game.actions || []).forEach(action => {
            if (action.actionType === 'own_goal') {
                ownGoals.push(action.gameMinute);
            } else if (playerActions[action.playerId]) {
                switch (action.actionType) {
                    case 'goal': playerActions[action.playerId].goals.push(action.gameMinute); break;
                    case 'assist': playerActions[action.playerId].assists++; break;
                    case 'save': playerActions[action.playerId].saves++; break;
                    case 'goal_allowed': playerActions[action.playerId].goalsAllowed++; break;
                    case 'shot_on_goal': playerActions[action.playerId].shotOnGoal = (playerActions[action.playerId].shotOnGoal || 0) + 1; break;
                    case 'yellow_card': playerActions[action.playerId].yellowCards.push(action.gameMinute); break;
                    case 'red_card': playerActions[action.playerId].redCards.push(action.gameMinute); break;
                    case 'late_to_game': playerActions[action.playerId].lateToGame = true; break;
                    case 'fault': playerActions[action.playerId].faults++; break;
                    case 'blocked_shot': playerActions[action.playerId].blockedShots++; break;
                    case 'own_goal': playerActions[action.playerId].ownGoals++; break;
                    case 'note':
                        // Notes are displayed separately, no stats to update
                        break;
                }
            } else if (action.actionType === 'own_goal' && action.playerId) {
                // Own goal by player
                if (playerActions[action.playerId]) {
                    playerActions[action.playerId].ownGoals++;
                }
            }
        });
        
        // Calculate missed games for unavailable players
        if (game.unavailablePlayers && game.unavailablePlayers.length > 0) {
            game.unavailablePlayers.forEach(playerId => {
                if (playerActions[playerId]) {
                    playerActions[playerId].missedGames = 1;
                }
            });
        }

        let playerStatsHTML = '';
        Object.values(playerActions)
            .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
            .forEach(playerStat => {
                const effectiveRedCards = playerStat.redCards.length + (playerStat.yellowCards.length >= 2 ? 1 : 0);
                playerStatsHTML += `
                    <tr>
                        <td>${playerStat.jerseyNumber}</td>
                        <td>${playerStat.name.toUpperCase()}</td>
                        <td>${playerStat.goals.length}</td>
                        <td>${playerStat.assists}</td>
                        <td>${playerStat.saves}</td>
                        <td>${playerStat.goalsAllowed}</td>
                        <td>${playerStat.shotOnGoal || 0}</td>
                        <td>${playerStat.blockedShots}</td>
                        <td>${playerStat.faults}</td>
                        <td>${playerStat.yellowCards.length}</td>
                        <td>${effectiveRedCards}</td>
                        <td>${playerStat.ownGoals || 0}</td>
                        <td>${playerStat.missedGames || 0}</td>
                        <td>${playerStat.lateToGame ? 1 : 0}</td>
                    </tr>
                `;
            });

        const goalLine = Object.values(playerActions)
            .filter(p => p.goals.length > 0)
            .map(p => ({ name: p.name, times: p.goals.sort((a, b) => a - b) }))
            .concat(ownGoals.sort((a, b) => a - b).map(time => ({ name: 'Opponent', times: [time], isOwnGoal: true })))
            .map(entry => entry.isOwnGoal ? `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')}, og)` : `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')})`)
            .join(', ') || 'N/A';

        const yellowCardLine = Object.values(playerActions)
            .filter(p => p.yellowCards.length > 0)
            .map(p => `${p.name} (${p.yellowCards.sort((a, b) => a - b).map(t => `${t}'`).join(', ')})`)
            .join(', ') || 'N/A';

        const redCardLine = Object.values(playerActions)
            .filter(p => p.redCards.length > 0 || p.yellowCards.length >= 2)
            .map(p => {
                const redTimes = [...p.redCards];
                if (p.yellowCards.length >= 2) redTimes.push(p.yellowCards[1]);
                return `${p.name} (${redTimes.sort((a, b) => a - b).map(t => `${t}'`).join(', ')})`;
            })
            .join(', ') || 'N/A';

        const lateLine = Object.values(playerActions)
            .filter(p => p.lateToGame)
            .map(p => p.name)
            .join(', ') || 'N/A';

        // Generate notes HTML
        const noteActions = (game.actions || []).filter(action => action.actionType === 'note');
        let notesHTML = '';
        if (noteActions.length > 0) {
            notesHTML = `
                <div style="margin-top: 15px;"><strong>Game Notes:</strong></div>
                <div class="game-notes" style="margin-left: 15px; font-size: 12px;">
                    ${noteActions.map(note => {
                        const playerName = note.playerId ? 
                            (teamPlayers.find(p => p.id === note.playerId)?.name || 'Unknown Player') : 
                            'General';
                        return `<div class="note-item" style="margin: 5px 0;">${note.gameMinute}' - ${playerName}: ${note.noteText}</div>`;
                    }).join('')}
                </div>
            `;
        }

        // Generate missed players line
        const missedLine = (game.unavailablePlayers || [])
            .map(playerId => {
                const player = teamPlayers.find(p => p.id === playerId);
                return player ? player.name : null;
            })
            .filter(name => name)
            .join(', ') || 'N/A';

        // Formation Section with correct stats and player names
        let formationHTML = '';
        if (game.formationPlayers && game.formationPlayers.length > 0) {
            formationHTML = `
                <div class="report-formation">
                    <h3>Starting Formation (${game.matchType})</h3>
                    <div class="formation-container-report" ${window.innerWidth <= 1024 ? 'style="flex-direction: column !important; align-items: center !important; min-width: auto !important;"' : ''}>
                        <div class="formation-field-report">
                            ${game.formationPlayers.map(f => {
                                const player = teamPlayers.find(p => p.id === f.playerId);
                                if (!player) return '';
                                const stats = playerActions[f.playerId] || {};
                                
                                // Show only non-zero stats regardless of starting position
                                let statTable = '<table class="player-stats-table">';
                                
                                if (stats.goals?.length > 0) {
                                    statTable += `<tr><th>⚽</th><td>${stats.goals.length}</td></tr>`;
                                }
                                if (stats.assists > 0) {
                                    statTable += `<tr><th>👟</th><td>${stats.assists}</td></tr>`;
                                }
                                if (stats.saves > 0) {
                                    statTable += `<tr><th>🧤</th><td>${stats.saves}</td></tr>`;
                                }
                                if (stats.shotOnGoal > 0) {
                                    statTable += `<tr><th>🎯</th><td>${stats.shotOnGoal}</td></tr>`;
                                }
                                if (stats.goalsAllowed > 0) {
                                    statTable += `<tr><th><img src="img/red-soccer.png" style="width:18px;height:18px;"></th><td>${stats.goalsAllowed}</td></tr>`;
                                }
                                if (stats.blockedShots > 0) {
                                    statTable += `<tr><th>🛡️</th><td>${stats.blockedShots}</td></tr>`;
                                }
                                if (stats.faults > 0) {
                                    statTable += `<tr><th>🚩</th><td>${stats.faults}</td></tr>`;
                                }
                                if (stats.yellowCards?.length > 0) {
                                    statTable += `<tr><th>🟨</th><td>${stats.yellowCards.length}</td></tr>`;
                                }
                                const redCards = (stats.redCards?.length || 0) + (stats.yellowCards?.length >= 2 ? 1 : 0);
                                if (redCards > 0) {
                                    statTable += `<tr><th>🟥</th><td>${redCards}</td></tr>`;
                                }
                                
                                statTable += '</table>';
                                return `
                                    <div class="player-slot-report" style="left: ${f.x}%; top: ${f.y}%">
                                        <span class="player-number-report">${player.jerseyNumber}</span>
                                        <span class="player-name-report">${player.name}</span>
                                        ${statTable}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="substitutes-list">
                            <h4>Substitutes</h4>
                            ${game.substitutes?.map(subId => {
                                const player = teamPlayers.find(p => p.id === subId);
                                if (!player) return '';
                                const stats = playerActions[subId] || {};
                                
                                // Show only non-zero stats for substitutes too
                                let statTable = '<table class="player-stats-table">';
                                
                                if (stats.goals?.length > 0) {
                                    statTable += `<tr><th>⚽</th><td>${stats.goals.length}</td></tr>`;
                                }
                                if (stats.assists > 0) {
                                    statTable += `<tr><th>👟</th><td>${stats.assists}</td></tr>`;
                                }
                                if (stats.saves > 0) {
                                    statTable += `<tr><th>🧤</th><td>${stats.saves}</td></tr>`;
                                }
                                if (stats.shotOnGoal > 0) {
                                    statTable += `<tr><th>🎯</th><td>${stats.shotOnGoal}</td></tr>`;
                                }
                                if (stats.goalsAllowed > 0) {
                                    statTable += `<tr><th><img src="img/red-soccer.png" style="width:18px;height:18px;"></th><td>${stats.goalsAllowed}</td></tr>`;
                                }
                                if (stats.blockedShots > 0) {
                                    statTable += `<tr><th>🛡️</th><td>${stats.blockedShots}</td></tr>`;
                                }
                                if (stats.faults > 0) {
                                    statTable += `<tr><th>🚩</th><td>${stats.faults}</td></tr>`;
                                }
                                if (stats.yellowCards?.length > 0) {
                                    statTable += `<tr><th>🟨</th><td>${stats.yellowCards.length}</td></tr>`;
                                }
                                const redCards = (stats.redCards?.length || 0) + (stats.yellowCards?.length >= 2 ? 1 : 0);
                                if (redCards > 0) {
                                    statTable += `<tr><th>🟥</th><td>${redCards}</td></tr>`;
                                }
                                
                                statTable += '</table>';
                                
                                return `
                                    <div class="substitute-item">
                                        <span>#${player.jerseyNumber} ${player.name}</span>
                                        ${statTable}
                                    </div>
                                `;
                            }).join('') || '<p>No substitutes</p>'}
                        </div>
                    </div>
                </div>
            `;
        }

        reportDialog.innerHTML = `
            <div class="dialog-content report-dialog">
                <h2>Game Report</h2>
                <div class="report-header-info">
                    <div><strong>Date:</strong> ${gameDate} ${gameTime}</div>
                    <div><strong>Teams:</strong> ${typeof getTeamName === 'function' ? getTeamName() : 'My Team'} vs ${game.opponentName}</div>
                    <div><strong>Final Score:</strong> ${game.homeScore} - ${game.awayScore}</div>
                    <div><strong>Goal for ${typeof getTeamName === 'function' ? getTeamName() : 'My Team'}:</strong> ${goalLine}</div>
                    <div><strong>Goals Against:</strong> ${game.awayScore || 'N/A'}</div>
                    <div><strong>Yellow Card:</strong> ${yellowCardLine}</div>
                    <div><strong>Red Card:</strong> ${redCardLine}</div>
                    <div><strong>Duration:</strong> ${gameDuration}</div>
                </div>
                ${formationHTML}
                <h3>Player Statistics</h3>
                <div class="report-table-container">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th><span class="material-icons stat-icon-small">sports_soccer</span></th>
                                <th><span class="stat-emoji">👟</span></th>
                                <th><span class="material-icons stat-icon-small">back_hand</span></th>
                                <th><img src="img/red-soccer.png" width="16" height="16" alt="Goals Allowed" class="stat-icon-img"></th>
                                <th><span class="stat-emoji">🎯</span></th>
                                <th><span class="stat-emoji">🛡️</span></th>
                                <th><span class="stat-emoji">🚩</span></th>
                                <th><span class="stat-emoji">🟨</span></th>
                                <th><span class="stat-emoji">🟥</span></th>
                                <th><img src="img/red-soccer.png" width="16" height="16" alt="Own Goals" class="stat-icon-img"></th>
                                <th><span class="stat-emoji">🚫</span></th>
                                <th><span class="stat-emoji">🕐</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${playerStatsHTML}
                        </tbody>
                    </table>
                </div>
                <div class="report-footer">
                    <div><strong>Game Summary:</strong> ${game.gameSummary || 'None'}</div>
                    <div><strong>Missed the game:</strong> ${missedLine}</div>
                    <div><strong>Late to the game:</strong> ${lateLine}</div>
                    ${notesHTML}
                </div>
                <div class="report-actions">
                    <button class="secondary-btn" onclick="ReportService.exportReport('${gameId}', 'pdf')">Export as PDF</button>
                    <button class="primary-btn" onclick="ReportService.closeDetailedReport()">Close</button>
                </div>
            </div>
        `;

        reportDialog.style.display = 'flex';
        reportDialog.classList.add('active');
    },

    /**
     * Close the detailed game report dialog
     */
    closeDetailedReport() {
        const reportDialog = document.getElementById('detailed-report-dialog');
        if (reportDialog) {
            reportDialog.style.display = 'none';
            reportDialog.classList.remove('active');
        }

        // Ensure end game dialogs are closed as a fallback
        const endGameDialog = document.getElementById('end-game-dialog');
        if (endGameDialog) {
            endGameDialog.style.display = 'none';
            endGameDialog.classList.remove('active');
        }
        const endGamePeriodDialog = document.getElementById('end-game-period-dialog');
        if (endGamePeriodDialog) {
            endGamePeriodDialog.style.display = 'none';
            endGamePeriodDialog.classList.remove('active');
        }
    },

    /**
     * Export game report to specified format
     * @param {string} gameId - ID of the game to export
     * @param {string} format - Export format (currently supports 'pdf')
     */
    exportReport(gameId, format) {
        // Try to get game from team games first
        let game = null;
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : null;
        if (Array.isArray(teamGames)) {
            game = teamGames.find(g => g.id === gameId);
        }
        
        // Fallback to legacy appState.games for old reports
        if (!game && appState && Array.isArray(appState.games)) {
            game = appState.games.find(g => g.id === gameId);
        }
        
        if (!game) {
            showMessage('Game not found', 'error');
            return;
        }

        const reportContent = document.querySelector('.report-dialog').innerHTML;
        let iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
            <head>
                <title>Game Report - ${game.date}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h2, h3, h4 { color: #333; }
                    .formation-container-report {
                        display: flex;
                        flex-direction: row;
                        gap: 20px;
                        align-items: flex-start;
                        min-width: 520px;
                    }
                    @media screen and (max-width: 1024px) {
                        .formation-container-report {
                            flex-direction: column !important;
                            align-items: center !important;
                            min-width: auto !important;
                        }
                    }
                    @media screen and (max-width: 500px) {
                        .formation-container-report {
                            flex-direction: column !important;
                            align-items: center !important;
                            min-width: auto !important;
                            width: 100% !important;
                        }
                    }
                    .formation-field-report {
                        width: 300px; height: 400px;
                        background: url('img/field-400.png') no-repeat center center;
                        background-size: cover;
                        position: relative;
                        border: 2px solid #fff;
                        flex-shrink: 0;
                    }
                    .player-slot-report {
                        position: absolute; text-align: center; transform: translate(-50%, -50%);
                        display: flex; flex-direction: column; align-items: center;
                    }
                    .player-number-report {
                        display: inline-block; width: 24px; height: 24px; line-height: 24px;
                        background: #000; color: #fff; border-radius: 50%; font-size: 12px;
                    }
                    .player-name-report {
                        font-size: 10px; color: #fff; margin-top: 2px;
                        text-shadow: 1px 1px 1px #000;
                    }
                    .player-stats-table {
                        width: auto; font-size: 10px; margin-top: 5px;
                        border-collapse: collapse; background: #fff;
                    }
                    .player-stats-table th, .player-stats-table td {
                        border: 1px solid #ddd; padding: 2px; width: 20px;
                    }
                    .substitutes-list {
                        width: 200px; background: #f5f5f5; padding: 10px;
                        border-radius: 8px; max-height: 400px; overflow-y: auto;
                    }
                    .substitute-item { margin-bottom: 10px; }
                </style>
            </head>
            <body>
                ${reportContent}
                <p style="margin-top: 30px; text-align: center; color: #666;">
                    Generated by Soccer Coach Tracker - ${new Date().toLocaleString()}
                </p>
            </body>
            </html>
        `);
        doc.close();

        iframe.onload = function() {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        };

        showMessage('Opening print dialog for PDF export', 'success');
    },

    /**
     * Generate enhanced v1.11 report with timeline, goals, cards, and stats
     * @param {string} gameId - ID of the game to report on
     */
    generateEnhancedReport(gameId) {
        // Get the game
        let game = null;
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : null;
        if (Array.isArray(teamGames)) {
            game = teamGames.find(g => g.id === gameId);
        }
        if (!game && appState && Array.isArray(appState.games)) {
            game = appState.games.find(g => g.id === gameId);
        }
        if (!game) {
            showMessage('Game report not found', 'error');
            return;
        }

        const teamPlayers = typeof getTeamPlayers === 'function' ? getTeamPlayers() : (appState?.players || []);
        const teamName = typeof getTeamName === 'function' ? getTeamName() : 'Team';
        
        // Parse actions into categories
        const actions = game.actions || [];
        const goalActions = actions.filter(a => a.actionType === 'goal');
        const cardActions = actions.filter(a => ['yellow_card', 'red_card'].includes(a.actionType));
        const shotActions = actions.filter(a => ['shot_on_goal', 'shot'].includes(a.actionType));
        const saveActions = actions.filter(a => a.actionType === 'save');
        const goalAllowedActions = actions.filter(a => a.actionType === 'goal_allowed');
        const noteActions = actions.filter(a => a.actionType === 'note');
        const lateActions = actions.filter(a => a.actionType === 'late_to_game');
        
        // Generate period score breakdown
        let periodScores = 'N/A';
        if (game.numPeriods === 2) {
            periodScores = `HT: ${game.halfTimeScore?.home || 0}-${game.halfTimeScore?.away || 0}`;
        } else {
            // Show score after each period if available
            periodScores = game.periodScores ? 
                game.periodScores.map((s, i) => `P${i+1}: ${s.home}-${s.away}`).join(' | ') :
                `FT: ${game.homeScore}-${game.awayScore}`;
        }

        // Build player stats
        const playerStats = {};
        teamPlayers.forEach(p => {
            playerStats[p.id] = {
                name: p.name,
                jersey: p.jerseyNumber,
                goals: 0,
                assists: 0,
                shots: 0,
                saves: 0,
                goalsAllowed: 0,
                yellowCards: [],
                redCards: [],
                late: false,
                notes: []
            };
        });

        // Organize actions by player
        actions.forEach(action => {
            if (!playerStats[action.playerId]) return;
            
            switch(action.actionType) {
                case 'goal': playerStats[action.playerId].goals++; break;
                case 'assist': playerStats[action.playerId].assists++; break;
                case 'shot_on_goal': playerStats[action.playerId].shots++; break;
                case 'save': playerStats[action.playerId].saves++; break;
                case 'goal_allowed': playerStats[action.playerId].goalsAllowed++; break;
                case 'yellow_card': playerStats[action.playerId].yellowCards.push(action.gameMinute); break;
                case 'red_card': playerStats[action.playerId].redCards.push(action.gameMinute); break;
                case 'late_to_game': playerStats[action.playerId].late = true; break;
                case 'note': playerStats[action.playerId].notes.push({ minute: action.gameMinute, text: action.noteText }); break;
            }
        });

        // Generate timeline HTML
        const timelineHTML = this._generateTimeline(goalActions, shotActions, saveActions, goalAllowedActions, teamPlayers);
        
        // Generate goals & cards timeline
        const goalsCardsHTML = this._generateGoalsCardsTimeline(goalActions, cardActions, teamPlayers);
        
        // Generate sections
        const substitutesHTML = game.substitutes && game.substitutes.length > 0 ?
            `<h3>Substitutes</h3><p>${game.substitutes.map(id => {
                const p = teamPlayers.find(x => x.id === id);
                return p ? `#${p.jerseyNumber} ${p.name}` : '';
            }).filter(x => x).join(', ')}</p>` : '';
        
        const latePlayersHTML = lateActions.length > 0 ?
            `<h3>Late Arrivals</h3><p>${Array.from(new Set(lateActions.map(a => a.playerId))).map(id => {
                const p = teamPlayers.find(x => x.id === id);
                return p ? `#${p.jerseyNumber} ${p.name}` : '';
            }).join(', ')}</p>` : '';
        
        const unavailableHTML = (game.unavailablePlayers && game.unavailablePlayers.length > 0) ?
            `<h3>Unavailable Players</h3><p>${game.unavailablePlayers.map(id => {
                const p = teamPlayers.find(x => x.id === id);
                return p ? `#${p.jerseyNumber} ${p.name}` : '';
            }).filter(x => x).join(', ')}</p>` : '';
        
        const notesHTML = noteActions.length > 0 ?
            `<h3>Game Notes</h3><div class="report-notes">${noteActions.map(n => 
                `<div class="note-item">⏱️ ${n.gameMinute}' - ${n.noteText}</div>`
            ).join('')}</div>` : '';
        
        // Generate player stats table
        const playerStatsTableHTML = this._generatePlayerStatsTable(playerStats);
        
        const gameDate = new Date(game.date).toDateString();
        
        // Build full report HTML
        const reportHTML = `
            <div class="report-v1.12">
                <!-- Match Header with Team Names -->
                <div class="report-header">
                    <div class="match-title">
                        <h2>${teamName} - ${game.opponentName}</h2>
                        <div class="score">
                            <span class="final-score">${game.homeScore} - ${game.awayScore}</span>
                            <span class="period-scores">${periodScores}</span>
                        </div>
                    </div>
                    <div class="match-meta">
                        <span>📅 ${gameDate}</span>
                        <span>🕐 ${game.matchType}</span>
                    </div>
                </div>

                <!-- Timeline/Chart - Symmetrical Design -->
                <div class="report-section">
                    <h3>Shot Timeline</h3>
                    ${timelineHTML}
                </div>

                <!-- Goals & Cards - Two Column Layout -->
                ${goalsCardsHTML}

                <!-- Substitutes -->
                ${substitutesHTML ? `<div class="report-section">${substitutesHTML}</div>` : ''}

                <!-- Late Arrivals -->
                ${latePlayersHTML ? `<div class="report-section">${latePlayersHTML}</div>` : ''}

                <!-- Unavailable -->
                ${unavailableHTML ? `<div class="report-section">${unavailableHTML}</div>` : ''}

                <!-- Notes -->
                ${notesHTML ? `<div class="report-section">${notesHTML}</div>` : ''}

                <!-- Player Stats Table -->
                <div class="report-section">
                    <h3>Player Statistics</h3>
                    ${playerStatsTableHTML}
                </div>
            </div>
        `;

        // Display in modal
        let reportDialog = document.getElementById('enhanced-report-dialog');
        if (!reportDialog) {
            reportDialog = document.createElement('div');
            reportDialog.id = 'enhanced-report-dialog';
            reportDialog.className = 'dialog';
            document.body.appendChild(reportDialog);
        }

        reportDialog.innerHTML = `
            <div class="dialog-content game-report-content">
                <div class="dialog-header">
                    <h2>Game Report - ${teamName} vs ${game.opponentName}</h2>
                    <button class="close-btn" onclick="this.closest('.dialog').classList.remove('active')">×</button>
                </div>
                ${reportHTML}
                <div class="report-actions">
                    <button class="primary-btn" onclick="ReportService.printEnhancedReport('${gameId}')">📄 Print/PDF</button>
                    <button class="secondary-btn" onclick="ReportService.shareReport('${gameId}')">📤 Share</button>
                    <button class="secondary-btn" onclick="this.closest('.dialog').classList.remove('active')">Close</button>
                </div>
            </div>
        `;

        reportDialog.classList.add('active');
    },

    /**
     * Generate timeline - one complete symmetrical graph
     * @private
     */
    _generateTimeline(goalActions, shotActions, saveActions, goalAllowedActions, teamPlayers) {
        // Group actions by minute
        const userShotsByMinute = {};
        const opponentActionsByMinute = {};

        [...goalActions, ...shotActions].forEach(a => {
            const min = Math.round(a.gameMinute || 0);
            if (!userShotsByMinute[min]) userShotsByMinute[min] = { shots: 0, goals: 0 };
            if (a.actionType === 'goal') userShotsByMinute[min].goals++;
            else userShotsByMinute[min].shots++;
        });

        [...saveActions, ...goalAllowedActions].forEach(a => {
            const min = Math.round(a.gameMinute || 0);
            if (!opponentActionsByMinute[min]) opponentActionsByMinute[min] = { saves: 0, goalsAllowed: 0 };
            if (a.actionType === 'save') opponentActionsByMinute[min].saves++;
            else opponentActionsByMinute[min].goalsAllowed++;
        });

        // Generate ALL bars in one container
        const allBars = [];

        // User team bars (going UP)
        Object.entries(userShotsByMinute).forEach(([minute, counts]) => {
            const leftPos = (parseInt(minute) / 90) * 100;
            const height = (counts.goals * 12) + (counts.shots * 8);
            allBars.push(`
                <div class="timeline-bar user" style="left: ${leftPos}%; height: ${height}px; background: linear-gradient(to top, #4CAF50, #8BC34A);" title="${counts.goals}G ${counts.shots}S"></div>
            `);
        });

        // Opponent bars (going DOWN)
        Object.entries(opponentActionsByMinute).forEach(([minute, counts]) => {
            const leftPos = (parseInt(minute) / 90) * 100;
            const height = (counts.goalsAllowed * 12) + (counts.saves * 8);
            allBars.push(`
                <div class="timeline-bar opponent" style="left: ${leftPos}%; height: ${height}px; background: linear-gradient(to top, #FF5252, #2196F3);" title="${counts.goalsAllowed}GA ${counts.saves}S"></div>
            `);
        });

        const userGoals = Object.values(userShotsByMinute).reduce((sum, c) => sum + c.goals, 0);
        const userShots = Object.values(userShotsByMinute).reduce((sum, c) => sum + c.shots, 0);
        const opponentGoalsAllowed = Object.values(opponentActionsByMinute).reduce((sum, c) => sum + c.goalsAllowed, 0);
        const opponentSaves = Object.values(opponentActionsByMinute).reduce((sum, c) => sum + c.saves, 0);

        return `
            <div class="timeline-chart">
                <div class="timeline-bars-wrapper">
                    <div class="timeline-bars">
                        ${allBars.join('')}
                    </div>
                </div>
                <div class="timeline-scale">
                    <span>0'</span>
                    <span>15'</span>
                    <span>30'</span>
                    <span>45'</span>
                    <span>60'</span>
                    <span>75'</span>
                    <span>90'</span>
                </div>
                <div class="timeline-legend">
                    <div class="legend-item user"><span class="colored-box"></span> Your Team: ${userGoals} ⚽ ${userShots} 👟</div>
                    <div class="legend-item opponent"><span class="colored-box"></span> Opponent: ${opponentGoalsAllowed} 🔴 ${opponentSaves} 🧤</div>
                </div>
            </div>
        `;
    },

    /**
     * Generate goals and cards as simple sequential list
     * @private
     */
    _generateGoalsCardsTimeline(goalActions, cardActions, teamPlayers) {
        // Sort all events by time
        const allEvents = [];

        // Add goals
        let goalCounter = 0;
        goalActions.forEach(a => {
            goalCounter++;
            const player = teamPlayers.find(p => p.id === a.playerId);
            allEvents.push({
                time: a.gameMinute,
                type: 'goal',
                score: goalCounter,
                player: player?.name || 'Unknown',
                assist: a.assistedBy ? teamPlayers.find(p => p.id === a.assistedBy)?.name : null
            });
        });

        // Add cards
        cardActions.forEach(a => {
            const player = teamPlayers.find(p => p.id === a.playerId);
            allEvents.push({
                time: a.gameMinute,
                type: a.actionType === 'yellow_card' ? 'yellow' : 'red',
                player: player?.name || 'Unknown'
            });
        });

        // Sort by time
        allEvents.sort((a, b) => a.time - b.time);

        const eventsHTML = allEvents.map(e => {
            if (e.type === 'goal') {
                return `
                    <div class="goals-cards-item goal-item">
                        <div class="item-icon">⚽</div>
                        <div class="item-number">#${e.score}</div>
                        <div class="item-details">
                            <div class="item-player">${e.player}</div>
                            ${e.assist ? `<div class="item-assist">Assist: ${e.assist}</div>` : ''}
                        </div>
                        <div class="item-time">${e.time}'</div>
                    </div>
                `;
            } else if (e.type === 'yellow') {
                return `
                    <div class="goals-cards-item card-item yellow">
                        <div class="item-icon">🟨</div>
                        <div class="item-details">
                            <div class="item-player">${e.player}</div>
                        </div>
                        <div class="item-time">${e.time}'</div>
                    </div>
                `;
            } else {
                return `
                    <div class="goals-cards-item card-item red">
                        <div class="item-icon">🟥</div>
                        <div class="item-details">
                            <div class="item-player">${e.player}</div>
                        </div>
                        <div class="item-time">${e.time}'</div>
                    </div>
                `;
            }
        }).join('');

        return `
            <div class="report-section">
                <h3>Goals & Cards</h3>
                <div class="goals-cards-list">
                    ${eventsHTML || '<div class="empty-state">No goals or cards recorded</div>'}
                </div>
            </div>
        `;
    },

    /**
     * Generate player statistics table
     * @private
     */
    _generatePlayerStatsTable(playerStats) {
        const stats = Object.values(playerStats)
            .filter(p => p.goals > 0 || p.assists > 0 || p.shots > 0 || p.saves > 0 || p.goalsAllowed > 0 || p.yellowCards.length > 0 || p.redCards.length > 0)
            .sort((a, b) => a.jersey - b.jersey);

        return `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>⚽</th>
                        <th>👟</th>
                        <th>🎯</th>
                        <th>🧤</th>
                        <th>🔴</th>
                        <th>🟨</th>
                        <th>🟥</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.map(p => `
                        <tr>
                            <td>${p.jersey}</td>
                            <td>${p.name}</td>
                            <td>${p.goals}</td>
                            <td>${p.assists}</td>
                            <td>${p.shots}</td>
                            <td>${p.saves}</td>
                            <td>${p.goalsAllowed}</td>
                            <td>${p.yellowCards.length}</td>
                            <td>${p.redCards.length}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Print enhanced report as PDF
     */
    printEnhancedReport(gameId) {
        // Get report content
        const reportContent = document.querySelector('.report-v1\\.11');
        if (!reportContent) {
            showMessage('Report not found', 'error');
            return;
        }

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
            <head>
                <title>Game Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .stats-table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 10px; text-align: center; }
                    .stats-table th { background-color: #4CAF50; color: white; }
                    .report-header { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                    .score { font-size: 24px; font-weight: bold; color: #333; }
                    .report-section { margin: 20px 0; }
                    .timeline-event { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #4CAF50; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${reportContent.innerHTML}
                <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
                    Generated by Soccer Coach Tracker
                </p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    },

    /**
     * Share report
     */
    shareReport(gameId) {
        showMessage('Share feature coming soon!', 'success');
        // TODO: Implement share via QR code or link
    }
};

// Expose globally
window.ReportService = ReportService;
