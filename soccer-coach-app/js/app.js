// Application State
let appState = {
    teamName: "My Team",
    players: [],
    games: [],
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
        darkMode: false,
        defaultTimer: 6,
        recordGameTime: false
    },
    currentPlayer: null
};

// Initialize the app
// Apply dark mode based on settings
function applyDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Ensure the toggle reflects the current state
    const darkModeToggle = document.getElementById('dark-mode');
    if (darkModeToggle) {
        darkModeToggle.checked = enabled;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Load saved data if available
    loadAppData();
    
    // Apply dark mode based on settings
    applyDarkMode(appState.settings.darkMode);
});

// Team Name Management
function updateTeamNameUI() {
    const teamNameElements = document.querySelectorAll('.team-name');
    teamNameElements.forEach(element => {
        element.textContent = appState.teamName;
    });
}

function saveTeamName() {
    const newName = document.getElementById('team-name-input').value.trim();
    if (newName) {
        appState.teamName = newName;
        updateTeamNameUI();
        saveAppData();
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
    const screenToShow = document.getElementById(`${screenId}-screen`);
    if (screenToShow) {
        screenToShow.classList.add('active');
    }
    
    // Special handling for different screens
    if (screenId === 'team-setup') {
        renderPlayersList();
    } else if (screenId === 'game-setup') {
        // Set current date as default
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('game-date');
        if (dateInput) {
            dateInput.value = today;
        }
    } else if (screenId === 'settings') {
        // Update settings UI with current values
        document.getElementById('dark-mode').checked = appState.settings.darkMode;
        document.getElementById('default-timer').value = appState.settings.defaultTimer;
        document.getElementById('record-game-time').checked = appState.settings.recordGameTime;
        
        // Set language radio based on settings
        const langRadio = document.querySelector(`input[name="language"][value="${appState.settings.language}"]`);
        if (langRadio) {
            langRadio.checked = true;
        }
    } else if (screenId === 'reports') {
        renderReportsList();
    }
}

// Player Management
function openAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'flex';
    document.getElementById('player-name').value = '';
    document.getElementById('jersey-number').value = '';
}

function closeAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'none';
}

function addPlayer() {
    const playerName = document.getElementById('player-name').value.trim();
    const jerseyNumber = document.getElementById('jersey-number').value.trim();
    
    if (!playerName || !jerseyNumber) {
        alert('Please enter both name and jersey number');
        return;
    }
    
    // Check if jersey number is already in use
    const jerseyExists = appState.players.some(player => player.jerseyNumber === jerseyNumber);
    if (jerseyExists) {
        alert('This jersey number is already in use');
        return;
    }
    
    // Add player
    const newPlayer = {
        id: Date.now().toString(), // Simple ID generation
        name: playerName,
        jerseyNumber,
        active: true // Players are active by default
    };
    
    appState.players.push(newPlayer);
    saveAppData();
    renderPlayersList();
    closeAddPlayerDialog();
}

function renderPlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    if (appState.players.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players added yet. Add players to get started.</div>';
        return;
    }
    
    // Sort players by jersey number
    appState.players
        .sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber))
        .forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.active ? 'active' : 'inactive'}`;
            
            playerItem.innerHTML = `
                <div class="player-info">
                    <div class="jersey-number">#${player.jerseyNumber}</div>
                    <div class="player-name">${player.name}</div>
                </div>
                <div class="player-actions">
                    <button class="icon-btn" onclick="editPlayer('${player.id}')">
                        <span class="material-icons">edit</span>
                    </button>
                    <label class="switch small">
                        <input type="checkbox" ${player.active ? 'checked' : ''} onchange="togglePlayerActive('${player.id}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            `;
            
            playersList.appendChild(playerItem);
        });
}

function togglePlayerActive(playerId, isActive) {
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex >= 0) {
        appState.players[playerIndex].active = isActive;
        saveAppData();
    }
}

function editPlayer(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Set up edit dialog
    document.getElementById('edit-player-name').value = player.name;
    document.getElementById('edit-jersey-number').value = player.jerseyNumber;
    document.getElementById('edit-player-id').value = player.id;
    
    // Show dialog
    document.getElementById('edit-player-dialog').style.display = 'flex';
}

function closeEditPlayerDialog() {
    document.getElementById('edit-player-dialog').style.display = 'none';
}

function savePlayerEdit() {
    const playerId = document.getElementById('edit-player-id').value;
    const newName = document.getElementById('edit-player-name').value.trim();
    const newJerseyNumber = document.getElementById('edit-jersey-number').value.trim();
    
    if (!newName || !newJerseyNumber) {
        alert('Please enter both name and jersey number');
        return;
    }
    
    // Find the player
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    // Check if jersey number is already in use by a different player
    const jerseyExists = appState.players.some(
        player => player.jerseyNumber === newJerseyNumber && player.id !== playerId
    );
    
    if (jerseyExists) {
        alert('This jersey number is already in use by another player');
        return;
    }
    
    // Update player
    appState.players[playerIndex].name = newName;
    appState.players[playerIndex].jerseyNumber = newJerseyNumber;
    
    saveAppData();
    renderPlayersList();
    closeEditPlayerDialog();
}

function deletePlayer() {
    const playerId = document.getElementById('edit-player-id').value;
    if (!confirm('Are you sure you want to delete this player?')) return;
    
    appState.players = appState.players.filter(p => p.id !== playerId);
    saveAppData();
    renderPlayersList();
    closeEditPlayerDialog();
}

// Game Management
function startGame() {
    // Check if we have active players
    const activePlayers = appState.players.filter(p => p.active);
    if (activePlayers.length === 0) {
        alert('You need at least one active player to start a game');
        return;
    }
    
    // Create a new game
    const newGame = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        startTime: new Date().toISOString(),
        opponent: document.getElementById('opponent-name').value.trim() || 'Opponent',
        activePlayers: activePlayers.map(p => p.id),
        actions: [],
        completed: false
    };
    
    appState.currentGame = newGame;
    appState.games.push(newGame);
    
    // Reset timer to default duration from settings
    appState.timer.duration = appState.settings.defaultTimer * 60;
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
    
    // Reset game timer
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.startTime = null;
    updateGameTimeDisplay();
    
    // Show game screen and render players
    showScreen('game');
    renderPlayerGrid();
    
    // Save state
    saveAppData();
}

function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    if (!playerGrid || !appState.currentGame) return;
    
    playerGrid.innerHTML = '';
    
    // Get active players for this game
    const gamePlayers = appState.players.filter(
        player => appState.currentGame.activePlayers.includes(player.id)
    );
    
    // Sort players by jersey number
    gamePlayers.sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber));
    
    // Add players to grid
    gamePlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-grid-item';
        playerItem.onclick = function() { openPlayerActionDialog(player); };
        
        playerItem.innerHTML = `
            <div class="jersey-number">#${player.jerseyNumber}</div>
            <h3>${player.name}</h3>
            <div class="stats-container">
                <div class="stat">⚽ <span class="goal-count" data-player-id="${player.id}">0</span></div>
                <div class="stat">👟 <span class="assist-count" data-player-id="${player.id}">0</span></div>
                <div class="stat">🧤 <span class="save-count" data-player-id="${player.id}">0</span></div>
                <div class="stat">😞 <span class="goal-allowed-count" data-player-id="${player.id}">0</span></div>
            </div>
        `;
        
        playerGrid.appendChild(playerItem);
    });
    
    // Update all player stats from game actions
    updateAllPlayerStats();
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(appState.timer.timeLeft / 60);
    const seconds = appState.timer.timeLeft % 60;
    
    timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Add flashing effect when timer is low
    if (appState.timer.timeLeft <= 30 && appState.timer.isRunning) {
        timerElement.classList.add('timer-low');
    } else {
        timerElement.classList.remove('timer-low');
    }
}

function updateGameTimeDisplay() {
    const gameTimeElement = document.getElementById('game-time');
    if (!gameTimeElement) return;
    
    const minutes = Math.floor(appState.gameTimer.elapsed / 60);
    const seconds = appState.gameTimer.elapsed % 60;
    
    gameTimeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function startTimer() {
    if (!appState.timer.isRunning) {
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
        
        if (!appState.gameTimer.startTime) {
            appState.gameTimer.startTime = Date.now();
        }
        
        appState.gameTimer.interval = setInterval(() => {
            appState.gameTimer.elapsed++;
            updateGameTimeDisplay();
        }, 1000);
    }
}

function pauseGameTimer() {
    clearInterval(appState.gameTimer.interval);
    appState.gameTimer.isRunning = false;
}

// Player Action Recording
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
    const dialog = document.getElementById('assist-selection-dialog');
    const playersGrid = document.getElementById('assist-players-grid');
    
    // Clear previous content
    playersGrid.innerHTML = '';
    
    // Get active players excluding the goal scorer
    const activePlayers = appState.players.filter(p => p.active && p.id !== appState.goalScorer.id);
    
    // Add players to the grid
    activePlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-select-item';
        playerItem.innerHTML = `
            <div class="jersey-number">#${player.jerseyNumber}</div>
            <div class="player-name">${player.name}</div>
        `;
        playerItem.onclick = function() { completeGoalWithAssist(player.id); };
        
        playersGrid.appendChild(playerItem);
    });
    
    dialog.style.display = 'flex';
}

function closeAssistSelectionDialog() {
    document.getElementById('assist-selection-dialog').style.display = 'none';
    appState.goalScorer = null;
}

function completeGoalWithAssist(assistPlayerId) {
    if (!appState.goalScorer || !assistPlayerId) return;
    
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
    const dialog = document.getElementById('scorer-selection-dialog');
    const playersGrid = document.getElementById('scorer-players-grid');
    
    // Clear previous content
    playersGrid.innerHTML = '';
    
    // Get active players excluding the assister
    const activePlayers = appState.players.filter(p => p.active && p.id !== appState.assister.id);
    
    // Add players to the grid
    activePlayers.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-select-item';
        playerItem.innerHTML = `
            <div class="jersey-number">#${player.jerseyNumber}</div>
            <div class="player-name">${player.name}</div>
        `;
        playerItem.onclick = function() { completeAssistWithScorer(player.id); };
        
        playersGrid.appendChild(playerItem);
    });
    
    dialog.style.display = 'flex';
}

function closeScorerSelectionDialog() {
    document.getElementById('scorer-selection-dialog').style.display = 'none';
    appState.assister = null;
}

function completeAssistWithScorer(scorerId) {
    if (!appState.assister || !scorerId) return;
    
    // Record the assist for the current player
    recordAction('assist', appState.assister.id);
    
    // Record the goal for the selected scorer
    recordAction('goal', scorerId);
    
    // Close the dialog
    closeScorerSelectionDialog();
}

function recordAction(actionType, specificPlayerId = null) {
    if (!appState.currentGame) return;
    
    // Use the specified player ID or the current player's ID
    const playerId = specificPlayerId || (appState.currentPlayer ? appState.currentPlayer.id : null);
    if (!playerId) return;
    
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    
    const action = {
        timestamp: new Date().toISOString(),
        playerId,
        actionType,
        gameMinute: calculateGameMinute()
    };
    
    // Add action to the current game
    appState.currentGame.actions.push(action);
    
    // Update the player's stats in the grid
    updatePlayerGridItem(playerId);
    
    // Save the game state
    saveAppData();
}

function updatePlayerGridItem(playerId) {
    // Count the actions for this player in the current game
    let goals = 0;
    let assists = 0;
    let saves = 0;
    let goalsAllowed = 0;
    
    appState.currentGame.actions.forEach(action => {
        if (action.playerId === playerId) {
            switch (action.actionType) {
                case 'goal':
                    goals++;
                    break;
                case 'assist':
                    assists++;
                    break;
                case 'save':
                    saves++;
                    break;
                case 'goal_allowed':
                    goalsAllowed++;
                    break;
            }
        }
    });
    
    // Update the counter elements
    document.querySelector(`.goal-count[data-player-id="${playerId}"]`).textContent = goals;
    document.querySelector(`.assist-count[data-player-id="${playerId}"]`).textContent = assists;
    document.querySelector(`.save-count[data-player-id="${playerId}"]`).textContent = saves;
    document.querySelector(`.goal-allowed-count[data-player-id="${playerId}"]`).textContent = goalsAllowed;
}

function updateAllPlayerStats() {
    if (!appState.currentGame) return;
    
    // Reset all counters to 0
    document.querySelectorAll('.goal-count, .assist-count, .save-count, .goal-allowed-count').forEach(el => {
        el.textContent = '0';
    });
    
    // Update each player based on game actions
    appState.currentGame.activePlayers.forEach(playerId => {
        updatePlayerGridItem(playerId);
    });
}

function calculateGameMinute() {
    if (!appState.gameTimer.startTime) return 0;
    
    const elapsedSeconds = appState.gameTimer.elapsed;
    return Math.floor(elapsedSeconds / 60);
}

// Game End Handling
function confirmEndGame() {
    document.getElementById('end-game-dialog').style.display = 'flex';
}

function closeEndGameDialog() {
    document.getElementById('end-game-dialog').style.display = 'none';
}

function endGame() {
    if (!appState.currentGame) return;
    
    // Stop all timers
    pauseTimer();
    pauseGameTimer();
    
    // Mark the game as completed
    appState.currentGame.completed = true;
    appState.currentGame.endTime = new Date().toISOString();
    
    // Save the final state
    saveAppData();
    
    // Return to main menu
    showScreen('main');
    
    // Clear current game
    appState.currentGame = null;
    
    // Close dialog
    closeEndGameDialog();
}

// Reports
function renderReportsList() {
    const reportsList = document.getElementById('reports-list');
    if (!reportsList) return;
    
    reportsList.innerHTML = '';
    
    // Filter for completed games only
    const completedGames = appState.games.filter(game => game.completed);
    
    if (completedGames.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">No completed games yet. Play a game to generate reports.</div>';
        return;
    }
    
    // Sort games by date (newest first)
    completedGames.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    completedGames.forEach(game => {
        const gameDate = new Date(game.date).toLocaleDateString();
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        // Count goals scored by team
        const goalsScored = game.actions.filter(a => a.actionType === 'goal').length;
        const goalsAllowed = game.actions.filter(a => a.actionType === 'goal_allowed').length;
        
        reportItem.innerHTML = `
            <div class="report-info">
                <div class="report-date">${gameDate}</div>
                <div class="report-title">vs ${game.opponent}</div>
                <div class="report-score">${goalsScored} - ${goalsAllowed}</div>
            </div>
            <div class="report-actions">
                <button class="secondary-btn" onclick="viewReport('${game.id}')">View Report</button>
            </div>
        `;
        
        reportsList.appendChild(reportItem);
    });
}

function viewReport(gameId) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) return;
    
    // Store current report game for export functions
    appState.currentReportGame = gameId;
    
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

    // Choose report format based on settings
    if (appState.settings.recordGameTime) {
        // TIME-BASED REPORT FORMAT
        // Create a timeline of actions
        const timeline = [];
        
        // Group actions by game minute
        game.actions.forEach(action => {
            const player = appState.players.find(p => p.id === action.playerId);
            if (!player) return;
            
            const minute = action.gameMinute || 0;
            
            // Create minute entry if it doesn't exist
            if (!timeline[minute]) {
                timeline[minute] = [];
            }
            
            // Add action to timeline
            timeline[minute].push({
                playerName: player.name,
                jerseyNumber: player.jerseyNumber,
                actionType: action.actionType,
                timestamp: action.timestamp
            });
        });
        
        // Build timeline HTML
        let timelineHTML = '';
        timeline.forEach((actions, minute) => {
            if (actions && actions.length > 0) {
                timelineHTML += `<div class="minute-section">
                    <h3>Minute ${minute}</h3>
                    <ul class="action-list">`;
                
                actions.forEach(action => {
                    let actionText = '';
                    switch(action.actionType) {
                        case 'goal':
                            actionText = `⚽ #${action.jerseyNumber} ${action.playerName} scored a goal`;
                            break;
                        case 'assist':
                            actionText = `👟 #${action.jerseyNumber} ${action.playerName} made an assist`;
                            break;
                        case 'save':
                            actionText = `🧤 #${action.jerseyNumber} ${action.playerName} made a save`;
                            break;
                        case 'goal_allowed':
                            actionText = `😞 #${action.jerseyNumber} ${action.playerName} allowed a goal`;
                            break;
                    }
                    timelineHTML += `<li>${actionText}</li>`;
                });
                
                timelineHTML += `</ul></div>`;
            }
        });
        
        // Set report HTML for time-based format
        reportDialog.innerHTML = `
            <div class="dialog-content wide-dialog">
                <h2>Game Report - ${gameDate} ${gameTime}</h2>
                <div class="report-header">
                    <p><strong>Team:</strong> ${appState.teamName}</p>
                    <p><strong>Opponent:</strong> ${game.opponent}</p>
                    <p><strong>Duration:</strong> ${gameDuration}</p>
                </div>
                <div class="report-body timeline-format">
                    <h3>Game Timeline</h3>
                    ${timelineHTML || '<p>No recorded actions for this game.</p>'}
                </div>
                <div class="dialog-buttons">
                    <button class="secondary-btn" onclick="closeDetailedReport()">Close</button>
                    <div class="export-buttons">
                        <button class="secondary-btn" onclick="exportReport('${gameId}', 'pdf')">Export as PDF</button>
                        <button class="secondary-btn" onclick="exportReport('${gameId}', 'png')">Export as PNG</button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // PLAYER-BASED REPORT FORMAT (Original)
        // Get player actions from the game
        const playerActions = {};
        
        // Initialize player actions
        game.activePlayers.forEach(playerId => {
            const player = appState.players.find(p => p.id === playerId);
            if (player) {
                playerActions[playerId] = {
                    name: player.name,
                    jerseyNumber: player.jerseyNumber,
                    goals: 0,
                    assists: 0,
                    saves: 0,
                    goalsAllowed: 0
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
                    <td>${playerStat.name}</td>
                    <td>${playerStat.goals}</td>
                    <td>${playerStat.assists}</td>
                    <td>${playerStat.saves}</td>
                    <td>${playerStat.goalsAllowed}</td>
                </tr>
                `;
            });
    
        // Generate report HTML for player-based format
        reportDialog.innerHTML = `
            <div class="dialog-content wide-dialog">
                <h2>Game Report - ${gameDate} ${gameTime}</h2>
                <div class="report-header">
                    <p><strong>Team:</strong> ${appState.teamName}</p>
                    <p><strong>Opponent:</strong> ${game.opponent || 'Unknown'}</p>
                    <p><strong>Duration:</strong> ${gameDuration}</p>
                </div>
                <div class="report-body">
                    <h3>Player Stats</h3>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Name</th>
                                <th>Goals</th>
                                <th>Assists</th>
                                <th>Saves</th>
                                <th>Goals Allowed</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${playerStatsHTML}
                        </tbody>
                    </table>
                </div>
                <div class="dialog-buttons">
                    <button class="secondary-btn" onclick="closeDetailedReport()">Close</button>
                    <div class="export-buttons">
                        <button class="secondary-btn" onclick="exportReport('${gameId}', 'pdf')">Export as PDF</button>
                        <button class="secondary-btn" onclick="exportReport('${gameId}', 'png')">Export as PNG</button>
                    </div>
                </div>
            </div>
        `;
    }
    
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
    // This would generate and export the report
    // For the prototype, we'll just show an alert
    alert(`Report would be exported as ${format.toUpperCase()}`);
}

// Settings
function saveSettings() {
    const language = document.querySelector('input[name="language"]:checked').value;
    const darkMode = document.getElementById('dark-mode').checked;
    const defaultTimer = document.getElementById('default-timer').value;
    const recordGameTime = document.getElementById('record-game-time').checked;
    
    appState.settings.language = language;
    appState.settings.darkMode = darkMode;
    appState.settings.defaultTimer = parseInt(defaultTimer);
    appState.settings.recordGameTime = recordGameTime;
    
    // Apply dark mode immediately
    applyDarkMode(darkMode);
    
    saveAppData();
    alert('Settings saved successfully');
}

// Data Persistence
function saveAppData() {
    localStorage.setItem('soccerCoachApp', JSON.stringify({
        teamName: appState.teamName,
        players: appState.players,
        games: appState.games,
        settings: appState.settings
    }));
}

function loadAppData() {
    const savedData = localStorage.getItem('soccerCoachApp');
    if (savedData) {
        const data = JSON.parse(savedData);
        appState.teamName = data.teamName || "My Team";
        appState.players = data.players || [];
        appState.games = data.games || [];
        appState.settings = data.settings || appState.settings;
        
        // Apply settings
        if (appState.settings.darkMode) {
            document.body.classList.add('dark-mode');
        }
    }
}

// Export/Import functions for moving data between devices
function exportTeamData() {
    // Prepare data for export
    const exportData = {
        exportDate: new Date().toISOString(),
        teamName: appState.teamName,
        players: appState.players,
        games: appState.games,
        settings: appState.settings
    };
    
    // Convert to JSON string
    const dataStr = JSON.stringify(exportData);
    
    // Create download link
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${appState.teamName.replace(/\s+/g, '_')}_data.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
            
            // Apply imported data
            appState.teamName = importedData.teamName;
            appState.players = importedData.players;
            appState.games = importedData.games || [];
            if (importedData.settings) {
                appState.settings = importedData.settings;
                applyDarkMode(appState.settings.darkMode);
            }
            
            // Save to local storage
            saveAppData();
            
            // Update UI
            updateTeamNameUI();
            if (document.getElementById('players-list')) {
                renderPlayersList();
            }
            
            alert('Data imported successfully');
        } catch (error) {
            alert('Error importing data. Invalid file format.');
        }
    };
    
    reader.readAsText(file);
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

// Reset Data functions
function confirmResetData() {
    // Show reset confirmation dialog
    document.getElementById('reset-data-dialog').style.display = 'flex';
}

function closeResetDataDialog() {
    document.getElementById('reset-data-dialog').style.display = 'none';
}

function resetAllData() {
    // Reset to default state
    appState = {
        teamName: "My Team",
        players: [],
        games: [],
        currentGame: null,
        timer: {
            duration: 6 * 60, // Reset to default 6 minutes
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
            darkMode: appState.settings.darkMode, // Keep current dark mode setting
            defaultTimer: 6,
            recordGameTime: appState.settings.recordGameTime // Keep current recording preference
        },
        currentPlayer: null
    };
    
    // Save to local storage
    saveAppData();
    
    // Update UI elements if they exist
    updateTeamNameUI();
    if (document.getElementById('players-list')) {
        renderPlayersList();
    }
    if (document.getElementById('reports-list')) {
        renderReportsList();
    }
    
    // Close dialog
    closeResetDataDialog();
    
    // Show confirmation
    alert('All data has been reset');
}