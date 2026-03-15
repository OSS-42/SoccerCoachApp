/**
 * ReportsScreen.js
 * Encapsulates reports screen rendering and report management
 */

const ReportsScreen = {
    isDeleteMode: false,

    /**
     * Render the list of completed games/reports
     */
    renderReportsList() {
        const reportsList = document.getElementById('reports-list');
        if (!reportsList) return;

        this.syncDeleteModeButton();
        
        reportsList.innerHTML = '';
        
        // Get games for current team
        const teamGames = typeof getTeamGames === 'function' ? getTeamGames() : [];
        
        // Guard clause: ensure teamGames is an array
        if (!Array.isArray(teamGames)) {
            reportsList.innerHTML = '<div class="empty-state">No completed games yet. Finish a game to see reports here.</div>';
            this.updateDeleteReportRibbon();
            return;
        }
        
        // Filter by completion status (games are already filtered by team since they come from getTeamGames())
        const completedGames = teamGames.filter(game => game.isCompleted);
        
        if (completedGames.length === 0) {
            reportsList.innerHTML = '<div class="empty-state">No completed games yet. Finish a game to see reports here.</div>';
            this.updateDeleteReportRibbon();
            return;
        }
        
        // Sort by date descending (newest first)
        completedGames.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        completedGames.forEach(game => {
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            reportItem.setAttribute('data-game-id', game.id);
            
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
                        <button class="secondary-btn" onclick="ReportService.generateEnhancedReport('${game.id}')" ${this.isDeleteMode ? 'disabled' : ''}>${window.renderSplitButtonContent('View', 'visibility')}</button>
                        <button class="secondary-btn" onclick="ReportService.exportReport('${game.id}', 'pdf')" ${this.isDeleteMode ? 'disabled' : ''}>${window.renderSplitButtonContent('PDF', 'picture_as_pdf')}</button>
                    ` : `
                        <span class="report-no-data">No data recorded</span>
                    `}
                    <input type="checkbox"
                           class="report-checkbox ${this.isDeleteMode ? '' : 'hidden'}"
                           data-game-id="${game.id}"
                           onchange="ReportsScreen.updateDeleteReportRibbon()">
                </div>
            `;
            
            reportsList.appendChild(reportItem);
        });

        this.updateDeleteReportRibbon();
    },

    toggleDeleteMode() {
        this.isDeleteMode = !this.isDeleteMode;

        if (!this.isDeleteMode) {
            this.clearSelectedReports();
        }

        this.renderReportsList();
    },

    syncDeleteModeButton() {
        const deleteButton = document.getElementById('reports-delete-mode-btn');
        if (!deleteButton) return;

        deleteButton.classList.toggle('active', this.isDeleteMode);
        deleteButton.title = 'Delete reports';
    },

    clearSelectedReports() {
        document.querySelectorAll('.report-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    },

    cancelDeleteSelection() {
        this.clearSelectedReports();
        this.updateDeleteReportRibbon();
    },

    updateDeleteReportRibbon() {
        const ribbon = document.getElementById('message-ribbon');
        if (!ribbon) return;

        if (!this.isDeleteMode) {
            ribbon.classList.add('hidden');
            ribbon.style.setProperty('display', 'none', 'important');
            ribbon.style.setProperty('height', '0', 'important');
            ribbon.style.setProperty('padding', '0', 'important');
            ribbon.innerHTML = `
                <span id="message-text"></span>
                <button class="close-btn" onclick="hideMessage()">×</button>
            `;
            return;
        }

        const selected = document.querySelectorAll('.report-checkbox:checked');
        if (selected.length > 0) {
            clearTimeout(window.messageTimeout);
            ribbon.innerHTML = `
                <span id="message-text">Delete ${selected.length} selected report${selected.length > 1 ? 's' : ''}?</span>
                <div class="ribbon-buttons">
                    <button class="warning-delete-btn" onclick="ReportsScreen.confirmDeleteFromRibbon()">Yes</button>
                    <button class="close-btn" onclick="ReportsScreen.cancelDeleteSelection()">No</button>
                </div>
            `;
            ribbon.className = 'message-ribbon warning';
            ribbon.classList.remove('hidden');
            ribbon.style.setProperty('display', 'flex', 'important');
            ribbon.style.setProperty('visibility', 'visible', 'important');
            ribbon.style.setProperty('opacity', '1', 'important');
            ribbon.style.setProperty('height', 'auto', 'important');
            ribbon.style.setProperty('padding', '20px', 'important');
        } else {
            ribbon.classList.add('hidden');
            ribbon.style.setProperty('display', 'none', 'important');
            ribbon.style.setProperty('height', '0', 'important');
            ribbon.style.setProperty('padding', '0', 'important');
            ribbon.innerHTML = `
                <span id="message-text"></span>
                <button class="close-btn" onclick="hideMessage()">×</button>
            `;
        }
    },

    confirmDeleteFromRibbon() {
        const selected = document.querySelectorAll('.report-checkbox:checked');
        const selectedIds = Array.from(selected).map(cb => cb.getAttribute('data-game-id'));

        if (selectedIds.length === 0) {
            this.updateDeleteReportRibbon();
            return;
        }

        const team = typeof getCurrentTeam === 'function' ? getCurrentTeam() : null;
        if (!team || !Array.isArray(team.games)) {
            showMessage('Error: Team reports not found', 'error');
            return;
        }

        const initialCount = team.games.length;
        team.games = team.games.filter(game => !selectedIds.includes(game.id));
        const deletedCount = initialCount - team.games.length;

        saveAppData();
        this.clearSelectedReports();
        this.renderReportsList();
        if (typeof updateGameReportCounter === 'function') {
            updateGameReportCounter();
        }

        showMessage(
            `${deletedCount} report${deletedCount > 1 ? 's' : ''} removed successfully`,
            'success'
        );
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
