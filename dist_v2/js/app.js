// Application State
let appState = {
    teamName: "My Team",
    players: [],
    games: [],
    currentGame: null,
    timer: {
        duration: 6 * 60, // 6 minutes in seconds
        timeLeft: 6 * 60,
        endTime: 0, // New: Timestamp when countdown ends
        pausedTime: 0, // New: Cumulative paused duration in ms
        interval: null,
        isRunning: false,
        isPaused: false
    },
    gameTimer: {
        elapsed: 0, // total seconds elapsed in the game
        startTime: 0, // New: Timestamp when game starts
        pausedTime: 0, // New: Cumulative paused duration in ms
        interval: null,
        isRunning: false,
        isPaused: false
    },
    settings: {
        language: 'en',
        defaultSubstitutionTime: null, // Replace defaultTimer with defaultSubstitutionTime
        isSubstitutionDefaultChecked: false
    },
    currentPlayer: null,
    formationTemp: null // Temporary storage for formation during setup
};

// We track pause start times using the high-resolution device timer (performance.now())
let gamePauseStart = 0; // For gameTimer
let subPauseStart = 0;  // For timer (substitution)

// ===============================================
// DRAG AND DROP STATE MANAGEMENT
// ===============================================

const DragState = {
    draggedElement: null,
    initialX: 0,
    initialY: 0,
    clone: null,
    lastVibratedSlot: null, // Track last slot vibrated to debounce
    
    reset() {
        this.draggedElement = null;
        this.initialX = 0;
        this.initialY = 0;
        this.clone = null;
        this.lastVibratedSlot = null;
    }
};

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

    // Haptic feedback when passing over a slot (field or unavailable)
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = dropTarget.closest('.player-slot, .unavailable-slot');
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
    const isPlaced = draggedElement.classList.contains('player-number-placed');
    const parentSlot = draggedElement.closest('.player-slot, .unavailable-slot');
    const isFromUnavailable = parentSlot && parentSlot.classList.contains('unavailable-slot');
    
    let source = 'sidebar';
    if (isPlaced && isFromUnavailable) {
        source = 'unavailable';
    } else if (isPlaced) {
        source = 'field';
    }
    
    const slotId = draggedElement.parentElement.id || '';

    const slot = dropTarget.closest('.player-slot');
    const unavailableSlot = dropTarget.closest('.unavailable-slot');
    if (slot) {
        const position = slot.getAttribute('data-position');
        const matchType = appState.currentGame.matchType;
        const maxPlayers = parseInt(matchType.split('v')[0]);
        let currentPlayers = appState.formationTemp.filter(f => f.playerId !== playerId).length;

        const existingPlayerId = slot.getAttribute('data-player-id');
        
        // Only check player limit if adding to empty slot (not replacing)
        if (source === 'sidebar' && !existingPlayerId && currentPlayers >= maxPlayers) {
            showMessage(`Too many players for ${matchType}. Remove a player first.`, 'error');
            draggedElement = null;
            return;
        }
        if (existingPlayerId && existingPlayerId !== playerId) {
            // Remove existing player from formation and return to sidebar
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
            position: position, // Always use the field slot position, not player's original position
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
    } else if (unavailableSlot) {
        // Handle drop to unavailable slot (mobile touch)
        const existingPlayerId = unavailableSlot.getAttribute('data-player-id');
        if (existingPlayerId && existingPlayerId !== playerId) {
            // Remove displaced player from unavailable list
            appState.unavailablePlayers = appState.unavailablePlayers.filter(id => id !== existingPlayerId);
            
            // Re-enable the displaced player in sidebar
            const displacedNumber = document.querySelector(`.player-number[data-player-id="${existingPlayerId}"]`);
            if (displacedNumber) {
                displacedNumber.classList.remove('disabled');
                displacedNumber.draggable = true;
            }
        }
        
        const player = appState.players.find(p => p.id === playerId);
        if (player) {
            // Remove from source
            if (source === 'field') {
                const sourceSlot = document.getElementById(slotId);
                if (sourceSlot) {
                    sourceSlot.innerHTML = '';
                    sourceSlot.removeAttribute('data-player-id');
                    sourceSlot.classList.remove('occupied');
                }
                appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);
                // Re-enable player number if moving from field
                const number = document.querySelector(`.player-number[data-player-id="${playerId}"]`);
                if (number) {
                    number.classList.remove('disabled');
                    number.draggable = true;
                }
            } else if (source === 'unavailable') {
                // Moving between unavailable slots
                const sourceSlot = document.getElementById(slotId);
                if (sourceSlot) {
                    sourceSlot.innerHTML = '';
                    sourceSlot.removeAttribute('data-player-id');
                    sourceSlot.classList.remove('occupied');
                }
            }
            
            // Add to unavailable players if not already there
            if (!appState.unavailablePlayers.includes(playerId)) {
                appState.unavailablePlayers.push(playerId);
            }
            
            // Add to target slot
            unavailableSlot.innerHTML = `
                <span class="player-number player-number-placed" draggable="true" data-player-id="${playerId}">${draggedElement.textContent}</span>
            `;
            unavailableSlot.setAttribute('data-player-id', playerId);
            unavailableSlot.classList.add('occupied');
            
            // Re-setup drag events and disable player in sidebar if from sidebar
            setupPlacedPlayerDrag();
            setupPlacedPlayerTouch();
            if (source === 'sidebar') {
                disablePlayerNumber(playerId);
            }
            
            // Save data
            saveAppData();
        }
    }

    const sidebar = document.querySelector('#player-list');
    if (sidebar && (source === 'field' || source === 'unavailable') && dropTarget.closest('#player-list')) {
        // Handle dropping back to sidebar from field or unavailable area
        if (source === 'field') {
            appState.formationTemp = appState.formationTemp.filter(f => f.playerId !== playerId);
        } else if (source === 'unavailable') {
            appState.unavailablePlayers = appState.unavailablePlayers.filter(id => id !== playerId);
        }
        
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
        
        // Save data
        saveAppData();
    }

    //     playerId: f.playerId,
    //     jersey: appState.players.find(p => p.id === f.playerId)?.jerseyNumber,
    // ...(truncated 148753 characters)...te).toLocaleDateString()} onwards`;
    else if (endDate) {
            periodText += `start to ${new Date(endDate).toLocaleDateString()}`;
        }
    else {
        periodText = 'All completed games';
    }
    
    periodInfoElement.textContent = periodText;
    
    // Set data attribute for mobile pseudo-element
    if (controlsRow2) {
        controlsRow2.setAttribute('data-period-info', periodText);
    }
    
    // Count games and available reports
    const totalGames = filteredGames.length;
    const gamesWithReports = filteredGames.filter(game => 
        game.actions && game.actions.length > 0
    ).length;
    
    // Update reports counter
    if (totalGames === 0) {
        reportsCounterElement.innerHTML = '';
    } else if (gamesWithReports === totalGames) {
        reportsCounterElement.innerHTML = `
            <span>Reports:</span>
            <span class="reports-counter-badge">${gamesWithReports}/${totalGames}</span>
        `;
    } else {
        reportsCounterElement.innerHTML = `
            <span>Reports:</span>
            <span class="reports-counter-warning">${gamesWithReports}/${totalGames}</span>
            <span style="color: #ff9800; font-size: 12px;">${totalGames - gamesWithReports} missing</span>
        `;
    }
}


// Render player statistics table
function renderPlayerStatistics() {
    const container = document.getElementById('player-statistics-container');
    if (!container) return;
    
    // Get date filter values
    const startDate = document.getElementById('stats-start-date')?.value || null;
    const endDate = document.getElementById('stats-end-date')?.value || null;
    
    const playerStats = calculatePlayerStatistics(startDate, endDate);
    
    // Check if we have completed games (considering date filter)
    let completedGames = appState.games.filter(game => game.isCompleted);
    if (startDate || endDate) {
        completedGames = completedGames.filter(game => {
            if (!game.date) return false;
            const gameDate = new Date(game.date);
            if (startDate && gameDate < new Date(startDate)) return false;
            if (endDate && gameDate > new Date(endDate)) return false;
            return true;
        });
    }
    const hasCompletedGames = completedGames && completedGames.length > 0;
    
    // Update period info and reports counter
    updateStatsPeriodInfo(startDate, endDate, completedGames);
    
    if (!hasCompletedGames || appState.players.length === 0) {
        container.innerHTML = `
            <div class="no-stats-message">
                ${appState.players.length === 0 
                    ? 'No players added to the team yet.' 
                    : 'No completed games yet. Statistics will appear after completing games.'}
            </div>
        `;
        return;
    }
    
    // Sort players by jersey number
    const sortedPlayers = Object.values(playerStats)
        .filter(player => appState.players.find(p => p.id === Object.keys(playerStats).find(id => playerStats[id] === player)))
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    
    const tableHTML = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>GP</th>
                    <th>Missed</th>
                    <th>Late</th>
                    <th>Goals</th>
                    <th>Assists</th>
                    <th>Saves</th>
                    <th>Passes</th>
                    <th>Shots</th>
                    <th>Blocks</th>
                    <th>Fouls</th>
                    <th>YC</th>
                    <th>RC</th>
                    <th>OG</th>
                </tr>
            </thead>
            <tbody>
                ${sortedPlayers.map(player => `
                    <tr>
                        <td>${player.jerseyNumber}</td>
                        <td>${player.name}</td>
                        <td>${player.gamesPlayed}</td>
                        <td>${player.missedGames}</td>
                        <td>${player.lateToGame}</td>
                        <td>${player.goals}</td>
                        <td>${player.assists}</td>
                        <td>${player.saves}</td>
                        <td>${player.passes}</td>
                        <td>${player.shots}</td>
                        <td>${player.blocks}</td>
                        <td>${player.fouls}</td>
                        <td>${player.yellowCards}</td>
                        <td>${player.redCards}</td>
                        <td>${player.ownGoals}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// No longer needed - removed updateActionHistory and updateUndoButton functions

function getPlayerName(playerId) {
    if (!playerId) return 'Unknown Player';
    const player = appState.players.find(p => p.id === playerId);
    return player ? `#${player.jerseyNumber} ${player.name}` : 'Unknown Player';
}

function formatActionType(actionType) {
    const typeMap = {
        'goal': '⚽ Goal',
        'assist': '👟 Assist',
        'save': '🧤 Save',
        'goals_allowed': '🔴 Goal Allowed',
        'yellow_card': '🟨 Yellow Card',
        'red_card': '🟥 Red Card',
        'fault': '⚠️ Fault',
        'blocked_shot': '❌ Blocked Shot',
        'late_to_game': '⏰ Late to Game',
        'own_goal': '⚽ Own Goal'
    };
    return typeMap[actionType] || actionType;
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

// Helper function to build player stat table HTML - consolidates duplicate code
function buildPlayerStatTable(stats) {
    let statTable = '<table class="player-stats-table">';
    
    if (stats.goals?.length > 0) {
        statTable += `<tr><th>⚽</th><td>${stats.goals.length}</td></tr>`;
    }
    if (stats.assists > 0) {
        statTable += `<tr><th>👟</th><td>${stats.assists}</td></tr>`;
    }
    if (stats.saves > 0) {
        statTable += `<tr><th>🧤</th><td>${stats.saves}</td></tr>`;
    }
    if (stats.goalsAllowed > 0) {
        statTable += `<tr><th><img src="img/red-soccer.png" style="width:18px;height:18px;"></th><td>${stats.goalsAllowed}</td></tr>`;
    }
    if (stats.blockedShots > 0) {
        statTable += `<tr><th>❌</th><td>${stats.blockedShots}</td></tr>`;
    }
    if (stats.faults > 0) {
        statTable += `<tr><th>⚠️</th><td>${stats.faults}</td></tr>`;
    }
    if (stats.yellowCards?.length > 0) {
        statTable += `<tr><th>🟨</th><td>${stats.yellowCards.length}</td></tr>`;
    }
    const redCards = (stats.redCards?.length || 0) + (stats.yellowCards?.length >= 2 ? 1 : 0);
    if (redCards > 0) {
        statTable += `<tr><th>🟥</th><td>${redCards}</td></tr>`;
    }
    
    statTable += '</table>';
    return statTable;
}

// ===============================================
// DIALOG MANAGEMENT SYSTEM
// ===============================================

const DialogManager = {
    show(dialogId, setupCallback = null) {
        const dialog = document.getElementById(dialogId);
        if (!dialog) return;
        
        if (setupCallback) setupCallback(dialog);
        
        dialog.style.display = 'flex';
        dialog.classList.add('active');
    },
    
    hide(dialogId, cleanupCallback = null) {
        const dialog = document.getElementById(dialogId);
        if (!dialog) return;
        
        dialog.style.display = 'none';
        dialog.classList.remove('active');
        
        if (cleanupCallback) cleanupCallback(dialog);
    },
    
    clearInputs(dialog, inputSelectors = ['input[type="text"]', 'input[type="number"]', 'textarea', 'select']) {
        inputSelectors.forEach(selector => {
            dialog.querySelectorAll(selector).forEach(input => {
                input.value = '';
            });
        });
    }
};

// ===============================================
// UI UPDATE MANAGEMENT SYSTEM
// ===============================================

const UIManager = {
    updateAll() {
        this.updatePlayerCounter();
        this.updateGameReportCounter();
        this.updateTeamNameUI();
    },
    
    updatePlayerCounter() {
        const playerCount = appState.players.length;
        const mainCounter = document.getElementById('player-counter');
        const teamCounter = document.getElementById('team-player-counter');
        
        if (mainCounter) mainCounter.textContent = playerCount;
        if (teamCounter) teamCounter.textContent = playerCount;
    },
    
    updateGameReportCounter() {
        const reportCount = appState.games.filter(game => game.completed).length;
        const reportCounter = document.getElementById('game-report-counter');
        
        if (reportCounter) reportCounter.textContent = reportCount;
    },
    
    updateTeamNameUI() {
        const teamNameInput = document.getElementById('team-name-input');
        if (teamNameInput && appState.teamName) {
            teamNameInput.value = appState.teamName;
        }
    }
};

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ------------------------------------------------------------------
// Page refresh lock helpers
// Prevent the user from accidentally reloading or pulling-to-refresh
// once the match timer has started. We use a beforeunload handler and
// dynamically toggle the CSS overscroll behavior on <body>.

function beforeUnloadHandler(e) {
    if (appState.gameTimer.isRunning) {
        // standard compliant browsers
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
    }
}

// touchmove listener that prevents the default pull-down gesture when
// the page is already scrolled to the top. Only active while the lock
// is enabled; removes itself when unlocked.
function onTouchMovePreventRefresh(e) {
    if (window.scrollY === 0 && e.touches && e.touches.length && e.touches[0].clientY > 0) {
        e.preventDefault();
    }
}

// popstate listener that intercepts back/forward navigation (including swipe gesture)
// and shows a confirmation dialog if the game is still running.
function onPopStatePreventBack(e) {
    if (appState.gameTimer.isRunning) {
        e.preventDefault();
        // Push state back to prevent the navigation
        history.pushState({ gameActive: true }, '');
        // Show confirmation dialog
        if (confirm('Game is in progress. Are you sure you want to go back and lose the timer?')) {
            // User confirmed – allow navigation by manually removing the listener and going back
            window.removeEventListener('popstate', onPopStatePreventBack);
            window.history.back();
        }
    }
}

function lockPageRefresh(enable) {
    if (enable) {
        window.addEventListener('beforeunload', beforeUnloadHandler);
        document.body.style.overscrollBehavior = 'none';
        window.addEventListener('touchmove', onTouchMovePreventRefresh, { passive: false });
        // Push a new history state and attach back-navigation guard
        history.pushState({ gameActive: true }, '');
        window.addEventListener('popstate', onPopStatePreventBack);
    } else {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        document.body.style.overscrollBehavior = '';
        window.removeEventListener('touchmove', onTouchMovePreventRefresh);
        window.removeEventListener('popstate', onPopStatePreventBack);
    }
}

function startGameTimer() {
    if (appState.gameTimer.isRunning) return; // Already running
    
    if (appState.gameTimer.isPaused) {
        // Resume: accumulate paused time using device timer
        appState.gameTimer.pausedTime += performance.now() - gamePauseStart;
        appState.gameTimer.isPaused = false;
        gamePauseStart = 0;
    } else {
        // First start: record the high-resolution start timestamp
        appState.gameTimer.startTime = performance.now();
        appState.gameTimer.pausedTime = 0;
        appState.gameTimer.elapsed = 0; // Reset stored elapsed
    }
    
    appState.gameTimer.isRunning = true;

    // Once the game is live we want to prevent the user from accidentally
    // pulling-to-refresh or closing the page. Lock the page refresh behavior.
    lockPageRefresh(true);
    
    // Start UI update loop if not already running
    if (!appState.timer.isRunning) {
        updateTimers(); // Kick off requestAnimationFrame loop
    }
}

function pauseGameTimer() {
    if (!appState.gameTimer.isRunning || appState.gameTimer.isPaused) return;
    
    // Update stored elapsed before pausing
    appState.gameTimer.elapsed = getElapsedGameTime();
    
    // Record pause start using device timer and set flag
    gamePauseStart = performance.now();
    appState.gameTimer.isPaused = true;
}

function stopGameTimer() {
    if (!appState.gameTimer.isRunning) return;
    
    // If paused, accumulate final paused time
    if (appState.gameTimer.isPaused) {
        appState.gameTimer.pausedTime += performance.now() - gamePauseStart;
    }
    
    // Update final elapsed
    appState.gameTimer.elapsed = getElapsedGameTime();
    
    // Reset state
    appState.gameTimer.isRunning = false;
    appState.gameTimer.isPaused = false;
    appState.gameTimer.startTime = 0;
    appState.gameTimer.pausedTime = 0;
    gamePauseStart = 0;

    // Remove page lock when timer stops
    lockPageRefresh(false);
    
    // Update UI immediately
    document.getElementById('game-time').textContent = formatTime(0);
}

function startTimer() {
    if (appState.timer.isRunning) return;
    
    if (appState.timer.isPaused) {
        // Resume: adjust endTime by pause duration using device timer
        const pauseDuration = performance.now() - subPauseStart;
        appState.timer.endTime += pauseDuration;
        appState.timer.isPaused = false;
        subPauseStart = 0;
    } else {
        // First start: set endTime using high-resolution timestamp
        const durationMs = appState.timer.duration * 1000;
        appState.timer.endTime = performance.now() + durationMs;
        appState.timer.pausedTime = 0;
        appState.timer.timeLeft = appState.timer.duration; // Initial stored value
    }
    
    appState.timer.isRunning = true;
    
    // Start UI update loop if not already running
    if (!appState.gameTimer.isRunning) {
        updateTimers();
    }
}

function pauseTimer() {
    if (!appState.timer.isRunning || appState.timer.isPaused) return;
    
    // Update stored timeLeft before pausing
    appState.timer.timeLeft = getRemainingSubTime();
    
    // Record pause start using device timer and set flag
    subPauseStart = performance.now();
    appState.timer.isPaused = true;
}

function resetTimer() {
    // Pause if running
    if (appState.timer.isRunning && !appState.timer.isPaused) {
        pauseTimer();
    }
    
    // Reset state
    appState.timer.isRunning = false;
    appState.timer.isPaused = false;
    appState.timer.endTime = 0;
    appState.timer.pausedTime = 0;
    appState.timer.timeLeft = appState.timer.duration;
    subPauseStart = 0;
    
    // Update UI
    document.getElementById('substitution-timer').querySelector('.timer-value').textContent = formatTime(appState.timer.duration);
}

// Function to calculate elapsed game time using device timer
function getElapsedGameTime() {
    if (!appState.gameTimer.isRunning || appState.gameTimer.isPaused) return appState.gameTimer.elapsed;
    const now = performance.now();
    const rawElapsed = now - appState.gameTimer.startTime - appState.gameTimer.pausedTime;
    return Math.max(0, Math.floor(rawElapsed / 1000));  // In seconds
}

// Function to calculate remaining substitution time using device timer
function getRemainingSubTime() {
    if (!appState.timer.isRunning || appState.timer.isPaused) return appState.timer.timeLeft;
    const now = performance.now();
    const remainingMs = appState.timer.endTime - now + appState.timer.pausedTime;
    return Math.max(0, Math.floor(remainingMs / 1000));  // In seconds
}

// Update display function (call this when visible)
function updateTimers() {
    const elapsed = getElapsedGameTime();
    const remaining = getRemainingSubTime();
    
    // Update game time UI
    document.getElementById('game-time').textContent = formatTime(elapsed);
    
    // Update substitution timer UI
    document.getElementById('substitution-timer').querySelector('.timer-value').textContent = formatTime(remaining);
    
    // Check for substitution timer end
    if (remaining <= 0 && appState.timer.isRunning) {
        pauseTimer(); // Or handle alert/vibration
        showMessage('Time for substitution!', 'info');
    }
    
    if (appState.gameTimer.isRunning || appState.timer.isRunning) {
        requestAnimationFrame(updateTimers);  // Efficient loop, only when visible
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ===============================================
// ACTION RECORDING SYSTEM
// ===============================================

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
    
    // Add "No Assist" button
    const noAssistBtn = document.createElement('div');
    noAssistBtn.className = 'player-select-item no-assist-btn';
    noAssistBtn.innerHTML = 'No Assist';
    noAssistBtn.addEventListener('click', completeGoalWithoutAssist);
    playersGrid.appendChild(noAssistBtn);
    
    toggleDialog('assist-selection-dialog', true);
}

function closeAssistSelectionDialog() {
    toggleDialog('assist-selection-dialog', false);
    appState.goalScorer = null;
}

function completeGoalWithAssist(assistPlayerId) {
    if (!appState.goalScorer || !assistPlayerId) return;
    
    // Record the goal for the scorer (this also increments shot_on_goal)
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
    
    // Record the goal for the scorer (this also increments shot_on_goal)
    recordAction('goal', scorerId);
    
    // Record the assist for the assisting player
    recordAction('assist', appState.assister.id);
    
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
            goalsAllowed: 0,
            shotOnGoal: 0,
            blockedShots: 0,
            faults: 0,
            yellowCards: 0,
            redCards: 0,
            ownGoals: 0
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
            // Shot on goal is incremented when a goal is scored
            appState.players[playerIndex].stats.shotOnGoal++;
            appState.currentGame.homeScore++;
            document.getElementById('home-score').textContent = appState.currentGame.homeScore;
            break;
        case 'assist':
            appState.players[playerIndex].stats.assists++;
            break;
        case 'shot_on_goal':
            appState.players[playerIndex].stats.shotOnGoal++;
            break;
        case 'save':
            appState.players[playerIndex].stats.saves++;
            break;
        case 'goal_allowed':
            appState.players[playerIndex].stats.goalsAllowed++;
            appState.currentGame.awayScore++;
            document.getElementById('away-score').textContent = appState.currentGame.awayScore;
            break;
        case 'blocked_shot':
            appState.players[playerIndex].stats.blockedShots++;
            break;
        case 'fault':
            appState.players[playerIndex].stats.faults++;
            break;
        case 'yellow_card':
            appState.players[playerIndex].stats.yellowCards++;
            break;
        case 'red_card':
            appState.players[playerIndex].stats.redCards++;
            break;
        case 'own_goal':
            appState.players[playerIndex].stats.ownGoals++;
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
    
    // Update stats display - check what stats are visible in the current layout
    const statValues = document.querySelectorAll(`.player-grid-item[data-player-id="${playerId}"] .stat-value`);
    if (statValues && statValues.length > 0) {
        // Update visible stats in order
        if (statValues[0]) statValues[0].textContent = player.stats.goals || 0;
        if (statValues[1]) statValues[1].textContent = player.stats.assists || 0;
        if (statValues[2]) statValues[2].textContent = player.stats.saves || 0;
        if (statValues[3]) statValues[3].textContent = player.stats.goalsAllowed || 0;
        if (statValues[4]) statValues[4].textContent = player.stats.shotOnGoal || 0;
    } else {
        // Fallback to re-rendering the entire player grid if we can't find stat elements
        renderPlayerGrid();
    }
}

function closePlayerActionDialog() {
    DialogManager.hide('player-action-dialog');
    appState.currentPlayer = null;
}

function calculateGameMinute() {
    if (!appState.currentGame || !appState.currentGame.startTime) return 0;
    
    const startTime = appState.currentGame.startTime instanceof Date 
        ? appState.currentGame.startTime 
        : new Date(appState.currentGame.startTime);
    
    const elapsed = getElapsedGameTime();
    return elapsed;
}