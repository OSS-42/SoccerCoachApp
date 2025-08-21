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
    currentPlayer: null,
    formationTemp: null // Temporary storage for formation during setup
};

// Touch event handlers
let draggedElement = null;
let initialX = 0;
let initialY = 0;
let clone = null;
let lastVibratedSlot = null; // Track last slot vibrated to debounce

function touchStart(e) {
    if (e.target.classList.contains('disabled')) return;
    e.preventDefault();
    draggedElement = e.target;
    const touch = e.targetTouches[0];

    // Haptic feedback on selection
    if (navigator.vibrate) {
        navigator.vibrate(50); // 50ms vibration
    }

    // Create a clone for visual feedback
    clone = draggedElement.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.opacity = '0.7';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '1000';
    clone.style.width = '72px'; // 3x larger than original 24px
    clone.style.height = '72px'; // 3x larger than original 24px
    clone.style.lineHeight = '72px'; // Center text vertically
    clone.style.fontSize = '36px'; // Scale font size for readability
    clone.style.borderRadius = '50%'; // Ensure circular shape
    clone.style.background = '#000'; // Retain black background
    clone.style.color = '#fff'; // Retain white text
    document.body.appendChild(clone);
    updateClonePosition(touch.clientX, touch.clientY);
}

function touchMove(e) {
    if (!draggedElement) return;
    e.preventDefault();
    const touch = e.targetTouches[0];
    updateClonePosition(touch.clientX, touch.clientY);

    // Haptic feedback when passing over a slot
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = dropTarget.closest('.player-slot');
    if (slot && slot !== lastVibratedSlot) {
        if (navigator.vibrate) {
            navigator.vibrate(30); // 30ms vibration
        }
        lastVibratedSlot = slot;
    } else if (!slot) {
        lastVibratedSlot = null; // Reset when not over a slot
    }
}

function updateClonePosition(clientX, clientY) {
    if (clone) {
        clone.style.left = `${clientX - 36}px`; // Center clone at touch point (72px / 2)
        clone.style.top = `${clientY - 36}px`; // Center clone at touch point (72px / 2)
    }
}

function touchEnd(e) {
    if (!draggedElement) return;
    e.preventDefault();

    // Remove clone
    if (clone) {
        document.body.removeChild(clone);
        clone = null;
    }

    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const playerId = draggedElement.getAttribute('data-player-id');
    const source = draggedElement.classList.contains('player-number-placed') ? 'field' : 'sidebar';
    const slotId = draggedElement.parentElement.id || '';

    const slot = dropTarget.closest('.player-slot');
    if (slot) {
        const position = slot.getAttribute('data-position');
        const matchType = appState.currentGame.matchType;
        const maxPlayers = parseInt(matchType.split('v')[0]);
        let currentPlayers = appState.formationTemp.filter(f => f.playerId !== playerId).length;

        if (source === 'sidebar' && currentPlayers >= maxPlayers) {
            showMessage(`Too many players for ${matchType}. Remove a player first.`, 'error');
            draggedElement = null;
            return;
        }

        const existingPlayerId = slot.getAttribute('data-player-id');
        if (existingPlayerId && existingPlayerId !== playerId) {
            appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== existingPlayerId);
            const oldPlayer = document.querySelector(`.player-number[data-player-id="${existingPlayerId}"]`);
            if (oldPlayer) {
                oldPlayer.classList.remove('disabled');
                oldPlayer.draggable = true;
            }
        }

        appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);
        const x = parseFloat(slot.style.left);
        const y = parseFloat(slot.style.top);

        appState.formationTemp.push({
            playerId,
            position: position === 'GK' || position === 'SW' ? position : appState.players.find(p => p.id === playerId).position,
            x,
            y
        });

        slot.innerHTML = '';
        slot.setAttribute('data-player-id', playerId);
        slot.innerHTML = `<span class="player-number-placed" draggable="true" data-player-id="${playerId}">${draggedElement.textContent}</span>`;
        slot.classList.add('occupied');

        if (source === 'sidebar') {
            disablePlayerNumber(playerId);
        } else if (source === 'field' && slotId !== slot.id) {
            const prevSlot = document.getElementById(slotId);
            if (prevSlot) {
                prevSlot.innerHTML = '';
                prevSlot.removeAttribute('data-player-id');
                prevSlot.classList.remove('occupied');
            }
        }

        setupPlacedPlayerDrag();
        setupPlacedPlayerTouch(); // Reattach touch event listeners
    }

    const sidebar = document.querySelector('#player-list');
    if (sidebar && source === 'field' && dropTarget.closest('#player-list')) {
        appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);
        const slot = document.getElementById(slotId);
        if (slot) {
            slot.innerHTML = '';
            slot.removeAttribute('data-player-id');
            slot.classList.remove('occupied');
        }
        const number = document.querySelector(`.player-number[data-player-id="${playerId}"]`);
        if (number) {
            number.classList.remove('disabled');
            number.draggable = true;
        }
    }

    console.log('Formation after drag:', appState.formationTemp.map(f => ({
        playerId: f.playerId,
        jersey: appState.players.find(p => p.id === f.playerId)?.jerseyNumber,
        position: f.position
    })));

    draggedElement = null;
    lastVibratedSlot = null; // Reset after drop
}

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
    const teamPlayerCounter = document.getElementById('team-player-counter');
    playersList.innerHTML = '';

    if (appState.players.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
        return;
    }
    if (teamPlayerCounter) {
        teamPlayerCounter.textContent = appState.players.length;
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
                <input type="checkbox" class="player-checkbox" data-player-id="${player.id}" onchange="updateDeletePlayerRibbon()">
            </div>
        `;
        playersList.appendChild(playerItem);
    });
}

// Show/hide yellow ribbon based on checkbox states
// Update updateDeletePlayerRibbon to reinforce yellow ribbon precedence
function updateDeletePlayerRibbon() {
    const checkboxes = document.querySelectorAll('.player-checkbox:checked');
    const ribbon = document.getElementById('message-ribbon');
    
    if (checkboxes.length > 0) {
        clearTimeout(messageTimeout); // Cancel any existing timeout
        ribbon.innerHTML = `
            <span id="message-text">Selected players will be deleted.</span>
            <div class="ribbon-buttons">
                <button class="warning-delete-btn" onclick="openDeletePlayersDialog()">Delete</button>
                <span class="close-btn" onclick="closeWarningRibbon()">×</span>
            </div>
        `;
        ribbon.className = 'message-ribbon warning';
        ribbon.classList.remove('hidden');
        ribbon.style.display = 'flex'; // Ensure ribbon is visible
        updateEditButtonStates(); // Update edit button states
    } else {
        ribbon.classList.add('hidden');
        ribbon.style.display = 'none'; // Explicitly hide
        ribbon.innerHTML = `
            <span id="message-text"></span>
            <button class="close-btn" onclick="hideMessage()">×</button>
        `; // Restore default structure
        updateEditButtonStates(); // Re-enable edit buttons
    }
}

function closeWarningRibbon() {
    const checkboxes = document.querySelectorAll('.player-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false; // Uncheck all player checkboxes
    });
    updateDeletePlayerRibbon(); // Update ribbon to hide it
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
    updateDeletePlayerRibbon();
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
    let messageText = document.getElementById('message-text');
    
    clearTimeout(messageTimeout);
    
    const playerCheckboxes = document.querySelectorAll('.player-checkbox:checked');
    const reportCheckboxes = document.querySelectorAll('.report-checkbox:checked');
    if ((playerCheckboxes.length > 0 || reportCheckboxes.length > 0) && type !== 'warning') {
        // Skip non-warning ribbons if any checkboxes are checked
        return;
    }
    
    // Reset ribbon content for non-warning messages
    ribbon.innerHTML = `
        <span id="message-text"></span>
        <button class="close-btn" onclick="hideMessage()">×</button>
    `;
    messageText = document.getElementById('message-text'); // Re-query after resetting
    
    messageText.textContent = message;
    ribbon.className = `message-ribbon ${type}`;
    ribbon.classList.remove('hidden');
    ribbon.style.display = 'flex'; // Ensure ribbon is visible
    
    if (type !== 'warning') {
        messageTimeout = setTimeout(() => {
            if (document.querySelectorAll('.player-checkbox:checked').length === 0 && 
                document.querySelectorAll('.report-checkbox:checked').length === 0) {
                hideMessage();
            }
        }, 5000);
    }
}

// Update hideMessage to reset players-list padding
// Update hideMessage to check checkbox state
function hideMessage() {
    const playerCheckboxes = document.querySelectorAll('.player-checkbox:checked');
    const reportCheckboxes = document.querySelectorAll('.report-checkbox:checked');
    if (playerCheckboxes.length > 0) {
        updateDeletePlayerRibbon();
        return;
    }
    if (reportCheckboxes.length > 0) {
        updateDeleteReportsRibbon();
        return;
    }
    
    const ribbon = document.getElementById('message-ribbon');
    ribbon.classList.add('hidden');
    ribbon.style.display = 'none'; // Explicitly hide
    ribbon.innerHTML = `
        <span id="message-text"></span>
        <button class="close-btn" onclick="hideMessage()">×</button>
    `; // Restore default structure
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

// Game Creation: Replace startGame with setupFormation
function setupFormation() {
    const opponentNameInput = document.getElementById('opponent-name');
    const gameDateInput = document.getElementById('game-date');
    const matchTypeInput = document.getElementById('match-type');
    const numPeriodsInput = document.getElementById('num-periods');
    const periodDurationInput = document.getElementById('period-duration');
    const substitutionTimeInput = document.getElementById('substitution-time');
    const saveSubstitutionDefaultCheckbox = document.getElementById('save-substitution-default');

    const opponentName = opponentNameInput.value.trim();
    const gameDate = gameDateInput.value;
    const matchType = matchTypeInput.value;
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
    if (!matchType) {
        showMessage('Please select a match type.', 'error');
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

    // Validate player count
    const minPlayers = parseInt(matchType.split('v')[0]);
    if (appState.players.length < minPlayers) {
        showMessage(`At least ${minPlayers} players are required for ${matchType}.`, 'error');
        return;
    }

    // Save substitution settings
    if (saveSubstitutionDefaultCheckbox.checked) {
        appState.settings.defaultSubstitutionTime = substitutionTime;
    }
    appState.settings.isSubstitutionDefaultChecked = saveSubstitutionDefaultCheckbox.checked;

    // Initialize currentGame
    appState.currentGame = {
        id: Date.now().toString(),
        date: gameDate,
        opponentName,
        matchType,
        homeScore: 0,
        awayScore: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        actions: [],
        activePlayers: [...appState.players.map(p => p.id)],
        isCompleted: false,
        totalGameTime: 0,
        numPeriods,
        periodDuration: periodDuration * 60,
        substitutionDuration: substitutionTime * 60,
        formation: [],
        substitutes: []
    };

    // Show formation screen
    showScreen('formation-setup');
    renderFormationSetup();
}

// Formation Setup
function renderFormationSetup() {
    const playerList = document.getElementById('player-list');
    const formationField = document.getElementById('formation-field');
    playerList.innerHTML = '';
    formationField.innerHTML = '';
    appState.formationTemp = [];

    // Define spots for 260x400px field
    const spots = [
        { position: 'GK', x: 50, y: 95 }, // Goalkeeper
        { position: 'SW', x: 50, y: 86.5 }, // Sweeper
        // Defense row
        { position: 'DEF-1', x: 10, y: 78.5 }, { position: 'DEF-2', x: 30, y: 78.5 },
        { position: 'DEF-3', x: 50, y: 78.5 }, { position: 'DEF-4', x: 70, y: 78.5 },
        { position: 'DEF-5', x: 90, y: 78.5 },
        // Defense Midfielder row
        { position: 'DM-1', x: 10, y: 61.38 }, { position: 'DM-2', x: 30, y: 61.38 },
        { position: 'DM-3', x: 50, y: 61.38 }, { position: 'DM-4', x: 70, y: 61.38 },
        { position: 'DM-5', x: 90, y: 61.38 },
        // Midfielder row
        { position: 'MID-1', x: 10, y: 44.25 }, { position: 'MID-2', x: 30, y: 44.25 },
        { position: 'MID-3', x: 50, y: 44.25 }, { position: 'MID-4', x: 70, y: 44.25 },
        { position: 'MID-5', x: 90, y: 44.25 },
        // Offensive Midfielder row
        { position: 'OM-1', x: 10, y: 27.13 }, { position: 'OM-2', x: 30, y: 27.13 },
        { position: 'OM-3', x: 50, y: 27.13 }, { position: 'OM-4', x: 70, y: 27.13 },
        { position: 'OM-5', x: 90, y: 27.13 },
        // Forwards row
        { position: 'FWD-1', x: 10, y: 10 }, { position: 'FWD-2', x: 30, y: 10 },
        { position: 'FWD-3', x: 50, y: 10 }, { position: 'FWD-4', x: 70, y: 10 },
        { position: 'FWD-5', x: 90, y: 10 }
    ];

    // Render spots
    spots.forEach(spot => {
        const slot = document.createElement('div');
        slot.className = `player-slot ${spot.position === 'GK' ? 'gk-slot' : spot.position === 'SW' ? 'sw-slot' : ''}`;
        slot.id = spot.position === 'GK' ? 'gk-slot' : spot.position === 'SW' ? 'sw-slot' : `slot-${spot.position}`;
        slot.setAttribute('data-position', spot.position);
        slot.style.left = `${spot.x}%`;
        slot.style.top = `${spot.y}%`;
        slot.draggable = false;
        formationField.appendChild(slot);
    });

    // Render player list
    appState.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item-draggable';
        playerItem.innerHTML = `
            <span class="player-number" draggable="true" data-player-id="${player.id}">${player.jerseyNumber}</span>
            <span class="player-name">${player.name}</span>
        `;
        playerList.appendChild(playerItem);
    });

    // Set up drag-and-drop and touch events
    const numbers = document.querySelectorAll('.player-number');
    numbers.forEach(number => {
        // Desktop drag events
        number.removeEventListener('dragstart', dragStart);
        number.addEventListener('dragstart', dragStart);
        // Mobile touch events
        number.removeEventListener('touchstart', touchStart);
        number.removeEventListener('touchmove', touchMove);
        number.removeEventListener('touchend', touchEnd);
        number.addEventListener('touchstart', touchStart, { passive: false });
        number.addEventListener('touchmove', touchMove, { passive: false });
        number.addEventListener('touchend', touchEnd);
    });

    const slots = document.querySelectorAll('.player-slot');
    slots.forEach(slot => {
        slot.removeEventListener('dragover', dragOver);
        slot.removeEventListener('drop', dropToSlot);
        slot.addEventListener('dragover', dragOver);
        slot.addEventListener('drop', dropToSlot);
    });

    playerList.removeEventListener('dragover', dragOver);
    playerList.removeEventListener('drop', dropToSidebar);
    playerList.addEventListener('dragover', dragOver);
    playerList.addEventListener('drop', dropToSidebar);

    // Set up touch events for placed players
    setupPlacedPlayerTouch();
}

function dragStart(e) {
    e.dataTransfer.setData('playerId', e.target.getAttribute('data-player-id'));
    e.dataTransfer.setData('source', e.target.classList.contains('player-number-placed') ? 'field' : 'sidebar');
    e.dataTransfer.setData('slotId', e.target.parentElement.id || '');

    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.textContent = e.target.textContent; // Set jersey number
    dragImage.style.position = 'absolute';
    dragImage.style.width = '72px'; // Match mobile clone size
    dragImage.style.height = '72px';
    dragImage.style.lineHeight = '72px';
    dragImage.style.fontSize = '36px';
    dragImage.style.borderRadius = '50%';
    dragImage.style.background = '#000';
    dragImage.style.color = '#fff';
    dragImage.style.textAlign = 'center';
    dragImage.style.opacity = '0.7';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.zIndex = '1000';
    document.body.appendChild(dragImage);

    // Set the drag image
    e.dataTransfer.setDragImage(dragImage, 36, 36); // Center at cursor (72px / 2)

    // Clean up drag image after a short delay
    setTimeout(() => {
        document.body.removeChild(dragImage);
    }, 0);
}

function dragOver(e) {
    e.preventDefault();
}

// Allow dropping back to sidebar to remove player
function dropToSidebar(e) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const source = e.dataTransfer.getData('source');
    const slotId = e.dataTransfer.getData('slotId');
    if (source !== 'field') return;

    // Remove from formation
    appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);

    // Clear slot
    const slot = document.getElementById(slotId);
    if (slot) {
        slot.innerHTML = '';
        slot.removeAttribute('data-player-id');
        slot.classList.remove('occupied');
    }

    // Re-enable player number
    const number = document.querySelector(`.player-number[data-player-id="${playerId}"]`);
    if (number) {
        number.classList.remove('disabled');
        number.draggable = true;
    }

    console.log('Formation after sidebar drop:', appState.formationTemp.map(f => ({
        playerId: f.playerId,
        jersey: appState.players.find(p => p.id === f.playerId)?.jerseyNumber,
        position: f.position
    })));
}

// Update dropToSlot to call setupPlacedPlayerTouch
function dropToSlot(e) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const source = e.dataTransfer.getData('source');
    const slotId = e.dataTransfer.getData('slotId');
    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;

    const slot = e.target.closest('.player-slot');
    if (!slot) return;
    const position = slot.getAttribute('data-position');
    const matchType = appState.currentGame.matchType;
    const maxPlayers = parseInt(matchType.split('v')[0]);

    let currentPlayers = appState.formationTemp.filter(f => f.playerId !== playerId).length;

    if (source === 'sidebar' && currentPlayers >= maxPlayers) {
        showMessage(`Too many players for ${matchType}. Remove a player first.`, 'error');
        return;
    }

    const existingPlayerId = slot.getAttribute('data-player-id');
    if (existingPlayerId && existingPlayerId !== playerId) {
        appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== existingPlayerId);
        const oldPlayer = document.querySelector(`.player-number[data-player-id="${existingPlayerId}"]`);
        if (oldPlayer) {
            oldPlayer.classList.remove('disabled');
            oldPlayer.draggable = true;
        }
    }

    appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);
    const x = parseFloat(slot.style.left);
    const y = parseFloat(slot.style.top);

    appState.formationTemp.push({
        playerId,
        position: position === 'GK' || position === 'SW' ? position : player.position,
        x,
        y
    });

    slot.innerHTML = '';
    slot.setAttribute('data-player-id', playerId);
    slot.innerHTML = `<span class="player-number-placed" draggable="true" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
    slot.classList.add('occupied');

    if (source === 'sidebar') {
        disablePlayerNumber(playerId);
    } else if (source === 'field' && slotId !== slot.id) {
        const prevSlot = document.getElementById(slotId);
        if (prevSlot) {
            prevSlot.innerHTML = '';
            prevSlot.removeAttribute('data-player-id');
            prevSlot.classList.remove('occupied');
        }
    }

    setupPlacedPlayerDrag();
}

// Add function to setup drag for placed players
function setupPlacedPlayerDrag() {
    const placedNumbers = document.querySelectorAll('.player-number-placed');
    placedNumbers.forEach(number => {
        number.removeEventListener('dragstart', dragStart);
        number.addEventListener('dragstart', dragStart);
    });
}

function setupPlacedPlayerTouch() {
    const placedNumbers = document.querySelectorAll('.player-number-placed');
    placedNumbers.forEach(number => {
        number.removeEventListener('touchstart', touchStart);
        number.removeEventListener('touchmove', touchMove);
        number.removeEventListener('touchend', touchEnd);
        number.addEventListener('touchstart', touchStart, { passive: false });
        number.addEventListener('touchmove', touchMove, { passive: false });
        number.addEventListener('touchend', touchEnd);
    });
}

function disablePlayerNumber(playerId) {
    const number = document.querySelector(`.player-number[data-player-id="${playerId}"]`);
    if (number) {
        number.classList.add('disabled');
        number.draggable = false;
    }
}

function confirmBackToGameSetup() {
    const dialog = document.getElementById('back-confirm-dialog');
    dialog.style.display = 'flex';
    dialog.classList.add('active');
}

function closeBackConfirmDialog() {
    const dialog = document.getElementById('back-confirm-dialog');
    dialog.style.display = 'none';
    dialog.classList.remove('active');
}

function backToGameSetup() {
    closeBackConfirmDialog();
    appState.currentGame = null;
    appState.formationTemp = null;
    showScreen('game-setup');
}

function startGameFromFormation() {
    const matchType = appState.currentGame.matchType;
    const maxPlayers = parseInt(matchType.split('v')[0]);
    const formation = appState.formationTemp || [];

    // Debug formation state
    console.log('Formation before start:', formation.map(f => ({
        playerId: f.playerId,
        jersey: appState.players.find(p => p.id === f.playerId)?.jerseyNumber,
        position: f.position
    })));

    // Validate formation
    if (formation.length > maxPlayers) {
        showMessage(`Too many players assigned for ${matchType}. Please assign exactly ${maxPlayers} players.`, 'error');
        return;
    }
    if (formation.length < maxPlayers) {
        showMessage(`Not enough players assigned for ${matchType}. Please assign exactly ${maxPlayers} players.`, 'error');
        return;
    }
    
    appState.currentGame.formation = formation;

    // Check for goalkeeper (y = 95)
    const hasGoalkeeper = appState.currentGame.formation.some(f => f.y === 95 && f.playerId);
    if (!hasGoalkeeper) {
        showMessage('A goalkeeper must be assigned before starting the game.', 'error');
        return;
    }

    // Set formation and substitutes
    
    appState.currentGame.substitutes = appState.players
        .filter(p => !formation.some(f => f.playerId === p.id))
        .map(p => p.id);

    // Reset player stats
    appState.players.forEach(player => {
        player.stats = {
            goals: 0,
            assists: 0,
            saves: 0,
            goalsAllowed: 0,
            yellowCards: 0,
            redCards: 0,
            faults: 0,
            blockedShots: 0
        };
    });

    // Setup timers and UI
    appState.timer.duration = appState.currentGame.substitutionDuration;
    appState.timer.timeLeft = appState.timer.duration;
    updateTimerDisplay();
    appState.gameTimer.elapsed = 0;
    appState.gameTimer.isRunning = false;
    appState.gameTimer.startTime = null;
    updateGameTimeDisplay();
    updatePeriodCounter();
    document.getElementById('opponent-team-name').textContent = appState.currentGame.opponentName.toUpperCase();
    document.getElementById('home-score').textContent = '0';
    document.getElementById('away-score').textContent = '0';
    renderPlayerGrid();
    showScreen('game-tracking');
    appState.formationTemp = null;
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

function getPlayerPositionInGame(playerId) {
    if (!appState.currentGame || !appState.currentGame.formation || !appState.currentGame.substitutes) {
        return 'SUB'; // Default to SUB if no game or formation
    }

    // Check if player is a substitute
    if (appState.currentGame.substitutes.includes(playerId)) {
        return 'SUB';
    }

    // Find player's formation entry
    const formationEntry = appState.currentGame.formation.find(f => f.playerId === playerId);
    if (!formationEntry) {
        return 'SUB'; // Not in formation, treat as substitute
    }

    const y = formationEntry.y;
    if (y === 95) return 'GK'; // Goalkeeper
    if (y === 86.5 || y === 78.5) return 'DEF'; // Sweeper or Defensive row
    if (y === 61.38) return 'MDEF'; // Defensive Midfield
    if (y === 44.25) return 'MID'; // Midfield
    if (y === 27.13) return 'OMID'; // Offensive Midfield
    if (y === 10) return 'ATT'; // Forward

    return 'SUB'; // Fallback
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
        // NEW: Apply starter or substitute class based on formation status
        const position = getPlayerPositionInGame(player.id);
        if (position === 'SUB') {
            playerGridItem.classList.add('substitute');
        } else {
            playerGridItem.classList.add('starter');
        }
        
        // Apply yellow or red card classes
        if (player.stats.redCards > 0 || player.stats.yellowCards >= 2) {
            playerGridItem.classList.add('red-card');
        } else if (player.stats.yellowCards > 0) {
            playerGridItem.classList.add('yellow-card');
        }
        
        // Get position from formation
        // const position = getPlayerPositionInGame(player.id);
        
        playerGridItem.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-columns">
                <div class="player-number">${player.jerseyNumber}</div>
                <div class="player-position">${position}</div>
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
    
    const anyChecked = document.querySelectorAll('.report-checkbox:checked').length > 0;
    
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
                <input type="checkbox" class="report-checkbox" data-report-id="${game.id}" onchange="updateDeleteReportsRibbon()" ${anyChecked ? 'disabled' : ''}>
            </div>
        `;
        reportsList.appendChild(reportItem);
    });
}

function updateDeleteReportsRibbon() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    const ribbon = document.getElementById('message-ribbon');
    
    if (checkboxes.length > 0) {
        clearTimeout(messageTimeout); // Cancel any existing timeout
        ribbon.innerHTML = `
            <span id="message-text">Selected reports will be deleted.</span>
            <div class="ribbon-buttons">
                <button class="warning-delete-btn" onclick="openDeleteReportsDialog()">Delete</button>
                <span class="close-btn" onclick="closeWarningReportsRibbon()">×</span>
            </div>
        `;
        ribbon.className = 'message-ribbon warning';
        ribbon.classList.remove('hidden');
        ribbon.style.display = 'flex'; // Ensure ribbon is visible
    } else {
        ribbon.classList.add('hidden');
        ribbon.style.display = 'none'; // Explicitly hide
        ribbon.innerHTML = `
            <span id="message-text"></span>
            <button class="close-btn" onclick="hideMessage()">×</button>
        `; // Restore default structure
    }
}

function closeWarningReportsRibbon() {
    const checkboxes = document.querySelectorAll('.report-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false; // Uncheck all report checkboxes
    });
    updateDeleteReportsRibbon(); // Update ribbon to hide it
}

function openDeleteReportsDialog() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    if (checkboxes.length === 0) {
        updateDeleteReportsRibbon();
        return;
    }
    
    let confirmDialog = document.getElementById('confirm-delete-reports-dialog');
    if (!confirmDialog) {
        confirmDialog = document.createElement('div');
        confirmDialog.id = 'confirm-delete-reports-dialog';
        confirmDialog.className = 'dialog';
        document.getElementById('app').appendChild(confirmDialog);
    }
    
    const reportCount = checkboxes.length;
    confirmDialog.innerHTML = `
        <div class="dialog-content">
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to remove ${reportCount} report${reportCount > 1 ? 's' : ''}?</p>
            <div class="dialog-buttons">
                <button class="secondary-btn" onclick="closeConfirmDeleteReportsDialog()">Cancel</button>
                <button class="primary-btn delete-btn" onclick="confirmDeleteReports()">Confirm</button>
            </div>
        </div>
    `;
    
    confirmDialog.style.display = 'flex';
    confirmDialog.classList.add('active');
}

function closeConfirmDeleteReportsDialog() {
    const confirmDialog = document.getElementById('confirm-delete-reports-dialog');
    if (confirmDialog) {
        confirmDialog.style.display = 'none';
        confirmDialog.classList.remove('active');
    }
    // Reset all checkboxes
    document.querySelectorAll('.report-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateDeleteReportsRibbon();
}

function confirmDeleteReports() {
    const checkboxes = document.querySelectorAll('.report-checkbox:checked');
    const reportIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-report-id'));
    
    if (reportIds.length === 0) {
        updateDeleteReportsRibbon();
        return;
    }
    
    // Close the dialog
    closeConfirmDeleteReportsDialog();
    
    // Delete selected reports
    const deletedCount = reportIds.length;
    reportIds.forEach(reportId => {
        const reportIndex = appState.games.findIndex(g => g.id === reportId);
        if (reportIndex !== -1) {
            appState.games.splice(reportIndex, 1);
        }
    });
    
    // Save and update UI
    saveAppData();
    renderReportsList();
    updateGameReportCounter();
    
    // Show success message
    showMessage(`${deletedCount} report${deletedCount > 1 ? 's' : ''} removed successfully`, 'success');
}

// Update viewReport to include formation
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
    const gameDuration = game.startTime && game.endTime && !isNaN(new Date(game.endTime) - new Date(game.startTime))
        ? `${Math.floor((new Date(game.endTime) - new Date(game.startTime)) / 60000)} minutes`
        : game.numPeriods && game.periodDuration
        ? `${Math.floor(game.numPeriods * game.periodDuration / 60)} minutes`
        : 'N/A';

    const playerActions = {};
    (game.activePlayers || []).forEach(playerId => {
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
    (game.actions || []).forEach(action => {
        if (action.actionType === 'own_goal') {
            ownGoals.push(action.gameMinute);
        } else if (playerActions[action.playerId]) {
            switch (action.actionType) {
                case 'goal': playerActions[action.playerId].goals.push(action.gameMinute); break;
                case 'assist': playerActions[action.playerId].assists++; break;
                case 'save': playerActions[action.playerId].saves++; break;
                case 'goal_allowed': playerActions[action.playerId].goalsAllowed++; break;
                case 'yellow_card': playerActions[action.playerId].yellowCards.push(action.gameMinute); break;
                case 'red_card': playerActions[action.playerId].redCards.push(action.gameMinute); break;
                case 'late_to_game': playerActions[action.playerId].lateToGame = true; break;
                case 'fault': playerActions[action.playerId].faults++; break;
                case 'blocked_shot': playerActions[action.playerId].blockedShots++; break;
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

    const goalLine = Object.values(playerActions)
        .filter(p => p.goals.length > 0)
        .map(p => ({ name: p.name, times: p.goals.sort((a, b) => a - b) }))
        .concat(ownGoals.sort((a, b) => a - b).map(time => ({ name: 'Opponent', times: [time], isOwnGoal: true })))
        .map(entry => entry.isOwnGoal ? `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')}, og)` : `${entry.name} (${entry.times.map(t => `${t}'`).join(', ')})`)
        .join(', ') || 'N/A';

    const yellowCardLine = Object.values(playerActions)
        .filter(p => p.yellowCards.length > 0)
        .map(p => `${p.name} (${p.yellowCards.sort((a, b) => a - b).map(t => `${t}'`).join(', ')})`)
        .join(', ') || 'N/A';

    const redCardLine = Object.values(playerActions)
        .filter(p => p.redCards.length > 0 || p.yellowCards.length >= 2)
        .map(p => {
            const redTimes = [...p.redCards];
            if (p.yellowCards.length >= 2) redTimes.push(p.yellowCards[1]);
            return `${p.name} (${redTimes.sort((a, b) => a - b).map(t => `${t}'`).join(', ')})`;
        })
        .join(', ') || 'N/A';

    const lateLine = Object.values(playerActions)
        .filter(p => p.lateToGame)
        .map(p => p.name)
        .join(', ') || 'N/A';

    // Formation Section with correct stats and player names
    let formationHTML = '';
    if (game.formation && game.formation.length > 0) {
        formationHTML = `
            <div class="report-formation">
                <h3>Starting Formation (${game.matchType})</h3>
                <div class="formation-container-report">
                    <div class="formation-field-report">
                        ${game.formation.map(f => {
                            const player = appState.players.find(p => p.id === f.playerId);
                            if (!player) return '';
                            const isGk = f.position === 'GK';
                            const stats = playerActions[f.playerId] || {};
                            const statTable = isGk
                                ? `<table class="player-stats-table">
                                       <tr><th>Saves</th><td>${stats.saves || 0}</td></tr>
                                       <tr><th>Goals Allowed</th><td>${stats.goalsAllowed || 0}</td></tr>
                                   </table>`
                                : `<table class="player-stats-table">
                                       <tr><th>Goals</th><td>${stats.goals?.length || 0}</td></tr>
                                       <tr><th>Assists</th><td>${stats.assists || 0}</td></tr>
                                       <tr><th>Yellow Cards</th><td>${stats.yellowCards?.length || 0}</td></tr>
                                       <tr><th>Red Cards</th><td>${stats.redCards?.length + (stats.yellowCards?.length >= 2 ? 1 : 0)}</td></tr>
                                   </table>`;
                            return `
                                <div class="player-slot-report" style="left: ${f.x}%; top: ${f.y}%">
                                    <span class="player-number-report">${player.jerseyNumber}</span>
                                    <span class="player-name-report">${player.name}</span>
                                    ${statTable}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="substitutes-list">
                        <h4>Substitutes</h4>
                        ${game.substitutes?.map(subId => {
                            const player = appState.players.find(p => p.id === subId);
                            if (!player) return '';
                            const stats = playerActions[subId] || {};
                            return `
                                <div class="substitute-item">
                                    <span>#${player.jerseyNumber} ${player.name}</span>
                                    <table class="player-stats-table">
                                        <tr><th>Goals</th><td>${stats.goals?.length || 0}</td></tr>
                                        <tr><th>Assists</th><td>${stats.assists || 0}</td></tr>
                                        <tr><th>Yellow Cards</th><td>${stats.yellowCards?.length || 0}</td></tr>
                                        <tr><th>Red Cards</th><td>${stats.redCards?.length + (stats.yellowCards?.length >= 2 ? 1 : 0)}</td></tr>
                                    </table>
                                </div>
                            `;
                        }).join('') || '<p>No substitutes</p>'}
                    </div>
                </div>
            </div>
        `;
    }

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
            ${formationHTML}
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

// Update exportReport to ensure formation is styled for PDF
function exportReport(gameId, format) {
    const game = appState.games.find(g => g.id === gameId);
    if (!game) {
        showMessage('Game not found', 'error');
        return;
    }

    const reportContent = document.querySelector('.report-dialog').innerHTML;
    let iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

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
                h2, h3, h4 { color: #333; }
                .formation-container-report {
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                    align-items: flex-start;
                    min-width: 520px;
                }
                .formation-field-report {
                    width: 300px; height: 400px;
                    background: url('img/field-400.png') no-repeat center center;
                    background-size: cover;
                    position: relative;
                    border: 2px solid #fff;
                    flex-shrink: 0;
                }
                .player-slot-report {
                    position: absolute; text-align: center; transform: translate(-50%, -50%);
                    display: flex; flex-direction: column; align-items: center;
                }
                .player-number-report {
                    display: inline-block; width: 24px; height: 24px; line-height: 24px;
                    background: #000; color: #fff; border-radius: 50%; font-size: 12px;
                }
                .player-name-report {
                    font-size: 10px; color: #fff; margin-top: 2px;
                    text-shadow: 1px 1px 1px #000;
                }
                .player-stats-table {
                    width: 100px; font-size: 10px; margin-top: 5px;
                    border-collapse: collapse; background: #fff;
                }
                .player-stats-table th, .player-stats-table td {
                    border: 1px solid #ddd; padding: 2px;
                }
                .substitutes-list {
                    width: 200px; background: #f5f5f5; padding: 10px;
                    border-radius: 8px; max-height: 400px; overflow-y: auto;
                }
                .substitute-item { margin-bottom: 10px; }
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

    iframe.onload = function() {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
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