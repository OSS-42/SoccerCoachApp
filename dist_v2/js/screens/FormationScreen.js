/**
 * FormationScreen.js - Formation Setup Screen
 * Handles rendering field, players, and tap-to-select placement logic
 */

const FormationScreen = {
    DESKTOP_FIELD_ASPECT_RATIO: 1.55,

    /**
     * Main render function - builds entire formation screen UI
     */
    renderFormationSetup() {
        const playerList = document.getElementById('player-list');
        const formationField = document.getElementById('formation-field');
        const benchSlots = document.getElementById('bench-slots');
        const unavailableSlots = document.getElementById('unavailable-slots');
        
        if (!playerList || !formationField || !benchSlots || !unavailableSlots) {
            console.error('❌ Formation screen DOM elements not found');
            return;
        }
        
        console.log('✅ All DOM elements found');
        
        // Clear all content
        playerList.innerHTML = '';
        formationField.innerHTML = '';
        benchSlots.innerHTML = '';
        unavailableSlots.innerHTML = '';
        
        // Reset state
        setUnavailablePlayers([]);
        setFormationTemp([]);

        // ============================================================================
        // STEP 1: Render all 25 empty field spots
        // ============================================================================
        const fieldSurface = document.createElement('div');
        fieldSurface.className = 'formation-field-surface';
        formationField.appendChild(fieldSurface);

        const fieldSpots = this._getFieldSpots();
        console.log(`📌 Rendering ${fieldSpots.length} empty field spots...`);
        
        fieldSpots.forEach(spot => {
            const slot = document.createElement('div');
            
            let classNames = 'player-slot';
            if (spot.position === 'GK') classNames += ' gk-slot';
            else if (spot.position === 'SW') classNames += ' sw-slot';
            
            slot.className = classNames;
            slot.setAttribute('data-position', spot.position);
            slot.dataset.baseX = String(spot.x);
            slot.dataset.baseY = String(spot.y);
            slot.style.position = 'absolute';
            slot.style.left = `${spot.x}%`;
            slot.style.top = `${spot.y}%`;
            
            fieldSurface.appendChild(slot);
        });

        this._observeFieldSurface(formationField);
        this._syncFieldSurfaceLayout();
        requestAnimationFrame(() => this._syncFieldSurfaceLayout());
        
        console.log(`✅ Created ${formationField.querySelectorAll('.player-slot').length} empty field spots`);

        // ============================================================================
        // STEP 2: Create empty bench slots based on game type
        // ============================================================================
        const benchSpotMapping = {
            '5v5': 10,
            '7v7': 12,
            '9v9': 15,
            '11v11': 18
        };
        
        const matchType = appState.gameSetupMatchType || '11v11';
        const teamPlayers = getTeamPlayers() || [];
        const numBenchSpots = Math.max(benchSpotMapping[matchType] || 18, teamPlayers.length);
        
        for (let i = 1; i <= numBenchSpots; i++) {
            const slot = document.createElement('div');
            slot.className = 'bench-slot';
            slot.id = `bench-slot-${i}`;
            benchSlots.appendChild(slot);
        }

        this._populateBenchWithTeamPlayers();
        
        console.log(`✅ Created ${numBenchSpots} empty bench slots for ${matchType}`);

        // ============================================================================
        // STEP 3: Create 5 empty unavailable (injury/missing) slots
        // ============================================================================
        for (let i = 1; i <= 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'unavailable-slot';
            slot.id = `unavailable-slot-${i}`;
            unavailableSlots.appendChild(slot);
        }
        
        console.log(`✅ Created 5 empty unavailable slots`);

        // ============================================================================
        // STEP 4: Attach all event handlers
        // ============================================================================
        this._setupTapHandlers();
    },

    /**
     * Get field spot definitions
     * @private
     * @returns {Array} Array of spot objects with position, x, y coordinates
     */
    _getFieldSpots() {
        const isDesktopLayout = window.matchMedia('(min-width: 769px)').matches;
        const rowY = isDesktopLayout
            ? {
                GK: 89,
                SW: 81,
                DEF: 72,
                DM: 59,
                MID: 46,
                OM: 33,
                FWD: 20,
                ST: 10
            }
            : {
                GK: 95,
                SW: 86.5,
                DEF: 78.5,
                DM: 61.38,
                MID: 44.25,
                OM: 27.13,
                FWD: 10,
                ST: 2
            };
        const lineX = [10, 30, 50, 70, 90];
        const strikerLineX = [30, 50, 70];

        return [
            { position: 'GK', x: 50, y: rowY.GK },
            { position: 'SW', x: 50, y: rowY.SW },
            ...lineX.map((x, index) => ({ position: `DEF-${index + 1}`, x, y: rowY.DEF })),
            ...lineX.map((x, index) => ({ position: `DM-${index + 1}`, x, y: rowY.DM })),
            ...lineX.map((x, index) => ({ position: `MID-${index + 1}`, x, y: rowY.MID })),
            ...lineX.map((x, index) => ({ position: `OM-${index + 1}`, x, y: rowY.OM })),
            ...lineX.map((x, index) => ({ position: `FWD-${index + 1}`, x, y: rowY.FWD })),
            ...strikerLineX.map((x, index) => ({ position: `ST-${index + 1}`, x, y: rowY.ST }))
        ];
    },

    _observeFieldSurface(formationField) {
        this._ensureFieldResizeHandler();

        if (this._fieldResizeObserver) {
            this._fieldResizeObserver.disconnect();
        }

        if ('ResizeObserver' in window) {
            this._fieldResizeObserver = new ResizeObserver(() => this._syncFieldSurfaceLayout());
            this._fieldResizeObserver.observe(formationField);
        }
    },

    _ensureFieldResizeHandler() {
        if (this._fieldResizeHandler) {
            return;
        }

        this._fieldResizeHandler = () => this._syncFieldSurfaceLayout();
        window.addEventListener('resize', this._fieldResizeHandler);
    },

    _syncFieldSurfaceLayout() {
        const formationField = document.getElementById('formation-field');
        const fieldSurface = formationField?.querySelector('.formation-field-surface');

        if (!formationField || !fieldSurface) {
            return;
        }

        const isDesktopLayout = window.matchMedia('(min-width: 769px)').matches;
        fieldSurface.classList.toggle('desktop-rotated', isDesktopLayout);

        if (!isDesktopLayout) {
            fieldSurface.style.width = '100%';
            fieldSurface.style.height = '100%';
            this._syncFieldSpotOffsets(fieldSurface, false);
            return;
        }

        const wrapperWidth = formationField.clientWidth;
        const wrapperHeight = formationField.clientHeight;

        if (!wrapperWidth || !wrapperHeight) {
            requestAnimationFrame(() => this._syncFieldSurfaceLayout());
            return;
        }

        const landscapeWidth = Math.min(wrapperWidth, wrapperHeight * this.DESKTOP_FIELD_ASPECT_RATIO);
        const landscapeHeight = landscapeWidth / this.DESKTOP_FIELD_ASPECT_RATIO;

        fieldSurface.style.width = `${landscapeHeight}px`;
        fieldSurface.style.height = `${landscapeWidth}px`;
        this._syncFieldSpotOffsets(fieldSurface, true);
    },

    _syncFieldSpotOffsets(fieldSurface, isDesktopLayout) {
        const fieldSlots = fieldSurface.querySelectorAll('.player-slot');

        if (!fieldSlots.length) {
            return;
        }

        const slotWidth = fieldSlots[0].offsetWidth || 56;
        const spotWidthPercent = fieldSurface.offsetHeight
            ? (slotWidth / fieldSurface.offsetHeight) * 100
            : 0;
        const rowPositions = isDesktopLayout
            ? this._getDesktopRowPositions(spotWidthPercent, slotWidth)
            : this._getMobileRowPositions(spotWidthPercent);

        fieldSlots.forEach(slot => {
            const baseX = parseFloat(slot.dataset.baseX || '50');
            const baseY = parseFloat(slot.dataset.baseY || '50');
            const position = slot.getAttribute('data-position') || '';
            const rowKey = position.split('-')[0];
            const adjustedY = rowPositions?.[rowKey] ?? baseY;

            slot.style.left = `${baseX}%`;
            slot.style.top = `${Math.max(0, Math.min(100, adjustedY))}%`;
        });
    },

    _getDesktopRowPositions(horizontalSpotWidthPercent, slotWidthPx) {
        const rowOrderFromSw = ['SW', 'DEF', 'DM', 'MID', 'OM', 'FWD', 'ST'];
        const gkAnchor = 89 + (horizontalSpotWidthPercent * 0.5);
        const baseFwdAnchor = 20 - horizontalSpotWidthPercent;
        const baseStepToFwd = (gkAnchor - baseFwdAnchor) / 6;
        const stAnchor = (baseFwdAnchor - baseStepToFwd) + horizontalSpotWidthPercent;
        // SW should sit next to GK: center distance = one full spot width + 2px edge gap.
        const swToGkSpacingPercent = horizontalSpotWidthPercent * ((slotWidthPx + 2) / (slotWidthPx || 56));
        const swAnchor = gkAnchor + swToGkSpacingPercent;
        const step = (swAnchor - stAnchor) / (rowOrderFromSw.length - 1);

        const positions = { GK: gkAnchor };
        rowOrderFromSw.forEach((rowKey, index) => {
            positions[rowKey] = swAnchor - (step * index);
        });

        return positions;
    },

    _getMobileRowPositions(spotWidthPercent) {
        const rowOrder = ['GK', 'SW', 'DEF', 'DM', 'MID', 'OM', 'FWD', 'ST'];
        const gkAnchor = 95;
        const baseFwdAnchor = 10;
        const baseStepToFwd = (gkAnchor - baseFwdAnchor) / 6;
        const stAnchor = (baseFwdAnchor - baseStepToFwd) + (spotWidthPercent * 2);
        const step = (gkAnchor - stAnchor) / (rowOrder.length - 1);

        return rowOrder.reduce((acc, rowKey, index) => {
            acc[rowKey] = gkAnchor - (step * index);
            return acc;
        }, {});
    },

    _populateBenchWithTeamPlayers() {
        const sortedPlayers = [...(getTeamPlayers() || [])]
            .sort((a, b) => (a.jerseyNumber || 0) - (b.jerseyNumber || 0));
        const benchSlots = Array.from(document.querySelectorAll('.bench-slot'));

        sortedPlayers.forEach((player, index) => {
            const slot = benchSlots[index];
            if (!slot) {
                return;
            }

            slot.innerHTML = `<span class="player-number" data-player-id="${player.id}"><span class="jersey-num">${player.jerseyNumber}</span><span class="player-name-bench">${(player.name || '').toUpperCase()}</span></span>`;
            slot.setAttribute('data-player-id', player.id);
            slot.classList.add('occupied');
        });
    },

    /**
     * Setup tap-to-select event listeners
     * @private
     */
    _setupTapHandlers() {
        console.log('🔗 _setupTapHandlers() called');

        // Spot-only interaction: field, bench, unavailable.
        document.querySelectorAll('.player-slot, .bench-slot, .unavailable-slot').forEach(el => {
            el.removeEventListener('click', handleTapSlot);
            el.removeEventListener('touchstart', handleTapSlot);
        });

        const slots = document.querySelectorAll('.player-slot, .bench-slot, .unavailable-slot');
        console.log(`   🎯 Found ${slots.length} spot elements`);
        slots.forEach((slot, idx) => {
            slot.style.cursor = 'pointer';
            slot.style.pointerEvents = 'auto';
            slot.style.touchAction = 'none';
            slot.addEventListener('click', handleTapSlot, { passive: false });
            slot.addEventListener('touchstart', handleTapSlot, { passive: false });
            if (idx < 3 || idx >= slots.length - 3) {
                console.log(`      [${idx}] ${slot.getAttribute('data-position') || slot.id} - position: ${slot.style.position || 'auto'}, click+touch listeners added`);
            }
        });
        
        console.log(`✅ Event listeners setup complete! (${slots.length} spot handlers)`);
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
        const inBenchSlot = targetElement.closest('.bench-slot');
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
    const eventType = e.type;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    let slotElement = e.currentTarget;
    if (eventType.includes('touch') && e.touches?.length > 0) {
        const touch = e.touches[0];
        const touchedEl = document.elementFromPoint(touch.clientX, touch.clientY);
        const touchedSlot = touchedEl?.closest?.('.player-slot, .bench-slot, .unavailable-slot');
        if (touchedSlot) {
            slotElement = touchedSlot;
        }
    }

    if (!slotElement) {
        return;
    }

    const slotId = getSlotId(slotElement);
    const tappedPlayerId = slotElement.getAttribute('data-player-id');

    if (!TapState.playerId) {
        if (!tappedPlayerId) {
            showMessage('Tap an occupied spot first', 'warning');
            return;
        }

        TapState.playerId = tappedPlayerId;
        TapState.source = getSlotType(slotElement);
        TapState.slotId = slotId;

        clearSelection();
        const badge = slotElement.querySelector('.player-number, .player-number-placed');
        if (badge) {
            badge.classList.add('tap-selected');
        }
        showMessage(`Player #${getPlayerJersey(TapState.playerId)} selected - tap destination spot`, 'info');
        return;
    }

    const selectedPlayerId = TapState.playerId;
    const sourceSlot = getSlotByPlayerId(selectedPlayerId);
    if (!sourceSlot) {
        clearSelectionFully();
        showMessage('Selected player is no longer on the board', 'warning');
        return;
    }

    if (slotId === getSlotId(sourceSlot)) {
        clearSelectionFully();
        return;
    }

    const displacedPlayerId = slotElement.getAttribute('data-player-id');

    // Move selected player to destination first.
    placePlayerToSlot(selectedPlayerId, slotElement);

    if (displacedPlayerId && displacedPlayerId !== selectedPlayerId) {
        const emptyBenchSpot = findFirstEmptyBenchSpot();
        if (emptyBenchSpot) {
            placePlayerToSlot(displacedPlayerId, emptyBenchSpot);
            showMessage(`Moved #${getPlayerJersey(selectedPlayerId)}. #${getPlayerJersey(displacedPlayerId)} returned to bench`, 'success');
        } else {
            showMessage('No empty bench spot for displaced player', 'warning');
        }
    } else {
        showMessage(`Moved #${getPlayerJersey(selectedPlayerId)}`, 'success');
    }

    clearSelectionFully();
}

/**
 * Handle sidebar tap to remove players from field/unavailable
 */
function handleSidebarTap(e) {
    // Sidebar interactions are disabled; spots are the only interactive elements.
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

function getSlotId(slotElement) {
    return slotElement?.getAttribute?.('data-position') || slotElement?.id || '';
}

function getSlotType(slotElement) {
    if (!slotElement) return null;
    if (slotElement.classList.contains('bench-slot')) return 'bench';
    if (slotElement.classList.contains('unavailable-slot')) return 'unavailable';
    if (slotElement.classList.contains('player-slot')) return 'field';
    return null;
}

function getPlayerJersey(playerId) {
    return getTeamPlayers().find(p => p.id === playerId)?.jerseyNumber || '?';
}

function getSlotByPlayerId(playerId) {
    return document.querySelector(`.player-slot[data-player-id="${playerId}"], .bench-slot[data-player-id="${playerId}"], .unavailable-slot[data-player-id="${playerId}"]`);
}

function findFirstEmptyBenchSpot() {
    const benchSpots = document.querySelectorAll('.bench-slot');
    for (const spot of benchSpots) {
        if (!spot.getAttribute('data-player-id')) {
            return spot;
        }
    }
    return null;
}

// ============================================================================
// PLACE & REMOVE PLAYER FUNCTIONS
// ============================================================================

/**
 * Find which position a player is currently at (field or unavailable slot)
 */
function findPositionOfPlayer(playerId) {
    // SPOT-LEVEL SEARCH: Check each individual field spot
    const fieldSpots = document.querySelectorAll('[data-position]');
    for (const spot of fieldSpots) {
        // Check THIS specific field spot to see if it contains this player
        const playerNum = spot.querySelector('.player-number-placed');
        if (playerNum && playerNum.dataset.playerId === playerId) {
            return spot.getAttribute('data-position');
        }
    }
    
    // SPOT-LEVEL SEARCH: Check each individual bench spot
    const benchSpots = document.querySelectorAll('.bench-slot');
    for (const spot of benchSpots) {
        // Check THIS specific bench spot to see if it contains this player
        const playerNum = spot.querySelector('.player-number');
        if (playerNum && playerNum.dataset.playerId === playerId) {
            return spot.id;  // Return the specific bench spot ID (e.g., 'bench-slot-1')
        }
    }

    const unavailableSpots = document.querySelectorAll('.unavailable-slot');
    for (const spot of unavailableSpots) {
        const playerNum = spot.querySelector('.player-number');
        if (playerNum && playerNum.dataset.playerId === playerId) {
            return spot.id;
        }
    }
    
    return null;
}

/**
 * Find which player is at a specific position (field or unavailable slot)
 */
/**
 * Find which player is at a specific position (works with individual spots)
 */
function findPlayerAtPosition(position) {
    // Check THIS specific field spot
    const fieldSpot = document.querySelector(`[data-position="${position}"]`);
    if (fieldSpot) {
        const playerNum = fieldSpot.querySelector('.player-number-placed');
        if (playerNum) {
            const playerId = playerNum.dataset.playerId;
            return getTeamPlayers().find(p => p.id === playerId) || null;
        }
    }
    
    // Check THIS specific bench spot (position is like 'bench-slot-1')
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

    // Place into target slot type
    if (slotElement.classList.contains('unavailable-slot')) {
        console.log(`   → Adding to unavailable`);
        placePlayerInUnavailable(playerId, slotElement, player);
    } else if (slotElement.classList.contains('bench-slot')) {
        console.log(`   → Adding to bench`);
        placePlayerOnBench(playerId, slotElement, player);
    } else {
        console.log(`   → Adding to field position`);
        placePlayerOnField(playerId, slotElement, player);
    }
    
    console.log(`✅ Player placed successfully`);
    
    // Re-setup event handlers after changes
    FormationScreen._setupTapHandlers();
}

/**
 * Remove player from all locations across all 3 area types
 * Operates at SPOT LEVEL - each individual spot is checked and cleared independently
 * Does not clear entire areas, only the specific spot where this player is located
 */
function removePlayerFromAllLocations(playerId) {
    console.log(`🗑️ removePlayerFromAllLocations: Clearing player ${playerId} from all spot types...`);
    
    // FIELD AREA: Scan each of 25 field spots individually
    // Only the specific spot containing this player gets cleared
    let clearedFromField = false;
    document.querySelectorAll('.player-slot').forEach(spot => {
        // Check THIS individual spot's data-player-id
        if (spot.getAttribute('data-player-id') === playerId) {
            console.log(`   🔴 FIELD SPOT: Clearing from position ${spot.getAttribute('data-position')}`);
            spot.innerHTML = '';
            spot.removeAttribute('data-player-id');
            spot.classList.remove('occupied');
            clearedFromField = true;
        }
    });
    if (clearedFromField) console.log(`   ✓ Freed field spot`);

    // BENCH AREA: Scan each bench spot individually
    let clearedFromBench = false;
    document.querySelectorAll('.bench-slot').forEach(spot => {
        if (spot.getAttribute('data-player-id') === playerId) {
            console.log(`   🟡 BENCH SPOT: Clearing from ${spot.id}`);
            spot.innerHTML = '';
            spot.removeAttribute('data-player-id');
            spot.classList.remove('occupied');
            clearedFromBench = true;
        }
    });
    if (clearedFromBench) console.log(`   ✓ Freed bench spot`);

    // UNAVAILABLE AREA: Scan each unavailable spot individually
    let clearedFromUnavailable = false;
    document.querySelectorAll('.unavailable-slot').forEach(spot => {
        if (spot.getAttribute('data-player-id') === playerId) {
            console.log(`   🔵 UNAVAILABLE SPOT: Clearing from ${spot.id}`);
            spot.innerHTML = '';
            spot.removeAttribute('data-player-id');
            spot.classList.remove('occupied');
            clearedFromUnavailable = true;
        }
    });
    if (clearedFromUnavailable) console.log(`   ✓ Freed unavailable spot`);

    // Update STATE: Remove from unavailable list
    const unavailableList = getUnavailablePlayers().filter(id => id !== playerId);
    setUnavailablePlayers(unavailableList);
    console.log(`   📋 Unavailable state cleared`);

    // Update STATE: Remove from formation
    const formation = (getFormationTemp() || []).filter(f => f.playerId !== playerId);
    setFormationTemp(formation);
    console.log(`   📋 Formation state cleared`);
    
    console.log(`   ✅ Removal complete: field=${clearedFromField}, bench=${clearedFromBench}, unavailable=${clearedFromUnavailable}`);
}

function placePlayerOnBench(playerId, slotElement, player) {
    const unavailableList = getUnavailablePlayers().filter(id => id !== playerId);
    setUnavailablePlayers(unavailableList);

    slotElement.innerHTML = `<span class="player-number" data-player-id="${playerId}"><span class="jersey-num">${player.jerseyNumber}</span><span class="player-name-bench">${(player.name || '').toUpperCase()}</span></span>`;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');
}

/**
 * Place player on a specific bench spot
 * Operates at SPOT LEVEL - modifies only the target bench spot
 */
function placePlayerInUnavailable(playerId, slotElement, player) {
    console.log(`   👉 placePlayerInUnavailable: Placing ${player.name}(${player.jerseyNumber}) on THIS specific bench spot ${slotElement.id}`);
    
    // Update UNAVAILABLE STATE (bench persistence)
    const unavailableList = getUnavailablePlayers();
    if (!unavailableList.includes(playerId)) {
        unavailableList.push(playerId);
        setUnavailablePlayers(unavailableList);
        console.log(`   ✓ STATE: Added to unavailable list (bench state)`);
    }

    // Update THIS SPECIFIC unavailable spot: Add badge, mark occupied
    slotElement.innerHTML = `<span class="player-number" data-player-id="${playerId}"><span class="jersey-num">${player.jerseyNumber}</span><span class="player-name-bench">${(player.name || '').toUpperCase()}</span></span>`;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');
    console.log(`   ✓ UNAVAILABLE SPOT: Badge rendered in ${slotElement.id}, spot now occupied`);
    
    console.log(`   ✅ Bench spot placement complete`);
}

/**
 * Place player on a specific field spot
 * Operates at SPOT LEVEL - modifies only the target field spot
 */
function placePlayerOnField(playerId, slotElement, player) {
    const position = slotElement.getAttribute('data-position');
    console.log(`   👉 placePlayerOnField: Placing ${player.name}(${player.jerseyNumber}) on THIS specific field spot at ${position}`);
    
    const formation = getFormationTemp() || [];
    
    // Update FORMATION STATE for this specific field spot
    const updatedFormation = formation.filter(f => f.playerId !== playerId);
    updatedFormation.push({
        playerId,
        position,
        x: parseFloat(slotElement.style.left),
        y: parseFloat(slotElement.style.top)
    });
    setFormationTemp(updatedFormation);
    console.log(`   ✓ STATE: Formation updated for THIS spot position ${position}`);

    // Update THIS SPECIFIC field spot: Add badge, mark occupied
    slotElement.innerHTML = `<span class="player-number player-number-placed" data-player-id="${playerId}"><span class="jersey-num">${player.jerseyNumber}</span><span class="player-name-field">${(player.name || '').toUpperCase()}</span></span>`;
    slotElement.setAttribute('data-player-id', playerId);
    slotElement.classList.add('occupied');
    console.log(`   ✓ FIELD SPOT: Badge rendered in position ${position}, spot now occupied`);
    
    console.log(`   ✅ Field spot placement complete`);
}

/**
 * Remove player from formation/unavailable back to sidebar
 */
function removePlayerFromSlot(playerId) {
    removePlayerFromAllLocations(playerId);

    // Re-setup handlers
    FormationScreen._setupTapHandlers();
}

// Expose globally
window.FormationScreen = FormationScreen;
