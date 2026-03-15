/**
 * FRESH START: Initialization Logic v1.12.44
 * Complete ground-up rebuild with visual loading screen
 * 
 * Flow:
 * 1. Show loading screen
 * 2. Check localStorage
 * 3. Create or load teams
 * 4. Validate state
 * 5. Hide loading screen and show app
 */

// Global initialization state
window.InitState = {
    ready: false,
    teams: [],
    currentTeamId: null,
    errors: []
};

/**
 * Initialize application - called from HTML on DOMContentLoaded
 */
async function initializeApp() {
    const loader = document.getElementById('app-loader');

    try {
        // =====================================================================
        // STEP 1: Check global state
        // =====================================================================
        if (!window.appState) {
            throw new Error('appState not initialized by StateInit.js');
        }
        // =====================================================================
        // STEP 2: Check localStorage
        // =====================================================================
        
        let savedTeams = null;
        let sourceType = null;
        
        try {
            // Try new format
            const newData = localStorage.getItem('soccerCoachApp2');
            if (newData) {
                savedTeams = JSON.parse(newData).teams;
                sourceType = 'new';
            } else {
                // Try legacy format
                const oldData = localStorage.getItem('soccerCoachApp');
                if (oldData) {
                    sourceType = 'legacy';
                } else {
                    sourceType = 'fresh';
                }
            }
        } catch (e) {
            sourceType = 'fresh';
        }
        
        // =====================================================================
        // STEP 3: Load or create teams
        // =====================================================================
        
        if (sourceType === 'new' && savedTeams && savedTeams.length > 0) {
            window.appState.teams = savedTeams;
            window.appState.currentTeamId = window.InitState.currentTeamId || savedTeams[0].id;
            window.InitState.teams = savedTeams;
        } else if (sourceType === 'legacy') {
            if (window.migrateLegacyData && typeof window.migrateLegacyData === 'function') {
                // Load legacy data first
                const legacyData = JSON.parse(localStorage.getItem('soccerCoachApp'));
                window.appState.teamName = legacyData.teamName || 'Team A';
                window.appState.players = legacyData.players || [];
                window.appState.games = legacyData.games || [];
                window.appState.unavailablePlayers = legacyData.unavailablePlayers || [];
                
                window.migrateLegacyData();
                window.InitState.teams = window.appState.teams;
                window.InitState.currentTeamId = window.appState.currentTeamId;
            } else {
                throw new Error('migrateLegacyData function not available');
            }
        } else {
            // Fresh start - create default teams
            if (window.createDefaultTeams && typeof window.createDefaultTeams === 'function') {
                window.createDefaultTeams();
                window.InitState.teams = window.appState.teams;
                window.InitState.currentTeamId = window.appState.currentTeamId;
            } else {
                throw new Error('createDefaultTeams function not available');
            }
        }
        
        // =====================================================================
        // STEP 4: Validate teams
        // =====================================================================
        
        if (!window.appState.teams || window.appState.teams.length === 0) {
            window.createDefaultTeams();
        }
        
        // Normalize older saved team objects so new team-scoped fields are always present.
        window.appState.teams = window.appState.teams.map(team => ({
            ...team,
            players: Array.isArray(team.players) ? team.players : [],
            games: Array.isArray(team.games) ? team.games : [],
            unavailablePlayers: Array.isArray(team.unavailablePlayers) ? team.unavailablePlayers : [],
            formationTemp: Array.isArray(team.formationTemp) ? team.formationTemp : [],
            defaultFormation: Array.isArray(team.defaultFormation) ? team.defaultFormation : []
        }));

        if (!window.appState.currentTeamId) {
            window.appState.currentTeamId = window.appState.teams[0].id;
        }
        
        // =====================================================================
        // STEP 5: Initialize UI
        // =====================================================================
        
        if (typeof updateTeamSelector !== 'function') {
            throw new Error('updateTeamSelector is not defined - app.js may not have loaded');
        }
        updateTeamSelector();
        
        if (!window.TeamSetupScreen || typeof TeamSetupScreen.renderPlayersList !== 'function') {
            throw new Error('TeamSetupScreen.renderPlayersList is not defined');
        }
        TeamSetupScreen.renderPlayersList();
        
        if (typeof updateTeamNameUI !== 'function') {
            throw new Error('updateTeamNameUI is not defined');
        }
        updateTeamNameUI();
        
        // Add demo players if needed
        if (typeof getTeamPlayers !== 'function') {
            throw new Error('getTeamPlayers is not defined');
        }
        const playerCount = getTeamPlayers().length;
        
        if (playerCount === 0) {
            if (typeof addDemoPlayers !== 'function') {
                throw new Error('addDemoPlayers is not defined');
            }
            addDemoPlayers();
        }
        
        // Set date
        const today = new Date().toISOString().split('T')[0];
        const gameDate = document.getElementById('game-date');
        if (gameDate) {
            gameDate.value = today;
        }
        
        // Setup note dialog character counter if exists
        const noteTextarea = document.getElementById('note-text');
        if (noteTextarea) {
            noteTextarea.addEventListener('input', function() {
                const counter = document.getElementById('note-char-count');
                if (counter) {
                    counter.textContent = this.value.length;
                }
            });
        }
        
        // Mark as ready
        window.InitState.ready = true;
        
        // Hide loader and show app
        setTimeout(() => {
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s ease-out';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }
            
            // Show main screen
            if (typeof showScreen === 'function') {
                showScreen('main-screen');
            } else {
                const mainScreen = document.getElementById('main-screen');
                if (mainScreen) {
                    mainScreen.classList.add('active');
                }
            }
        }, 800);
        
    } catch (err) {
        console.error('App failed to initialize:', err.message, err.stack);
        window.InitState.errors.push(err.message);
    }
}

// Ensure initialization runs after DOM is ready AND app.js is loaded
function initializeAppWhenReady() {
    // Check if required functions exist
    if (typeof updateTeamSelector !== 'function' || !window.appState) {
        // Not ready yet, try again in 100ms
        setTimeout(initializeAppWhenReady, 100);
        return;
    }
    
    // Ready! Run initialization
    initializeApp();
}

// Always wait for DOMContentLoaded, even if DOM is already parsed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppWhenReady);
} else {
    // DOM is ready, but wait a tick to ensure scripts from HTML are processed
    setTimeout(initializeAppWhenReady, 50);
}
