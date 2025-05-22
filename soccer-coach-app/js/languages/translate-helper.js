// Helper function to apply translations to specific selectors
function translateElements() {
    const currentLanguage = appState.settings.language || 'fr';
    
    // Team Management screen buttons
    const saveTeamButton = document.querySelector('.team-name-edit button');
    if (saveTeamButton) {
        saveTeamButton.textContent = translate('save', currentLanguage);
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
}

// Export the function
window.translateElements = translateElements;