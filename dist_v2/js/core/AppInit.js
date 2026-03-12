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
        
        updateTeamSelector();
        log(`✓ Team selector updated`, 'pass');
        
        TeamSetupScreen.renderPlayersList();
        log(`✓ Player list rendered`, 'pass');
        
        updateTeamNameUI();
        log(`✓ Team name UI updated`, 'pass');
        
        // Add demo players if needed
        const playerCount = getTeamPlayers().length;
        log(`✓ Current team has ${playerCount} players`, 'pass');
        
        if (playerCount === 0) {
            log(`ℹ️  Adding demo players...`, 'info');
            addDemoPlayers();
            log(`✓ Demo players added`, 'pass');
        }
        
        // Set date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('game-date').value = today;
        log(`✓ Date set to today`, 'pass');
        
        // Mark as ready
        window.InitState.ready = true;
        
        log('\n🎉 Application initialized successfully!', 'success');
        
        // Hide loader after 1 second to show final msg
        setTimeout(() => {
            if (loader) {
                loader.style.display = 'none';
            }
            showScreen('main-screen');
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

// Ensure initialization runs after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already ready
    initializeApp();
}
