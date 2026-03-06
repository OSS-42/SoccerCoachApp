/**
 * FormationScreen.js
 * Encapsulates all formation setup screen rendering and drag-and-drop logic
 * Version: 1.9.81
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
            slot.draggable = false;
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
                <span class="player-number ${shouldDisable ? 'disabled' : ''}" draggable="${!shouldDisable}" data-player-id="${player.id}">${player.jerseyNumber}</span>
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
                        <span class="player-number player-number-placed" draggable="true" data-player-id="${playerId}">${player.jerseyNumber}</span>
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
        this._setupDragAndDrop();
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
    _setupDragAndDrop() {
        const numbers = document.querySelectorAll('.player-number');
        numbers.forEach(number => {
            if (!number.hasAttribute('data-events-setup')) {
                number.addEventListener('dragstart', (e) => dragStart(e));
                number.addEventListener('touchstart', (e) => touchStart(e), { passive: false });
                number.addEventListener('touchmove', (e) => touchMove(e), { passive: false });
                number.addEventListener('touchend', (e) => touchEnd(e));
                number.addEventListener('click', (e) => handleTapPlayer(e));
                number.setAttribute('data-events-setup', 'true');
            }
        });

        const slots = document.querySelectorAll('.player-slot, .unavailable-slot');
        slots.forEach(slot => {
            slot.removeEventListener('dragover', (e) => dragOver(e));
            slot.removeEventListener('drop', (e) => dropToSlot(e));
            slot.addEventListener('dragover', (e) => dragOver(e));
            slot.addEventListener('drop', (e) => dropToSlot(e));
            slot.addEventListener('click', (e) => handleTapSlot(e));
        });

        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.removeEventListener('dragover', (e) => dragOver(e));
            playerList.removeEventListener('drop', (e) => dropToSidebar(e));
            playerList.addEventListener('dragover', (e) => dragOver(e));
            playerList.addEventListener('drop', (e) => dropToSidebar(e));

            // allow tap-to-remove: if a player is selected and user taps sidebar
            playerList.addEventListener('click', (e) => {
                if (!TapState.playerId) return;
                if (TapState.source === 'field' || TapState.source === 'unavailable') {
                    const fakeEvt = {
                        preventDefault() {},
                        dataTransfer: {
                            getData(key) {
                                if (key === 'playerId') return TapState.playerId;
                                if (key === 'source') return TapState.source;
                                if (key === 'slotId') return TapState.slotId || '';
                                return '';
                            }
                        },
                        target: playerList
                    };
                    dropToSidebar(fakeEvt);
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

// Drag event: Player starts being dragged
function dragStart(e) {
    e.dataTransfer.setData('playerId', e.target.getAttribute('data-player-id'));
    e.dataTransfer.setData('source', e.target.classList.contains('player-number-placed') ? 'field' : 'sidebar');
    e.dataTransfer.setData('slotId', e.target.parentElement.id || '');

    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.textContent = e.target.textContent;
    dragImage.style.position = 'absolute';
    dragImage.style.width = '72px';
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
    e.dataTransfer.setDragImage(dragImage, 36, 36);
    setTimeout(() => {
        document.body.removeChild(dragImage);
    }, 0);
}

// Drag over: Allow dropping on slots
function dragOver(e) {
    e.preventDefault();
}

// Drop to slot: Player placed on formation field
function dropToSlot(e) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const source = e.dataTransfer.getData('source');
    const slotId = e.dataTransfer.getData('slotId');
    const player = getTeamPlayers().find(p => p.id === playerId);
    if (!player) return;

    const slot = e.target.closest('.player-slot, .unavailable-slot');
    if (!slot) return;

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
        sidebarPlayerNum.draggable = true;
    }

    // Remove from unavailable list temporarily
    let unavailableList = [...getUnavailablePlayers()];
    unavailableList = unavailableList.filter(id => id !== playerId);

    // Check if this is unavailable slot
    if (slot.classList.contains('unavailable-slot')) {
        // Add to unavailable list
        unavailableList.push(playerId);
        setUnavailablePlayers(unavailableList);
        
        // Place in unavailable slot
        slot.innerHTML = `<span class="player-number" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
        slot.setAttribute('data-player-id', playerId);
        
        // Disable in sidebar
        if (sidebarPlayerNum) {
            sidebarPlayerNum.classList.add('disabled');
            sidebarPlayerNum.draggable = false;
        }
        return;
    }

    // Regular field slot
    setUnavailablePlayers(unavailableList);
    
    const position = slot.getAttribute('data-position');
    const formation = getFormationTemp() || [];
    
    // Check if player already exists in formation and remove
    const updatedFormation = formation.filter(f => f.playerId !== playerId);
    
    // Add/update player to formation
    updatedFormation.push({
        playerId,
        position,
        x: parseFloat(slot.style.left),
        y: parseFloat(slot.style.top)
    });
    setFormationTemp(updatedFormation);

    // Update slot UI
    slot.innerHTML = `<span class="player-number player-number-placed" draggable="true" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
    slot.setAttribute('data-player-id', playerId);
    slot.classList.add('occupied');

    // Disable player in sidebar
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.add('disabled');
        sidebarPlayerNum.draggable = false;
    }

    // Reattach drag listeners to placed players and setup click handlers
    const placedNumbers = document.querySelectorAll('.player-number-placed');
    placedNumbers.forEach(num => {
        num.removeEventListener('dragstart', dragStart);
        num.removeEventListener('click', handleTapPlayer);
        num.addEventListener('dragstart', dragStart);
        num.addEventListener('click', handleTapPlayer);
    });
}

// Drop to sidebar: Remove player from formation
function dropToSidebar(e) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    const source = e.dataTransfer.getData('source');
    const slotId = e.dataTransfer.getData('slotId');
    
    // Only allow removing from field
    if (source === 'sidebar') return;

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

    // Re-enable player in sidebar
    const playerNum = document.querySelector(`.player-number[data-player-id="${playerId}"]`);
    if (playerNum) {
        playerNum.classList.remove('disabled');
        playerNum.draggable = true;
        // Re-attach event listeners
        playerNum.removeEventListener('dragstart', dragStart);
        playerNum.removeEventListener('click', handleTapPlayer);
        playerNum.removeEventListener('touchstart', touchStart);
        playerNum.removeEventListener('touchmove', touchMove);
        playerNum.removeEventListener('touchend', touchEnd);
        
        playerNum.addEventListener('dragstart', (e) => dragStart(e));
        playerNum.addEventListener('click', (e) => handleTapPlayer(e));
        playerNum.addEventListener('touchstart', (e) => touchStart(e), { passive: false });
        playerNum.addEventListener('touchmove', (e) => touchMove(e), { passive: false });
        playerNum.addEventListener('touchend', (e) => touchEnd(e));
    }
    
    // Remove from unavailable list if present
    const unavailableList = getUnavailablePlayers().filter(id => id !== playerId);
    setUnavailablePlayers(unavailableList);
}

// ============================================================================
// TOUCH EVENT HANDLERS
// ============================================================================

let draggedElement = null;
let clone = null;
let lastVibratedSlot = null;

function touchStart(e) {
    if (e.target.classList.contains('disabled')) return;
    e.preventDefault();
    draggedElement = e.target;
    const touch = e.targetTouches[0];

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    // Create clone for visual feedback
    clone = draggedElement.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.opacity = '0.7';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '1000';
    clone.style.width = '72px';
    clone.style.height = '72px';
    clone.style.lineHeight = '72px';
    clone.style.fontSize = '36px';
    clone.style.borderRadius = '50%';
    clone.style.background = '#000';
    clone.style.color = '#fff';
    document.body.appendChild(clone);
    updateClonePosition(touch.clientX, touch.clientY);
}

function touchMove(e) {
    if (!draggedElement) return;
    e.preventDefault();
    const touch = e.targetTouches[0];
    updateClonePosition(touch.clientX, touch.clientY);

    // Haptic feedback when over slot
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = dropTarget?.closest('.player-slot');
    if (slot && slot !== lastVibratedSlot) {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        lastVibratedSlot = slot;
    } else if (!slot) {
        lastVibratedSlot = null;
    }
}

function updateClonePosition(clientX, clientY) {
    if (clone) {
        clone.style.left = `${clientX - 36}px`;
        clone.style.top = `${clientY - 36}px`;
    }
}

function touchEnd(e) {
    if (!draggedElement) return;
    e.preventDefault();

    if (clone) {
        document.body.removeChild(clone);
        clone = null;
    }

    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const playerId = draggedElement.getAttribute('data-player-id');
    const source = draggedElement.classList.contains('player-number-placed') ? 'field' : 'sidebar';
    const slotId = draggedElement.parentElement.id || '';

    const slot = dropTarget?.closest('.player-slot, .unavailable-slot');
    if (slot) {
        const fakeEvent = {
            preventDefault() {},
            dataTransfer: {
                getData(key) {
                    if (key === 'playerId') return playerId;
                    if (key === 'source') return source;
                    if (key === 'slotId') return slotId;
                    return '';
                }
            },
            target: slot
        };
        if (slot.classList.contains('unavailable-slot')) {
            dropToSlot(fakeEvent);
        } else {
            dropToSlot(fakeEvent);
        }
    }

    draggedElement = null;
}

// ============================================================================
// TAP-TO-SELECT HANDLERS
// ============================================================================

function handleTapPlayer(e) {
    e.stopPropagation();
    const playerId = e.target.getAttribute('data-player-id');
    
    // If tapping same player, deselect
    if (TapState.playerId === playerId) {
        TapState.clear();
        document.querySelectorAll('.player-number').forEach(num => {
            num.style.outline = 'none';
        });
        return;
    }

    // Select this player
    TapState.playerId = playerId;
    TapState.source = e.target.classList.contains('player-number-placed') ? 'field' : 'sidebar';
    TapState.slotId = e.target.parentElement.id || '';

    // Visual feedback
    document.querySelectorAll('.player-number').forEach(num => {
        num.style.outline = num === e.target ? '3px solid #4CAF50' : 'none';
    });
}

function handleTapSlot(e) {
    e.stopPropagation();
    const slot = e.currentTarget;
    
    // If no player selected, do nothing
    if (!TapState.playerId) return;

    // Create fake event to reuse drop logic
    const fakeEvent = {
        preventDefault() {},
        dataTransfer: {
            getData(key) {
                if (key === 'playerId') return TapState.playerId;
                if (key === 'source') return TapState.source;
                if (key === 'slotId') return TapState.slotId;
                return '';
            }
        },
        target: slot
    };

    dropToSlot(fakeEvent);
    TapState.clear();
    
    // Clear visual feedback
    document.querySelectorAll('.player-number').forEach(num => {
        num.style.outline = 'none';
    });
}

// Expose globally
window.FormationScreen = FormationScreen;
