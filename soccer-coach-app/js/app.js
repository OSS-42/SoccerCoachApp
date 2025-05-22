// Application State
let appState = {
    teamName: "Mon Équipe",
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
        language: 'fr', // Set French as default language
        darkMode: false,
        defaultTimer: 6
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
    
    // Update the toggle in the settings panel if available
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.checked = enabled;
    }
}

// Apply language to all UI elements
function applyLanguage(language) {
    // Set the language in our new translation system
    if (typeof setLanguage === 'function') {
        setLanguage(language);
    }
    
    // Apply translations to all UI elements
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
}

// Update team name in the UI
function updateTeamNameUI() {
    const teamNameDisplay = document.getElementById('team-name-display');
    if (teamNameDisplay) {
        teamNameDisplay.textContent = appState.teamName;
    }
}

// Save team name
function saveTeamName() {
    const teamNameInput = document.getElementById('team-name-input');
    if (teamNameInput && teamNameInput.value.trim()) {
        appState.teamName = teamNameInput.value.trim();
        updateTeamNameUI();
        saveAppData();
        // Show success message
        alert(t('teamNameSaved'));
    } else {
        alert(t('pleaseEnterTeamName'));
    }
}

// Show specific screen and hide others
function showScreen(screenId) {
    const screens = ['main-screen', 'team-setup', 'game-setup', 'game-tracking', 'reports', 'settings'];
    
    screens.forEach(screen => {
        document.getElementById(screen).style.display = screen === screenId ? 'block' : 'none';
    });
    
    // Special cases for screens
    if (screenId === 'team-setup') {
        renderPlayersList();
    } else if (screenId === 'reports') {
        renderReportsList();
    } else if (screenId === 'settings') {
        // Initialize settings form values
        document.getElementById('language-select').value = appState.settings.language;
        document.getElementById('dark-mode-toggle').checked = appState.settings.darkMode;
        document.getElementById('default-timer').value = appState.settings.defaultTimer;
    }
}

// Open add player dialog
function openAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'block';
    document.getElementById('player-name').value = '';
    document.getElementById('jersey-number').value = '';
}

// Close add player dialog
function closeAddPlayerDialog() {
    document.getElementById('add-player-dialog').style.display = 'none';
}

// Add a new player
function addPlayer() {
    const playerName = document.getElementById('player-name').value.trim();
    const jerseyNumber = document.getElementById('jersey-number').value.trim();
    
    if (!playerName || !jerseyNumber) {
        alert(t('fillAllFields'));
        return;
    }
    
    // Check if jersey number already exists
    if (appState.players.some(player => player.jerseyNumber === jerseyNumber)) {
        alert(t('duplicateJersey'));
        return;
    }
    
    appState.players.push({
        id: Date.now().toString(),
        name: playerName,
        jerseyNumber: jerseyNumber,
        stats: {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0
        }
    });
    
    closeAddPlayerDialog();
    renderPlayersList();
    saveAppData();
}

// Render the players list
function renderPlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    appState.players.sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber)).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="player-info">
                <div class="jersey-number">${player.jerseyNumber}</div>
                <div class="player-name">${player.name}</div>
            </div>
            <div class="player-actions">
                <button onclick="editPlayer('${player.id}')"><span class="material-icons">edit</span>${t('edit')}</button>
                <button onclick="deletePlayer('${player.id}')"><span class="material-icons">delete</span>${t('delete')}</button>
            </div>
        `;
        playersList.appendChild(playerItem);
    });
}

// Edit player
function editPlayer(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (player) {
        document.getElementById('edit-player-id').value = player.id;
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-jersey-number').value = player.jerseyNumber;
        document.getElementById('edit-player-dialog').style.display = 'block';
    }
}

// Close edit player dialog
function closeEditPlayerDialog() {
    document.getElementById('edit-player-dialog').style.display = 'none';
}

// Save player edit
function savePlayerEdit() {
    const playerId = document.getElementById('edit-player-id').value;
    const playerName = document.getElementById('edit-player-name').value.trim();
    const jerseyNumber = document.getElementById('edit-jersey-number').value.trim();
    
    if (!playerName || !jerseyNumber) {
        alert(t('fillAllFields'));
        return;
    }
    
    // Check if jersey number already exists (but ignore the current player's jersey)
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        const otherPlayers = appState.players.filter(p => p.id !== playerId);
        if (otherPlayers.some(p => p.jerseyNumber === jerseyNumber)) {
            alert(t('duplicateJersey'));
            return;
        }
        
        appState.players[playerIndex].name = playerName;
        appState.players[playerIndex].jerseyNumber = jerseyNumber;
        
        closeEditPlayerDialog();
        renderPlayersList();
        saveAppData();
    }
}

// Delete player
function deletePlayer(playerId) {
    const confirmDelete = confirm("Are you sure you want to delete this player?");
    if (confirmDelete) {
        appState.players = appState.players.filter(p => p.id !== playerId);
        renderPlayersList();
        saveAppData();
    }
}

// Start a new game
function startGame() {
    const opponentName = document.getElementById('opponent-name').value.trim();
    const gameDate = document.getElementById('game-date').value;
    const substitutionTime = document.getElementById('substitution-time').value;
    
    if (!opponentName || !gameDate) {
        alert(t('fillAllFields'));
        return;
    }
    
    appState.currentGame = {
        id: Date.now().toString(),
        date: gameDate,
        opponent: opponentName,
        score: {
            team: 0,
            opponent: 0
        },
        duration: 0,
        startTime: new Date().getTime(),
        actions: [],
        completed: false
    };
    
    // Reset timers
    appState.timer.duration = parseInt(substitutionTime) * 60;
    appState.timer.timeLeft = appState.timer.duration;
    appState.timer.isRunning = false;
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.isRunning = false;
    
    // Clear any existing intervals
    if (appState.timer.interval) {
        clearInterval(appState.timer.interval);
        appState.timer.interval = null;
    }
    if (appState.gameTimer.interval) {
        clearInterval(appState.gameTimer.interval);
        appState.gameTimer.interval = null;
    }
    
    // Update display
    updateTimerDisplay();
    updateGameTimeDisplay();
    
    // Render player grid
    renderPlayerGrid();
    
    // Switch to game tracking screen
    showScreen('game-tracking');
    
    // Start the game timer
    startGameTimer();
}

// Render player grid for game tracking
function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';
    
    appState.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.setAttribute('data-player-id', player.id);
        playerCard.innerHTML = `
            <div class="player-card-header">
                <span class="player-number">${player.jerseyNumber}</span>
                <span class="player-name">${player.name}</span>
            </div>
            <div class="player-stats">
                <div class="stat-item" title="${t('goals')}">
                    <span class="material-icons">sports_score</span>
                    <span class="stat-count" id="goals-${player.id}">0</span>
                </div>
                <div class="stat-item" title="${t('assists')}">
                    <span class="material-icons">front_hand</span>
                    <span class="stat-count" id="assists-${player.id}">0</span>
                </div>
                <div class="stat-item" title="${t('saves')}">
                    <span class="material-icons">back_hand</span>
                    <span class="stat-count" id="saves-${player.id}">0</span>
                </div>
                <div class="stat-item" title="${t('goalsAllowed')}">
                    <span class="material-icons">sports_soccer</span>
                    <span class="stat-count" id="goals-allowed-${player.id}">0</span>
                </div>
            </div>
            <button class="action-btn" onclick="openPlayerActionDialog(${JSON.stringify(player).replace(/"/g, '&quot;')})">
                <span class="material-icons">add_circle</span>
            </button>
        `;
        playerGrid.appendChild(playerCard);
    });
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(appState.timer.timeLeft / 60);
    const seconds = appState.timer.timeLeft % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('sub-time').textContent = `${t('substitution')} ${formattedTime}`;
    
    // Add visual indicator when timer is low
    if (appState.timer.timeLeft <= 30) { // Less than 30 seconds
        document.getElementById('sub-time').classList.add('warning');
    } else {
        document.getElementById('sub-time').classList.remove('warning');
    }
}

// Update game time display
function updateGameTimeDisplay() {
    let elapsedTime = appState.gameTimer.elapsed;
    
    // If timer is running, add the time since it started
    if (appState.gameTimer.isRunning && appState.gameTimer.startTime) {
        const currentTime = new Date().getTime();
        const additionalSeconds = Math.floor((currentTime - appState.gameTimer.startTime) / 1000);
        elapsedTime += additionalSeconds;
    }
    
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('game-time').textContent = `${t('gameTime')} ${formattedTime}`;
}

// Start timer for substitutions
function startTimer() {
    if (appState.timer.isRunning) return;
    
    // Update button states
    document.querySelector('.timer-controls button:nth-child(1)').disabled = true; // Start button
    document.querySelector('.timer-controls button:nth-child(2)').disabled = false; // Pause button
    
    appState.timer.isRunning = true;
    appState.timer.interval = setInterval(() => {
        if (appState.timer.timeLeft > 0) {
            appState.timer.timeLeft--;
            updateTimerDisplay();
        } else {
            // Timer reached zero
            clearInterval(appState.timer.interval);
            appState.timer.interval = null;
            appState.timer.isRunning = false;
            
            // Play sound or visual alert
            document.getElementById('sub-time').classList.add('alert');
            setTimeout(() => {
                document.getElementById('sub-time').classList.remove('alert');
            }, 3000);
            
            // Update button states
            document.querySelector('.timer-controls button:nth-child(1)').disabled = false; // Start button
            document.querySelector('.timer-controls button:nth-child(2)').disabled = true; // Pause button
        }
    }, 1000);
}

// Pause timer
function pauseTimer() {
    if (!appState.timer.isRunning) return;
    
    clearInterval(appState.timer.interval);
    appState.timer.interval = null;
    appState.timer.isRunning = false;
    
    // Update button states
    document.querySelector('.timer-controls button:nth-child(1)').disabled = false; // Start button
    document.querySelector('.timer-controls button:nth-child(2)').disabled = true; // Pause button
}

// Reset timer
function resetTimer() {
    pauseTimer();
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
}

// Start game timer
function startGameTimer() {
    if (appState.gameTimer.isRunning) return;
    
    appState.gameTimer.isRunning = true;
    appState.gameTimer.startTime = new Date().getTime();
    
    appState.gameTimer.interval = setInterval(() => {
        updateGameTimeDisplay();
    }, 1000);
}

// Pause game timer
function pauseGameTimer() {
    if (!appState.gameTimer.isRunning) return;
    
    clearInterval(appState.gameTimer.interval);
    appState.gameTimer.interval = null;
    
    // Update elapsed time
    const currentTime = new Date().getTime();
    const additionalSeconds = Math.floor((currentTime - appState.gameTimer.startTime) / 1000);
    appState.gameTimer.elapsed += additionalSeconds;
    appState.gameTimer.isRunning = false;
}

// Open player action dialog
function openPlayerActionDialog(player) {
    appState.currentPlayer = player;
    document.getElementById('action-player-name').textContent = player.name;
    document.getElementById('player-action-dialog').style.display = 'block';
}

// Close player action dialog
function closePlayerActionDialog() {
    document.getElementById('player-action-dialog').style.display = 'none';
    appState.currentPlayer = null;
}

// Handle goal action
function handleGoalAction() {
    // Close current dialog and open assist selection dialog
    closePlayerActionDialog();
    openAssistSelectionDialog();
}

// Open assist selection dialog
function openAssistSelectionDialog() {
    document.getElementById('assist-selection-dialog').style.display = 'block';
    
    // Generate list of potential assisters (all players except the current scorer)
    const assistList = document.getElementById('assist-players-list');
    assistList.innerHTML = '';
    
    appState.players.forEach(player => {
        if (player.id !== appState.currentPlayer.id) {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'player-select-btn';
            playerBtn.onclick = () => completeGoalWithAssist(player.id);
            playerBtn.innerHTML = `
                <div class="jersey-number">${player.jerseyNumber}</div>
                <div class="player-name">${player.name}</div>
            `;
            assistList.appendChild(playerBtn);
        }
    });
}

// Close assist selection dialog
function closeAssistSelectionDialog() {
    document.getElementById('assist-selection-dialog').style.display = 'none';
}

// Complete goal with assist
function completeGoalWithAssist(assistPlayerId) {
    // Record the goal for the current player
    recordAction('goal');
    
    // Record the assist for the assisting player
    recordAction('assist', assistPlayerId);
    
    // Update score
    appState.currentGame.score.team++;
    
    // Close dialog
    closeAssistSelectionDialog();
}

// Complete goal without assist
function completeGoalWithoutAssist() {
    // Record goal for current player
    recordAction('goal');
    
    // Update score
    appState.currentGame.score.team++;
    
    // Close dialog
    closeAssistSelectionDialog();
}

// Handle assist action
function handleAssistAction() {
    // Close current dialog and open scorer selection
    closePlayerActionDialog();
    openScorerSelectionDialog();
}

// Open scorer selection dialog
function openScorerSelectionDialog() {
    document.getElementById('scorer-selection-dialog').style.display = 'block';
    
    // Generate list of potential scorers (all players except the current assister)
    const scorerList = document.getElementById('scorer-players-list');
    scorerList.innerHTML = '';
    
    appState.players.forEach(player => {
        if (player.id !== appState.currentPlayer.id) {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'player-select-btn';
            playerBtn.onclick = () => completeAssistWithScorer(player.id);
            playerBtn.innerHTML = `
                <div class="jersey-number">${player.jerseyNumber}</div>
                <div class="player-name">${player.name}</div>
            `;
            scorerList.appendChild(playerBtn);
        }
    });
}

// Close scorer selection dialog
function closeScorerSelectionDialog() {
    document.getElementById('scorer-selection-dialog').style.display = 'none';
}

// Complete assist with scorer
function completeAssistWithScorer(scorerId) {
    // Record the assist for the current player
    recordAction('assist');
    
    // Record the goal for the scoring player
    recordAction('goal', scorerId);
    
    // Update score
    appState.currentGame.score.team++;
    
    // Close dialog
    closeScorerSelectionDialog();
}

// Record player action
function recordAction(actionType, specificPlayerId = null) {
    const playerId = specificPlayerId || (appState.currentPlayer ? appState.currentPlayer.id : null);
    if (!playerId) return;
    
    // Find the player
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    
    // Update player stats
    switch (actionType) {
        case 'goal':
            appState.players[playerIndex].stats.goals++;
            break;
        case 'assist':
            appState.players[playerIndex].stats.assists++;
            break;
        case 'save':
            appState.players[playerIndex].stats.saves++;
            break;
        case 'goal_allowed':
            appState.players[playerIndex].stats.goalsAllowed++;
            appState.currentGame.score.opponent++;
            break;
    }
    
    // Record action in game log
    if (appState.currentGame) {
        const gameMinute = calculateGameMinute();
        appState.currentGame.actions.push({
            type: actionType,
            playerId: playerId,
            playerName: appState.players[playerIndex].name,
            jerseyNumber: appState.players[playerIndex].jerseyNumber,
            time: gameMinute,
            timestamp: new Date().toISOString()
        });
    }
    
    // Update UI
    updatePlayerGridItem(playerId);
    
    // Save data
    saveAppData();
}

// Update an individual player's stats in the grid
function updatePlayerGridItem(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    document.getElementById(`goals-${playerId}`).textContent = player.stats.goals;
    document.getElementById(`assists-${playerId}`).textContent = player.stats.assists;
    document.getElementById(`saves-${playerId}`).textContent = player.stats.saves;
    document.getElementById(`goals-allowed-${playerId}`).textContent = player.stats.goalsAllowed;
}

// Calculate current game minute for logging actions
function calculateGameMinute() {
    let elapsedTime = appState.gameTimer.elapsed;
    
    // If timer is running, add the time since it started
    if (appState.gameTimer.isRunning && appState.gameTimer.startTime) {
        const currentTime = new Date().getTime();
        const additionalSeconds = Math.floor((currentTime - appState.gameTimer.startTime) / 1000);
        elapsedTime += additionalSeconds;
    }
    
    return Math.floor(elapsedTime / 60);
}

// Confirm end game
function confirmEndGame() {
    document.getElementById('end-game-dialog').style.display = 'block';
}

// Close end game dialog
function closeEndGameDialog() {
    document.getElementById('end-game-dialog').style.display = 'none';
}

// End the current game
function endGame() {
    // Stop timers
    pauseTimer();
    pauseGameTimer();
    
    // Mark game as completed
    if (appState.currentGame) {
        appState.currentGame.completed = true;
        appState.currentGame.duration = appState.gameTimer.elapsed;
        appState.currentGame.endTime = new Date().getTime();
        
        // Add to games list
        appState.games.push(appState.currentGame);
        appState.currentGame = null;
        
        // Save data
        saveAppData();
    }
    
    // Close dialog and return to main screen
    closeEndGameDialog();
    showScreen('main-screen');
}

// Render list of completed games
function renderReportsList() {
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '';
    
    if (appState.games.length === 0 || !appState.games.some(game => game.completed)) {
        reportsList.innerHTML = `<div class="empty-state">${t('noGames')}</div>`;
        return;
    }
    
    appState.games.filter(game => game.completed).forEach(game => {
        const gameDate = new Date(game.date);
        const formattedDate = gameDate.toLocaleDateString();
        
        const gameItem = document.createElement('div');
        gameItem.className = 'report-item';
        gameItem.innerHTML = `
            <div class="report-info">
                <div class="report-date">${formattedDate}</div>
                <div class="report-teams">${appState.teamName} ${game.score.team} - ${game.score.opponent} ${game.opponent}</div>
            </div>
            <div class="report-actions">
                <button onclick="viewReport('${game.id}')"><span class="material-icons">visibility</span>${t('viewReport')}</button>
            </div>
        `;
        reportsList.appendChild(gameItem);
    });
}

// View detailed report for a game
function viewReport(gameId) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) return;
    
    // Format game date
    const gameDate = new Date(game.date);
    const formattedDate = gameDate.toLocaleDateString();
    
    // Calculate duration
    const durationMinutes = Math.floor(game.duration / 60);
    const durationSeconds = game.duration % 60;
    const formattedDuration = `${durationMinutes.toString().padStart(2, '0')}:${durationSeconds.toString().padStart(2, '0')}`;
    
    // Update report details
    document.getElementById('report-date').textContent = formattedDate;
    document.getElementById('report-teams').textContent = `${appState.teamName} ${t('vs')} ${game.opponent}`;
    document.getElementById('report-score').textContent = `${game.score.team} - ${game.score.opponent}`;
    document.getElementById('report-duration').textContent = formattedDuration;
    
    // Generate player stats
    const statsTable = document.getElementById('player-stats-table');
    statsTable.innerHTML = `
        <tr>
            <th>#</th>
            <th>${t('playerName')}</th>
            <th>${t('goals')}</th>
            <th>${t('assists')}</th>
            <th>${t('saves')}</th>
            <th>${t('goalsAllowed')}</th>
        </tr>
    `;
    
    // Get all players who participated in the game (had actions)
    const participantIds = [...new Set(game.actions.map(action => action.playerId))];
    
    // Get players data
    const participants = participantIds.map(id => {
        const player = appState.players.find(p => p.id === id);
        if (!player) {
            // Player might have been deleted, use info from game actions
            const action = game.actions.find(a => a.playerId === id);
            return {
                id,
                name: action ? action.playerName : 'Unknown',
                jerseyNumber: action ? action.jerseyNumber : '?',
                stats: {
                    goals: game.actions.filter(a => a.playerId === id && a.type === 'goal').length,
                    assists: game.actions.filter(a => a.playerId === id && a.type === 'assist').length,
                    saves: game.actions.filter(a => a.playerId === id && a.type === 'save').length,
                    goalsAllowed: game.actions.filter(a => a.playerId === id && a.type === 'goal_allowed').length
                }
            };
        }
        
        // For existing players, count actions from this specific game
        return {
            ...player,
            stats: {
                goals: game.actions.filter(a => a.playerId === id && a.type === 'goal').length,
                assists: game.actions.filter(a => a.playerId === id && a.type === 'assist').length,
                saves: game.actions.filter(a => a.playerId === id && a.type === 'save').length,
                goalsAllowed: game.actions.filter(a => a.playerId === id && a.type === 'goal_allowed').length
            }
        };
    });
    
    // Sort by jersey number
    participants.sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber)).forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.jerseyNumber}</td>
            <td>${player.name}</td>
            <td>${player.stats.goals}</td>
            <td>${player.stats.assists}</td>
            <td>${player.stats.saves}</td>
            <td>${player.stats.goalsAllowed}</td>
        `;
        statsTable.appendChild(row);
    });
    
    // Setup export buttons (if implemented)
    document.getElementById('export-pdf').onclick = () => exportReport(game.id, 'pdf');
    document.getElementById('export-png').onclick = () => exportReport(game.id, 'png');
    
    // Show detailed report
    document.getElementById('detailed-report').style.display = 'block';
}

// Close detailed report view
function closeDetailedReport() {
    document.getElementById('detailed-report').style.display = 'none';
}

// Export report to PDF or PNG
function exportReport(gameId, format) {
    alert(`Export as ${format} not yet implemented`);
    // Implementation for report export would go here
}

// Save application settings
function saveSettings() {
    appState.settings.language = document.getElementById('language-select').value;
    appState.settings.darkMode = document.getElementById('dark-mode-toggle').checked;
    appState.settings.defaultTimer = parseInt(document.getElementById('default-timer').value) || 6;
    
    // Apply settings immediately
    applyDarkMode(appState.settings.darkMode);
    applyLanguage(appState.settings.language);
    
    // Save settings to storage
    saveAppData();
    
    // Show confirmation
    alert(t('settingsSaved'));
}

// Save app data to local storage
function saveAppData() {
    localStorage.setItem('soccerCoachApp', JSON.stringify({
        teamName: appState.teamName,
        players: appState.players,
        games: appState.games,
        settings: appState.settings
    }));
}

// Load app data from local storage
function loadAppData() {
    const savedData = localStorage.getItem('soccerCoachApp');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Update app state with saved data
        appState.teamName = parsedData.teamName || "Mon Équipe";
        appState.players = parsedData.players || [];
        appState.games = parsedData.games || [];
        
        // Load settings if available
        if (parsedData.settings) {
            appState.settings = {
                ...appState.settings,
                ...parsedData.settings
            };
        }
        
        // Apply settings
        applyDarkMode(appState.settings.darkMode);
        applyLanguage(appState.settings.language);
        
        // Update UI
        updateTeamNameUI();
    } else {
        // First time setup - apply default settings
        applyDarkMode(appState.settings.darkMode);
        applyLanguage(appState.settings.language);
    }
}

// Export team data to JSON file
function exportTeamData() {
    const exportData = {
        teamName: appState.teamName,
        players: appState.players,
        games: appState.games,
        settings: appState.settings,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileName = `soccer_coach_data_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
}

// Import team data from JSON file
function importTeamData() {
    document.getElementById('import-file').click();
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!importedData.teamName || !Array.isArray(importedData.players)) {
                throw new Error('Invalid data format');
            }
            
            // Update app state
            appState.teamName = importedData.teamName;
            appState.players = importedData.players;
            
            // Conditionally import games and settings if available
            if (Array.isArray(importedData.games)) {
                appState.games = importedData.games;
            }
            
            if (importedData.settings) {
                appState.settings = {
                    ...appState.settings,
                    ...importedData.settings
                };
                
                // Apply imported settings
                applyDarkMode(appState.settings.darkMode);
                applyLanguage(appState.settings.language);
            }
            
            // Update UI
            updateTeamNameUI();
            renderPlayersList();
            
            // Save to local storage
            saveAppData();
            
            alert('Team data imported successfully!');
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Add demo players for testing
function addDemoPlayers() {
    const demoPlayers = [
        { id: 'p1', name: 'Martin', jerseyNumber: '1', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p2', name: 'Sophie', jerseyNumber: '5', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p3', name: 'Louis', jerseyNumber: '7', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p4', name: 'Emma', jerseyNumber: '9', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p5', name: 'Hugo', jerseyNumber: '11', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p6', name: 'Léa', jerseyNumber: '14', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p7', name: 'Antoine', jerseyNumber: '18', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } },
        { id: 'p8', name: 'Chloé', jerseyNumber: '21', stats: { goals: 0, assists: 0, saves: 0, goalsAllowed: 0 } }
    ];
    
    appState.players = demoPlayers;
    renderPlayersList();
    saveAppData();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load saved data
    loadAppData();
    
    // Initialize date picker with today's date
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('game-date').value = today;
    
    // Set default substitution timer from settings
    document.getElementById('substitution-time').value = appState.settings.defaultTimer;
    
    // Show main screen
    showScreen('main-screen');
    
    // Add event listeners for file import
    document.getElementById('import-file').addEventListener('change', handleFileImport);
    
    // DEBUG: Add double-click on app title to add demo players
    document.querySelector('.app-title').addEventListener('dblclick', addDemoPlayers);
});