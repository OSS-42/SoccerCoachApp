// Global Application State - MUST be loaded before services
// global state structure has been expanded to support multiple teams.
// Older installs will still have the legacy single-team fields; the
// migration logic in `initState()` below will convert them on startup.

window.appState = {
    // teams is an array of objects, each with its own roster/settings/games
    teams: [],
    // id of the team currently being edited/viewed
    currentTeamId: null,
    
    // timers and misc pieces remain at top-level since they are not team-specific
    currentGame: null,
    timer: {
        duration: 6 * 60, // 6 minutes in seconds
        timeLeft: 6 * 60,
        interval: null,
        isRunning: false
    },
    gameTimer: {
        elapsed: 0, // total seconds elapsed in the game
        interval: null,
        isRunning: false,
        startTime: null  // used to calculate elapsed time
    },
    settings: {
        language: 'en',
        defaultSubstitutionTime: null,
        isSubstitutionDefaultChecked: false
    },
    currentPlayer: null,
    formationTemp: null // Temporary storage for formation during setup
};

console.log('✅ StateInit.js: window.appState initialized with empty teams array');
console.log(`   appState.teams = ${window.appState.teams?.length || 0}`);

// helper used throughout the app to access the active team
function getCurrentTeam() {
    let team = appState.teams.find(t => t.id === appState.currentTeamId);
    if (!team) {
        // fall back to first team if id invalid or not set
        team = appState.teams[0];
        if (team) appState.currentTeamId = team.id;
    }
    return team || null;
}

/**
 * Create default teams when localStorage is empty
 * IMPORTANT: This should ONLY be called after localStorage is checked
 * Do NOT call this automatically during script load
 */
function createDefaultTeams() {
    console.log('🆕 createDefaultTeams() called');
    console.log(`   Current teams: ${appState.teams?.length || 0}`);
    
    const teamA = {
        id: 't1',
        name: 'Team A',
        players: [],
        games: [],
        settings: appState.settings || { 
            language: 'en', 
            defaultSubstitutionTime: null, 
            isSubstitutionDefaultChecked: false 
        },
        unavailablePlayers: [],
        formationTemp: null
    };
    
    const teamB = {
        id: 't2',
        name: 'Team B',
        players: [],
        games: [],
        settings: appState.settings || { 
            language: 'en', 
            defaultSubstitutionTime: null, 
            isSubstitutionDefaultChecked: false 
        },
        unavailablePlayers: [],
        formationTemp: null
    };
    
    appState.teams = [teamA, teamB];
    appState.currentTeamId = teamA.id;
    
    console.log(`   ✓ Created ${appState.teams.length} default teams`);
    console.log(`      Team 0: "${teamA.name}" (id=${teamA.id})`);
    console.log(`      Team 1: "${teamB.name}" (id=${teamB.id})`);
    console.log(`   ✓ currentTeamId set to: ${appState.currentTeamId}`);
}

/**
 * Migrate legacy single-team data to new multi-team format
 */
function migrateLegacyData() {
    console.log('🔄 migrateLegacyData() called');
    console.log(`   Checking for legacy fields...`);
    
    const hasLegacy = appState.teamName || (appState.players && appState.players.length > 0);
    
    if (!hasLegacy) {
        console.log(`   ℹ️  No legacy data found`);
        return false;
    }
    
    console.log(`   ✓ Found legacy data - migrating...`);
    
    const teamA = {
        id: 't1',
        name: appState.teamName || 'Team A',
        players: appState.players || [],
        games: appState.games || [],
        settings: appState.settings || { 
            language: 'en', 
            defaultSubstitutionTime: null, 
            isSubstitutionDefaultChecked: false 
        },
        unavailablePlayers: appState.unavailablePlayers || [],
        formationTemp: appState.formationTemp || null
    };
    
    const teamB = {
        id: 't2',
        name: 'Team B',
        players: [],
        games: [],
        settings: appState.settings || { 
            language: 'en', 
            defaultSubstitutionTime: null, 
            isSubstitutionDefaultChecked: false 
        },
        unavailablePlayers: [],
        formationTemp: null
    };
    
    appState.teams = [teamA, teamB];
    appState.currentTeamId = teamA.id;
    
    // Clean up legacy fields
    delete appState.teamName;
    delete appState.players;
    delete appState.games;
    delete appState.unavailablePlayers;
    
    console.log(`   ✓ Migration complete - created 2 teams from legacy data`);
    console.log(`      Team A (migrated): "${teamA.name}" (${teamA.players.length} players)`);
    console.log(`      Team B (new): "Team B" (0 players)`);
    
    return true;
}

// Make both functions available globally
window.createDefaultTeams = createDefaultTeams;
window.migrateLegacyData = migrateLegacyData;
