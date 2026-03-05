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
    if (!appState.teams || appState.teams.length === 0) {
        // existing data will have teamName/players/games
        const legacy = {
            id: 't1',
            name: appState.teamName || 'My Team',
            players: appState.players || [],
            games: appState.games || [],
            settings: appState.settings || { language:'en', defaultSubstitutionTime:null, isSubstitutionDefaultChecked:false },
            unavailablePlayers: appState.unavailablePlayers || [],
            formationTemp: appState.formationTemp || null
        };
        appState.teams = [legacy];
        appState.currentTeamId = legacy.id;
        // clean up legacy fields to avoid confusion
        delete appState.teamName;
        delete appState.players;
        delete appState.games;
        delete appState.unavailablePlayers;
        // note: formationTemp already handled per-team later
    }
}

// immediately run migration on load
initState();
