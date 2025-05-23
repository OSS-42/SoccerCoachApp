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
        defaultTimer: 6
    },
    currentPlayer: null
};

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
function showMessage(message, type = 'error') {
    const ribbon = document.getElementById('message-ribbon');
    const messageText = document.getElementById('message-text');
    
    messageText.textContent = message;
    ribbon.className = `message-ribbon ${type}`;
    
    // Show message
    setTimeout(() => {
        ribbon.classList.remove('hidden');
    }, 10);
    
    // Auto-hide after 5 seconds
    if (type === 'success') {
        setTimeout(hideMessage, 5000);
    }
}

function hideMessage() {
    const ribbon = document.getElementById('message-ribbon');
    ribbon.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    // Load saved data if available
    loadAppData();
    
    // Populate UI with existing data
    renderPlayersList();
    updateTeamNameUI();
    
    // Add demo players if none exist
    if (appState.players.length === 0) {
        addDemoPlayers();
    }
    
    // Set today's date as the default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('game-date').value = today;
});

// Team Name functions
function updateTeamNameUI() {
    // Update team name in the input field
    const teamNameInput = document.getElementById('team-name-input');
    if (teamNameInput) {
        teamNameInput.value = appState.teamName;
    }
    
    // Update team name in game screen
    const teamNameElements = document.querySelectorAll('.team-name');
    teamNameElements.forEach(element => {
        if (element.id !== 'opponent-team-name') {
            element.textContent = appState.teamName.toUpperCase();
        }
    });
}

function saveTeamName() {
    const teamNameInput = document.getElementById('team-name-input');
    const newTeamName = teamNameInput.value.trim();
    
    if (newTeamName) {
        appState.teamName = newTeamName;
        saveAppData();
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
    
    // Special handling for specific screens
    if (screenId === 'reports') {
        renderReportsList();
    } else if (screenId === 'game-setup') {
        // Auto-fill today's date when opening the game setup screen
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('game-date').value = `${year}-${month}-${day}`;
    }
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
    const name = document.getElementById('player-name').value.trim();
    const jerseyNumber = document.getElementById('jersey-number').value;
    
    if (!name || !jerseyNumber) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Check for duplicate jersey numbers
    if (appState.players.some(p => p.jerseyNumber === Number(jerseyNumber))) {
        showMessage('A player with this jersey number already exists', 'error');
        return;
    }
    
    // Generate a unique ID that isn't already in use
    let playerId;
    do {
        playerId = Math.floor(Math.random() * 1000000).toString();
    } while (appState.players.some(p => p.id === playerId));
    
    const player = {
        id: playerId, // Using a random number instead of timestamp for better reusability
        name,
        jerseyNumber: Number(jerseyNumber),
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
    
    if (appState.players.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
        return;
    }
    
    appState.players.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
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
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Create edit player dialog if it doesn't exist
    let editDialog = document.getElementById('edit-player-dialog');
    if (!editDialog) {
        editDialog = document.createElement('div');
        editDialog.id = 'edit-player-dialog';
        editDialog.className = 'dialog';
        document.getElementById('app').appendChild(editDialog);
    }
    
    editDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Edit Player</h2>
            <div class="form-group">
                <label for="edit-player-name">First Name:</label>
                <input type="text" id="edit-player-name" value="${player.name}" placeholder="Enter player's first name">
            </div>
            <div class="form-group">
                <label for="edit-jersey-number">Jersey Number:</label>
                <input type="number" id="edit-jersey-number" value="${player.jerseyNumber}" min="1" max="99">
            </div>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeEditPlayerDialog()">Cancel</button>
                <button class="primary-btn" onclick="savePlayerEdit('${player.id}')">Save</button>
            </div>
        </div>
    `;
    
    editDialog.style.display = 'flex';
}

function closeEditPlayerDialog() {
    const editDialog = document.getElementById('edit-player-dialog');
    if (editDialog) {
        editDialog.style.display = 'none';
    }
}

function savePlayerEdit(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const newName = document.getElementById('edit-player-name').value.trim();
    const newJerseyNumber = parseInt(document.getElementById('edit-jersey-number').value);
    
    if (!newName) {
        showMessage('Please enter a name for the player', 'error');
        return;
    }
    
    if (!newJerseyNumber || newJerseyNumber < 1 || newJerseyNumber > 99) {
        showMessage('Please enter a valid jersey number between 1 and 99', 'error');
        return;
    }
    
    // Check for duplicate jersey numbers (excluding this player)
    if (appState.players.some(p => p.id !== playerId && p.jerseyNumber === newJerseyNumber)) {
        showMessage('Another player already has this jersey number', 'error');
        return;
    }
    
    // Update player data
    player.name = newName;
    player.jerseyNumber = newJerseyNumber;
    
    // Save and refresh
    saveAppData();
    renderPlayersList();
    closeEditPlayerDialog();
}

function deletePlayer(playerId) {
    // Create confirmation dialog if it doesn't exist
    let confirmDialog = document.getElementById('confirm-delete-dialog');
    if (!confirmDialog) {
        confirmDialog = document.createElement('div');
        confirmDialog.id = 'confirm-delete-dialog';
        confirmDialog.className = 'dialog';
        document.getElementById('app').appendChild(confirmDialog);
    }
    
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    confirmDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to remove ${player.name} (#${player.jerseyNumber})?</p>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="document.getElementById('confirm-delete-dialog').style.display='none'">Cancel</button>
                <button class="primary-btn delete-btn" onclick="confirmDeletePlayer('${playerId}')">Remove Player</button>
            </div>
        </div>
    `;
    
    confirmDialog.style.display = 'flex';
}

function confirmDeletePlayer(playerId) {
    // Close the confirmation dialog
    document.getElementById('confirm-delete-dialog').style.display = 'none';
    
    // Actually remove the player completely instead of just marking inactive
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        // Get player information for the message
        const player = appState.players[playerIndex];
        
        // Remove the player completely (not just set inactive)
        appState.players.splice(playerIndex, 1);
        
        // Update data and UI
        saveAppData();
        renderPlayersList();
        
        // Show success message with the ribbon
        showMessage(`Player ${player.name} (#${player.jerseyNumber}) has been removed`, 'success');
    }
}

// Game Management
function startGame() {
    const opponentName = document.getElementById('opponent-name').value.trim();
    const gameDate = document.getElementById('game-date').value;
    const substitutionTime = document.getElementById('substitution-time').value;
    
    if (!opponentName) {
        showMessage('Please enter the opponent team name', 'error');
        return;
    }
    
    // Reset player stats for this new game
    appState.players.forEach(player => {
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
        activePlayers: [...appState.players.map(p => p.id)],
        isCompleted: false,
        totalGameTime: 0 // Track total game time in seconds
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
    
    // Switch to game screen
    showScreen('game-tracking');
}

function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';
    
    // Using all players, not filtering by active status anymore
    appState.players.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        // Ensure player has stats object
        if (!player.stats) {
            player.stats = {
                goals: 0,
                assists: 0,
                saves: 0,
                goalsAllowed: 0
            };
        }
        
        const playerGridItem = document.createElement('div');
        playerGridItem.className = 'player-grid-item';
        playerGridItem.setAttribute('data-player-id', player.id);
        
        // Create a completely redesigned player card (now square shaped)
        playerGridItem.innerHTML = `
            <div class="player-header">
                <div class="player-number">${player.jerseyNumber}</div>
                <div class="player-name">${player.name}</div>
            </div>
            <div class="player-stats-container">
                <div class="stat-item">
                    <div class="stat-label">
                        <span class="material-icons">sports_soccer</span>
                    </div>
                    <div class="stat-value">${player.stats.goals}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">
                        <span class="stat-emoji">👟</span>
                    </div>
                    <div class="stat-value">${player.stats.assists}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">
                        <span class="material-icons">back_hand</span>
                    </div>
                    <div class="stat-value">${player.stats.saves}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">
                        <img src="img/red-soccer.png" width="18" height="18" alt="Goals Allowed">
                    </div>
                    <div class="stat-value">${player.stats.goalsAllowed}</div>
                </div>
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
    
    // Reset the game timer completely to 0
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.interval = null;
    appState.gameTimer.startTime = null;
    
    // Update the display to show 00:00
    document.getElementById('game-time').textContent = 'Time: 00:00';
    
    // Also stop and reset substitution timer
    pauseTimer();
    resetTimer();
    
    // Save the state
    saveAppData();
}

// Player Actions
// Helper function to handle dialog operations
function toggleDialog(dialogId, isOpen) {
    document.getElementById(dialogId).style.display = isOpen ? 'flex' : 'none';
}

function openPlayerActionDialog(player) {
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
    
    // Get all players excluding the goal scorer
    const activePlayers = appState.players.filter(p => p.id !== appState.goalScorer.id);
    
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
    const activePlayers = appState.players.filter(p => p.id !== appState.assister.id);
    
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
    
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return; // Player not found
    
    // Ensure player stats object is initialized
    if (!appState.players[playerIndex].stats) {
        appState.players[playerIndex].stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
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
    
    // Only close the dialog if it was opened directly (not via another action flow)
    if (!specificPlayerId) {
        closePlayerActionDialog();
    }
}

function updatePlayerGridItem(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Directly update the stat values in the player card
    const statValues = document.querySelectorAll(`.player-grid-item[data-player-id="${playerId}"] .stat-value`);
    if (statValues && statValues.length >= 4) {
        statValues[0].textContent = player.stats.goals;
        statValues[1].textContent = player.stats.assists;
        statValues[2].textContent = player.stats.saves;
        statValues[3].textContent = player.stats.goalsAllowed;
    } else {
        // Fallback to re-rendering the entire player grid if we can't find stat elements
        renderPlayerGrid();
    }
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
    appState.games.push({...appState.currentGame});
    
    // Stop both timers
    pauseTimer();
    pauseGameTimer();
    
    // Save data before showing report
    saveAppData();
    
    // Close the dialog
    closeEndGameDialog();
    
    // Show the reports screen
    showScreen('reports');
    
    // Generate and show the detailed report for this game
    setTimeout(() => {
        viewReport(finishedGameId);
    }, 300);
    
    // Clear current game
    appState.currentGame = null;
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
            </div>
        `;
        reportsList.appendChild(reportItem);
    });
}

function viewReport(gameId) {
    const game = appState.games.find(g => g.id === gameId);
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
    
    // Generate report HTML
    reportDialog.innerHTML = `
        <div class="dialog-content report-dialog">
            <h2>Game Report</h2>
            <div class="report-header-info">
                <div><strong>Date:</strong> ${gameDate} ${gameTime}</div>
                <div><strong>Teams:</strong> My Team vs ${game.opponentName}</div>
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
    const game = appState.games.find(g => g.id === gameId);
    if (!game) {
        showMessage('Game not found', 'error');
        return;
    }
    
    // Get the report content from the dialog
    const reportContent = document.querySelector('.report-dialog').innerHTML;
    
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

// Data persistence (using localStorage in the prototype)
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
        
        // Initialize UI styling
        initializeStyling();
        
        updateTeamNameUI();
    }
}

// Function to clear all app data and start fresh
function clearAppData() {
    if (confirm('Are you sure you want to clear all data? This will remove all players, games, and settings.')) {
        localStorage.removeItem('soccerCoachApp');
        
        // Reset app state to defaults
        appState = {
            teamName: "My Team",
            players: [],
            games: [],
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
                defaultTimer: 6
            },
            currentPlayer: null
        };
        
        // Update UI
        updateTeamNameUI();
        showMessage('All data has been cleared. The app has been reset.', 'success');
        
        // Return to main screen
        showScreen('main-screen');
    }
}

// Export/Import functions for moving data between devices
function exportTeamData() {
    // Prepare data for export
    const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: "1.0.0",
        teamName: appState.teamName,
        players: appState.players,
        games: appState.games,
        settings: appState.settings
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
                // Update app state with imported data
                appState.teamName = importedData.teamName;
                appState.players = importedData.players;
                appState.games = importedData.games || [];
                if (importedData.settings) {
                    appState.settings = importedData.settings;
                }
                
                // Save to local storage
                saveAppData();
                
                // Update UI
                updateTeamNameUI();
                renderPlayersList();
                
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