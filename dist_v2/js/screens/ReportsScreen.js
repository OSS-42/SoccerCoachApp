/**
 * ReportsScreen.js
 * Encapsulates reports screen rendering and report management
 * Version: 1.9.81
 */

const ReportsScreen = {
    /**
     * Render the list of completed games/reports
     */
    renderReportsList() {
        const reportsList = document.getElementById('reports-list');
        if (!reportsList) return;
        
        reportsList.innerHTML = '';
        
        // Filter games by current team and completion status
        const completedGames = appState.games.filter(game => 
            game.isCompleted && game.teamId === appState.currentTeamId
        );
        
        if (completedGames.length === 0) {
            reportsList.innerHTML = '<div class="empty-state">No completed games yet. Finish a game to see reports here.</div>';
            return;
        }
        
        // Sort by date descending (newest first)
        completedGames.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        completedGames.forEach(game => {
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            
            const gameDate = new Date(game.date).toLocaleDateString();
            const hasActions = game.actions && game.actions.length > 0;
            const score = `${game.homeScore} - ${game.awayScore}`;
            
            reportItem.innerHTML = `
                <div class="report-header">
                    <span class="report-date">${gameDate}</span>
                    <span class="report-teams">${appState.teamName} vs ${game.opponentName}</span>
                    <span class="report-score">${score}</span>
                </div>
                <div class="report-actions">
                    ${hasActions ? `
                        <button class="secondary-btn" onclick="ReportService.viewReport('${game.id}')">View Report</button>
                        <button class="secondary-btn" onclick="ReportService.exportReport('${game.id}', 'pdf')">PDF</button>
                    ` : `
                        <span class="report-no-data">No data recorded</span>
                    `}
                </div>
            `;
            
            reportsList.appendChild(reportItem);
        });
    },

    /**
     * Get count of completed games with action data
     * @returns {number} Number of games with recorded actions
     */
    getReportsWithDataCount() {
        return appState.games.filter(game => 
            game.isCompleted && game.actions && game.actions.length > 0
        ).length;
    },

    /**
     * Get total number of completed games
     * @returns {number} Total completed games
     */
    getTotalCompletedGamesCount() {
        return appState.games.filter(game => game.isCompleted).length;
    }
};

// Expose globally
window.ReportsScreen = ReportsScreen;
