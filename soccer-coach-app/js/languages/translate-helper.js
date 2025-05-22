// Helper function to apply translations to specific selectors
function translateElements() {
    const currentLanguage = appState.settings.language || 'fr';
    
    // Team Management screen buttons - direct fix for "Save"/"Enregistrer" button
    try {
        // Force change the text content for all save buttons
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            // For team management save button
            if (btn.closest('.team-name-edit')) {
                btn.textContent = translate('save', currentLanguage);
            }
            
            // For edit player save button
            if (btn.closest('#edit-player-dialog') && btn.classList.contains('primary-btn')) {
                btn.textContent = translate('save', currentLanguage);
            }
        });
    } catch (e) {
        console.error('Error applying save button translations:', e);
    }
    
    // Team setup titles
    const teamNameHeader = document.querySelector('.team-name-section h2');
    if (teamNameHeader) {
        teamNameHeader.textContent = translate('teamName', currentLanguage);
    }
    
    const playersHeader = document.querySelector('#team-setup .content > h2:nth-child(3)');
    if (playersHeader) {
        playersHeader.textContent = translate('players', currentLanguage);
    }
    
    // Game tracking screen - fix for game time and substitution labels
    const gameTimeEl = document.getElementById('game-time');
    if (gameTimeEl) {
        let timeValue = '00:00';
        // Extract the time value if it exists
        const parts = gameTimeEl.textContent.split(':');
        if (parts.length > 1) {
            timeValue = parts.slice(1).join(':').trim();
        }
        gameTimeEl.textContent = `${translate('gameTime', currentLanguage)} ${timeValue}`;
    }
    
    const subTimeEl = document.getElementById('sub-time');
    if (subTimeEl) {
        let timeValue = '06:00';
        // Extract the time value if it exists
        const parts = subTimeEl.textContent.split(':');
        if (parts.length > 1) {
            timeValue = parts.slice(1).join(':').trim();
        }
        subTimeEl.textContent = `${translate('substitution', currentLanguage)} ${timeValue}`;
    }
    
    // Game tracking controls
    const startBtn = document.querySelector('.timer-controls button:nth-child(1)');
    if (startBtn) {
        startBtn.textContent = translate('start', currentLanguage);
    }
    
    const pauseBtn = document.querySelector('.timer-controls button:nth-child(2)');
    if (pauseBtn) {
        pauseBtn.textContent = translate('pause', currentLanguage);
    }
    
    const resetBtn = document.querySelector('.timer-controls button:nth-child(3)');
    if (resetBtn) {
        resetBtn.textContent = translate('reset', currentLanguage);
    }
    
    // End game button
    const endGameBtn = document.querySelector('.end-game-btn');
    if (endGameBtn) {
        endGameBtn.textContent = translate('endGame', currentLanguage);
    }
    
    // Game reports screen
    const reportsList = document.getElementById('reports-list');
    if (reportsList && reportsList.querySelector('.empty-state')) {
        reportsList.querySelector('.empty-state').textContent = translate('noGames', currentLanguage);
    }
    
    // Edit player dialog
    const editPlayerTitle = document.querySelector('#edit-player-dialog h2');
    if (editPlayerTitle) {
        editPlayerTitle.textContent = translate('edit', currentLanguage) + ' ' + translate('players', currentLanguage);
    }
    
    const editPlayerBtns = document.querySelectorAll('#edit-player-dialog .dialog-buttons button');
    if (editPlayerBtns.length >= 2) {
        editPlayerBtns[0].textContent = translate('cancel', currentLanguage);
        editPlayerBtns[1].textContent = translate('save', currentLanguage);
    }
    
    // Settings screen - fix export/import buttons
    const exportBtn = document.querySelector('button[onclick="exportTeamData()"]');
    if (exportBtn) {
        exportBtn.innerHTML = `<span class="material-icons">file_download</span>${translate('exportTeamData', currentLanguage)}`;
    }
    
    const importBtn = document.querySelector('button[onclick="importTeamData()"]');
    if (importBtn) {
        importBtn.innerHTML = `<span class="material-icons">file_upload</span>${translate('importTeamData', currentLanguage)}`;
    }
}

// Export the function
window.translateElements = translateElements;