/**
 * FormationScreen.js - Formation Setup Screen
 * Handles rendering field, players, and tap-to-select placement logic
 */

const FormationScreen = {
    /**
     * Main render function - builds entire formation screen UI
     */
    renderFormationSetup() {
        const playerList = document.getElementById('player-list');
        const formationField = document.getElementById('formation-field');
        const unavailableSlots = document.getElementById('unavailable-slots');
        const unavailablePlayers = document.getElementById('unavailable-players');
        
        if (!playerList || !formationField || !unavailableSlots || !unavailablePlayers) {
            console.error('❌ Formation screen DOM elements not found:', {playerList: !!playerList, formationField: !!formationField, unavailableSlots: !!unavailableSlots, unavailablePlayers: !!unavailablePlayers});
            return;
        }
        
        console.log('✅ All DOM elements found');
        
        // Clear all content
        playerList.innerHTML = '';
        formationField.innerHTML = '';
        unavailableSlots.innerHTML = '';
        
        // Reset state
        setUnavailablePlayers([]);
        if (appState.defaultFormation && appState.defaultFormation.length > 0) {
            setFormationTemp([...appState.defaultFormation]);
        } else {
            setFormationTemp([]);
        }

        // ============================================================================
        // STEP 1: Render all 25 field spots (CRITICAL - must happen first)
        // ============================================================================
        const fieldSpots = this._getFieldSpots();
        console.log(`📌 Rendering ${fieldSpots.length} field spots...`);
        
        fieldSpots.forEach(spot => {
            const slot = document.createElement('div');
            
            // Add appropriate classes
            let classNames = 'player-slot';
            if (spot.position === 'GK') classNames += ' gk-slot';
            else if (spot.position === 'SW') classNames += ' sw-slot';
            
            slot.className = classNames;
            slot.setAttribute('data-position', spot.position);
            slot.style.position = 'absolute';
            slot.style.left = `${spot.x}%`;
            slot.style.top = `${spot.y}%`;
            
            formationField.appendChild(slot);
        });
        
        console.log(`✅ Created ${formationField.querySelectorAll('.player-slot').length} spots on field`);

        // ============================================================================
        // STEP 2: Render available players in sidebar
        // ============================================================================
        const teamPlayers = getTeamPlayers();
        console.log(`👥 Found ${teamPlayers.length} team players`);
        
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
        
        console.log(`✅ Created ${playerList.querySelectorAll('.player-item-draggable').length} player items in sidebar`);

        // ============================================================================
        // STEP 3: Create 5 unavailable slots
        // ============================================================================
        for (let i = 1; i <= 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'unavailable-slot';
            slot.id = `unavailable-slot-${i}`;
            unavailableSlots.appendChild(slot);
        }
        
        console.log(`✅ Created 5 unavailable slots`);

        // ============================================================================
        // STEP 4: Restore previously placed players to field/unavailable
        // ============================================================================
        let playersPlaced = 0;
        (getFormationTemp() || []).forEach(formationPlayer => {
            const playerId = formationPlayer.playerId;
            const position = formationPlayer.position;
            const player = getTeamPlayers().find(p => p.id === playerId);
            
            if (player && position) {
                const slotElement = document.querySelector(`[data-position="${position}"]`);
                if (slotElement) {
                    slotElement.innerHTML = `<span class="player-number player-number-placed" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
                    slotElement.setAttribute('data-player-id', playerId);
                    slotElement.classList.add('occupied');
                    playersPlaced++;
                }
            }
        });
        
        if (playersPlaced > 0 && appState.defaultFormation) {
            showMessage(`Default formation loaded: ${playersPlaced} players placed`, 'success');
        }
        
        console.log(`✅ Formation screen fully rendered - ${playersPlaced} players placed`);

        // ============================================================================
        // STEP 5: Attach all event handlers
        // ============================================================================
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
     * Setup tap-to-select event listeners
     * @private
     */
    _setupTapHandlers() {
        // Setup handlers for all player numbers (sidebar + placed)
        const allPlayerNumbers = document.querySelectorAll('.player-number, .player-number-placed');
        allPlayerNumbers.forEach(number => {
            number.removeEventListener('click', handleTapPlayer);
            number.addEventListener('click', handleTapPlayer, { passive: false });
        });

        // Setup handlers for all slots (field + unavailable)
        const slots = document.querySelectorAll('.player-slot, .unavailable-slot');
        slots.forEach(slot => {
            slot.removeEventListener('click', handleTapSlot);
            slot.addEventListener('click', handleTapSlot, { passive: false });
        });

        // Setup sidebar tap-to-remove functionality
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.removeEventListener('click', handleSidebarTap);
            playerList.addEventListener('click', handleSidebarTap);
        }
    }
};

// ============================================================================
// GLOBAL STATE FOR TAP-TO-SELECT FUNCTIONALITY
// ============================================================================

const TapState = {
    playerId: null,
    source: null, // 'field', 'sidebar', 'unavailable', or 'placed'
    slotId: null,
    
    clear() {
        this.playerId = null;
        this.source = null;
        this.slotId = null;
    }
};

// ============================================================================
// TAP-TO-SELECT HANDLERS
// ============================================================================

/**
 * Handle player number tap - select/deselect player
 */
function handleTapPlayer(e) {
    e.preventDefault();
    e.stopPropagation();
    
    let targetElement = e.target || e.currentTarget;
    
    // Ensure we have the player-number element
    if (!targetElement.classList.contains('player-number') && 
        !targetElement.classList.contains('player-number-placed')) {
        targetElement = targetElement.closest('.player-number, .player-number-placed');
    }
    
    if (!targetElement) {
        console.warn('⚠️ handleTapPlayer: targetElement not found');
        return;
    }
    
    const playerId = targetElement.getAttribute('data-player-id');
    if (!playerId) {
        console.warn('⚠️ handleTapPlayer: playerId not found on element');
        return;
    }
    
    console.log(`👆 Player tapped: ${playerId}`);
    
    // If tapping same player, deselect
    if (TapState.playerId === playerId) {
        console.log(`🔄 Player ${playerId} already selected - deselecting`);
        clearSelection();
        return;
    }

    // Determine source
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
    clearSelection();
    targetElement.classList.add('tap-selected');
    console.log(`✅ Player ${playerId} selected from ${source}. Ready to place on field.`);
}

/**
 * Handle slot tap - place selected player or clear slot
 */
function handleTapSlot(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const slotElement = e.currentTarget;
    const position = slotElement.getAttribute('data-position');
    
    console.log(`🎯 Slot tapped at position: ${position}, TapState.playerId: ${TapState.playerId}`);
    
    // If no player is selected, show hint
    if (!TapState.playerId) {
        console.log('💡 No player selected. Tap a player jersey first, then tap a spot.');
        return;
    }
    
    console.log(`📍 Placing player ${TapState.playerId} to position ${position}`);
    
    // Place or move the selected player to this slot
    placePlayerToSlot(TapState.playerId, slotElement);
    clearSelection();
}

/**
 * Handle sidebar tap to remove players from field/unavailable
 */
function handleSidebarTap(e) {
    // If a player is selected and user taps sidebar (not on a player)
    if (!TapState.playerId) return;
    if (TapState.source === 'sidebar') return;
    if (!e.target.classList.contains('player-list')) return;
    
    removePlayerFromSlot(TapState.playerId);
    clearSelection();
}

/**
 * Clear all selection visual feedback
 */
function clearSelection() {
    document.querySelectorAll('.player-number, .player-number-placed').forEach(num => {
        num.classList.remove('tap-selected');
    });
    TapState.clear();
}

// ============================================================================
// PLACE & REMOVE PLAYER FUNCTIONS
// ============================================================================

/**
 * Place player in a slot (field or unavailable)
 */
function placePlayerToSlot(playerId, slotElement) {
    const player = getTeamPlayers().find(p => p.id === playerId);
    if (!player || !slotElement) {
        console.error(`❌ Cannot place player: player=${!!player}, slot=${!!slotElement}`);
        return;
    }
    
    console.log(`🔄 placePlayerToSlot called: player=${player.name}(${player.jerseyNumber}), slot=${slotElement.getAttribute('data-position')}`);

    // Remove player from ALL locations first
    removePlayerFromAllLocations(playerId);

    // Check if target is unavailable slot
    if (slotElement.classList.contains('unavailable-slot')) {
        console.log(`   → Adding to unavailable`);
        placePlayerInUnavailable(playerId, slotElement, player);
    } else {
        console.log(`   → Adding to field position`);
        placePlayerOnField(playerId, slotElement, player);
    }
    
    console.log(`✅ Player placed successfully`);
    
    // Re-setup event handlers after changes
    FormationScreen._setupTapHandlers();
}

/**
 * Remove player from all locations (field, unavailable, sidebar)
 */
function removePlayerFromAllLocations(playerId) {
    // Clear all field slots
    document.querySelectorAll('.player-slot').forEach(s => {
        if (s.getAttribute('data-player-id') === playerId) {
            s.innerHTML = '';
            s.removeAttribute('data-player-id');
            s.classList.remove('occupied');
        }
    });

    // Clear all unavailable slots
    document.querySelectorAll('.unavailable-slot').forEach(s => {
        if (s.getAttribute('data-player-id') === playerId) {
            s.innerHTML = '';
            s.removeAttribute('data-player-id');
        }
    });

    // Clear sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.remove('disabled');
    }

    // Update state
    const unavailableList = getUnavailablePlayers().filter(id => id !== playerId);
    setUnavailablePlayers(unavailableList);

    const formation = (getFormationTemp() || []).filter(f => f.playerId !== playerId);
    setFormationTemp(formation);
}

/**
 * Place player in unavailable slot
 */
function placePlayerInUnavailable(playerId, slotElement, player) {
    // Add to unavailable list
    const unavailableList = getUnavailablePlayers();
    if (!unavailableList.includes(playerId)) {
        unavailableList.push(playerId);
        setUnavailablePlayers(unavailableList);
    }

    // Update slot
    slotElement.innerHTML = `<span class="player-number" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
    slotElement.setAttribute('data-player-id', playerId);

    // Disable in sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.add('disabled');
    }
}

/**
 * Place player on field slot
 */
function placePlayerOnField(playerId, slotElement, player) {
    const position = slotElement.getAttribute('data-position');
    const formation = getFormationTemp() || [];
    
    // Update formation
    const updatedFormation = formation.filter(f => f.playerId !== playerId);
    updatedFormation.push({
        playerId,
        position,
        x: parseFloat(slotElement.style.left),
        y: parseFloat(slotElement.style.top)
    });
    setFormationTemp(updatedFormation);

    // Update slot
    slotElement.innerHTML = `<span class="player-number player-number-placed" data-player-id="${playerId}">${player.jerseyNumber}</span>`;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');

    // Disable in sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.add('disabled');
    }
}

/**
 * Remove player from formation/unavailable back to sidebar
 */
function removePlayerFromSlot(playerId) {
    removePlayerFromAllLocations(playerId);

    // Re-enable in sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.remove('disabled');
    }

    // Re-setup handlers
    FormationScreen._setupTapHandlers();
}

// Expose globally
window.FormationScreen = FormationScreen;
