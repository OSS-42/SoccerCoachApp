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
                <span class="player-number ${shouldDisable ? 'disabled' : ''}" data-player-id="${player.id}">
                    <span class="jersey-num">${player.jerseyNumber}</span>
                    <span class="player-name-bench">${player.name}</span>
                </span>
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
                    slotElement.innerHTML = `<span class="player-number player-number-placed" data-player-id="${playerId}"><span class="jersey-num">${player.jerseyNumber}</span><span class="player-name-field">${player.name}</span></span>`;
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
        console.log('🔗 _setupTapHandlers() called');
        
        // Remove old listeners first - BOTH click and touch events
        document.querySelectorAll('.player-number, .player-number-placed').forEach(el => {
            el.removeEventListener('click', handleTapPlayer);
            el.removeEventListener('touchstart', handleTapPlayer);
        });
        document.querySelectorAll('.player-slot, .unavailable-slot').forEach(el => {
            el.removeEventListener('click', handleTapSlot);
            el.removeEventListener('touchstart', handleTapSlot);
        });

        // Re-attach handlers for all player numbers (sidebar + placed)
        const allPlayerNumbers = document.querySelectorAll('.player-number, .player-number-placed');
        console.log(`   📌 Found ${allPlayerNumbers.length} player number elements`);
        allPlayerNumbers.forEach((number, idx) => {
            // Add BOTH click and touch event handlers for mobile compatibility
            number.addEventListener('click', handleTapPlayer, { passive: false });
            number.addEventListener('touchstart', handleTapPlayer, { passive: false });
            if (idx < 3) console.log(`      [${idx}] ${number.getAttribute('data-player-id')} - click+touch listeners added`);
        });

        // RE-ATTACH handlers for all slots (field + unavailable)
        const slots = document.querySelectorAll('.player-slot, .unavailable-slot');
        console.log(`   🎯 Found ${slots.length} slot elements (20 field + 5 unavailable)`);
        slots.forEach((slot, idx) => {
            slot.style.cursor = 'pointer';
            slot.style.pointerEvents = 'auto';
            slot.style.touchAction = 'none';  /* Prevent touch scrolling on slots */
            // Add BOTH click and touch event handlers for mobile compatibility
            slot.addEventListener('click', handleTapSlot, { passive: false });
            slot.addEventListener('touchstart', handleTapSlot, { passive: false });
            if (idx < 3 || idx >= slots.length - 3) {
                console.log(`      [${idx}] ${slot.getAttribute('data-position') || slot.id} - position: ${slot.style.position || 'auto'}, click+touch listeners added`);
            }
        });

        // Setup sidebar tap-to-remove functionality
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.removeEventListener('click', handleSidebarTap);
            playerList.removeEventListener('touchstart', handleSidebarTap);
            playerList.addEventListener('click', handleSidebarTap, { passive: false });
            playerList.addEventListener('touchstart', handleSidebarTap, { passive: false });
            console.log(`   ✓ Sidebar listener attached (click + touch)`);
        }
        
        console.log(`✅ Event listeners setup complete! (${allPlayerNumbers.length} player + ${slots.length} slot handlers)`);
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
    const eventType = e.type;  // 'click', 'touchstart', etc.
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    
    let targetElement = e.target || e.currentTarget;
    const originalTarget = targetElement;
    
    console.log(`👆 handleTapPlayer fired [${eventType}]. Original target: ${targetElement.className}`);
    
    // For touch events, find the element at the touch point (more accurate than e.target)
    if (eventType.includes('touch') && e.touches?.length > 0) {
        const touch = e.touches[0];
        const touchedEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (touchedEl && (touchedEl.classList.contains('player-number') || touchedEl.classList.contains('player-number-placed'))) {
            targetElement = touchedEl;
            console.log(`   Touch event: corrected target to: ${targetElement.className}`);
        }
    }
    
    // Ensure we have a player-number or player-number-placed element
    if (!targetElement.classList.contains('player-number') && 
        !targetElement.classList.contains('player-number-placed')) {
        console.log(`   Searching for closest .player-number or .player-number-placed...`);
        targetElement = targetElement.closest('.player-number, .player-number-placed');
        if (targetElement) {
            console.log(`   Found via closest(): ${targetElement.className}`);
        }
    }
    
    if (!targetElement) {
        console.warn('⚠️ handleTapPlayer: Could not find player element');
        return;
    }
    
    const playerId = targetElement.getAttribute('data-player-id');
    if (!playerId) {
        console.warn('⚠️ handleTapPlayer: playerId not found on element', {
            elementClass: targetElement.className,
            element: targetElement
        });
        return;
    }
    
    console.log(`✓ Found player: ${playerId} on element: ${targetElement.className}`);
    
    // Check if this is a placed player on field
    const isPlaced = targetElement.classList.contains('player-number-placed');
    const isDisabled = targetElement.classList.contains('disabled');
    
    console.log(`   Placed on field: ${isPlaced}, Disabled: ${isDisabled}`);
    
    // If tapping same player that's already selected, deselect
    if (TapState.playerId === playerId) {
        console.log(`🔄 Player ${playerId} already selected - deselecting`);
        clearSelectionFully();
        return;
    }

    // Determine source (where the player is coming from)
    let source = 'sidebar';
    if (isPlaced) {
        source = 'field';
    } else if (isDisabled) {
        // Check if player is in unavailable slot or just in sidebar but disabled
        const inUnavailableSlot = targetElement.closest('.unavailable-slot');
        if (inUnavailableSlot) {
            source = 'unavailable';
        } else {
            // Player is disabled in sidebar (on field or unavailable)
            source = 'field';
        }
    }

    // Select this player
    TapState.playerId = playerId;
    TapState.source = source;
    TapState.slotId = targetElement.parentElement?.id || '';

    console.log(`✅ SELECTED Player ${playerId} from ${source}`);
    console.log(`   TapState:`, { playerId: TapState.playerId, source: TapState.source });

    // Visual feedback
    clearSelection();
    targetElement.classList.add('tap-selected');
    console.log(`   ✓ Added tap-selected class`);
    showMessage(`Player #${playerId} selected - tap a spot to place`, 'info');
}

/**
 * Handle slot tap - place selected player or swap with existing player
 */
function handleTapSlot(e) {
    // Handle both touch and click events
    const eventType = e.type;  // 'click', 'touchstart', 'touchend'
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    
    // For touch events, get the touched element, otherwise use click target
    let slotElement = e.currentTarget;
    if (eventType.includes('touch') && e.touches?.length > 0) {
        const touch = e.touches[0];
        const touchedEl = document.elementFromPoint(touch.clientX, touch.clientY);
        if (touchedEl?.classList.contains('player-slot') || touchedEl?.classList.contains('unavailable-slot')) {
            slotElement = touchedEl;
        }
    }
    
    const position = slotElement?.getAttribute?.('data-position') || slotElement?.getAttribute?.('id') || 'unknown';
    
    console.log(`🎯 Slot tapped! [${eventType}]`);
    console.log(`   Position: ${position}`);
    console.log(`   Class: ${slotElement.className}`);
    console.log(`   Is a player-slot: ${slotElement.classList.contains('player-slot')}`);
    console.log(`   Is unavailable-slot: ${slotElement.classList.contains('unavailable-slot')}`);
    console.log(`   TapState object:`, TapState);
    console.log(`   TapState.playerId: ${TapState.playerId}`);
    
    // If no player is selected, show hint
    if (!TapState.playerId) {
        console.log('💡 No player selected. TapState is:', TapState);
        console.log('💡 Tap a player jersey first (should see green outline), then tap a spot.');
        showMessage('Tap a player first!', 'warning');
        return;
    }
    
    // Get slot ID (could be data-position or id)
    const slotId = slotElement.getAttribute('data-position') || slotElement.id;
    console.log(`   Slot ID to place in: ${slotId}`);
    
    // Check if slot already has a player (for swapping)
    const existingPlayer = findPlayerAtPosition(slotId);
    console.log(`   Existing player at slot: ${existingPlayer ? existingPlayer.id : 'NONE'}`);
    
    // Only swap if there is an existing player AND it's not the same player we're placing
    if (existingPlayer && existingPlayer.id !== TapState.playerId) {
        console.log(`🔄 SWAP MODE: Player ${existingPlayer.id} at ${slotId}, will swap with ${TapState.playerId}`);
        // Find where the selected player currently is
        const selectedPlayerPosition = findPositionOfPlayer(TapState.playerId);
        console.log(`   Selected player ${TapState.playerId} is currently at: ${selectedPlayerPosition}`);
        
        if (selectedPlayerPosition) {
            // Move existing player to selected player's position
            console.log(`   → Moving ${existingPlayer.id} to ${selectedPlayerPosition}`);
            movePlayerToPosition(existingPlayer.id, selectedPlayerPosition);
        }
        
        // Move selected player to this slot
        console.log(`   → Moving ${TapState.playerId} to ${slotId}`);
        movePlayerToPosition(TapState.playerId, slotId);
        showMessage(`Players swapped!`, 'success');
    } else {
        // Normal placement (no swap)
        console.log(`📍 PLACING player ${TapState.playerId} from ${TapState.source} to position ${slotId}`);
        
        // Place or move the selected player to this slot
        try {
            console.log('   → Calling placePlayerToSlot()...');
            placePlayerToSlot(TapState.playerId, slotElement);
            console.log('✅ Placement successful!');
            showMessage('Player placed!', 'success');
        } catch (err) {
            console.error('❌ Placement failed:', err);
            console.error('   Stack:', err.stack);
            showMessage('Placement failed!', 'error');
        }
    }
    
    clearSelectionFully();
}

/**
 * Handle sidebar tap to remove players from field/unavailable
 */
function handleSidebarTap(e) {
    // Prevent propagation for touch events too
    if (e.type.includes('touch')) {
        e.preventDefault();
    }
    
    // If no player is selected from field/unavailable, nothing to remove
    if (!TapState.playerId || TapState.source === 'sidebar') {
        return;
    }
    
    // Check if click/tap is within the sidebar area (not on another player)
    const sidebarElement = e.currentTarget || e.target;
    const isClickInSidebar = e.target.classList.contains('player-list') || 
                             e.target.closest('.player-list');
    
    if (!isClickInSidebar) {
        return;
    }
    
    console.log(`🔙 REMOVE: User tapped sidebar to move player ${TapState.playerId} back to bench`);
    console.log(`   Player was from: ${TapState.source}`);
    removePlayerFromSlot(TapState.playerId);
    showMessage('Player moved back to bench!', 'success');
    clearSelectionFully();
}

/**
 * Clear all selection visual feedback (removes outline from other players, but PRESERVES TapState)
 */
function clearSelection() {
    document.querySelectorAll('.player-number, .player-number-placed').forEach(num => {
        num.classList.remove('tap-selected');
    });
    // NOTE: Do NOT call TapState.clear() here - we need to preserve the selected player state
    // TapState should only be cleared after successful placement or when user explicitly deselects
}

/**
 * Fully clear selection (visual + state) when resetting
 */
function clearSelectionFully() {
    document.querySelectorAll('.player-number, .player-number-placed').forEach(num => {
        num.classList.remove('tap-selected');
    });
    TapState.clear();
}

// ============================================================================
// PLACE & REMOVE PLAYER FUNCTIONS
// ============================================================================

/**
 * Find which position a player is currently at (field or unavailable slot)
 */
function findPositionOfPlayer(playerId) {
    // Check field spots
    const fieldSpots = document.querySelectorAll('[data-position]');
    for (const spot of fieldSpots) {
        const playerNum = spot.querySelector('.player-number-placed');
        if (playerNum && playerNum.dataset.playerId === playerId) {
            return spot.getAttribute('data-position');
        }
    }
    
    // Check unavailable slots
    const unavailableSpots = document.querySelectorAll('.unavailable-slot');
    for (const spot of unavailableSpots) {
        const playerNum = spot.querySelector('.player-number');
        if (playerNum && playerNum.dataset.playerId === playerId) {
            return spot.id;  // Return the slot ID (e.g., 'unavailable-slot-1')
        }
    }
    
    return null;
}

/**
 * Find which player is at a specific position (field or unavailable slot)
 */
function findPlayerAtPosition(position) {
    // Check field spots
    const fieldSpot = document.querySelector(`[data-position="${position}"]`);
    if (fieldSpot) {
        const playerNum = fieldSpot.querySelector('.player-number-placed');
        if (playerNum) {
            const playerId = playerNum.dataset.playerId;
            return getTeamPlayers().find(p => p.id === playerId) || null;
        }
    }
    
    // Check unavailable slots (position is like 'unavailable-slot-1')
    const unavailableSpot = document.getElementById(position);
    if (unavailableSpot) {
        const playerNum = unavailableSpot.querySelector('.player-number');
        if (playerNum) {
            const playerId = playerNum.dataset.playerId;
            return getTeamPlayers().find(p => p.id === playerId) || null;
        }
    }
    
    return null;
}

/**
 * Move a player to a specific position (helper for swap)
 */
function movePlayerToPosition(playerId, position) {
    // Try to find field spot first
    let spot = document.querySelector(`[data-position="${position}"]`);
    
    // If not found, try unavailable slot
    if (!spot) {
        spot = document.getElementById(position);
    }
    
    if (spot) {
        placePlayerToSlot(playerId, spot);
    } else {
        console.error(`Cannot move player ${playerId}: position ${position} not found`);
    }
}

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
 * Place player in unavailable slot (on the bench)
 */
function placePlayerInUnavailable(playerId, slotElement, player) {
    console.log(`   👉 placePlayerInUnavailable: ${player.name}(${player.jerseyNumber}) to bench`);
    
    // Add to unavailable list
    const unavailableList = getUnavailablePlayers();
    if (!unavailableList.includes(playerId)) {
        unavailableList.push(playerId);
        setUnavailablePlayers(unavailableList);
    }

    // Update slot with jersey number AND player name
    slotElement.innerHTML = `
        <span class="player-number" data-player-id="${playerId}">
            <span class="jersey-num">${player.jerseyNumber}</span>
            <span class="player-name-bench">${player.name}</span>
        </span>
    `;
    slotElement.setAttribute('data-player-id', playerId);
    console.log(`   ✓ Updated unavailable slot with player ${playerId}`);

    // Disable in sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.add('disabled');
        console.log(`   ✓ Disabled sidebar player ${playerId}`);
    }
}

/**
 * Place player on field slot
 */
function placePlayerOnField(playerId, slotElement, player) {
    const position = slotElement.getAttribute('data-position');
    console.log(`   👉 placePlayerOnField: ${player.name}(${player.jerseyNumber}) to position ${position}`);
    
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
    console.log(`   ✓ Added to formation: ${position}`);

    // Update slot with jersey number AND player name
    slotElement.innerHTML = `
        <span class="player-number player-number-placed" data-player-id="${playerId}">
            <span class="jersey-num">${player.jerseyNumber}</span>
            <span class="player-name-field">${player.name}</span>
        </span>
    `;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');
    console.log(`   ✓ Occupied field slot, updated with player name`);

    // Disable in sidebar
    const sidebarPlayerNum = document.querySelector(`.player-list [data-player-id="${playerId}"]`);
    if (sidebarPlayerNum) {
        sidebarPlayerNum.classList.add('disabled');
        console.log(`   ✓ Disabled sidebar player ${playerId}`);
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
