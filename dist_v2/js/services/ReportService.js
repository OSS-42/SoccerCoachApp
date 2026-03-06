/**
 * ReportService.js
 * Handles game report generation, display, and export functionality
 * Version: 1.9.81
 */

const ReportService = {
    /**
     * Display detailed game report in a dialog
     * @param {string} gameId - ID of the game to report on
     */
    viewReport(gameId) {
        const game = appState.games.find(g => g.id === gameId);
        if (!game) return;

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
        (game.activePlayers || []).forEach(playerId => {
            const player = appState.players.find(p => p.id === playerId);
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
                    blockedShots: 0
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
                    case 'note':
                        // Notes are displayed separately, no stats to update
                        break;
                }
            }
        });

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
                            (appState.players.find(p => p.id === note.playerId)?.name || 'Unknown Player') : 
                            'General';
                        return `<div class="note-item" style="margin: 5px 0;">${note.gameMinute}' - ${playerName}: ${note.noteText}</div>`;
                    }).join('')}
                </div>
            `;
        }

        // Generate missed players line
        const missedLine = (game.unavailablePlayers || [])
            .map(playerId => {
                const player = appState.players.find(p => p.id === playerId);
                return player ? player.name : null;
            })
            .filter(name => name)
            .join(', ') || 'N/A';

        // Formation Section with correct stats and player names
        let formationHTML = '';
        if (game.formation && game.formation.length > 0) {
            formationHTML = `
                <div class="report-formation">
                    <h3>Starting Formation (${game.matchType})</h3>
                    <div class="formation-container-report" ${window.innerWidth <= 1024 ? 'style="flex-direction: column !important; align-items: center !important; min-width: auto !important;"' : ''}>
                        <div class="formation-field-report">
                            ${game.formation.map(f => {
                                const player = appState.players.find(p => p.id === f.playerId);
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
                                    statTable += `<tr><th>❌</th><td>${stats.blockedShots}</td></tr>`;
                                }
                                if (stats.faults > 0) {
                                    statTable += `<tr><th>⚠️</th><td>${stats.faults}</td></tr>`;
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
                                const player = appState.players.find(p => p.id === subId);
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
                                    statTable += `<tr><th>❌</th><td>${stats.blockedShots}</td></tr>`;
                                }
                                if (stats.faults > 0) {
                                    statTable += `<tr><th>⚠️</th><td>${stats.faults}</td></tr>`;
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
                    <div><strong>Teams:</strong> ${appState.teamName} vs ${game.opponentName}</div>
                    <div><strong>Final Score:</strong> ${game.homeScore} - ${game.awayScore}</div>
                    <div><strong>Goal for ${appState.teamName}:</strong> ${goalLine}</div>
                    <div><strong>Yellow card:</strong> ${yellowCardLine}</div>
                    <div><strong>Red card:</strong> ${redCardLine}</div>
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
        const game = appState.games.find(g => g.id === gameId);
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
    }
};

// Expose globally
window.ReportService = ReportService;
