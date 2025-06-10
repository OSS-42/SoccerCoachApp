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
        defaultSubstitutionTime: null, // Replace defaultTimer with defaultSubstitutionTime
        isSubstitutionDefaultChecked: false
    },
    currentPlayer: null
};

// Initialize IndexedDB
let db = null;
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SoccerCoachDB', 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Create object stores
            db.createObjectStore('team', { keyPath: 'id' });
            db.createObjectStore('players', { keyPath: 'id' });
            db.createObjectStore('games', { keyPath: 'id' });
            db.createObjectStore('settings', { keyPath: 'id' });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            showMessage('Failed to initialize database', 'error');
            reject(event.target.error);
        };
    });
}

// Initialize the app
// Initialize app styling - light mode only
function initializeStyling() {
    // No styling needed, we're using light mode only
}

function updatePlayerGridOrientation() {
    const playerGrid = document.getElementById('player-grid');
    if (!playerGrid) return;

    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    if (isLandscape) {
        playerGrid.classList.add('landscape-mode');
    } else {
        playerGrid.classList.remove('landscape-mode');
    }
}

let messageTimeout;

// Message functions
function showMessage(message, type = 'error') {
    const ribbon = document.getElementById('message-ribbon');
    const messageText = document.getElementById('message-text');
    
    clearTimeout(messageTimeout);
    
    messageText.textContent = message;
    ribbon.className = `message-ribbon ${type}`;
    ribbon.classList.remove('hidden');
    
    messageTimeout = setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    const ribbon = document.getElementById('message-ribbon');
    ribbon.classList.add('hidden');
}

// Function to render the Game Setup screen and pre-fill the substitution time
function renderGameSetup() {
    const substitutionTimeInput = document.getElementById('substitution-time');
    const saveSubstitutionDefaultCheckbox = document.getElementById('save-substitution-default');
    
    // Pre-fill substitution time and checkbox state from settings
    if (appState.settings.isSubstitutionDefaultChecked && appState.settings.defaultSubstitutionTime !== null) {
        substitutionTimeInput.value = appState.settings.defaultSubstitutionTime;
        saveSubstitutionDefaultCheckbox.checked = true;
    } else {
        substitutionTimeInput.value = ''; // Default to empty if no persisted default
        saveSubstitutionDefaultCheckbox.checked = false;
    }
}

function updateUI() {
    updatePlayerCounter();
    updateGameReportCounter();
    updateTeamNameUI();
    renderPlayersList();
}

// Update the DOMContentLoaded listener to ensure Settings screen updates
document.addEventListener('DOMContentLoaded', function() {
    // Set dynamic header height
    const header = document.querySelector('.game-header') || document.querySelector('.app-header');
    if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }

    // Hide all dialogs
    const dialogs = document.querySelectorAll('.dialog');
    dialogs.forEach(dialog => {
        dialog.style.display = 'none';
        dialog.classList.remove('active');
    });

    // Update player grid orientation on load
    updatePlayerGridOrientation();
    window.addEventListener('resize', updatePlayerGridOrientation);
    window.addEventListener('orientationchange', updatePlayerGridOrientation);

    // Load saved data and update UI
    loadAppData().then(() => {
        updateUI();
        renderReportsList(); // Ensure reports list is rendered on load
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('game-date').value = today;
        showScreen('main-screen');
    });
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
    
    // Reset message ribbon
    hideMessage();

    // Special handling for specific screens
    if (screenId === 'game-setup') {
        // Auto-fill today's date when opening the game setup screen
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('game-date').value = `${year}-${month}-${day}`;
        renderGameSetup(); // Pre-fill the substitution time
    } else if (screenId === 'reports') {
        renderReportsList();
    }
}

// Player Management
function openAddPlayerDialog() {
    const dialog = document.getElementById('add-player-dialog');
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeAddPlayerDialog() {
    const dialog = document.getElementById('add-player-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
    document.getElementById('player-name').value = '';
    document.getElementById('jersey-number').value = '';
}

function addPlayer() {
    const name = document.getElementById('player-name').value.trim();
    const jerseyNumber = document.getElementById('jersey-number').value;
    const position = document.getElementById('player-position').value;
    
    if (!name || !jerseyNumber || !position) {
        showMessage('Please fill in all required fields, including position', 'error');
        return;
    }
    
    // Check for duplicate jersey numbers
    if (appState.players.some(p => p.jerseyNumber === Number(jerseyNumber))) {
        showMessage('A player with this jersey number already exists', 'error');
        return;
    }
    
    // Get player ID (reuse or generate new)
    let playerId;
    if (appState.settings.reusablePlayerIds && appState.settings.reusablePlayerIds.length > 0) {
        playerId = appState.settings.reusablePlayerIds.shift();
    } else {
        do {
            playerId = Math.floor(Math.random() * 1000000).toString();
        } while (appState.players.some(p => p.id === playerId));
    }
    
    const player = {
        id: playerId,
        name,
        jerseyNumber: Number(jerseyNumber),
        position,
        stats: {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0,
            yellowCards: 0,
            redCards: 0
        }
    };
    
    appState.players.push(player);
    saveAppData();
    renderPlayersList();
    updatePlayerCounter();
    closeAddPlayerDialog();

    // Show success message
    showMessage(`Player ${name} (#${jerseyNumber}) added successfully`, 'success');
}

// New function to update edit button states without re-rendering
function updateEditButtonStates() {
    const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
    const editButtons = document.querySelectorAll('.player-action-btn[onclick*="editPlayer"]');
    editButtons.forEach(button => {
        button.disabled = anyChecked;
    });
}

// Update renderPlayersList to disable edit button when checkboxes are checked
function renderPlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    if (appState.players.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
        return;
    }
    
    const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
    
    appState.players.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <div class="jersey-number">${player.jerseyNumber}</div>
            <div class="player-info">
                <div class="player-name">${player.name} (${player.position})</div>
            </div>
            <div class="player-actions">
                <button class="player-action-btn" onclick="editPlayer('${player.id}')" ${anyChecked ? 'disabled' : ''}>
                    <span class="material-icons">edit</span>
                </button>
                <input type="checkbox" class="player-checkbox" data-player-id="${player.id}" onchange="updateDeleteRibbon()">
            </div>
        `;
        playersList.appendChild(playerItem);
    });
}

// Show/hide yellow ribbon based on checkbox states
// Update updateDeleteRibbon to reinforce yellow ribbon precedence
function updateDeleteRibbon() {
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    const ribbon = document.getElementById('message-ribbon');
    const messageText = document.getElementById('message-text');
    
    if (checkboxes.length > 0) {
        clearTimeout(messageTimeout); // Cancel any existing timeout
        messageText.innerHTML = `<div id="message-ribbon" class="message-ribbon warning">
            <div id="message-text">Selected players will be deleted. 
                <button class="warning-delete-btn">Delete</button>
            </div> <span class="close-btn">×</span>
        </div>`;
        ribbon.className = 'message-ribbon warning';
        ribbon.classList.remove('hidden');
        updateEditButtonStates(); // Update edit button states
    } else {
        ribbon.classList.add('hidden');
        messageText.textContent = '';
        updateEditButtonStates(); // Re-enable edit buttons
    }
}

// Open confirmation dialog for multiple players
function openDeletePlayersDialog() {
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    if (checkboxes.length === 0) {
        hideMessage();
        return;
    }
    
    let confirmDialog = document.getElementById('confirm-delete-dialog');
    if (!confirmDialog) {
        confirmDialog = document.createElement('div');
        confirmDialog.id = 'confirm-delete-dialog';
        confirmDialog.className = 'dialog';
        document.getElementById('app').appendChild(confirmDialog);
    }
    
    const playerCount = checkboxes.length;
    confirmDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to remove ${playerCount} player${playerCount > 1 ? 's' : ''}?</p>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeConfirmDeleteDialog()">Cancel</button>
                <button class="primary-btn delete-btn" onclick="confirmDeletePlayers()">Confirm</button>
            </div>
        </div>
    `;
    
    confirmDialog.style.display = 'flex';
    confirmDialog.classList.add('active');
}

// Update closeConfirmDeleteDialog to reset checkboxes
function closeConfirmDeleteDialog() {
    const confirmDialog = document.getElementById('confirm-delete-dialog');
    if (confirmDialog) {
        confirmDialog.style.display = 'none';
        confirmDialog.classList.remove('active');
    }
    // Reset all checkboxes
    document.querySelectorAll('.player-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateDeleteRibbon();
}

// Delete multiple selected players
// Update confirmDeletePlayers to ensure proper state updates
function confirmDeletePlayers() {
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    const playerIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-player-id'));
    
    if (playerIds.length === 0) {
        hideMessage();
        return;
    }
    
    // Close the dialog
    closeConfirmDeleteDialog();
    
    // Delete selected players
    const deletedCount = playerIds.length;
    playerIds.forEach(playerId => {
        const playerIndex = appState.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const player = appState.players[playerIndex];
            if (!appState.settings.reusablePlayerIds) {
                appState.settings.reusablePlayerIds = [];
            }
            appState.settings.reusablePlayerIds.push(player.id);
            appState.players.splice(playerIndex, 1);
        }
    });
    
    // Log state for debugging
    console.log('After deletion - Players:', appState.players);
    console.log('Reusable Player IDs:', appState.settings.reusablePlayerIds);
    
    // Save and update UI
    saveAppData();
    renderPlayersList();
    updatePlayerCounter();
    
    // Show success message
    showMessage(`${deletedCount} player${deletedCount > 1 ? 's' : ''} removed successfully`, 'success');
}

// Update showMessage to handle players-list padding
// Update showMessage to prevent timeout if yellow ribbon is needed
function showMessage(message, type = 'error') {
    const ribbon = document.getElementById('message-ribbon');
    const messageText = document.getElementById('message-text');
    
    clearTimeout(messageTimeout);
    
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    if (checkboxes.length > 0 && type !== 'warning') {
        // Skip non-warning ribbons if checkboxes are checked
        return;
    }
    
    messageText.innerHTML = type === 'warning' ? message : message;
    ribbon.className = `message-ribbon ${type}`;
    ribbon.classList.remove('hidden');
    
    if (type !== 'warning') {
        messageTimeout = setTimeout(() => {
            if (document.querySelectorAll('.player-checkbox:checked').length === 0) {
                hideMessage();
            }
        }, 5000);
    }
}

// Update hideMessage to reset players-list padding
// Update hideMessage to check checkbox state
function hideMessage() {
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    if (checkboxes.length > 0) {
        updateDeleteRibbon();
        return;
    }
    
    const ribbon = document.getElementById('message-ribbon');
    ribbon.classList.add('hidden');
    const messageText = document.getElementById('message-text');
    messageText.textContent = '';
    updateEditButtonStates(); // Ensure edit buttons are enabled
}

function editPlayer(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    let editDialog = document.getElementById('edit-player-dialog');
    if (!editDialog) {
        editDialog = document.createElement('div');
        editDialog.id = 'edit-player-dialog';
        editDialog.className = 'dialog';
        document.getElementById('app').appendChild(editDialog);
    }
    
    const positions = ['GK', 'SW', 'LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'CDM', 'RWB', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'LW', 'CAM', 'RW', 'SS', 'CF', 'ST'];
    const positionOptions = positions.map(pos => 
        `<option value="${pos}" ${player.position === pos ? 'selected' : ''}>${pos}</option>`
    ).join('');
    
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
            <div class="form-group">
                <label for="edit-player-position">Position:</label>
                <select id="edit-player-position">
                    ${positionOptions}
                </select>
            </div>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeEditPlayerDialog()">Cancel</button>
                <button class="primary-btn" onclick="savePlayerEdit('${player.id}')">Save</button>
            </div>
        </div>
    `;
    
    editDialog.style.display = 'flex';
    editDialog.classList.add('active');
}

function closeEditPlayerDialog() {
    const editDialog = document.getElementById('edit-player-dialog');
    if (editDialog) {
        editDialog.style.display = 'none';
        editDialog.classList.remove('active');
    }
}

function savePlayerEdit(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const newName = document.getElementById('edit-player-name').value.trim();
    const newJerseyNumber = parseInt(document.getElementById('edit-jersey-number').value);
    const newPosition = document.getElementById('edit-player-position').value;
    
    if (!newName) {
        showMessage('Please enter a name for the player', 'error');
        return;
    }
    
    if (!newJerseyNumber || newJerseyNumber < 1 || newJerseyNumber > 99) {
        showMessage('Please enter a valid jersey number between 1 and 99', 'error');
        return;
    }
    
    if (!newPosition) {
        showMessage('Please select a position', 'error');
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
    player.position = newPosition;
    
    // Save and refresh
    saveAppData();
    renderPlayersList();
    updatePlayerCounter();
    closeEditPlayerDialog();

    // Show success message
    showMessage(`Player ${newName} (#${newJerseyNumber}) updated successfully`, 'success');
}

function deletePlayer(playerId) {
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
                <button class="secondary-btn" onclick="closeConfirmDeleteDialog()">Cancel</button>
                <button class="primary-btn delete-btn" onclick="confirmDeletePlayer('${playerId}')">Remove Player</button>
            </div>
        </div>
    `;
    
    confirmDialog.style.display = 'flex';
    confirmDialog.classList.add('active');
}

function closeConfirmDeleteDialog() {
    const confirmDialog = document.getElementById('confirm-delete-dialog');
    if (confirmDialog) {
        confirmDialog.style.display = 'none';
        confirmDialog.classList.remove('active');
    }
}

function confirmDeletePlayer(playerId) {
    // Close the confirmation dialog
    document.getElementById('confirm-delete-dialog').style.display = 'none';
    
    // Remove the player and add their ID to reusablePlayerIds
    const playerIndex = appState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        // Get player information for the message
        const player = appState.players[playerIndex];
        
        // Add player ID to reusable IDs
        if (!appState.settings.reusablePlayerIds) {
            appState.settings.reusablePlayerIds = [];
        }
        appState.settings.reusablePlayerIds.push(player.id);
        
        // Remove the player
        appState.players.splice(playerIndex, 1);
        
        // Update data and UI
        saveAppData();
        renderPlayersList();
        updatePlayerCounter();
        
        // Show success message with the ribbon
        showMessage(`Player ${player.name} (#${player.jerseyNumber}) has been removed`, 'success');
    }
}

function updatePlayerCounter() {
    const counterElement = document.getElementById('player-counter');
    if (counterElement) {
        counterElement.textContent = appState.players.length;
    }
}

function updateGameReportCounter() {
    const counterElement = document.getElementById('game-report-counter');
    if (counterElement) {
        const completedGames = appState.games.filter(game => game.isCompleted).length;
        counterElement.textContent = completedGames;
    }
}

// Game Management
function startGame() {
    const opponentNameInput = document.getElementById('opponent-name');
    const gameDateInput = document.getElementById('game-date');
    const numPeriodsInput = document.getElementById('num-periods');
    const periodDurationInput = document.getElementById('period-duration');
    const substitutionTimeInput = document.getElementById('substitution-time');
    const saveSubstitutionDefaultCheckbox = document.getElementById('save-substitution-default');

    const opponentName = opponentNameInput.value.trim();
    const gameDate = gameDateInput.value;
    const numPeriods = parseInt(numPeriodsInput.value, 10);
    const periodDuration = parseInt(periodDurationInput.value, 10);
    const substitutionTime = parseInt(substitutionTimeInput.value, 10);

    // Validate inputs
    if (!opponentName) {
        showMessage('Please enter an opponent team name.', 'error');
        return;
    }

    if (!gameDate) {
        showMessage('Please select a game date.', 'error');
        return;
    }

    if (isNaN(numPeriods) || numPeriods < 1) {
        showMessage('Number of periods must be at least 1.', 'error');
        return;
    }

    if (isNaN(periodDuration) || periodDuration < 1 || periodDuration > 45) {
        showMessage('Time per period must be between 1 and 45 minutes.', 'error');
        return;
    }

    if (isNaN(substitutionTime) || substitutionTime < 1) {
        showMessage('Substitution time must be at least 1 minute.', 'error');
        return;
    }

    // Calculate total game time (in minutes)
    const totalGameTime = numPeriods * periodDuration;

    // Validate substitution time against total game time and max of 20 minutes
    const maxSubstitutionTime = Math.min(totalGameTime, 20);
    if (substitutionTime > maxSubstitutionTime) {
        showMessage(`Substitution time cannot exceed the total game time (${totalGameTime} minutes) or 20 minutes.`, 'error');
        return;
    }

    // Save the default substitution time and checkbox state
    if (saveSubstitutionDefaultCheckbox.checked) {
        appState.settings.defaultSubstitutionTime = substitutionTime;
    }
    appState.settings.isSubstitutionDefaultChecked = saveSubstitutionDefaultCheckbox.checked;

    // Reset player stats for this new game
    appState.players.forEach(player => {
        player.stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0,
            yellowCards: 0,
            redCards: 0
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
        totalGameTime: 0,
        numPeriods: numPeriods,
        periodDuration: periodDuration * 60, // Convert to seconds
        substitutionDuration: substitutionTime * 60 // Convert to seconds
    };

    // Validate game data
    if (!appState.currentGame.numPeriods || !appState.currentGame.periodDuration) {
        console.error('Failed to set game duration parameters');
        showMessage('Error setting game duration parameters', 'error');
        return;
    }

    // Setup substitution timer
    appState.timer.duration = appState.currentGame.substitutionDuration;
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();

    // Reset and setup game timer
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.isRunning = false;
    appState.gameTimer.startTime = null;
    updateGameTimeDisplay();
    updatePeriodCounter(); // Initialize period counter

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

function updateCardCounters() {
    if (!appState.currentGame) return;
    
    const yellowCardCount = appState.players.reduce((sum, player) => sum + (player.stats.yellowCards || 0), 0);
    const redCardCount = appState.players.reduce((sum, player) => {
        const yellows = player.stats.yellowCards || 0;
        const reds = player.stats.redCards || 0;
        return sum + reds + (yellows >= 2 ? 1 : 0);
    }, 0);
    
    const yellowCardElement = document.getElementById('yellow-card-count');
    const redCardElement = document.getElementById('red-card-count');
    
    if (yellowCardElement) yellowCardElement.textContent = yellowCardCount;
    if (redCardElement) redCardElement.textContent = redCardCount;
}

function renderPlayerGrid() {
    const playerGrid = document.getElementById('player-grid');
    if (!playerGrid) {
        console.error('Player grid element not found');
        return;
    }
    
    playerGrid.innerHTML = '';
    
    if (appState.players.length === 0) {
        playerGrid.innerHTML = '<div class="empty-state">No players available</div>';
        return;
    }
    
    appState.players.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach(player => {
        if (!player.id || !player.jerseyNumber || !player.name || !player.position) {
            console.warn('Skipping invalid player:', player);
            return;
        }
        
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
        
        // Apply yellow or red card classes
        if (player.stats.redCards > 0 || player.stats.yellowCards >= 2) {
            playerGridItem.classList.add('red-card');
        } else if (player.stats.yellowCards > 0) {
            playerGridItem.classList.add('yellow-card');
        }
        
        playerGridItem.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-columns">
                <div class="player-number">${player.jerseyNumber}</div>
                <div class="player-position">${player.position}</div>
            </div>
        `;
        
        // Add click handler based on player status
        if (player.stats.redCards === 0 && player.stats.yellowCards < 2) {
            playerGridItem.addEventListener('click', () => {
                openPlayerActionDialog(player);
            });
        } else {
            playerGridItem.addEventListener('click', () => {
                showMessage('Player sent off, no actions allowed', 'error');
            });
        }
        
        playerGrid.appendChild(playerGridItem);
    });
    
    updatePlayerGridOrientation();
    updateCardCounters();
}

function updatePeriodCounter() {
    if (!appState.currentGame) return;

    const periodDuration = appState.currentGame.periodDuration; // in seconds
    const totalElapsed = appState.gameTimer.elapsed;
    const currentPeriod = Math.min(
        Math.ceil(totalElapsed / periodDuration),
        appState.currentGame.numPeriods
    );
    const totalPeriods = appState.currentGame.numPeriods;

    const periodCounter = document.getElementById('period-counter');
    if (periodCounter) {
        periodCounter.textContent = `Period ${currentPeriod} of ${totalPeriods}`;
    }
}

// Timer Functions
function updateTimerDisplay() {
    const minutes = Math.floor(appState.timer.timeLeft / 60);
    const seconds = appState.timer.timeLeft % 60;
    
    const timerDisplay = document.getElementById('substitution-timer');
    const timerValue = timerDisplay.querySelector('.timer-value');
    
    if (timerValue) {
        timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Add alert styling if timer is at zero
    if (appState.timer.timeLeft === 0) {
        timerDisplay.classList.add('timer-alert');
    } else {
        timerDisplay.classList.remove('timer-alert');
    }
}

function updateGameTimeDisplay() {
    const minutes = Math.floor(appState.gameTimer.elapsed / 60);
    const seconds = appState.gameTimer.elapsed % 60;
    const gameTimeElement = document.getElementById('game-time');
    if (gameTimeElement) {
        gameTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    updatePeriodCounter(); // Update period counter on every tick
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

        // Show success message
        showMessage('Period started successfully', 'success');
    }
}

function pauseGameTimer() {
    if (appState.gameTimer.isRunning) {
        clearInterval(appState.gameTimer.interval);
        appState.gameTimer.isRunning = false;
    }
}

function stopGameTimer() {
    // Check if the game timer is running
    if (!appState.gameTimer.isRunning) {
        showMessage('Cannot stop: Game clock has not been started', 'error');
        return;
    }

    // Stop both timers
    pauseGameTimer();
    pauseTimer();

    // Calculate current period based on game clock
    const periodDuration = appState.currentGame.periodDuration; // in seconds
    const totalElapsed = appState.gameTimer.elapsed;
    const currentPeriod = Math.min(
        Math.ceil(totalElapsed / periodDuration),
        appState.currentGame.numPeriods
    );

    // If it's the last period, show "End Game" dialog
    if (currentPeriod >= appState.currentGame.numPeriods) {
        let endGameDialog = document.getElementById('end-game-period-dialog');
        if (!endGameDialog) {
            endGameDialog = document.createElement('div');
            endGameDialog.id = 'end-game-period-dialog';
            endGameDialog.className = 'dialog';
            document.getElementById('app').appendChild(endGameDialog);
        }

        endGameDialog.innerHTML = `
            <div class="dialog-content">
                <h2>Game Complete</h2>
                <p>Game Complete. End now?</p>
                <div class="dialog-buttons">
                    <button class="secondary-btn" onclick="closeEndGamePeriodDialog()">Cancel</button>
                    <button class="primary-btn" onclick="endGame()">End Game</button>
                </div>
            </div>
        `;

        endGameDialog.style.display = 'flex';
        endGameDialog.classList.add('active');
        return;
    }

    // Otherwise, show "Is this period finished?" dialog
    let periodDialog = document.getElementById('period-finished-dialog');
    if (!periodDialog) {
        periodDialog = document.createElement('div');
        periodDialog.id = 'period-finished-dialog';
        periodDialog.className = 'dialog';
        document.getElementById('app').appendChild(periodDialog);
    }

    periodDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Period Status</h2>
            <p>Is this period finished?</p>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closePeriodFinishedDialog()">No</button>
                <button class="primary-btn" onclick="confirmPeriodFinished()">Yes</button>
            </div>
        </div>
    `;

    periodDialog.style.display = 'flex';
    periodDialog.classList.add('active');
}

function closePeriodFinishedDialog() {
    const dialog = document.getElementById('period-finished-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
}

function confirmPeriodFinished() {
    const dialog = document.getElementById('period-finished-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');

    // Reset substitution timer
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();

    // Reset game clock to the expected end of the current period
    const periodDuration = appState.currentGame.periodDuration;
    const totalElapsed = appState.gameTimer.elapsed;
    const currentPeriod = Math.min(
        Math.ceil(totalElapsed / periodDuration),
        appState.currentGame.numPeriods
    );
    appState.gameTimer.elapsed = currentPeriod * periodDuration;
    updateGameTimeDisplay(); // This will also update the period counter
}

function closeEndGamePeriodDialog() {
    const dialog = document.getElementById('end-game-period-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
}

// Player Actions
function openPlayerActionDialog(player) {
    appState.currentPlayer = player;
    const dialog = document.getElementById('player-action-dialog');
    const playerNameSpan = document.getElementById('action-player-name');
    playerNameSpan.textContent = player.name;
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closePlayerActionDialog() {
    const dialog = document.getElementById('player-action-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
    appState.currentPlayer = null;
}

// Goal with possible assist handling
function handleGoalAction() {
    if (!appState.currentPlayer) return;
    
    // Record the current player as the scorer
    appState.goalScorer = appState.currentPlayer;

    // Save state to ensure latest stats
    saveAppData();
    
    // Close the player action dialog
    closePlayerActionDialog();
    
    // Show the assist selection dialog
    openAssistSelectionDialog();
}

function openAssistSelectionDialog() {
    const dialog = document.getElementById('assist-selection-dialog');
    const playersGrid = document.getElementById('assist-players-grid');
    playersGrid.innerHTML = '';
    const activePlayers = appState.players.filter(p => {
        const redCards = p.stats?.redCards || 0;
        const yellowCards = p.stats?.yellowCards || 0;
        return p.id !== appState.goalScorer.id && redCards === 0 && yellowCards < 2;
    });
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
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeAssistSelectionDialog() {
    const dialog = document.getElementById('assist-selection-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
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
    playersGrid.innerHTML = '';
    const activePlayers = appState.players.filter(p => p.id !== appState.assister.id && p.stats.redCards === 0 && p.stats.yellowCards < 2);
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
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeScorerSelectionDialog() {
    const dialog = document.getElementById('scorer-selection-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
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
    
    const playerId = specificPlayerId || (appState.currentPlayer ? appState.currentPlayer.id : null);
    const action = {
        timestamp: new Date().toISOString(),
        playerId: actionType === 'own_goal' ? null : playerId,
        actionType,
        gameMinute: calculateGameMinute()
    };
    
    appState.currentGame.actions.push(action);
    
    const playerIndex = playerId ? appState.players.findIndex(p => p.id === playerId) : -1;
    const playerGridItem = playerId ? document.querySelector(`.player-grid-item[data-player-id="${playerId}"]`) : null;
    
    if (playerIndex !== -1 && !appState.players[playerIndex].stats) {
        appState.players[playerIndex].stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0,
            yellowCards: 0,
            redCards: 0,
            faults: 0,
            blockedShots: 0
        };
    }
    
    switch (actionType) {
        case 'goal':
            appState.players[playerIndex].stats.goals++;
            appState.currentGame.homeScore++;
            document.getElementById('home-score').textContent = appState.currentGame.homeScore;
            showMessage('Goal recorded', 'success');
            break;
        case 'assist':
            appState.players[playerIndex].stats.assists++;
            showMessage('Assist recorded', 'success');
            break;
        case 'save':
            appState.players[playerIndex].stats.saves++;
            showMessage('Save recorded', 'success');
            break;
        case 'goal_allowed':
            appState.players[playerIndex].stats.goalsAllowed++;
            appState.currentGame.awayScore++;
            document.getElementById('away-score').textContent = appState.currentGame.awayScore;
            showMessage('Goal allowed recorded', 'success');
            break;
        case 'yellow_card':
            appState.players[playerIndex].stats.yellowCards++;
            if (appState.players[playerIndex].stats.yellowCards >= 2) {
                if (playerGridItem) {
                    playerGridItem.classList.remove('yellow-card');
                    playerGridItem.classList.add('red-card');
                }
            } else if (playerGridItem) {
                playerGridItem.classList.add('yellow-card');
            }
            updateCardCounters();
            showMessage('Yellow card recorded', 'success');
            break;
        case 'red_card':
            appState.players[playerIndex].stats.redCards++;
            if (playerGridItem) {
                playerGridItem.classList.remove('yellow-card');
                playerGridItem.classList.add('red-card');
            }
            updateCardCounters();
            showMessage('Red card recorded', 'success');
            break;
        case 'own_goal':
            appState.currentGame.homeScore++;
            document.getElementById('home-score').textContent = appState.currentGame.homeScore;
            showMessage('Own goal recorded', 'success');
            break;
        case 'late_to_game':
            showMessage('Player recorded as late to game', 'success');
            break;
        case 'fault':
            appState.players[playerIndex].stats.faults++;
            showMessage('Fault recorded', 'success'); // Changed from 'yellow' to 'success' for consistency
            break;
        case 'blocked_shot':
            appState.players[playerIndex].stats.blockedShots++;
            showMessage('Blocked shot recorded', 'success');
            break;
    }
    
    if (playerId) {
        updatePlayerGridItem(playerId);
    }
    
    saveAppData();
    
    closePlayerActionDialog();
}

function updatePlayerGridItem(playerId) {
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Directly update the stat values in the player card
    const statValues = document.querySelectorAll(`.player-grid-item[data-player-id="${playerId}"] .stat-value`);
    if (statValues && statValues.length >= 6) {
        statValues[0].textContent = player.stats.goals;
        statValues[1].textContent = player.stats.assists;
        statValues[2].textContent = player.stats.saves;
        statValues[3].textContent = player.stats.goalsAllowed;
        statValues[4].textContent = player.stats.yellowCards;
        statValues[5].textContent = player.stats.redCards;
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
    const dialog = document.getElementById('end-game-dialog');
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeEndGameDialog() {
    const dialog = document.getElementById('end-game-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
}

function endGame() {
    if (!appState.currentGame) return;

    // Close any open end game dialogs
    const endGameDialog = document.getElementById('end-game-dialog');
    if (endGameDialog) {
        endGameDialog.style.display = 'none';
        endGameDialog.classList.remove('active');
    }
    const endGamePeriodDialog = document.getElementById('end-game-period-dialog');
    if (endGamePeriodDialog) {
        endGamePeriodDialog.style.display = 'none';
        endGamePeriodDialog.classList.remove('active');
    }

    // Set endTime if not already set
    appState.currentGame.endTime = appState.currentGame.endTime || new Date().toISOString();
    appState.currentGame.isCompleted = true;

    // Validate game data
    if (!appState.currentGame.numPeriods || !appState.currentGame.periodDuration) {
        console.warn('Game data incomplete, setting fallback values');
        appState.currentGame.numPeriods = appState.currentGame.numPeriods || 2;
        appState.currentGame.periodDuration = appState.currentGame.periodDuration || 15 * 60; // 15 minutes in seconds
    }

    // Store the game in our games array
    const finishedGameId = appState.currentGame.id;
    appState.games.push({...appState.currentGame});

    // Stop both timers
    pauseTimer();
    pauseGameTimer();

    // Save data before showing report
    saveAppData();

    // Update game report counter
    updateGameReportCounter();

    // Show the reports screen and open the report dialog
    showScreen('reports');
    renderReportsList();
    viewReport(finishedGameId);

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
    
    completedGames.sort((a, b) => {
        if (!a.startTime || !b.startTime) return a.startTime ? -1 : b.startTime ? 1 : 0;
        return new Date(b.startTime) - new Date(a.startTime);
    }).forEach(game => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        
        const gameDateTime = game.startTime ? new Date(game.startTime).toLocaleString() : 'No date provided';
        reportItem.innerHTML = `
            <div class="report-header">
                <div class="report-date">${gameDateTime}</div>
                <div class="report-score">${appState.teamName} ${game.homeScore} - ${game.awayScore} ${game.opponentName}</div>
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
    
    let reportDialog = document.getElementById('detailed-report-dialog');
    if (!reportDialog) {
        reportDialog = document.createElement('div');
        reportDialog.id = 'detailed-report-dialog';
        reportDialog.className = 'dialog';
        document.getElementById('app').appendChild(reportDialog);
    }
    
    const gameDate = new Date(game.date).toDateString();
    const gameTime = game.startTime ? new Date(game.startTime).toLocaleTimeString([], { timeStyle: 'short' }) : '';
    
    let gameDuration = '';
    if (game.startTime && game.endTime && !isNaN(new Date(game.endTime) - new Date(game.startTime))) {
        const start = new Date(game.startTime);
        const end = new Date(game.endTime);
        const durationMs = end - start;
        const durationMins = Math.floor(durationMs / 60000);
        gameDuration = `${durationMins} minutes`;
    } else if (game.numPeriods && game.periodDuration) {
        const durationMins = Math.floor(game.numPeriods * game.periodDuration / 60);
        gameDuration = `${durationMins} minutes`;
    } else {
        gameDuration = 'N/A';
    }

    const playerActions = {};
    game.activePlayers.forEach(playerId => {
        const player = appState.players.find(p => p.id === playerId);
        if (player) {
            playerActions[playerId] = {
                name: player.name,
                jerseyNumber: player.jerseyNumber,
                goals: [],
                assists: 0,
                saves: 0,
                goalsAllowed: 0,
                yellowCards: [],
                redCards: [],
                lateToGame: false,
                faults: 0,
                blockedShots: 0
            };
        }
    });
    
    const ownGoals = [];
    game.actions.forEach(action => {
        if (action.actionType === 'own_goal') {
            ownGoals.push(action.gameMinute);
        } else if (playerActions[action.playerId]) {
            switch (action.actionType) {
                case 'goal':
                    playerActions[action.playerId].goals.push(action.gameMinute);
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
                    playerActions[action.playerId].yellowCards.push(action.gameMinute);
                    break;
                case 'red_card':
                    playerActions[action.playerId].redCards.push(action.gameMinute);
                    break;
                case 'late_to_game':
                    playerActions[action.playerId].lateToGame = true;
                    break;
                case 'fault':
                    playerActions[action.playerId].faults++;
                    break;
                case 'blocked_shot':
                    playerActions[action.playerId].blockedShots++;
                    break;
            }
        }
    });
    
    let playerStatsHTML = '';
    Object.values(playerActions)
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
        .forEach(playerStat => {
            const effectiveRedCards = playerStat.redCards.length + (playerStat.yellowCards.length >= 2 ? 1 : 0);
            playerStatsHTML += `
                <tr>
                    <td>${playerStat.jerseyNumber}</td>
                    <td>${playerStat.name.toUpperCase()}</td>
                    <td>${playerStat.goals.length}</td>
                    <td>${playerStat.assists}</td>
                    <td>${playerStat.saves}</td>
                    <td>${playerStat.goalsAllowed}</td>
                    <td>${playerStat.blockedShots}</td>
                    <td>${playerStat.faults}</td>
                    <td>${playerStat.yellowCards.length}</td>
                    <td>${effectiveRedCards}</td>
                </tr>
            `;
        });
    
    const goalEntries = Object.values(playerActions)
        .filter(p => p.goals.length > 0)
        .map(p => ({
            name: p.name,
            times: p.goals.sort((a, b) => a - b)
        }));
    ownGoals.sort((a, b) => a - b).forEach(time => {
        goalEntries.push({ name: 'Opponent', times: [time], isOwnGoal: true });
    });
    const goalLine = goalEntries.length > 0
        ? goalEntries.map(entry => {
              const times = entry.times.map(t => `${t}'`).join(', ');
              return entry.isOwnGoal ? `${entry.name} (${times}, og)` : `${entry.name} (${times})`;
          }).join(', ')
        : 'N/A';
    
    const yellowCardEntries = Object.values(playerActions)
        .filter(p => p.yellowCards.length > 0)
        .map(p => ({
            name: p.name,
            times: p.yellowCards.sort((a, b) => a - b)
        }));
    const yellowCardLine = yellowCardEntries.length > 0
        ? yellowCardEntries.map(entry => `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')})`).join(', ')
        : 'N/A';
    
    const redCardEntries = Object.values(playerActions)
        .filter(p => p.redCards.length > 0 || p.yellowCards.length >= 2)
        .map(p => {
            const redTimes = [...p.redCards];
            if (p.yellowCards.length >= 2) {
                redTimes.push(p.yellowCards[1]);
            }
            return { name: p.name, times: redTimes.sort((a, b) => a - b) };
        });
    const redCardLine = redCardEntries.length > 0
        ? redCardEntries.map(entry => `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')})`).join(', ')
        : 'N/A';
    
    const latePlayers = Object.values(playerActions)
        .filter(p => p.lateToGame)
        .map(p => p.name);
    const lateLine = latePlayers.length > 0 ? latePlayers.join(', ') : 'N/A';
    
    reportDialog.innerHTML = `
        <div class="dialog-content report-dialog">
            <h2>Game Report</h2>
            <div class="report-header-info">
                <div><strong>Date:</strong> ${gameDate} ${gameTime}</div>
                <div><strong>Teams:</strong> ${appState.teamName} vs ${game.opponentName}</div>
                <div><strong>Final Score:</strong> ${game.homeScore} - ${game.awayScore}</div>
                <div><strong>Goal for ${appState.teamName}:</strong> ${goalLine}</div>
                <div><strong>Yellow card:</strong> ${yellowCardLine}</div>
                <div><strong>Red card:</strong> ${redCardLine}</div>
                <div><strong>Duration:</strong> ${gameDuration}</div>
            </div>
            
            <h3>Player Statistics</h3>
            <div class="report-table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th><span class="stat-emoji">⚽</span></th>
                            <th><span class="stat-emoji">👟</span></th>
                            <th><span class="stat-emoji">🧤</span></th>
                            <th><img src="img/red-soccer.png" class="red-soccer-icon" width="18" height="18" alt="Goals Allowed"></th>
                            <th><span class="stat-emoji">❌</span></th>
                            <th><span class="stat-emoji">⚠️</span></th>
                            <th><span class="stat-emoji">🟨</span></th>
                            <th><span class="stat-emoji">🟥</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerStatsHTML}
                    </tbody>
                </table>
            </div>
            
            <div class="report-footer">
                <div><strong>Late to the game:</strong> ${lateLine}</div>
            </div>
            
            <div class="report-actions">
                <button class="secondary-btn" onclick="exportReport('${gameId}', 'pdf')">Export as PDF</button>
                <button class="primary-btn" onclick="closeDetailedReport()">Close</button>
            </div>
        </div>
    `;
    
    reportDialog.style.display = 'flex';
    reportDialog.classList.add('active');
}

function closeDetailedReport() {
    const reportDialog = document.getElementById('detailed-report-dialog');
    if (reportDialog) {
        reportDialog.style.display = 'none';
        reportDialog.classList.remove('active');
    }

    // Ensure end game dialogs are closed as a fallback
    const endGameDialog = document.getElementById('end-game-dialog');
    if (endGameDialog) {
        endGameDialog.style.display = 'none';
        endGameDialog.classList.remove('active');
    }
    const endGamePeriodDialog = document.getElementById('end-game-period-dialog');
    if (endGamePeriodDialog) {
        endGamePeriodDialog.style.display = 'none';
        endGamePeriodDialog.classList.remove('active');
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
    
    // Create a hidden iframe to render the print content
    let iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Write the report content to the iframe
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
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
        </body>
        </html>
    `);
    doc.close();
    
    // Trigger the print dialog after the iframe content is loaded
    iframe.onload = function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Remove the iframe after printing
        document.body.removeChild(iframe);
    };
    
    showMessage('Opening print dialog for PDF export', 'success');
}

// Settings
function handleLanguageChange() {
    console.log('handleLanguageChange called'); // Debug

    const checkedRadio = document.querySelector('input[name="language"]:checked');
    if (!checkedRadio) {
        console.error('No language radio button is checked');
        showMessage('Please select a language', 'error');
        return;
    }

    const selectedLanguage = checkedRadio.value;
    console.log('Selected language:', selectedLanguage); // Debug

    // Check if French is selected
    if (selectedLanguage === 'fr') {
        console.log('French selected, reverting to English'); // Debug
        // Show error message
        showMessage('French language is not implemented yet.', 'error');
        // Revert to English
        const englishRadio = document.querySelector('input[name="language"][value="en"]');
        if (englishRadio) {
            console.log('English radio found, setting checked to true'); // Debug
            englishRadio.checked = true;
            // Force UI update by dispatching a change event
            const changeEvent = new Event('change');
            englishRadio.dispatchEvent(changeEvent);
            console.log('English radio checked state:', englishRadio.checked); // Debug
        } else {
            console.error('English radio button not found'); // Debug
        }
        appState.settings.language = 'en';
        console.log('appState.settings.language set to:', appState.settings.language); // Debug
    } else {
        appState.settings.language = selectedLanguage;
        console.log('appState.settings.language set to:', appState.settings.language); // Debug
    }
    
    saveAppData(); // Save the state immediately
}

function saveSettings() {
    console.log('saveSettings called'); // Debug

    // Language is already handled by handleLanguageChange, so just save the current state
    saveAppData();
    showMessage('Settings saved successfully', 'success');
}

// Data persistence (using localStorage in the prototype)
// Update saveAppData to ensure reliable persistence
function saveAppData() {
    if (!db) {
        showMessage('Database not initialized', 'error');
        console.error('IndexedDB not initialized');
        return;
    }

    const transaction = db.transaction(['team', 'players', 'games', 'settings'], 'readwrite');
    const teamStore = transaction.objectStore('team');
    const playersStore = transaction.objectStore('players');
    const gamesStore = transaction.objectStore('games');
    const settingsStore = transaction.objectStore('settings');

    // Validate data
    if (!appState.teamName || !Array.isArray(appState.players) || !Array.isArray(appState.games) || !appState.settings) {
        showMessage('Invalid data format for saving', 'error');
        console.error('Invalid appState:', appState);
        return;
    }

    // Save team
    teamStore.put({ id: 'team', teamName: appState.teamName });

    // Clear and save players
    const clearPlayersRequest = playersStore.clear();
    clearPlayersRequest.onsuccess = () => {
        appState.players.forEach(player => {
            if (player.id && player.name && player.jerseyNumber !== undefined) {
                playersStore.put(player);
            } else {
                console.warn('Skipping invalid player:', player);
            }
        });
    };

    // Save games
    appState.games.forEach(game => {
        if (game.id) {
            gamesStore.put(game);
        }
    });

    // Save settings
    settingsStore.put({ id: 'settings', ...appState.settings });

    transaction.oncomplete = () => {
        console.log('Data saved successfully to IndexedDB');
    };

    transaction.onerror = (event) => {
        showMessage('Failed to save data', 'error');
        console.error('IndexedDB save error:', event.target.error);
    };
}

function loadAppData() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.error('IndexedDB not supported');
            // Fallback to defaults
            appState.teamName = "My Team";
            appState.players = [];
            appState.games = [];
            appState.settings = {
                language: 'en',
                defaultSubstitutionTime: null,
                isSubstitutionDefaultChecked: false,
                reusablePlayerIds: []
            };
            updateTeamNameUI();
            renderPlayersList();
            updatePlayerCounter();
            updateGameReportCounter();
            showMessage('IndexedDB not supported, using defaults', 'error');
            resolve();
            return;
        }

        initIndexedDB().then(() => {
            const transaction = db.transaction(['team', 'players', 'games', 'settings'], 'readonly');
            const teamStore = transaction.objectStore('team');
            const playersStore = transaction.objectStore('players');
            const gamesStore = transaction.objectStore('games');
            const settingsStore = transaction.objectStore('settings');

            // Load team
            teamStore.get('team').onsuccess = (event) => {
                const team = event.target.result;
                appState.teamName = team ? team.teamName : "My Team";
                updateTeamNameUI();
            };

            // Load players
            playersStore.getAll().onsuccess = (event) => {
                appState.players = event.target.result || [];
                updatePlayerCounter();
            };

            // Load games
            gamesStore.getAll().onsuccess = (event) => {
                appState.games = event.target.result || [];
                updateGameReportCounter();
            };

            // Load settings
            settingsStore.get('settings').onsuccess = (event) => {
                const settings = event.target.result || {
                    language: 'en',
                    defaultSubstitutionTime: null,
                    isSubstitutionDefaultChecked: false,
                    reusablePlayerIds: []
                };
                appState.settings = settings;
                initializeStyling();
            };

            transaction.oncomplete = () => {
                renderPlayersList();
                resolve();
            };

            transaction.onerror = () => {
                console.error('Transaction error');
                // Fallback to defaults
                appState.teamName = "My Team";
                appState.players = [];
                appState.games = [];
                appState.settings = {
                    language: 'en',
                    defaultSubstitutionTime: null,
                    isSubstitutionDefaultChecked: false,
                    reusablePlayerIds: []
                };
                updateTeamNameUI();
                renderPlayersList();
                updatePlayerCounter();
                updateGameReportCounter();
                showMessage('Failed to load data, using defaults', 'error');
                resolve();
            };
        }).catch((error) => {
            console.error('IndexedDB initialization failed:', error);
            // Fallback to defaults
            appState.teamName = "My Team";
            appState.players = [];
            appState.games = [];
            appState.settings = {
                language: 'en',
                defaultSubstitutionTime: null,
                isSubstitutionDefaultChecked: false,
                reusablePlayerIds: []
            };
            updateTeamNameUI();
            renderPlayersList();
            updatePlayerCounter();
            updateGameReportCounter();
            showMessage('Database initialization failed, using defaults', 'error');
            resolve();
        });
    });
}

// Function to clear all app data and start fresh
// Function to open clear data confirmation dialog
function openClearDataDialog() {
    let clearDialog = document.getElementById('clear-data-dialog');
    if (!clearDialog) {
        clearDialog = document.createElement('div');
        clearDialog.id = 'clear-data-dialog';
        clearDialog.className = 'dialog';
        document.getElementById('app').appendChild(clearDialog);
    }
    
    clearDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Confirm Clear Data</h2>
            <p>Are you sure you want to clear all data? This will remove all players, games, and settings.</p>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeClearDataDialog()">Cancel</button>
                <button class="primary-btn" onclick="confirmClearData()">Clear Data</button>
            </div>
        </div>
    `;
    
    clearDialog.style.display = 'flex';
    clearDialog.classList.add('active');
}

// Function to close clear data dialog
function closeClearDataDialog() {
    const clearDialog = document.getElementById('clear-data-dialog');
    if (clearDialog) {
        clearDialog.style.display = 'none';
        clearDialog.classList.remove('active');
    }
}

// Function to clear all app data
function confirmClearData() {
    closeClearDataDialog();
    
    if (!db) {
        showMessage('Database not initialized', 'error');
        return;
    }

    const transaction = db.transaction(['team', 'players', 'games', 'settings'], 'readwrite');
    const teamStore = transaction.objectStore('team');
    const playersStore = transaction.objectStore('players');
    const gamesStore = transaction.objectStore('games');
    const settingsStore = transaction.objectStore('settings');

    // Clear all stores
    teamStore.clear();
    playersStore.clear();
    gamesStore.clear();
    settingsStore.clear();

    transaction.oncomplete = () => {
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
                defaultSubstitutionTime: null,
                isSubstitutionDefaultChecked: false,
                reusablePlayerIds: []
            },
            currentPlayer: null,
            goalScorer: null,
            assister: null
        };

        // Update UI
        updateTeamNameUI();
        renderPlayersList();
        updatePlayerCounter();
        updateGameReportCounter();
        renderReportsList(); // Update reports list to show empty state

        showMessage('All data has been cleared. The app has been reset.', 'success');
    };

    transaction.onerror = () => {
        showMessage('Failed to clear data', 'error');
    };
}

// Modified clearAppData to trigger dialog instead of confirm
function clearAppData() {
    openClearDataDialog();
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
        settings: appState.settings // Includes reusablePlayerIds
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

// Add these functions to handle the import confirmation dialog
function openImportConfirmDialog() {
    const dialog = document.getElementById('import-confirm-dialog');
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeImportConfirmDialog() {
    const dialog = document.getElementById('import-confirm-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
}

function confirmImportTeamData() {
    closeImportConfirmDialog();
    // Store the import data in a temporary variable to access after confirmation
    if (appState.pendingImportData) {
        // Update app state with imported data
        appState.teamName = appState.pendingImportData.teamName;
        appState.players = appState.pendingImportData.players;
        appState.games = appState.pendingImportData.games || [];
        appState.settings = appState.pendingImportData.settings || {
            language: 'en',
            defaultSubstitutionTime: null,
            isSubstitutionDefaultChecked: false,
            reusablePlayerIds: []
        };
        
        // Save to IndexedDB
        saveAppData();
        
        // Update UI
        updateTeamNameUI();
        renderPlayersList();
        updatePlayerCounter();
        updateGameReportCounter();
        
        showMessage('Team data imported successfully!', 'success');
        
        // Clear pending import data
        appState.pendingImportData = null;
    }
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
            
            // Store the imported data temporarily
            appState.pendingImportData = importedData;
            
            // Show confirmation dialog instead of native confirm
            openImportConfirmDialog();
        } catch (error) {
            showMessage('Error importing data. Please check the file format.', 'error');
            console.error('Import error:', error);
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}