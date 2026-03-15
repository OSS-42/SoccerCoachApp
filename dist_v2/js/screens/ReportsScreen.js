/**
 * ReportsScreen.js
 * Encapsulates reports screen rendering and report management
 */

const ReportsScreen = {
    /**
     * Render the list of completed games/reports
     */
    renderReportsList() {
        const reportsList = document.getElementById('reports-list');
        if (!reportsList) return;
        
        reportsList.innerHTML = '';
        
        // Get games for current team
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : [];
        
        // Guard clause: ensure teamGames is an array
        if (!Array.isArray(teamGames)) {
            reportsList.innerHTML = '<div class="empty-state">No completed games yet. Finish a game to see reports here.</div>';
            return;
        }
        
        // Filter by completion status (games are already filtered by team since they come from getTeamGames())
        const completedGames = teamGames.filter(game => game.isCompleted);
        
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
                    <span class="report-teams">${getTeamName()} vs ${game.opponentName}</span>
                    <span class="report-score">${score}</span>
                </div>
                <div class="report-actions">
                    ${hasActions ? `
                        <button class="secondary-btn" onclick="ReportService.generateEnhancedReport('${game.id}')">${window.renderSplitButtonContent('View', 'visibility')}</button>
                        <button class="secondary-btn" onclick="ReportService.exportReport('${game.id}', 'pdf')">${window.renderSplitButtonContent('PDF', 'picture_as_pdf')}</button>
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
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : [];
        return teamGames.filter(game => 
            game.isCompleted && game.actions && game.actions.length > 0
        ).length;
    },

    /**
     * Get total number of completed games
     * @returns {number} Total completed games
     */
    getTotalCompletedGamesCount() {
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : [];
        return teamGames.filter(game => game.isCompleted).length;
    }
};

// Expose globally
window.ReportsScreen = ReportsScreen;
