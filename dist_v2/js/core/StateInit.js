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

// perform migration from legacy single-team structure if needed
function initState() {
    console.log('🔧 initState() called');
    console.log(`   Current appState.teams: ${appState.teams?.length || 0}`);
    
    if (!appState.teams || appState.teams.length === 0) {
        console.log(`   Teams array is empty, creating defaults...`);
        const hasLegacy = appState.teamName || (appState.players && appState.players.length > 0) || (appState.games && appState.games.length > 0);
        console.log(`   Has legacy data: ${hasLegacy}`);
        
        if (hasLegacy) {
            console.log(`   → Creating from legacy format`);
            // Migrate legacy data to Team A
            const teamA = {
                id: 't1',
                name: appState.teamName || 'Team A',
                players: appState.players || [],
                games: appState.games || [],
                settings: appState.settings || { language:'en', defaultSubstitutionTime:null, isSubstitutionDefaultChecked:false },
                unavailablePlayers: appState.unavailablePlayers || [],
                formationTemp: appState.formationTemp || null
            };
            // Create Team B as new
            const teamB = {
                id: 't2',
                name: 'Team B',
                players: [],
                games: [],
                settings: { language:'en', defaultSubstitutionTime:null, isSubstitutionDefaultChecked:false },
                unavailablePlayers: [],
                formationTemp: null
            };
            appState.teams = [teamA, teamB];
            appState.currentTeamId = teamA.id;
            console.log(`   ✓ Created ${appState.teams.length} teams from legacy data`);
            // clean up legacy fields
            delete appState.teamName;
            delete appState.players;
            delete appState.games;
            delete appState.unavailablePlayers;
        } else {
            console.log(`   → Creating fresh default teams`);
            // New install: create default Team A and Team B
            const teamA = {
                id: 't1',
                name: 'Team A',
                players: [],
                games: [],
                settings: { language:'en', defaultSubstitutionTime:null, isSubstitutionDefaultChecked:false },
                unavailablePlayers: [],
                formationTemp: null
            };
            const teamB = {
                id: 't2',
                name: 'Team B',
                players: [],
                games: [],
                settings: { language:'en', defaultSubstitutionTime:null, isSubstitutionDefaultChecked:false },
                unavailablePlayers: [],
                formationTemp: null
            };
            appState.teams = [teamA, teamB];
            appState.currentTeamId = teamA.id;
            console.log(`   ✓ Created ${appState.teams.length} default teams`);
        }
    } else {
        console.log(`   Teams already exist (${appState.teams.length} teams), no init needed`);
    }
    
    console.log(`   Final state: ${appState.teams.length} teams, currentTeamId=${appState.currentTeamId}`);
}

// make initState available globally
window.initState = initState;

// DO NOT call initState() here - it will overwrite saved localStorage data!
// Instead, loadAppData() in app.js will check localStorage first, then call initState() if needed
