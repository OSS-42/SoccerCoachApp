/**
 * FormationScreen.js
 * Encapsulates all formation setup screen rendering and tap-to-select logic
 * Version: 1.10.22
 */

const FormationScreen = {
    /**
     * Render the formation setup screen with field and player list
     */
    renderFormationSetup() {
        const playerList = document.getElementById('player-list');
        const formationField = document.getElementById('formation-field');
        const unavailableSlots = document.getElementById('unavailable-slots');
        
        if (!playerList || !formationField || !unavailableSlots) return;
        
        playerList.innerHTML = '';
        formationField.innerHTML = '';
        unavailableSlots.innerHTML = '';
        
        // Initialize unavailable players array (clear for new setup)
        setUnavailablePlayers([]);
        
        // Initialize formation temp based on global default if present
        if (appState.defaultFormation && appState.defaultFormation.length > 0) {
            setFormationTemp([...appState.defaultFormation]);
        } else {
            setFormationTemp([]);
        }

        // Define spots for 260x400px field
        const spots = this._getFieldSpots();

        // Render spots
        spots.forEach(spot => {
            const slot = document.createElement('div');
            slot.className = `player-slot ${spot.position === 'GK' ? 'gk-slot' : spot.position === 'SW' ? 'sw-slot' : ''}`;
            slot.id = spot.position === 'GK' ? 'gk-slot' : spot.position === 'SW' ? 'sw-slot' : `slot-${spot.position}`;
            slot.setAttribute('data-position', spot.position);
            slot.style.left = `${spot.x}%`;
            slot.style.top = `${spot.y}%`;
            formationField.appendChild(slot);
        });

        // Render player list using current team's roster
        const teamPlayers = getTeamPlayers();
        const formationTempList = getFormationTemp() || [];
        const unavailableList = getUnavailablePlayers();
        teamPlayers.forEach(player => {
            const isOnField = formationTempList.some(f => f.playerId === player.id);
            const isUnavailable = unavailableList.includes(player.id);
            const shouldDisable = isOnField || isUnavailable;
            
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item-draggable';
            playerItem.innerHTML = `
                <span class="player-number ${shouldDisable ? 'disabled' : ''}" data-player-id="${player.id}">${player.jerseyNumber}</span>
                <span class="player-name">${player.name}</span>
            `;
            playerList.appendChild(playerItem);
        });

        // Create unavailable player slots
        for (let i = 1; i <= 5; i++) {
            const unavailableSlot = document.createElement('div');
            unavailableSlot.className = 'unavailable-slot';
            unavailableSlot.id = `unavailable-slot-${i}`;
            unavailableSlot.setAttribute('data-slot-type', 'unavailable');
            unavailableSlots.appendChild(unavailableSlot);
        }

        // Restore formation positions
        let playersPlaced = 0;
        (getFormationTemp() || []).forEach(formationPlayer => {
            const position = formationPlayer.position;
            const playerId = formationPlayer.playerId;
            const player = getTeamPlayers().find(p => p.id === playerId);
            
            if (player) {
                let slotId;
                if (position === 'GK') slotId = 'gk-slot';
                else if (position === 'SW') slotId = 'sw-slot';
                else slotId = `slot-${position}`;
                
                const slot = document.getElementById(slotId);
                if (slot) {
                    slot.innerHTML = `
                        <span class="player-number player-number-placed" data-player-id="${playerId}">${player.jerseyNumber}</span>
                    `;
                    slot.setAttribute('data-player-id', playerId);
                    slot.classList.add('occupied');
                    playersPlaced++;
                }
            }
        });
        
        if (playersPlaced > 0 && appState.defaultFormation && appState.defaultFormation.length > 0) {
            showMessage(`Default formation loaded: ${playersPlaced} players placed`, 'success');
        }

        // Setup drag-and-drop
        this._setupTapHandlers();
    },

    /**
     * Get field spot definitions
     * @private
     * @returns {Array} Array of spot objects with position, x, y coordinates
     */
    _getFieldSpots() {
        return [
            { position: 'GK', x: 50, y: 95 },
            { position: 'SW', x: 50, y: 86.5 },
            { position: 'DEF-1', x: 10, y: 78.5 }, { position: 'DEF-2', x: 30, y: 78.5 },
            { position: 'DEF-3', x: 50, y: 78.5 }, { position: 'DEF-4', x: 70, y: 78.5 },
            { position: 'DEF-5', x: 90, y: 78.5 },
            { position: 'DM-1', x: 10, y: 61.38 }, { position: 'DM-2', x: 30, y: 61.38 },
            { position: 'DM-3', x: 50, y: 61.38 }, { position: 'DM-4', x: 70, y: 61.38 },
            { position: 'DM-5', x: 90, y: 61.38 },
            { position: 'MID-1', x: 10, y: 44.25 }, { position: 'MID-2', x: 30, y: 44.25 },
            { position: 'MID-3', x: 50, y: 44.25 }, { position: 'MID-4', x: 70, y: 44.25 },
            { position: 'MID-5', x: 90, y: 44.25 },
            { position: 'OM-1', x: 10, y: 27.13 }, { position: 'OM-2', x: 30, y: 27.13 },
            { position: 'OM-3', x: 50, y: 27.13 }, { position: 'OM-4', x: 70, y: 27.13 },
            { position: 'OM-5', x: 90, y: 27.13 },
            { position: 'FWD-1', x: 10, y: 10 }, { position: 'FWD-2', x: 30, y: 10 },
            { position: 'FWD-3', x: 50, y: 10 }, { position: 'FWD-4', x: 70, y: 10 },
            { position: 'FWD-5', x: 90, y: 10 }
        ];
    },

    /**
     * Setup drag-and-drop event listeners
     * @private
     */
    _setupTapHandlers() {
        const numbers = document.querySelectorAll('.player-number');
        numbers.forEach(number => {
            if (!number.hasAttribute('data-events-setup')) {
                // Prevent native browser drag behavior
                number.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, { passive: false });
                
                // Handle both click and touch tap
                number.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTapPlayer(e);
                }, { passive: false });
                number.setAttribute('data-events-setup', 'true');
            }
        });

        const slots = document.querySelectorAll('.player-slot, .unavailable-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTapSlot(e);
            }, { passive: false });
            // Add touch support for mobile tap detection
            slot.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                slot.dataset.touchStarted = 'true';
            }, { passive: true });
            slot.addEventListener('touchend', (e) => {
                if (slot.dataset.touchStarted === 'true') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTapSlot(e);
                    delete slot.dataset.touchStarted;
                }
            }, { passive: false });
        });

        const playerList = document.getElementById('player-list');
        if (playerList) {
            // allow tap-to-remove: if a player is selected and user taps sidebar
            playerList.addEventListener('click', (e) => {
                if (!TapState.playerId) return;
                if (TapState.source === 'field' || TapState.source === 'unavailable') {
                    removePlayerFromSlot(TapState.playerId);
                    TapState.clear();
                }
            });
        }
    }
};

// ============================================================================
// DRAG AND DROP EVENT HANDLERS
// ============================================================================

// Global state for tap-to-select functionality
const TapState = {
    playerId: null,
    source: null, // 'field', 'sidebar', or 'unavailable'
    slotId: null,
    
    clear() {
        this.playerId = null;
        this.source = null;
        this.slotId = null;
    }
};



// Place player with tap-to-select
function placePlayerToSlot(playerId, slotElement, source, slotId) {
    const player = getTeamPlayers().find(p => p.id === playerId);
    if (!player) return;

    if (!slotElement) return;

    // First, remove player from all locations (field slots, unavailable slots, sidebar)
    // Remove from all field slots
    document.querySelectorAll('.player-slot').forEach(s => {
        if (s.getAttribute('data-player-id') === playerId) {
            s.innerHTML = '';
            s.removeAttribute('data-player-id');
            s.classList.remove('occupied');
        }
    });

    // Remove from all unavailable slots
    document.querySelectorAll('.unavailable-slot').forEach(s => {
        if (s.getAttribute('data-player-id') === playerId) {
            s.innerHTML = '';
            s.removeAttribute('data-player-id');
        }
    });

    // Remove player from sidebar (only one should exist)
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.remove('disabled');
    }

    // Remove from unavailable list temporarily
    let unavailableList = [...getUnavailablePlayers()];
    unavailableList = unavailableList.filter(id => id !== playerId);

    // Check if this is unavailable slot
    if (slotElement.classList.contains('unavailable-slot')) {
        // Remove from formation if currently on field
        const formation = getFormationTemp() || [];
        const updatedFormation = formation.filter(f => f.playerId !== playerId);
        setFormationTemp(updatedFormation);
        
        // Add to unavailable list
        unavailableList.push(playerId);
        setUnavailablePlayers(unavailableList);
        
        // Place in unavailable slot
        slotElement.innerHTML = `<span class="player-number" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
        slotElement.setAttribute('data-player-id', playerId);
        
        // Disable in sidebar
        if (sidebarPlayerNum) {
            sidebarPlayerNum.classList.add('disabled');
        }
        
        // Reattach tap listeners to unavailable slot player so they can be moved
        const unavailableNum = slotElement.querySelector(`[data-player-id="${playerId}"]`);
        if (unavailableNum) {
            unavailableNum.removeEventListener('click', handleTapPlayer);
            unavailableNum.addEventListener('click', (e) => handleTapPlayer(e), { passive: false });
        }
        return;
    }

    // Regular field slot
    setUnavailablePlayers(unavailableList);
    
    const position = slotElement.getAttribute('data-position');
    const formation = getFormationTemp() || [];
    
    // Check if player already exists in formation and remove
    const updatedFormation = formation.filter(f => f.playerId !== playerId);
    
    // Add/update player to formation
    updatedFormation.push({
        playerId,
        position,
        x: parseFloat(slotElement.style.left),
        y: parseFloat(slotElement.style.top)
    });
    setFormationTemp(updatedFormation);

    // Update slot UI
    slotElement.innerHTML = `<span class="player-number player-number-placed" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');

    // Disable player in sidebar - Keep element but clear content
    const sidebarContainer = document.querySelector('.player-list');
    if (sidebarContainer) {
        const sidebarPlayerItems = sidebarContainer.querySelectorAll('.player-item-draggable');
        sidebarPlayerItems.forEach(playerItem => {
            const playerNum = playerItem.querySelector(`[data-player-id="${playerId}"]`);
            if (playerNum) {
                // Clear the content but keep the element (shows empty bench spot)
                playerItem.innerHTML = '';
                playerItem.classList.add('empty-spot');
            }
        });
    }

    // Setup click handlers for placed players
    const placedNumbers = document.querySelectorAll('.player-number-placed');
    placedNumbers.forEach(num => {
        num.removeEventListener('click', handleTapPlayer);
        num.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleTapPlayer(e);
        }, { passive: false });
    });
}

// Remove player from formation with tap-to-select
function removePlayerFromSlot(playerId) {
    const formation = getFormationTemp() || [];
    const newFormation = formation.filter(f => f.playerId !== playerId);
    setFormationTemp(newFormation);

    // Clear ALL field slots containing this player
    document.querySelectorAll('.player-slot').forEach(slot => {
        if (slot.getAttribute('data-player-id') === playerId) {
            slot.innerHTML = '';
            slot.removeAttribute('data-player-id');
            slot.classList.remove('occupied');
        }
    });

    // Clear ALL unavailable slots containing this player
    document.querySelectorAll('.unavailable-slot').forEach(slot => {
        if (slot.getAttribute('data-player-id') === playerId) {
            slot.innerHTML = '';
            slot.removeAttribute('data-player-id');
        }
    });

    // Remove from unavailable list if present
    const unavailableList = getUnavailablePlayers().filter(id => id !== playerId);
    setUnavailablePlayers(unavailableList);
    
    // Only update the removed player in sidebar - don't rebuild entire sidebar
    const playerList = document.getElementById('player-list');
    if (!playerList) return;
    
    const teamPlayers = getTeamPlayers();
    const removedPlayer = teamPlayers.find(p => p.id === playerId);
    if (!removedPlayer) return;
    
    // Find and update the player item for this specific player
    const playerItems = document.querySelectorAll('.player-item-draggable');
    let playerFound = false;
    
    // First try to find existing player with number span
    playerItems.forEach(item => {
        const numberSpan = item.querySelector('.player-number');
        if (numberSpan && numberSpan.getAttribute('data-player-id') === playerId) {
            playerFound = true;
            // Re-enable the player item: remove disabled class
            numberSpan.classList.remove('disabled');
            
            // Re-attach event listeners to this specific player
            numberSpan.removeEventListener('click', handleTapPlayer);
            numberSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTapPlayer(e);
            }, { passive: false });
        }
    });
    
    // If not found, rebuild from empty-spot items
    if (!playerFound) {
        playerItems.forEach(item => {
            if (item.classList.contains('empty-spot') && !playerFound) {
                // Check if this was the item for this player by checking siblings or by finding the next empty spot
                const html = '<span class="player-number" data-player-id="' + playerId + '">' + removedPlayer.jerseyNumber + '</span><span class="player-name">' + removedPlayer.name + '</span>';
                item.innerHTML = html;
                item.classList.remove('empty-spot');
                
                // Re-attach event listeners to newly created number span
                const newNumberSpan = item.querySelector('.player-number');
                newNumberSpan.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTapPlayer(e);
                }, { passive: false });
                
                playerFound = true;
            }
        });
    }
}



// ============================================================================
// TAP-TO-SELECT HANDLERS
// ============================================================================

function handleTapPlayer(e) {
    // Get the target element (could be the player-number itself)
    let targetElement = e.target || e.currentTarget;
    
    // Ensure we have the player-number element
    if (!targetElement.classList.contains('player-number') && 
        !targetElement.classList.contains('player-number-placed')) {
        targetElement = targetElement.closest('.player-number, .player-number-placed');
    }
    
    if (!targetElement) return;
    
    const playerId = targetElement.getAttribute('data-player-id');
    if (!playerId) return;
    
    // If tapping same player, deselect
    if (TapState.playerId === playerId) {
        TapState.clear();
        document.querySelectorAll('.player-number').forEach(num => {
            num.style.outline = 'none';
        });
        return;
    }

    // Determine source: field, unavailable slot, or sidebar
    let source = 'sidebar';
    if (targetElement.classList.contains('player-number-placed')) {
        source = 'field';
    } else if (targetElement.parentElement?.classList.contains('unavailable-slot')) {
        source = 'unavailable';
    }

    // Select this player
    TapState.playerId = playerId;
    TapState.source = source;
    TapState.slotId = targetElement.parentElement?.id || '';

    // Visual feedback
    document.querySelectorAll('.player-number').forEach(num => {
        num.style.outline = num === targetElement ? '3px solid #4CAF50' : 'none';
    });
}

function handleTapSlot(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    
    // Get the slot element (use closest in case event.currentTarget doesn't work on touch)
    const slot = e.currentTarget?.closest?.('.player-slot, .unavailable-slot') || 
                 e.target?.closest('.player-slot, .unavailable-slot') ||
                 e.currentTarget;
    
    // If no player selected, do nothing
    if (!TapState.playerId) return;

    placePlayerToSlot(TapState.playerId, slot, TapState.source, TapState.slotId);
    TapState.clear();
    
    // Clear visual feedback
    document.querySelectorAll('.player-number').forEach(num => {
        num.style.outline = 'none';
    });
}

// Expose globally
window.FormationScreen = FormationScreen;
