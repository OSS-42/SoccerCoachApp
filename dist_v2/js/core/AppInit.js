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
    const console_log = document.getElementById('loader-console');
    
    function log(msg, type = 'info') {
        const line = document.createElement('div');
        line.className = `log-line log-${type}`;
        line.textContent = msg;
        if (console_log) {
            console_log.appendChild(line);
            console_log.scrollTop = console_log.scrollHeight;
        }
        window.console.log(`[${type}] ${msg}`);
    }
    
    try {
        log('🚀 Starting application...', 'info');
        
        // =====================================================================
        // STEP 1: Check global state
        // =====================================================================
        log('📋 STEP 1: Checking global state...', 'step');
        
        if (!window.appState) {
            log('❌ appState not defined!', 'error');
            throw new Error('appState not initialized by StateInit.js');
        }
        log(`✓ appState found`, 'pass');
        log(`  - teams: ${window.appState.teams?.length || 0}`, 'info');
        log(`  - currentTeamId: ${window.appState.currentTeamId}`, 'info');
        
        // =====================================================================
        // STEP 2: Check localStorage
        // =====================================================================
        log('💾 STEP 2: Checking localStorage...', 'step');
        
        let savedTeams = null;
        let sourceType = null;
        
        try {
            // Try new format
            const newData = localStorage.getItem('soccerCoachApp2');
            if (newData) {
                log(`✓ Found soccerCoachApp2 (${newData.length} bytes)`, 'pass');
                savedTeams = JSON.parse(newData).teams;
                sourceType = 'new';
            } else {
                // Try legacy format
                const oldData = localStorage.getItem('soccerCoachApp');
                if (oldData) {
                    log(`✓ Found soccerCoachApp [LEGACY] (${oldData.length} bytes)`, 'pass');
                    sourceType = 'legacy';
                } else {
                    log(`ℹ️  No saved data found (fresh start)`, 'info');
                    sourceType = 'fresh';
                }
            }
        } catch (e) {
            log(`⚠️  Error reading localStorage: ${e.message}`, 'warn');
            sourceType = 'fresh';
        }
        
        // =====================================================================
        // STEP 3: Load or create teams
        // =====================================================================
        log('👥 STEP 3: Loading teams...', 'step');
        
        if (sourceType === 'new' && savedTeams && savedTeams.length > 0) {
            log(`✓ Loading ${savedTeams.length} teams from localStorage`, 'pass');
            window.appState.teams = savedTeams;
            window.appState.currentTeamId = window.InitState.currentTeamId || savedTeams[0].id;
            window.InitState.teams = savedTeams;
        } else if (sourceType === 'legacy') {
            log(`ℹ️  Migrating legacy data...`, 'info');
            if (window.migrateLegacyData && typeof window.migrateLegacyData === 'function') {
                // Load legacy data first
                const legacyData = JSON.parse(localStorage.getItem('soccerCoachApp'));
                window.appState.teamName = legacyData.teamName || 'Team A';
                window.appState.players = legacyData.players || [];
                window.appState.games = legacyData.games || [];
                window.appState.unavailablePlayers = legacyData.unavailablePlayers || [];
                
                window.migrateLegacyData();
                log(`✓ Legacy data migrated`, 'pass');
                window.InitState.teams = window.appState.teams;
                window.InitState.currentTeamId = window.appState.currentTeamId;
            } else {
                throw new Error('migrateLegacyData function not available');
            }
        } else {
            // Fresh start - create default teams
            log(`✓ Creating default teams...`, 'pass');
            if (window.createDefaultTeams && typeof window.createDefaultTeams === 'function') {
                window.createDefaultTeams();
                log(`✓ 2 default teams created`, 'pass');
                window.InitState.teams = window.appState.teams;
                window.InitState.currentTeamId = window.appState.currentTeamId;
            } else {
                throw new Error('createDefaultTeams function not available');
            }
        }
        
        // =====================================================================
        // STEP 4: Validate teams
        // =====================================================================
        log('✔️  STEP 4: Validating data...', 'step');
        
        if (!window.appState.teams || window.appState.teams.length === 0) {
            log(`⚠️  No teams found, creating emergency defaults...`, 'warn');
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

        log(`✓ Teams loaded: ${window.appState.teams.length}`, 'pass');
        window.appState.teams.forEach((t, i) => {
            const marker = t.id === window.appState.currentTeamId ? ' ⭐' : '';
            log(`  Team ${i}: "${t.name}" (${t.players?.length || 0} players)${marker}`, 'info');
        });
        
        if (!window.appState.currentTeamId) {
            window.appState.currentTeamId = window.appState.teams[0].id;
            log(`✓ Set currentTeamId to: ${window.appState.currentTeamId}`, 'pass');
        }
        
        // =====================================================================
        // STEP 5: Initialize UI
        // =====================================================================
        log('🎨 STEP 5: Initializing UI...', 'step');
        
        if (typeof updateTeamSelector !== 'function') {
            throw new Error('updateTeamSelector is not defined - app.js may not have loaded');
        }
        updateTeamSelector();
        log(`✓ Team selector updated`, 'pass');
        
        if (!window.TeamSetupScreen || typeof TeamSetupScreen.renderPlayersList !== 'function') {
            throw new Error('TeamSetupScreen.renderPlayersList is not defined');
        }
        TeamSetupScreen.renderPlayersList();
        log(`✓ Player list rendered`, 'pass');
        
        if (typeof updateTeamNameUI !== 'function') {
            throw new Error('updateTeamNameUI is not defined');
        }
        updateTeamNameUI();
        log(`✓ Team name UI updated`, 'pass');
        
        // Add demo players if needed
        if (typeof getTeamPlayers !== 'function') {
            throw new Error('getTeamPlayers is not defined');
        }
        const playerCount = getTeamPlayers().length;
        log(`✓ Current team has ${playerCount} players`, 'pass');
        
        if (playerCount === 0) {
            log(`ℹ️  Adding demo players...`, 'info');
            if (typeof addDemoPlayers !== 'function') {
                throw new Error('addDemoPlayers is not defined');
            }
            addDemoPlayers();
            log(`✓ Demo players added`, 'pass');
        }
        
        // Set date
        const today = new Date().toISOString().split('T')[0];
        const gameDate = document.getElementById('game-date');
        if (gameDate) {
            gameDate.value = today;
            log(`✓ Date set to today`, 'pass');
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
            log(`✓ Note counter setup`, 'pass');
        }
        
        // Mark as ready
        window.InitState.ready = true;
        
        log('\n🎉 Application initialized successfully!', 'success');
        
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
                log('⚠️  showScreen not defined, setting display directly', 'warn');
                const mainScreen = document.getElementById('main-screen');
                if (mainScreen) {
                    mainScreen.classList.add('active');
                }
            }
        }, 800);
        
    } catch (err) {
        log(`\n❌ FATAL ERROR: ${err.message}`, 'error');
        if (err.stack) {
            log(`Stack: ${err.stack}`, 'error');
        }
        window.InitState.errors.push(err.message);
        
        // Still try to show something
        setTimeout(() => {
            if (loader) {
                loader.innerHTML += '<div class="error-message">Application failed to initialize. Check console for details.</div>';
            }
        }, 2000);
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
