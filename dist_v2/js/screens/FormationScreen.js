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

// Expose globally
window.FormationScreen = FormationScreen;
