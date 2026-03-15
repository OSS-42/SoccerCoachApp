// Application State - ALWAYS ensure window.appState exists first
if (!window.appState) {
    console.warn('⚠️  window.appState not found, creating it now');
    window.appState = {
        teams: [],
        currentTeamId: null,
        currentGame: null,
        timer: {
            duration: 6 * 60,
            timeLeft: 6 * 60,
            interval: null,
            isRunning: false
        },
        gameTimer: {
            elapsed: 0,
            interval: null,
            isRunning: false,
            startTime: null
        },
        settings: {
            language: 'en',
            defaultSubstitutionTime: null,
            isSubstitutionDefaultChecked: false
        },
        currentPlayer: null,
        formationTemp: null
    };
}

// Reference the global appState
const appState = window.appState;
console.log('✅ app.js loaded, appState ready');
console.log(`   teams: ${appState.teams?.length || 0}, currentTeamId: ${appState.currentTeamId}`);

// Team helper functions - provide team isolation
function getCurrentTeam() {
    if (appState.teams && appState.teams.length > 0) {
        let team = appState.teams.find(t => t.id === appState.currentTeamId);
        if (!team) {
            team = appState.teams[0];
            appState.currentTeamId = team.id;
        }
        return team;
    }
    return null;
}

function getTeamPlayers() {
    const team = getCurrentTeam();
    return team ? team.players : [];
}

function setTeamPlayers(players) {
    const team = getCurrentTeam();
    if (team) team.players = players;
}

function getTeamName() {
    const team = getCurrentTeam();
    return team ? team.name : '';
}

function setTeamName(name) {
    const team = getCurrentTeam();
    if (team) team.name = name;
}

function getTeamGames() {
    const team = getCurrentTeam();
    return team ? team.games : [];
}

function setTeamGames(games) {
    const team = getCurrentTeam();
    if (team) team.games = games;
}

function getTeamSettings() {
    const team = getCurrentTeam();
    return team ? team.settings : {};
}

function setTeamSettings(settings) {
    const team = getCurrentTeam();
    if (team) team.settings = settings;
}

function getUnavailablePlayers() {
    const team = getCurrentTeam();
    return team ? (team.unavailablePlayers || []) : [];
}

function setUnavailablePlayers(list) {
    const team = getCurrentTeam();
    if (team) team.unavailablePlayers = list;
}

function getFormationTemp() {
    const team = getCurrentTeam();
    return team ? team.formationTemp : null;
}

function setFormationTemp(ft) {
    const team = getCurrentTeam();
    if (team) team.formationTemp = ft;
}

// Export helper functions globally for services
window.getCurrentTeam = getCurrentTeam;
window.getTeamPlayers = getTeamPlayers;
window.setTeamPlayers = setTeamPlayers;
window.getTeamName = getTeamName;
window.setTeamName = setTeamName;
window.getTeamGames = getTeamGames;
window.setTeamGames = setTeamGames;
window.getTeamSettings = getTeamSettings;
window.setTeamSettings = setTeamSettings;
window.getUnavailablePlayers = getUnavailablePlayers;
window.setUnavailablePlayers = setUnavailablePlayers;
window.getFormationTemp = getFormationTemp;
window.setFormationTemp = setFormationTemp;

// Update UI functions
function updateMainScreen() {
    updateTeamSelector();
    updateTeamNameUI();
    TeamSetupScreen.renderPlayersList();
    updatePlayerCounter();
    updateGameReportCounter();
}

function updateUI() {
    updateMainScreen();
}

// Counter update functions
function updatePlayerCounter() {
    const mainCounterElement = document.getElementById('player-counter');
    if (mainCounterElement) {
        const teamPlayers = getTeamPlayers();
        mainCounterElement.textContent = teamPlayers.length;
    }
}

function updateGameReportCounter() {
    const counterElement = document.getElementById('game-report-counter');
    if (counterElement) {
        const teamGames = getTeamGames();
        const completedGames = teamGames.filter(game => game.isCompleted).length;
        counterElement.textContent = completedGames;
    }
}

// Initialize the app
// Utility functions for common operations
function getElement(id) {
    return document.getElementById(id);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Initialize app styling - light mode only
function initializeStyling() {
    // No styling needed, we're using light mode only
}

// Message functions
let messageTimeout = null;

function showMessage(message, type = 'error') {
    const ribbon = document.getElementById('message-ribbon');
    const messageText = document.getElementById('message-text');
    
    if (!ribbon || !messageText) {
        console.error('Message ribbon or text element not found');
        console.error('ribbon:', ribbon);
        console.error('messageText:', messageText);
        alert(`Error: ${message}`); // Fallback to alert if ribbon not found
        return;
    }
    
    // Clear any existing timeout to prevent overlapping messages
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    // Ensure ribbon HTML is correct (TeamSetupScreen may have modified it)
    if (!ribbon.querySelector('.close-btn')) {
        ribbon.innerHTML = `<span id="message-text"></span><button class="close-btn" onclick="hideMessage()">×</button>`;
    }
    
    // Set the message content
    const messageTextElement = ribbon.querySelector('#message-text');
    if (messageTextElement) {
        messageTextElement.textContent = message;
    } else {
        ribbon.innerHTML = `<span id="message-text">${message}</span><button class="close-btn" onclick="hideMessage()">×</button>`;
    }
    
    // Reset classes - start fresh
    ribbon.className = '';
    
    // Add message-ribbon class and type (error/success/warning)
    ribbon.classList.add('message-ribbon', type);
    
    // Remove hidden class to show
    ribbon.classList.remove('hidden');
    
    // Force visible with inline styles (overrides any CSS !important)
    ribbon.style.setProperty('display', 'flex', 'important');
    ribbon.style.setProperty('visibility', 'visible', 'important');
    ribbon.style.setProperty('opacity', '1', 'important');
    ribbon.style.setProperty('height', 'auto', 'important');
    ribbon.style.setProperty('padding', '20px', 'important');
    ribbon.style.setProperty('margin', '0', 'important');
    ribbon.style.setProperty('border', 'none', 'important');
    
    // Auto-hide after 5 seconds for success, 7 seconds for errors
    const hideDelay = type === 'error' ? 7000 : 5000;
    messageTimeout = setTimeout(hideMessage, hideDelay);
    
    // Log message for debugging - includes element inspection
    console.log(`✓ Message shown (${type}):`, message);
    console.log('Ribbon DOM:', ribbon.outerHTML.substring(0, 100));
}

function hideMessage() {
    const ribbon = document.getElementById('message-ribbon');
    if (ribbon) {
        ribbon.classList.add('hidden');
        ribbon.style.setProperty('display', 'none', 'important');
        ribbon.style.setProperty('height', '0', 'important');
        ribbon.style.setProperty('padding', '0', 'important');
        console.log('✓ Message hidden');
    }
}

// ===== INITIALIZATION IS NOW HANDLED BY AppInit.js =====
// This file contains only the application logic functions
// Do NOT add DOMContentLoaded handlers here - use AppInit.js instead
// =========================================================

// Team Name functions
function updateTeamNameUI() {
    // Update team name in the input field
    const teamNameInput = document.getElementById('team-name-input');
    if (teamNameInput) {
        teamNameInput.value = getTeamName();
    }
    
    // Update team name in game screen
    const teamNameElements = document.querySelectorAll('.team-name');
    teamNameElements.forEach(element => {
        if (element.id !== 'opponent-team-name') {
            element.textContent = getTeamName().toUpperCase();
        }
    });
}

function handleTeamChange(selectElement) {
    // Get the new team ID from the element that triggered the change
    let newTeamId = null;
    
    if (selectElement && selectElement.value) {
        // Use the element that triggered the change
        newTeamId = selectElement.value;
    } else {
        // Fallback: check both selectors (shouldn't normally happen)
        const teamSelector = document.getElementById('team-selector');
        const mainSelector = document.getElementById('main-team-selector');
        if (mainSelector && mainSelector.value) {
            newTeamId = mainSelector.value;
        } else if (teamSelector && teamSelector.value) {
            newTeamId = teamSelector.value;
        } else {
            return;
        }
    }
    
    appState.currentTeamId = newTeamId;
    saveAppData();
    updateTeamSelector(); // Update both selectors
    updateUI();
    
    // Update counters on both screens
    const teamPlayers = getTeamPlayers();
    const mainCounterElement = document.getElementById('player-counter');
    const teamCounterElement = document.getElementById('team-player-counter');
    if (mainCounterElement) {
        mainCounterElement.textContent = teamPlayers.length;
    }
    if (teamCounterElement) {
        teamCounterElement.textContent = teamPlayers.length;
    }
    
    // Update game report counter
    updateGameReportCounter();
    
    // Update team name banners on all screens
    updateTeamNameBanner('game-setup-team-name');
    updateTeamNameBanner('formation-setup-team-name');
    updateTeamNameBanner('main-screen-team-name');
    updateTeamNameBanner('team-setup-team-name');
    updateTeamNameBanner('reports-team-name');
    
    // Re-render reports if on reports screen
    const reportsScreen = document.getElementById('reports');
    if (reportsScreen && reportsScreen.classList.contains('active')) {
        ReportsScreen.renderReportsList();
    }
    
    // If on a specific screen, refresh its content for the new team
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) {
        const screenId = activeScreen.id;
        if (screenId === 'team-setup') {
            // Check if we need to update team setup content
            const playersTabContent = document.getElementById('players-tab-content');
            const statsTabContent = document.getElementById('statistics-tab-content');
            
            if (playersTabContent && playersTabContent.classList.contains('active')) {
                if (typeof TeamSetupScreen !== 'undefined') {
                    TeamSetupScreen.renderPlayersList();
                }
            } else if (statsTabContent && statsTabContent.classList.contains('active')) {
                // Re-render statistics for the new team
                renderPlayerStatistics();
            }
        } else if (screenId === 'formation-setup' && typeof FormationScreen !== 'undefined') {
            FormationScreen.renderFormationSetup();
        }
    }
}

function addNewTeam() {
    const maxTeams = 2;
    const currentTeamCount = appState.teams.length;
    
    if (currentTeamCount >= maxTeams) {
        showMessage(
            `You can create a maximum of ${maxTeams} teams. To manage more teams, this will be available as a premium feature.`,
            'error'
        );
        return;
    }
    
    const name = prompt('Enter new team name:');
    if (!name) return;
    
    const id = 't' + Date.now();
    const team = {
        id,
        name: name.trim().toUpperCase(),
        players: [],
        games: [],
        settings: { language: 'en', defaultSubstitutionTime: null, isSubstitutionDefaultChecked: false },
        unavailablePlayers: [],
        formationTemp: null
    };
    
    appState.teams.push(team);
    appState.currentTeamId = id;
    saveAppData();
    updateUI();
    updateMainScreen();
    showMessage(`Team "${name}" created successfully`, 'success');
}

function deleteTeam() {
    const currentTeamId = appState.currentTeamId;
    const currentTeam = getCurrentTeam();
    
    if (!currentTeam) {
        showMessage('No team to delete', 'error');
        return;
    }
    
    // Prevent deletion if only one team exists
    if (appState.teams.length <= 1) {
        showMessage('You must have at least one team', 'error');
        return;
    }
    
    const confirmDelete = confirm(
        `Are you sure you want to delete the team "${currentTeam.name}"?\n\nAll players and game data for this team will be permanently erased.`
    );
    
    if (!confirmDelete) return;
    
    // Remove the team
    appState.teams = appState.teams.filter(t => t.id !== currentTeamId);
    
    // Switch to another team (first available)
    if (appState.teams.length > 0) {
        appState.currentTeamId = appState.teams[0].id;
    }
    
    saveAppData();
    updateUI();
    updateMainScreen();
    showMessage(`Team "${currentTeam.name}" has been deleted`, 'success');
}

function saveTeamName() {
    const teamNameInput = document.getElementById('team-name-input');
    const newTeamName = teamNameInput.value.trim().toUpperCase();
    
    if (newTeamName) {
        setTeamName(newTeamName);
        saveAppData();
        updateTeamSelector();
        updateTeamNameUI();
        showMessage('Team name saved successfully', 'success');
    } else {
        showMessage('Please enter a team name', 'error');
    }
}

// Screen Navigation
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    document.getElementById(screenId).classList.add('active');
    
    // Update team selector and banners for main-screen and team-setup screen
    if (screenId === 'team-setup' || screenId === 'main-screen') {
        updateTeamSelector();
        updatePlayerCounter();
        updateGameReportCounter();
    }
    
    // Special handling for specific screens
    if (screenId === 'reports') {
        updateTeamNameBanner('reports-team-name');
        updateTeamSelectorElement('reports-team-selector');
        if (typeof ReportsScreen !== 'undefined' && ReportsScreen.renderReportsList) {
            ReportsScreen.renderReportsList();
        } else {
            renderReportsList();
        }
    } else if (screenId === 'game-setup') {
        // Auto-fill today's date when opening the game setup screen
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('game-date').value = `${year}-${month}-${day}`;
        updateTeamNameBanner('game-setup-team-name');
    } else if (screenId === 'formation-setup') {
        updateTeamNameBanner('formation-setup-team-name');
    } else if (screenId === 'game-tracking') {
        // Render player grid when entering game tracking screen
        renderPlayerGrid();
    }
}

function updateTeamSelector() {
    console.log('🔄 updateTeamSelector() called');
    console.log(`   appState.teams: ${appState.teams?.length || 0} teams`);
    console.log(`   appState.currentTeamId: ${appState.currentTeamId}`);
    appState.teams?.forEach((t, i) => {
        console.log(`      Team ${i}: "${t.name}" (id=${t.id})`);
    });
    
    // Update both selectors
    updateTeamSelectorElement('team-selector');
    updateTeamSelectorElement('main-team-selector');
    updateTeamNameBanner('main-screen-team-name');
    updateTeamNameBanner('team-setup-team-name');
}

function updateTeamSelectorElement(selectorId) {
    const selector = document.getElementById(selectorId);
    console.log(`   Updating ${selectorId}: element found=${!!selector}`);
    if (!selector) {
        console.warn(`   ❌ Element ${selectorId} not found!`);
        return;
    }
    const teams = appState.teams || [];
    const currentId = appState.currentTeamId;
    console.log(`   Teams to populate: ${teams.length}, Current: ${currentId}`);
    selector.innerHTML = '';
    teams.forEach(team => {
        const opt = document.createElement('option');
        opt.value = team.id;
        opt.textContent = team.name || 'Unnamed Team';
        if (team.id === currentId) opt.selected = true;
        selector.appendChild(opt);
        console.log(`      Added option: "${team.name}"`);
    });
    console.log(`   ✓ ${selectorId} populated with ${teams.length} teams`);
}

function updateTeamNameBanner(bannerId) {
    const bannerElement = document.getElementById(bannerId);
    if (bannerElement) {
        const teamName = getTeamName();
        bannerElement.textContent = teamName || 'Team Name';
    }
}

// Tab switching function for Team Setup screen
function switchTeamTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('[id$="-tab-content"]');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const activeContent = document.getElementById(tabName + '-tab-content');
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // Mark selected tab button as active
    const activeButton = document.getElementById(tabName + '-tab');
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Render content for the tab
    if (tabName === 'statistics') {
        renderPlayerStatistics();
    }
}

// Render player statistics - delegate to StatisticsService
function renderPlayerStatistics() {
    if (typeof StatisticsService !== 'undefined' && StatisticsService.renderPlayerStatistics) {
        StatisticsService.renderPlayerStatistics();
    }
}

// Formation setup function
function setupFormation() {
    // Check if team has enough players for the match type
    const requiredPlayerCount = parseInt(document.getElementById('match-type').value.split('v')[0]);
    const teamPlayers = getTeamPlayers();
    
    if (teamPlayers.length < requiredPlayerCount) {
        showMessage(`You need at least ${requiredPlayerCount} players for ${document.getElementById('match-type').value}. Your team has ${teamPlayers.length} player${teamPlayers.length !== 1 ? 's' : ''}.`, 'error');
        return;
    }
    
    // Validate required game setup fields
    const opponentName = document.getElementById('opponent-name').value.trim().toUpperCase();
    const gameDate = document.getElementById('game-date').value;
    const matchType = document.getElementById('match-type').value;
    const numPeriods = document.getElementById('num-periods').value;
    const periodDuration = document.getElementById('period-duration').value || 12; // Default to 12 minutes
    const useSubstitutionTimer = !document.getElementById('use-substitution-timer').checked;
    const substitutionTime = document.getElementById('substitution-time').value;
    
    if (!opponentName) {
        showMessage('Please enter the opponent team name', 'error');
        return;
    }
    
    if (!gameDate) {
        showMessage('Please enter the game date', 'error');
        return;
    }

    if (!matchType) {
        showMessage('Please select a match type', 'error');
        return;
    }

    if (!numPeriods || parseInt(numPeriods) < 1) {
        showMessage('Please specify at least 1 period', 'error');
        return;
    }
    
    // Only require substitution time if timer is actually needed
    if (useSubstitutionTimer && !substitutionTime) {
        showMessage('Please enter substitution timer duration', 'error');
        return;
    }
    
    // Reset player stats for this new game
    getTeamPlayers().forEach(player => {
        player.stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        };
    });
    
    // Create the game object (minimal version for formation setup)
    // Get current team name
    const currentTeamId = appState.currentTeamId;
    const currentTeam = appState.teams.find(t => t.id === currentTeamId);
    const teamName = currentTeam ? currentTeam.name : 'Team';
    
    appState.currentGame = {
        id: Date.now().toString(),
        date: gameDate,
        teamName: teamName,
        opponentName,
        matchType,
        numPeriods: parseInt(numPeriods),
        periodDuration: parseInt(periodDuration),
        homeScore: 0,
        awayScore: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        actions: [],
        activePlayers: [...getTeamPlayers().map(p => p.id)],
        isCompleted: false,
        totalGameTime: 0,
        gameTime: 0,
        periodScores: []
    };
    
    // Save the game data
    saveAppData();
    
    // Show formation setup screen
    showScreen('formation-setup');
    // Store match type for formation validation
    appState.gameSetupMatchType = matchType;
    if (typeof FormationScreen !== 'undefined' && FormationScreen.renderFormationSetup) {
        FormationScreen.renderFormationSetup();
    }
}

// Formation validation - called when user clicks Start Formation or tries to move to game tracking
function validateFormationSetup() {
    let formationPlayers = getFormationTemp() || [];
    const requiredPlayerCount = parseInt(appState.gameSetupMatchType.split('v')[0]);
    const isDesktopLayout = window.matchMedia('(min-width: 769px)').matches;

    // Prefer current field DOM as source of truth for slot assignments.
    const fieldSpotPlayers = Array.from(document.querySelectorAll('.player-slot[data-player-id]')).map(spot => ({
        playerId: spot.getAttribute('data-player-id'),
        position: spot.getAttribute('data-position'),
        x: parseFloat(spot.style.left),
        y: parseFloat(spot.style.top)
    }));
    if (fieldSpotPlayers.length > 0) {
        formationPlayers = fieldSpotPlayers;
        setFormationTemp(fieldSpotPlayers);
    }
    
    // Check that on-field players match required count
    if (formationPlayers.length !== requiredPlayerCount) {
        showMessage(`On-field players must be exactly ${requiredPlayerCount} for ${appState.gameSetupMatchType}. Currently selected: ${formationPlayers.length}`, 'error');
        return false;
    }
    
    // Check that the visual GK spot has a player:
    // mobile = bottom-most row, desktop (rotated field) = left-most spot.
    let goalkeeperFilled = false;
    const allFieldSlots = Array.from(document.querySelectorAll('.player-slot[data-position]'));
    if (allFieldSlots.length > 0) {
        const allSlotY = allFieldSlots
            .map(slot => parseFloat(slot.style.top))
            .filter(y => Number.isFinite(y));

        if (allSlotY.length > 0) {
            const goalkeeperRowY = Math.max(...allSlotY);
            const yTolerance = 0.25;
            const goalkeeperSlots = allFieldSlots.filter(slot => {
                const y = parseFloat(slot.style.top);
                return Number.isFinite(y) && Math.abs(y - goalkeeperRowY) <= yTolerance;
            });

            goalkeeperFilled = goalkeeperSlots.some(slot => !!slot.getAttribute('data-player-id'));
        }
    }

    // Fallback for non-rendered states.
    if (!goalkeeperFilled) {
        goalkeeperFilled = formationPlayers.some(p => p.position === 'GK');
    }

    if (!goalkeeperFilled) {
        const gkLocationText = isDesktopLayout ? 'left side of field' : 'bottom of field';
        showMessage(`Goalkeeper position (${gkLocationText}) must be filled`, 'error');
        return false;
    }
    
    return true;
}

// Player Management
function openAddPlayerDialog() {
    toggleDialog('add-player-dialog', true);
}

function closeAddPlayerDialog() {
    toggleDialog('add-player-dialog', false);
    document.getElementById('player-name').value = '';
    document.getElementById('jersey-number').value = '';
}

function addPlayer() {
    console.log('🆕 addPlayer() called');
    const name = document.getElementById('player-name').value.trim().toUpperCase();
    const jerseyNumber = document.getElementById('jersey-number').value;
    const position = document.getElementById('player-position').value;
    
    if (!name || !jerseyNumber) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Check for duplicate jersey numbers
    const teamPlayers = getTeamPlayers();
    console.log(`   Current team has ${teamPlayers?.length || 0} players`);
    if (teamPlayers.some(p => p.jerseyNumber === Number(jerseyNumber))) {
        showMessage('A player with this jersey number already exists', 'error');
        return;
    }
    
    // Generate a unique ID that isn't already in use
    let playerId;
    do {
        playerId = Math.floor(Math.random() * 1000000).toString();
    } while (getTeamPlayers().some(p => p.id === playerId));
    
    const player = {
        id: playerId,
        name,
        jerseyNumber: Number(jerseyNumber),
        position: position,
        stats: {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        }
    };
    
    console.log(`   ➕ Adding player: ${name} #${jerseyNumber} (${position})`);
    const team = getCurrentTeam();
    console.log(`   Team found: ${team?.name}, Players before: ${team?.players?.length || 0}`);
    
    getTeamPlayers().push(player);
    console.log(`   Players after push: ${getTeamPlayers()?.length || 0}`);
    
    saveAppData();
    console.log(`   ✅ Player added and saved!`);
    
    showMessage(`Player "${name}" (${position}) added successfully`, 'success');
    TeamSetupScreen.renderPlayersList();
    closeAddPlayerDialog();
}

// Game Management
function startGame() {
    const opponentName = document.getElementById('opponent-name').value.trim().toUpperCase();
    const gameDate = document.getElementById('game-date').value;
    const substitutionTime = document.getElementById('substitution-time').value;
    
    if (!opponentName) {
        showMessage('Please enter the opponent team name', 'error');
        return;
    }
    
    // Reset player stats for this new game
    getTeamPlayers().forEach(player => {
        player.stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        };
    });
    
    // Create the new game
    appState.currentGame = {
        id: Date.now().toString(),
        date: gameDate,
        opponentName,
        homeScore: 0,
        awayScore: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        actions: [],
        activePlayers: [...getTeamPlayers().map(p => p.id)],
        isCompleted: false,
        totalGameTime: 0, // Track total game time in seconds
        periodScores: []
    };
    
    // Setup substitution timer
    appState.timer.duration = parseInt(substitutionTime) * 60;
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
    
    // Reset and setup game timer
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.isRunning = false;
    appState.gameTimer.startTime = null;
    updateGameTimeDisplay();
    
    // Update opponent name in UI
    document.getElementById('opponent-team-name').textContent = opponentName.toUpperCase();
    
    // Reset scores
    document.getElementById('home-score').textContent = '0';
    document.getElementById('away-score').textContent = '0';
    
    // Populate player grid
    renderPlayerGrid();
    
    // Update period counter display
    updatePeriodCounterDisplay();
    
    // Switch to game screen
    showScreen('game-tracking');
}

function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';
    
    // Get formation players if we're in a game
    const formationPlayerIds = appState.currentGame && appState.currentGame.formationPlayers 
        ? appState.currentGame.formationPlayers.map(p => p.playerId) 
        : [];
    
    // Get unavailable players - exclude them from the live game display
    const unavailablePlayers = getUnavailablePlayers();
    
    // Using all players, not filtering by active status anymore
    getTeamPlayers().sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        // Skip unavailable players - they don't appear in the live game screen
        if (unavailablePlayers.includes(player.id)) {
            return;
        }
        // Ensure player has stats object
        if (!player.stats) {
            player.stats = {
                goals: 0,
                assists: 0,
                saves: 0,
                goalsAllowed: 0,
                yellowCards: 0,
                redCards: 0
            };
        }
        
        const playerGridItem = document.createElement('div');
        playerGridItem.className = 'player-grid-item';
        playerGridItem.setAttribute('data-player-id', player.id);
        
        // Determine player status: starter (on field) or substitute (benched)
        const isStarter = formationPlayerIds.includes(player.id);
        if (isStarter) {
            playerGridItem.classList.add('starter');
        } else {
            playerGridItem.classList.add('substitute');
        }
        
        // Live-game tile content: jersey + name only (no per-tile stat grid).
        playerGridItem.innerHTML = `
            <div class="player-header">
                <div class="game-jersey-badge">
                    <span class="jersey-num">${player.jerseyNumber}</span>
                </div>
                <div class="game-player-name">${player.name}</div>
            </div>
        `;
        
        // Apply card classes if player has cards
        const redCards = player.stats.redCards || 0;
        const yellowCards = player.stats.yellowCards || 0;
        if (redCards > 0) {
            playerGridItem.classList.add('red-card');
        } else if (yellowCards > 0) {
            playerGridItem.classList.add('yellow-card');
        }
        
        playerGridItem.addEventListener('click', () => {
            openPlayerActionDialog(player);
        });
        
        playerGrid.appendChild(playerGridItem);
    });
}

// Timer Functions
function updateTimerDisplay() {
    const timerDisplay = getElement('substitution-timer');
    const timerValue = timerDisplay.querySelector('.timer-value');
    
    if (timerValue) {
        timerValue.textContent = formatTime(appState.timer.timeLeft);
    }
    
    // Add alert styling if timer is at zero
    if (appState.timer.timeLeft === 0) {
        timerDisplay.classList.add('timer-alert');
    } else {
        timerDisplay.classList.remove('timer-alert');
    }
}

function updateGameTimeDisplay() {
    const gameTimeElement = getElement('game-time');
    if (gameTimeElement) {
        gameTimeElement.textContent = `Time: ${formatTime(appState.gameTimer.elapsed)}`;
    }
}

function updatePeriodCounterDisplay() {
    const periodCounterElement = getElement('period-counter');
    if (periodCounterElement && appState.currentGame) {
        const periodDuration = (appState.currentGame.periodDuration || 45) * 60; // Convert to seconds
        const currentPeriodIndex = Math.floor((appState.currentGame.gameTime || 0) / periodDuration);
        const currentPeriodNumber = currentPeriodIndex + 1; // Convert to 1-based
        const numPeriods = appState.currentGame.numPeriods || 2;
        periodCounterElement.textContent = `Period ${currentPeriodNumber} of ${numPeriods}`;
    }
}

function startTimer() {
    if (!appState.timer.isRunning && appState.timer.timeLeft > 0) {
        appState.timer.isRunning = true;
        appState.timer.interval = setInterval(() => {
            if (appState.timer.timeLeft > 0) {
                appState.timer.timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(appState.timer.interval);
                appState.timer.isRunning = false;
            }
        }, 1000);
        
        // Also start the game timer if not already running
        startGameTimer();
    }
}

function pauseTimer() {
    clearInterval(appState.timer.interval);
    appState.timer.isRunning = false;
    
    // We don't pause the game timer when the substitution timer is paused
    // The game continues even if substitutions are paused
}

function resetTimer() {
    pauseTimer();
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
}

function startGameTimer() {
    if (!appState.gameTimer.isRunning) {
        appState.gameTimer.isRunning = true;
        appState.gameTimer.startTime = new Date();
        
        appState.gameTimer.interval = setInterval(() => {
            appState.gameTimer.elapsed++;
            updateGameTimeDisplay();
            
            // Update the current game's total time
            if (appState.currentGame) {
                appState.currentGame.totalGameTime = appState.gameTimer.elapsed;
            }
        }, 1000);
    }
}

function pauseGameTimer() {
    if (appState.gameTimer.isRunning) {
        clearInterval(appState.gameTimer.interval);
        appState.gameTimer.isRunning = false;
    }
}

function stopGameTimer() {
    // Stop the timer first
    if (appState.gameTimer.isRunning) {
        clearInterval(appState.gameTimer.interval);
        appState.gameTimer.isRunning = false;
    }
    
    appState.gameTimer.interval = null;
    
    // Stop substitution timer AND reset it to default value
    pauseTimer();
    resetTimer();
    
    // Calculate current period and total periods
    const game = appState.currentGame;
    const periodDurationSeconds = (game.periodDuration || 45) * 60;
    const currentPeriod = Math.floor((game.gameTime || 0) / periodDurationSeconds) + 1;
    const totalPeriods = game.numPeriods || 2;
    
    const isLastPeriod = currentPeriod >= totalPeriods;
    
    // Show period finish dialog
    const title = document.getElementById('period-finish-title');
    const message = document.getElementById('period-finish-message');
    
    if (isLastPeriod) {
        title.textContent = 'End Game';
        message.textContent = 'Is the game finished?';
        appState.pendingPeriodAction = 'end-game';
    } else {
        title.textContent = `Finish Period ${currentPeriod}`;
        message.textContent = `Is period ${currentPeriod} finished?`;
        appState.pendingPeriodAction = 'finish-period';
    }
    
    toggleDialog('period-finish-dialog', true);
}

function closePeriodFinishDialog() {
    toggleDialog('period-finish-dialog', false);
    appState.pendingPeriodAction = null;
}

function confirmPeriodFinish() {
    const action = appState.pendingPeriodAction;
    closePeriodFinishDialog();
    
    if (action === 'end-game') {
        endGame();
    } else if (action === 'finish-period') {
        finishPeriod();
    }
}

function finishPeriod() {
    if (!appState.currentGame) return;
    
    const game = appState.currentGame;
    const periodDuration = game.periodDuration || 45; // Default to 45 minutes if not set
    const periodDurationSeconds = periodDuration * 60;
    
    // Calculate which period we're currently in (0-based)
    const currentPeriodIndex = Math.floor((game.gameTime || 0) / periodDurationSeconds);
    
    // Capture period score before moving to next period
    if (!game.periodScores) game.periodScores = [];
    game.periodScores.push({
        home: game.homeScore || 0,
        away: game.awayScore || 0
    });
    
    // Calculate the start time of the next period (in seconds)
    const nextPeriodStartSeconds = (currentPeriodIndex + 1) * periodDurationSeconds;
    
    // Set gameTime to the start of next period
    game.gameTime = nextPeriodStartSeconds;
    
    // Update game timer to match the period time
    appState.gameTimer.elapsed = Math.floor(nextPeriodStartSeconds);
    
    // Reset substitution timer with default duration
    resetTimer();
    
    // Update UI displays
    updateGameTimeDisplay();
    updatePeriodCounterDisplay();
    
    // Save state
    saveAppData();
    
    // Show message
    const nextPeriodNumber = currentPeriodIndex + 2; // Period number is 1-based
    showMessage(`Period ${currentPeriodIndex + 1} finished. Starting period ${nextPeriodNumber}.`, 'success');
}

// Player Actions
// Helper function to handle dialog operations
function toggleDialog(dialogId, isOpen) {
    document.getElementById(dialogId).style.display = isOpen ? 'flex' : 'none';
}

function openPlayerActionDialog(player) {
    // Don't allow actions on red-carded players
    if (player.stats && player.stats.redCards > 0) {
        showMessage('Cannot perform actions on red-carded players', 'error');
        return;
    }
    
    // Don't allow actions on injured players
    if (player.stats && player.stats.injured) {
        showMessage('Cannot perform actions on injured players', 'error');
        return;
    }
    
    appState.currentPlayer = player;
    document.getElementById('action-player-name').textContent = player.name;
    toggleDialog('player-action-dialog', true);
}

function closePlayerActionDialog() {
    toggleDialog('player-action-dialog', false);
    appState.currentPlayer = null;
}

// Goal with possible assist handling
function handleGoalAction() {
    if (!appState.currentPlayer) return;
    
    // Record the current player as the scorer
    appState.goalScorer = appState.currentPlayer;
    
    // Close the player action dialog
    closePlayerActionDialog();
    
    // Show the assist selection dialog
    openAssistSelectionDialog();
}

function openAssistSelectionDialog() {
    const playersGrid = document.getElementById('assist-players-grid');
    
    // Clear previous content
    playersGrid.innerHTML = '';
    
    // Get all players excluding the goal scorer and red/yellow-carded players
    const activePlayers = getTeamPlayers().filter(p => {
        // Exclude goal scorer
        if (p.id === appState.goalScorer.id) return false;
        
        // Exclude red-carded players
        if (p.stats && p.stats.redCards > 0) return false;
        
        // Exclude players with 2+ yellow cards (auto red)
        if (p.stats && p.stats.yellowCards >= 2) return false;
        
        return true;
    });
    
    // Add players to the grid
    activePlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-select-item';
        playerItem.innerHTML = `
            <div class="player-select-number">${player.jerseyNumber}</div>
            <div>${player.name}</div>
        `;
        playerItem.addEventListener('click', () => {
            completeGoalWithAssist(player.id);
        });
        playersGrid.appendChild(playerItem);
    });
    
    toggleDialog('assist-selection-dialog', true);
}

function closeAssistSelectionDialog() {
    toggleDialog('assist-selection-dialog', false);
    appState.goalScorer = null;
}

function completeGoalWithAssist(assistPlayerId) {
    if (!appState.goalScorer || !assistPlayerId) return;
    
    // Verify the assister isn't red-carded
    const assister = getTeamPlayers().find(p => p.id === assistPlayerId);
    if (assister && assister.stats && assister.stats.redCards > 0) {
        showMessage('Cannot assign assist to red-carded player', 'error');
        return;
    }
    
    // Record the goal for the scorer
    recordAction('goal', appState.goalScorer.id);
    
    // Record the assist for the assisting player
    recordAction('assist', assistPlayerId);
    
    // Close the dialog
    closeAssistSelectionDialog();
}

function completeGoalWithoutAssist() {
    if (!appState.goalScorer) return;
    
    // Record just the goal with no assist
    recordAction('goal', appState.goalScorer.id);
    
    // Close the dialog
    closeAssistSelectionDialog();
}

// Assist with goal scorer handling
function handleAssistAction() {
    if (!appState.currentPlayer) return;
    
    // Record the current player as the assister
    appState.assister = appState.currentPlayer;
    
    // Close the player action dialog
    closePlayerActionDialog();
    
    // Show the goal scorer selection dialog
    openScorerSelectionDialog();
}

function openScorerSelectionDialog() {
    const playersGrid = document.getElementById('scorer-players-grid');
    
    // Clear previous content
    playersGrid.innerHTML = '';
    
    // Get all players excluding the assister
    const activePlayers = getTeamPlayers().filter(p => p.id !== appState.assister.id);
    
    // Add players to the grid
    activePlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-select-item';
        playerItem.innerHTML = `
            <div class="player-select-number">${player.jerseyNumber}</div>
            <div>${player.name}</div>
        `;
        playerItem.addEventListener('click', () => {
            completeAssistWithScorer(player.id);
        });
        playersGrid.appendChild(playerItem);
    });
    
    toggleDialog('scorer-selection-dialog', true);
}

function closeScorerSelectionDialog() {
    toggleDialog('scorer-selection-dialog', false);
    appState.assister = null;
}

function completeAssistWithScorer(scorerId) {
    if (!appState.assister || !scorerId) return;
    
    // Record the assist for the assisting player
    recordAction('assist', appState.assister.id);
    
    // Record the goal for the scorer
    recordAction('goal', scorerId);
    
    // Close the dialog
    closeScorerSelectionDialog();
}

function recordAction(actionType, specificPlayerId = null) {
    if (!appState.currentGame) return;
    
    // Use the specified player ID or the current player's ID
    const playerId = specificPlayerId || (appState.currentPlayer ? appState.currentPlayer.id : null);
    if (!playerId) return;
    
    const teamPlayers = getTeamPlayers();
    const playerIndex = teamPlayers.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return; // Player not found
    
    // Ensure player stats object is initialized with all fields including cards
    if (!teamPlayers[playerIndex].stats) {
        teamPlayers[playerIndex].stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0,
            yellowCards: 0,
            redCards: 0
        };
    }
    
    const action = {
        timestamp: new Date().toISOString(),
        playerId,
        actionType,
        gameMinute: calculateGameMinute()
    };
    
    appState.currentGame.actions.push(action);
    
    // Update player stats
    switch (actionType) {
        case 'goal':
            teamPlayers[playerIndex].stats.goals++;
            appState.currentGame.homeScore++;
            document.getElementById('home-score').textContent = appState.currentGame.homeScore;
            break;
        case 'assist':
            teamPlayers[playerIndex].stats.assists++;
            break;
        case 'save':
            teamPlayers[playerIndex].stats.saves++;
            break;
        case 'goal_allowed':
            teamPlayers[playerIndex].stats.goalsAllowed++;
            appState.currentGame.awayScore++;
            document.getElementById('away-score').textContent = appState.currentGame.awayScore;
            break;
        case 'yellow_card':
            teamPlayers[playerIndex].stats.yellowCards = (teamPlayers[playerIndex].stats.yellowCards || 0) + 1;
            
            // If 2 yellow cards, convert to red card
            if (teamPlayers[playerIndex].stats.yellowCards >= 2) {
                teamPlayers[playerIndex].stats.redCards = (teamPlayers[playerIndex].stats.redCards || 0) + 1;
                teamPlayers[playerIndex].stats.yellowCards = 0;
                
                // Show message about red card conversion
                showMessage(`2 yellow cards issued to ${teamPlayers[playerIndex].name}. Converted to Red Card!`, 'warning');
                
                // Update red card counter
                const redCounter = document.getElementById('red-card-count');
                if (redCounter) {
                    redCounter.textContent = (parseInt(redCounter.textContent) || 0) + 1;
                }
                const yellowCounter = document.getElementById('yellow-card-count');
                if (yellowCounter) {
                    yellowCounter.textContent = '0';
                }
            } else {
                // Update yellow card counter
                const yellowCounter = document.getElementById('yellow-card-count');
                if (yellowCounter) {
                    yellowCounter.textContent = (parseInt(yellowCounter.textContent) || 0) + 1;
                }
            }
            break;
        case 'red_card':
            teamPlayers[playerIndex].stats.redCards = (teamPlayers[playerIndex].stats.redCards || 0) + 1;
            // Update red card counter
            const redCounter = document.getElementById('red-card-count');
            if (redCounter) {
                redCounter.textContent = (parseInt(redCounter.textContent) || 0) + 1;
            }
            break;
        case 'injury':
            // Mark player as injured (unavailable) for the rest of the game
            if (!teamPlayers[playerIndex].stats.injured) {
                teamPlayers[playerIndex].stats.injured = true;
            }
            
            // Show message about player injury
            showMessage(`${teamPlayers[playerIndex].name} is injured and no longer available`, 'warning');
            break;
    }
    
    // Update player grid item
    updatePlayerGridItem(playerId);
    
    saveAppData();
    
    // Only close the dialog if it was opened directly (not via another action flow)
    if (!specificPlayerId) {
        closePlayerActionDialog();
    }
}

function updatePlayerGridItem(playerId) {
    const player = getTeamPlayers().find(p => p.id === playerId);
    if (!player) return;
    
    // Get the player grid item
    const playerGridItem = document.querySelector(`.player-grid-item[data-player-id="${playerId}"]`);
    if (!playerGridItem) return;
    
    // Update stat values
    const statValues = playerGridItem.querySelectorAll('.stat-value');
    if (statValues && statValues.length >= 4) {
        statValues[0].textContent = player.stats.goals || 0;
        statValues[1].textContent = player.stats.assists || 0;
        statValues[2].textContent = player.stats.saves || 0;
        statValues[3].textContent = player.stats.goalsAllowed || 0;
    }
    
    // Update card classes
    const yellowCards = player.stats.yellowCards || 0;
    const redCards = player.stats.redCards || 0;
    const isInjured = player.stats.injured || false;
    
    playerGridItem.classList.remove('yellow-card', 'red-card', 'injured');
    
    if (isInjured) {
        playerGridItem.classList.add('injured');
    } else if (redCards > 0) {
        playerGridItem.classList.add('red-card');
    } else if (yellowCards > 0) {
        playerGridItem.classList.add('yellow-card');
    }
    
    // Prevent further actions on injured or carded players
    const isUnavailable = isInjured || redCards > 0;
    playerGridItem.style.pointerEvents = isUnavailable ? 'none' : 'auto';
    playerGridItem.style.opacity = isUnavailable ? '0.6' : '1';
}

function calculateGameMinute() {
    if (!appState.currentGame) return 0;
    
    // Use gameTimer.elapsed which is synced with periods
    // Convert seconds to minutes
    const minutes = Math.floor((appState.gameTimer.elapsed || 0) / 60);
    
    return minutes;
}

// End Game
function confirmEndGame() {
    toggleDialog('end-game-dialog', true);
}

function closeEndGameDialog() {
    toggleDialog('end-game-dialog', false);
}

function endGame() {
    if (!appState.currentGame) return;
    
    appState.currentGame.endTime = new Date().toISOString();
    appState.currentGame.isCompleted = true;
    
    // Store the game in our games array
    const finishedGameId = appState.currentGame.id;
    getTeamGames().push({...appState.currentGame});
    
    // Stop both timers
    pauseTimer();
    pauseGameTimer();
    
    // Save data before showing report
    saveAppData();
    
    // Update game report counter
    updateGameReportCounter();
    
    // Close the dialog
    closeEndGameDialog();
    
    // Show the reports screen
    showScreen('reports');
    
    // Generate and show the detailed report for this game
    setTimeout(() => {
        if (typeof ReportService !== 'undefined' && ReportService.generateEnhancedReport) {
            ReportService.generateEnhancedReport(finishedGameId);
        } else if (typeof ReportService !== 'undefined' && ReportService.viewReport) {
            ReportService.viewReport(finishedGameId);
        } else {
            viewReport(finishedGameId);
        }
    }, 300);
    
    // Clear current game
    appState.currentGame = null;
}

// Reports
function renderReportsList() {
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '';
    
    const completedGames = getTeamGames().filter(game => game.isCompleted);
    
    if (completedGames.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">No completed games yet</div>';
        return;
    }
    
    completedGames.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(game => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        const gameDate = new Date(game.date).toLocaleDateString();
        const teamName = game.teamName || 'My Team';
        reportItem.innerHTML = `
            <div class="report-header">
                <div class="report-date">${gameDate}</div>
                <div class="report-score">${teamName} ${game.homeScore} - ${game.awayScore} ${game.opponentName}</div>
            </div>
            <div class="report-actions">
                <button class="secondary-btn" onclick="viewReport('${game.id}')">View Report</button>
                <button class="secondary-btn" onclick="exportReport('${game.id}', 'pdf')">PDF</button>
            </div>
        `;
        reportsList.appendChild(reportItem);
    });
}

function viewReport(gameId) {
    const game = getTeamGames().find(g => g.id === gameId);
    if (!game) return;
    
    // Create a report dialog if it doesn't exist
    let reportDialog = document.getElementById('detailed-report-dialog');
    if (!reportDialog) {
        reportDialog = document.createElement('div');
        reportDialog.id = 'detailed-report-dialog';
        reportDialog.className = 'dialog';
        document.getElementById('app').appendChild(reportDialog);
    }
    
    // Format date
    const gameDate = new Date(game.date).toLocaleDateString();
    const gameTime = game.startTime ? new Date(game.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    
    // Calculate game duration
    let gameDuration = '';
    if (game.startTime && game.endTime) {
        const start = new Date(game.startTime);
        const end = new Date(game.endTime);
        const durationMs = end - start;
        const durationMins = Math.floor(durationMs / 60000);
        gameDuration = `${durationMins} minutes`;
    }

    // Get player actions from the game
    const playerActions = {};
    
    // Initialize player actions with all fields
    game.activePlayers.forEach(playerId => {
        const player = getTeamPlayers().find(p => p.id === playerId);
        if (player) {
            playerActions[playerId] = {
                name: player.name,
                jerseyNumber: player.jerseyNumber,
                goals: 0,
                assists: 0,
                saves: 0,
                goalsAllowed: 0,
                yellowCards: 0,
                redCards: 0
            };
        }
    });
    
    // Count actions
    game.actions.forEach(action => {
        if (playerActions[action.playerId]) {
            switch (action.actionType) {
                case 'goal':
                    playerActions[action.playerId].goals++;
                    break;
                case 'assist':
                    playerActions[action.playerId].assists++;
                    break;
                case 'save':
                    playerActions[action.playerId].saves++;
                    break;
                case 'goal_allowed':
                    playerActions[action.playerId].goalsAllowed++;
                    break;
                case 'yellow_card':
                    playerActions[action.playerId].yellowCards = (playerActions[action.playerId].yellowCards || 0) + 1;
                    break;
                case 'red_card':
                    playerActions[action.playerId].redCards = (playerActions[action.playerId].redCards || 0) + 1;
                    break;
            }
        }
    });
    
    // Build player stats table
    let playerStatsHTML = '';
    Object.values(playerActions)
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
        .forEach(playerStat => {
            playerStatsHTML += `
                <tr>
                    <td>${playerStat.jerseyNumber}</td>
                    <td>${playerStat.name.charAt(0).toUpperCase() + playerStat.name.slice(1).toLowerCase()}</td>
                    <td>${playerStat.goals}</td>
                    <td>${playerStat.assists}</td>
                    <td>${playerStat.saves}</td>
                    <td>${playerStat.goalsAllowed}</td>
                    <td>${playerStat.yellowCards}</td>
                    <td>${playerStat.redCards}</td>
                </tr>
            `;
        });
    
    // Generate report HTML
    const teamName = game.teamName || 'My Team';
    reportDialog.innerHTML = `
        <div class="dialog-content report-dialog">
            <h2>Game Report</h2>
            <div class="report-header-info">
                <div><strong>Date:</strong> ${gameDate} ${gameTime}</div>
                <div><strong>Teams:</strong> ${teamName} vs ${game.opponentName}</div>
                <div><strong>Final Score:</strong> ${game.homeScore} - ${game.awayScore}</div>
                <div><strong>Duration:</strong> ${gameDuration}</div>
            </div>
            
            <h3>Player Statistics</h3>
            <div class="report-table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th><span class="material-icons stat-icon-small">sports_soccer</span></th>
                            <th><span class="stat-emoji">👟</span></th>
                            <th><span class="material-icons stat-icon-small">back_hand</span></th>
                            <th><img src="img/red-soccer.png" width="16" height="16" alt="Goals" class="stat-icon-img"></th>
                            <th><span class="yellow-card-icon">🟨</span></th>
                            <th><span class="red-card-icon">🟥</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerStatsHTML}
                    </tbody>
                </table>
            </div>
            
            <div class="report-actions">
                <button class="secondary-btn" onclick="exportReport('${gameId}', 'pdf')">Export as PDF</button>
                <button class="primary-btn" onclick="closeDetailedReport()">Close</button>
            </div>
        </div>
    `;
    
    // Show the dialog
    reportDialog.style.display = 'flex';
}

function closeDetailedReport() {
    const reportDialog = document.getElementById('detailed-report-dialog');
    if (reportDialog) {
        reportDialog.style.display = 'none';
    }
}

function exportReport(gameId, format) {
    const game = getTeamGames().find(g => g.id === gameId);
    if (!game) {
        showMessage('Game not found', 'error');
        return;
    }
    
    // Get the report content from the dialog
    const reportContent = document.querySelector('.report-dialog').innerHTML;
    
    // Build version: 1.12.1 (see constants.js for centralized APP_VERSION)
    // For PDF, we'll use a printable version that users can save as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Game Report - ${game.date}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h2, h3 { color: #333; }
            </style>
        </head>
        <body>
            ${reportContent}
            <p style="margin-top: 30px; text-align: center; color: #666;">
                Generated by Soccer Coach Tracker - ${new Date().toLocaleString()}
            </p>
            <script>
                // Auto-print
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
    showMessage('Report opened in new tab for printing/saving as PDF', 'success');
}

// Settings
function saveSettings() {
    const language = document.querySelector('input[name="language"]:checked').value;
    const defaultTimer = document.getElementById('default-timer').value;
    
    appState.settings.language = language;
    appState.settings.defaultTimer = parseInt(defaultTimer);
    
    saveAppData();
    showMessage('Settings saved successfully', 'success');
}

function handleLanguageChange() {
    // This function handles language change events
    // Can be used to provide immediate feedback or update UI
    const selectedLanguage = document.querySelector('input[name="language"]:checked');
    if (selectedLanguage) {
        appState.settings = appState.settings || {};
        appState.settings.language = selectedLanguage.value;
        // Delegate to SettingsScreen if available
        if (typeof SettingsScreen !== 'undefined' && SettingsScreen.handleLanguageChange) {
            SettingsScreen.handleLanguageChange();
        }
    }
}

// =====================================================================
// STORAGE DIAGNOSTICS - Can be called from console to debug issues
// =====================================================================

/**
 * Comprehensive storage diagnostics for troubleshooting
 * Call from console: window.debugStorage()
 */
window.debugStorage = function() {
    console.log('\n🔧 ===== STORAGE DIAGNOSTICS =====');
    
    // Check if Storage API is available
    console.log('\n1️⃣  Storage API Availability:');
    console.log(`   typeof(Storage): ${typeof(Storage)}`);
    console.log(`   localStorage exists: ${!!localStorage}`);
    console.log(`   typeof(localStorage): ${typeof(localStorage)}`);
    
    // Try to read/write
    console.log('\n2️⃣  localStorage Read/Write Test:');
    try {
        localStorage.setItem('__test__', 'works');
        const testRead = localStorage.getItem('__test__');
        console.log(`   ✅ localStorage is working (test read: "${testRead}")`);
        localStorage.removeItem('__test__');
    } catch (e) {
        console.error(`   ❌ localStorage disabled/failed: ${e.message}`);
        console.error(`   Error type: ${e.name}`);
        return;
    }
    
    // List all keys
    console.log('\n3️⃣  All localStorage Keys:');
    console.log(`   Total keys: ${localStorage.length}`);
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const size = localStorage.getItem(key).length;
        console.log(`      ${i}: "${key}" (${size} bytes)`);
    }
    
    // Check for app-specific keys
    console.log('\n4️⃣  App Data Keys:');
    const key1 = localStorage.getItem('soccerCoachApp2');
    const key2 = localStorage.getItem('soccerCoachApp');
    console.log(`   soccerCoachApp2: ${key1 ? `✅ ${key1.length} bytes` : '❌ NOT FOUND'}`);
    console.log(`   soccerCoachApp: ${key2 ? `✅ ${key2.length} bytes (LEGACY)` : '❌ NOT FOUND'}`);
    
    // Parse and display structure
    console.log('\n5️⃣  App State Structure:');
    console.log(`   appState.teams: ${appState.teams?.length || 0} teams`);
    appState.teams?.forEach((t, i) => {
        console.log(`      Team ${i}: "${t.name}" (id=${t.id}, ${t.players?.length || 0} players, ${t.games?.length || 0} games)`);
    });
    console.log(`   appState.currentTeamId: ${appState.currentTeamId}`);
    
    // Browser/Device info
    console.log('\n6️⃣  Browser/Device Info:');
    console.log(`   User Agent: ${navigator.userAgent.substring(0, 80)}...`);
    console.log(`   Platform: ${navigator.platform}`);
    console.log(`   Language: ${navigator.language}`);
    console.log(`   Online: ${navigator.onLine}`);
    
    console.log('\n🔧 ===== END DIAGNOSTICS =====\n');
};

// Data persistence (using localStorage in the prototype)
function saveAppData() {
    // Save all teams to localStorage
    try {
        // Check localStorage accessibility first
        if (typeof(Storage) === "undefined" || localStorage === null) {
            console.error(`❌ localStorage not accessible (browser may be in private mode)`);
            return;
        }
        
        const dataToSave = JSON.stringify(appState);
        localStorage.setItem('soccerCoachApp2', dataToSave);
        
        console.log(`💾 saveAppData(): Saved successfully`);
        console.log(`   localStorage key: soccerCoachApp2`);
        console.log(`   Data size: ${dataToSave.length} bytes`);
        console.log(`   Teams saved: ${appState.teams?.length || 0}`);
        appState.teams?.forEach((t, i) => {
            console.log(`      Team ${i}: "${t.name}" (id=${t.id}, players=${t.players?.length || 0})`);
        });
        console.log(`   Active team (${appState.currentTeamId}): ${getTeamPlayers()?.length || 0} players`);
    } catch (e) {
        console.error(`❌ saveAppData(): Failed to save!`, e.message);
        if (e.name === 'QuotaExceededError') {
            console.error('   ❌ Storage quota exceeded! (localStorage is full)');
        } else if (e.name === 'NS_ERROR_FILE_CORRUPTED') {
            console.error('   ❌ Firefox private mode detected (localStorage disabled)');
        } else if (e.message.includes('denied')) {
            console.error('   ❌ Access denied - browser privacy/permissions issue');
        }
    }
}

// NOTE: Data loading is now handled by AppInit.js
// This function has been removed - use AppInit.js for initialization

// Function to clear all app data and start fresh
function clearAppData() {
    if (confirm('Are you sure you want to clear all data? This will remove all players, games, and settings.')) {
        // Remove both old and new storage keys
        localStorage.removeItem('soccerCoachApp');
        localStorage.removeItem('soccerCoachApp2');
        
        // Reset app state to new multi-team defaults
        const teamA = {
            id: 't1',
            name: 'Team A',
            players: [],
            games: [],
            settings: { language: 'en', defaultSubstitutionTime: null, isSubstitutionDefaultChecked: false },
            unavailablePlayers: [],
            formationTemp: null
        };
        const teamB = {
            id: 't2',
            name: 'Team B',
            players: [],
            games: [],
            settings: { language: 'en', defaultSubstitutionTime: null, isSubstitutionDefaultChecked: false },
            unavailablePlayers: [],
            formationTemp: null
        };
        
        appState.teams = [teamA, teamB];
        appState.currentTeamId = teamA.id;
        appState.currentGame = null;
        appState.timer = {
            duration: 6 * 60,
            timeLeft: 6 * 60,
            interval: null,
            isRunning: false
        };
        appState.gameTimer = {
            elapsed: 0,
            interval: null,
            isRunning: false,
            startTime: null
        };
        appState.settings = {
            language: 'en',
            defaultSubstitutionTime: null,
            isSubstitutionDefaultChecked: false
        };
        appState.currentPlayer = null;
        appState.formationTemp = null;
        
        // Save cleared state and update UI
        saveAppData();
        updateTeamNameUI();
        updateTeamSelector();
        TeamSetupScreen.renderPlayersList();
        showMessage('All data has been cleared. The app has been reset.', 'success');
        
        // Return to main screen
        showScreen('main-screen');
    }
}

// Export/Import functions for moving data between devices
function exportTeamData() {
    // Prepare data for export
    const currentTeam = getCurrentTeam();
    const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: window.APP_VERSION || "1.12.1",
        teamName: currentTeam ? currentTeam.name : 'Team A',
        players: currentTeam ? currentTeam.players : [],
        games: currentTeam ? currentTeam.games : [],
        settings: currentTeam ? currentTeam.settings : appState.settings
    };
    
    // Convert to JSON string
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // Create a temporary link element
    const exportFileDefaultName = `${appState.teamName.replace(/\s+/g, '_')}_data.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.style.display = 'none';
    
    // Add to document, click, and remove
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}

function importTeamData() {
    // Trigger file input click
    document.getElementById('import-file').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate imported data has required fields
            if (!importedData.teamName || !Array.isArray(importedData.players)) {
                throw new Error('Invalid data format');
            }
            
            // Confirm data import
            if (confirm('This will replace your current team data. Continue?')) {
                // Update current team with imported data
                const currentTeam = getCurrentTeam();
                if (currentTeam) {
                    currentTeam.name = importedData.teamName || importedData.name || currentTeam.name;
                    currentTeam.players = importedData.players || [];
                    currentTeam.games = importedData.games || [];
                    if (importedData.settings) {
                        currentTeam.settings = importedData.settings;
                    }
                }
                
                // Save to local storage
                saveAppData();
                
                // Update UI
                updateTeamNameUI();
                TeamSetupScreen.renderPlayersList();
                
                showMessage('Team data imported successfully!', 'success');
            }
        } catch (error) {
            showMessage('Error importing data. Please check the file format.', 'error');
            console.error('Import error:', error);
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Add demo players for testing
function addDemoPlayers() {
    const demoPlayers = [
        { id: '1', name: 'ALEX', jerseyNumber: 1, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '2', name: 'JORDAN', jerseyNumber: 4, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '3', name: 'CASEY', jerseyNumber: 6, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '4', name: 'RILEY', jerseyNumber: 8, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '5', name: 'TAYLOR', jerseyNumber: 10, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '6', name: 'SAM', jerseyNumber: 11, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } }
    ];
    
    setTeamPlayers(demoPlayers);
    saveAppData();
    TeamSetupScreen.renderPlayersList();
}

// Formation Setup Functions
function confirmBackToGameSetup() {
    const dialog = document.getElementById('back-confirm-dialog');
    if (dialog) {
        dialog.style.display = 'flex';
    }
}

function closeBackConfirmDialog() {
    const dialog = document.getElementById('back-confirm-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}

function backToGameSetup() {
    closeBackConfirmDialog();
    setFormationTemp([]);
    showScreen('game-setup');
}

function clearFormation() {
    setFormationTemp([]);
    setUnavailablePlayers([]);
    FormationScreen.renderFormationSetup();
}

function startGameFromFormation() {
    if (!appState.currentGame) {
        showMessage('No game selected');
        return;
    }

    // Validate formation before starting game
    if (!validateFormationSetup()) {
        return;
    }
    
    // Save formation as default if checkbox is checked
    const saveDefault = document.getElementById('save-default-formation');
    if (saveDefault && saveDefault.checked) {
        appState.defaultFormation = getFormationTemp();
    }

    // Store formation players in the current game so we know who's on field
    appState.currentGame.formationPlayers = getFormationTemp();
    
    // Calculate substitutes (all team players not in formation)
    const formationPlayerIds = getFormationTemp().map(f => f.playerId);
    const allTeamPlayers = getTeamPlayers().map(p => p.id);
    appState.currentGame.substitutes = allTeamPlayers.filter(playerId => !formationPlayerIds.includes(playerId));
    
    saveAppData();
    
    // Start the game
    showScreen('game-tracking');
    renderPlayerGrid();
    startGameTimer();
    startTimer();
}

// Note Dialog Functions
function openNoteDialog() {
    const dialog = document.getElementById('note-dialog');
    const playerName = (appState.currentPlayer ? appState.currentPlayer.name : 'Player');
    document.getElementById('note-player-name').textContent = playerName;
    document.getElementById('note-text').value = '';
    document.getElementById('note-char-count').textContent = '0';
    if (dialog) {
        dialog.style.display = 'flex';
    }
}

function closeNoteDialog() {
    const dialog = document.getElementById('note-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}

function recordNoteAction() {
    if (!appState.currentGame || !appState.currentPlayer) {
        showMessage('No game or player selected');
        return;
    }
    
    const noteText = document.getElementById('note-text').value.trim();
    if (!noteText) {
        showMessage('Please enter a note');
        return;
    }
    
    const action = {
        timestamp: new Date().toISOString(),
        playerId: appState.currentPlayer.id,
        actionType: 'note',
        gameMinute: calculateGameMinute(),
        noteText: noteText
    };
    
    appState.currentGame.actions.push(action);
    saveAppData();
    closeNoteDialog();
    showMessage('Note recorded successfully', 'success');
}

// Game Note Dialog Functions (for general game notes, not player-specific)
function openGameNoteDialog() {
    // Create a temporary note dialog for game notes
    const noteText = prompt('Enter game note:');
    if (noteText && noteText.trim()) {
        recordGameNote(noteText);
    }
}

function recordGameNote(noteText) {
    if (!appState.currentGame) {
        showMessage('No game in progress');
        return;
    }
    
    const action = {
        timestamp: new Date().toISOString(),
        playerId: null, // No specific player for game notes
        actionType: 'game_note',
        gameMinute: calculateGameMinute(),
        noteText: noteText
    };
    
    appState.currentGame.actions.push(action);
    saveAppData();
    showMessage('Game note recorded', 'success');
}

// Action Review Dialog Function
function openActionReviewDialog() {
    if (!appState.currentGame || !appState.currentGame.actions || appState.currentGame.actions.length === 0) {
        showMessage('No actions recorded yet');
        return;
    }
    
    const actions = appState.currentGame.actions;
    const dialogContent = document.querySelector('#action-review-dialog .dialog-content');
    
    if (!dialogContent) {
        // Dialog doesn't exist, create it
        createActionReviewDialog();
        return;
    }
    
    // Render actions list
    const actionsList = document.getElementById('action-review-list') || dialogContent.querySelector('.action-review-list');
    if (actionsList) {
        actionsList.innerHTML = '';
        
        actions.slice().reverse().forEach((action, index) => {
            const player = getTeamPlayers().find(p => p.id === action.playerId);
            const playerName = player ? player.name : 'Game Event';
            
            const actionItem = document.createElement('div');
            actionItem.className = 'action-review-item';
            actionItem.innerHTML = `
                <span class="action-review-text">${action.gameMinute}' - ${playerName}: ${formatActionType(action.actionType)}</span>
                <button class="action-remove-btn" onclick="removeAction(${actions.length - 1 - index})" title="Remove this action">✕</button>
            `;
            actionsList.appendChild(actionItem);
        });
    }
    
    toggleDialog('action-review-dialog', true);
}

function createActionReviewDialog() {
    // Create dialog if it doesn't exist
    const dialog = document.createElement('div');
    dialog.id = 'action-review-dialog';
    dialog.className = 'dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h2>Review & Remove Actions</h2>
            <div class="action-review-list" id="action-review-list"></div>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeActionReviewDialog()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    openActionReviewDialog();
}

function closeActionReviewDialog() {
    toggleDialog('action-review-dialog', false);
}

function removeAction(index) {
    if (!appState.currentGame || !appState.currentGame.actions || index < 0 || index >= appState.currentGame.actions.length) {
        return;
    }
    
    const removedAction = appState.currentGame.actions[index];
    const player = getTeamPlayers().find(p => p.id === removedAction.playerId);
    const playerName = player ? player.name : 'Unknown';
    
    if (!confirm(`Remove action: ${removedAction.gameMinute}' - ${playerName} - ${formatActionType(removedAction.actionType)}?`)) {
        return;
    }
    
    // Revert stats changes based on action type
    if (player && player.stats) {
        switch (removedAction.actionType) {
            case 'goal':
                player.stats.goals = Math.max(0, (player.stats.goals || 0) - 1);
                appState.currentGame.homeScore = Math.max(0, (appState.currentGame.homeScore || 0) - 1);
                document.getElementById('home-score').textContent = appState.currentGame.homeScore;
                break;
            case 'assist':
                player.stats.assists = Math.max(0, (player.stats.assists || 0) - 1);
                break;
            case 'save':
                player.stats.saves = Math.max(0, (player.stats.saves || 0) - 1);
                break;
            case 'goal_allowed':
                player.stats.goalsAllowed = Math.max(0, (player.stats.goalsAllowed || 0) - 1);
                appState.currentGame.awayScore = Math.max(0, (appState.currentGame.awayScore || 0) - 1);
                document.getElementById('away-score').textContent = appState.currentGame.awayScore;
                break;
            case 'yellow_card':
                player.stats.yellowCards = Math.max(0, (player.stats.yellowCards || 0) - 1);
                const yellowCounter = document.getElementById('yellow-card-count');
                if (yellowCounter) {
                    yellowCounter.textContent = Math.max(0, parseInt(yellowCounter.textContent) - 1);
                }
                break;
            case 'red_card':
                player.stats.redCards = Math.max(0, (player.stats.redCards || 0) - 1);
                const redCounter = document.getElementById('red-card-count');
                if (redCounter) {
                    redCounter.textContent = Math.max(0, parseInt(redCounter.textContent) - 1);
                }
                break;
            case 'injury':
                player.stats.injured = false;
                break;
        }
    }
    
    // Remove the action
    appState.currentGame.actions.splice(index, 1);
    
    // Update player grid item
    if (player) {
        updatePlayerGridItem(player.id);
    }
    
    saveAppData();
    
    // Refresh the dialog
    openActionReviewDialog();
}

// Player Statistics Functions
function resetPlayerStatistics() {
    if (!confirm('Reset all player statistics? This cannot be undone.')) {
        return;
    }
    
    const players = getTeamPlayers();
    players.forEach(player => {
        player.stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        };
    });
    
    setTeamPlayers(players);
    saveAppData();
    showMessage('Player statistics reset', 'success');
    renderPlayerGrid();
}

// Import/Export Functions
function closeImportConfirmDialog() {
    const dialog = document.getElementById('import-confirm-dialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}

function confirmImportTeamData() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput || !fileInput.files.length) {
        showMessage('No file selected');
        return;
    }
    
    closeImportConfirmDialog();
    handleFileImport({ target: fileInput });
}