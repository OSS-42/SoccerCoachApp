// Application State
let appState = {
    players: [],
    games: [],
    currentGame: null,
    timer: {
        duration: 6 * 60, // 6 minutes in seconds
        timeLeft: 6 * 60,
        interval: null,
        isRunning: false
    },
    settings: {
        language: 'en',
        darkMode: false,
        defaultTimer: 6
    },
    currentPlayer: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data if available
    loadAppData();
    
    // Populate UI with existing data
    renderPlayersList();
    
    // Add demo players if none exist
    if (appState.players.length === 0) {
        addDemoPlayers();
    }
    
    // Set today's date as the default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('game-date').value = today;
});

// Screen Navigation
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    document.getElementById(screenId).classList.add('active');
    
    // Special handling for specific screens
    if (screenId === 'reports') {
        renderReportsList();
    }
}

// Player Management
function openAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'flex';
}

function closeAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'none';
    document.getElementById('player-name').value = '';
    document.getElementById('jersey-number').value = '';
}

function addPlayer() {
    const name = document.getElementById('player-name').value.trim();
    const jerseyNumber = document.getElementById('jersey-number').value;
    
    if (!name || !jerseyNumber) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Check for duplicate jersey numbers
    if (appState.players.some(p => p.jerseyNumber === Number(jerseyNumber))) {
        alert('A player with this jersey number already exists');
        return;
    }
    
    const player = {
        id: Date.now().toString(),
        name,
        jerseyNumber: Number(jerseyNumber),
        active: true,
        stats: {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        }
    };
    
    appState.players.push(player);
    saveAppData();
    renderPlayersList();
    closeAddPlayerDialog();
}

function renderPlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    const activePlayers = appState.players.filter(p => p.active);
    
    if (activePlayers.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
        return;
    }
    
    activePlayers.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="jersey-number">${player.jerseyNumber}</div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
            </div>
            <div class="player-actions">
                <button class="player-action-btn" onclick="editPlayer('${player.id}')">
                    <span class="material-icons">edit</span>
                </button>
                <button class="player-action-btn" onclick="deletePlayer('${player.id}')">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `;
        playersList.appendChild(playerItem);
    });
}

function editPlayer(playerId) {
    // This would open a dialog to edit the player
    // For the prototype, we'll just show an alert
    alert('Edit player functionality would be implemented here');
}

function deletePlayer(playerId) {
    if (confirm('Are you sure you want to remove this player?')) {
        const playerIndex = appState.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            appState.players[playerIndex].active = false;
            saveAppData();
            renderPlayersList();
        }
    }
}

// Game Management
function startGame() {
    const opponentName = document.getElementById('opponent-name').value.trim();
    const gameDate = document.getElementById('game-date').value;
    const substitutionTime = document.getElementById('substitution-time').value;
    
    if (!opponentName) {
        alert('Please enter the opponent team name');
        return;
    }
    
    appState.currentGame = {
        id: Date.now().toString(),
        date: gameDate,
        opponentName,
        homeScore: 0,
        awayScore: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        actions: [],
        activePlayers: [...appState.players.filter(p => p.active).map(p => p.id)],
        isCompleted: false
    };
    
    // Setup timer
    appState.timer.duration = parseInt(substitutionTime) * 60;
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
    
    // Update opponent name in UI
    document.getElementById('opponent-team-name').textContent = opponentName;
    
    // Reset scores
    document.getElementById('home-score').textContent = '0';
    document.getElementById('away-score').textContent = '0';
    
    // Populate player grid
    renderPlayerGrid();
    
    // Switch to game screen
    showScreen('game-tracking');
}

function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';
    
    const activePlayers = appState.players.filter(p => p.active);
    
    activePlayers.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        const playerGridItem = document.createElement('div');
        playerGridItem.className = 'player-grid-item';
        playerGridItem.setAttribute('data-player-id', player.id);
        playerGridItem.innerHTML = `
            <div class="player-number">${player.jerseyNumber}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-stats">
                <div>Goals: 0</div>
                <div>Assists: 0</div>
                <div>Saves: 0</div>
                <div>Goals Allowed: 0</div>
            </div>
        `;
        playerGridItem.addEventListener('click', () => {
            openPlayerActionDialog(player);
        });
        playerGrid.appendChild(playerGridItem);
    });
}

// Timer Functions
function updateTimerDisplay() {
    const minutes = Math.floor(appState.timer.timeLeft / 60);
    const seconds = appState.timer.timeLeft % 60;
    
    const timerDisplay = document.getElementById('substitution-timer');
    const timerValue = timerDisplay.querySelector('.timer-value');
    
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Add alert styling if timer is at zero
    if (appState.timer.timeLeft === 0) {
        timerDisplay.classList.add('timer-alert');
    } else {
        timerDisplay.classList.remove('timer-alert');
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
    }
}

function pauseTimer() {
    clearInterval(appState.timer.interval);
    appState.timer.isRunning = false;
}

function resetTimer() {
    pauseTimer();
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
}

// Player Actions
function openPlayerActionDialog(player) {
    appState.currentPlayer = player;
    
    const dialog = document.getElementById('player-action-dialog');
    const playerNameSpan = document.getElementById('action-player-name');
    
    playerNameSpan.textContent = player.name;
    
    // All actions are now available for all players
    
    dialog.style.display = 'flex';
}

function closePlayerActionDialog() {
    document.getElementById('player-action-dialog').style.display = 'none';
    appState.currentPlayer = null;
}

function recordAction(actionType) {
    if (!appState.currentPlayer || !appState.currentGame) return;
    
    const playerId = appState.currentPlayer.id;
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    
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
            appState.players[playerIndex].stats.goals++;
            appState.currentGame.homeScore++;
            document.getElementById('home-score').textContent = appState.currentGame.homeScore;
            break;
        case 'assist':
            appState.players[playerIndex].stats.assists++;
            break;
        case 'save':
            appState.players[playerIndex].stats.saves++;
            break;
        case 'goal_allowed':
            appState.players[playerIndex].stats.goalsAllowed++;
            appState.currentGame.awayScore++;
            document.getElementById('away-score').textContent = appState.currentGame.awayScore;
            break;
    }
    
    // Update player grid item
    updatePlayerGridItem(playerId);
    
    saveAppData();
    closePlayerActionDialog();
}

function updatePlayerGridItem(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const gridItem = document.querySelector(`.player-grid-item[data-player-id="${playerId}"]`);
    if (!gridItem) return;
    
    const statsDiv = gridItem.querySelector('.player-stats');
    statsDiv.innerHTML = `
        <div>Goals: ${player.stats.goals}</div>
        <div>Assists: ${player.stats.assists}</div>
        <div>Saves: ${player.stats.saves}</div>
        <div>Goals Allowed: ${player.stats.goalsAllowed}</div>
    `;
}

function calculateGameMinute() {
    if (!appState.currentGame) return 0;
    
    const startTime = new Date(appState.currentGame.startTime);
    const now = new Date();
    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    return diffMins;
}

// End Game
function confirmEndGame() {
    document.getElementById('end-game-dialog').style.display = 'flex';
}

function closeEndGameDialog() {
    document.getElementById('end-game-dialog').style.display = 'none';
}

function endGame() {
    if (!appState.currentGame) return;
    
    appState.currentGame.endTime = new Date().toISOString();
    appState.currentGame.isCompleted = true;
    
    appState.games.push({...appState.currentGame});
    appState.currentGame = null;
    
    pauseTimer();
    saveAppData();
    closeEndGameDialog();
    showScreen('main-screen');
}

// Reports
function renderReportsList() {
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '';
    
    const completedGames = appState.games.filter(game => game.isCompleted);
    
    if (completedGames.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">No completed games yet</div>';
        return;
    }
    
    completedGames.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(game => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        const gameDate = new Date(game.date).toLocaleDateString();
        reportItem.innerHTML = `
            <div class="report-header">
                <div class="report-date">${gameDate}</div>
                <div class="report-score">My Team ${game.homeScore} - ${game.awayScore} ${game.opponentName}</div>
            </div>
            <div class="report-actions">
                <button class="secondary-btn" onclick="viewReport('${game.id}')">View Report</button>
                <button class="secondary-btn" onclick="exportReport('${game.id}', 'pdf')">PDF</button>
                <button class="secondary-btn" onclick="exportReport('${game.id}', 'png')">PNG</button>
            </div>
        `;
        reportsList.appendChild(reportItem);
    });
}

function viewReport(gameId) {
    // This would navigate to a detailed report view
    // For the prototype, we'll just show an alert
    alert('Detailed report view would be shown here');
}

function exportReport(gameId, format) {
    // This would generate and export the report
    // For the prototype, we'll just show an alert
    alert(`Report would be exported as ${format.toUpperCase()}`);
}

// Settings
function saveSettings() {
    const language = document.querySelector('input[name="language"]:checked').value;
    const darkMode = document.getElementById('dark-mode').checked;
    const defaultTimer = document.getElementById('default-timer').value;
    
    appState.settings.language = language;
    appState.settings.darkMode = darkMode;
    appState.settings.defaultTimer = parseInt(defaultTimer);
    
    // Apply dark mode if selected
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    saveAppData();
    alert('Settings saved successfully');
}

// Data persistence (using localStorage in the prototype)
function saveAppData() {
    localStorage.setItem('soccerCoachApp', JSON.stringify({
        players: appState.players,
        games: appState.games,
        settings: appState.settings
    }));
}

function loadAppData() {
    const savedData = localStorage.getItem('soccerCoachApp');
    if (savedData) {
        const data = JSON.parse(savedData);
        appState.players = data.players || [];
        appState.games = data.games || [];
        appState.settings = data.settings || appState.settings;
        
        // Apply settings
        if (appState.settings.darkMode) {
            document.body.classList.add('dark-mode');
        }
    }
}

// Add demo players for testing
function addDemoPlayers() {
    const demoPlayers = [
        { id: '1', name: 'Alex', jerseyNumber: 1, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '2', name: 'Jordan', jerseyNumber: 4, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '3', name: 'Casey', jerseyNumber: 6, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '4', name: 'Riley', jerseyNumber: 8, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '5', name: 'Taylor', jerseyNumber: 10, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: '6', name: 'Sam', jerseyNumber: 11, active: true, stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } }
    ];
    
    appState.players = demoPlayers;
    saveAppData();
    renderPlayersList();
}