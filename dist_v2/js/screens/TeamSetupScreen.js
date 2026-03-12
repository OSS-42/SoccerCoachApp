/**
 * TeamSetupScreen.js
 * Encapsulates all team setup screen rendering and player management logic
 */

const TeamSetupScreen = {
    /**
     * Render the players list with current state
     */
    renderPlayersList() {
        console.log('🔄 TeamSetupScreen.renderPlayersList() called');
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('   ❌ ERROR: players-list element not found!');
            return;
        }
        
        // NOTE: Do NOT manipulate message-ribbon here - let app.js manage it
        // Only clear the players-list DOM, not the message system
        
        playersList.innerHTML = '';
        const teamPlayerCounter = document.getElementById('team-player-counter');
        const players = getTeamPlayers();
        
        console.log(`   Teams total: ${appState.teams?.length || 0}`);
        console.log(`   Current team ID: ${appState.currentTeamId}`);
        const currentTeam = getCurrentTeam();
        console.log(`   Current team: ${currentTeam?.name} (id=${currentTeam?.id})`);
        console.log(`   Players retrieved: ${players?.length || 0}`);
        
        if (!players || players.length === 0) {
            console.log('   ℹ️ No players in current team');
            playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
            if (teamPlayerCounter) {
                teamPlayerCounter.textContent = '0';
            }
            return;
        }
        
        if (teamPlayerCounter) {
            teamPlayerCounter.textContent = players.length;
        }
        
        const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
        
        console.log(`   Rendering ${players.length} players (${anyChecked ? 'with checkboxes checked' : 'no checkboxes'})...`);
        players.sort((a, b) => a.jerseyNumber - b.jerseyNumber).forEach((player, idx) => {
            console.log(`      [${idx}] Player: ${player.name} #${player.jerseyNumber} (${player.position})`);
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <div class="jersey-number">${player.jerseyNumber}</div>
                <div class="player-info" style="display: flex; align-items: center; flex: 1; min-width: 0;">
                    <div class="player-name" style="display: block; color: #2c3e50; font-weight: 600; font-size: 0.85rem; flex: 1; word-break: break-word; overflow: visible; text-overflow: clip;">${player.name} (${player.position})</div>
                </div>
                <div class="player-actions">
                    <button class="player-action-btn" onclick="TeamSetupScreen.editPlayer('${player.id}')" ${anyChecked ? 'disabled' : ''}>
                        <span class="material-icons">edit</span>
                    </button>
                    <input type="checkbox" class="player-checkbox" data-player-id="${player.id}" onchange="TeamSetupScreen.updateDeletePlayerRibbon()">
                </div>
            `;
            playersList.appendChild(playerItem);
        });
        console.log(`   ✅ Rendered ${players.length} player items`);
    },

    /**
     * Show/hide yellow delete warning ribbon based on checkbox states
     */
    updateDeletePlayerRibbon() {
        const checkboxes = document.querySelectorAll('.player-checkbox:checked');
        const ribbon = document.getElementById('message-ribbon');
        
        if (checkboxes.length > 0) {
            clearTimeout(messageTimeout); // Cancel any existing timeout
            ribbon.innerHTML = `
                <span id="message-text">Selected players will be deleted.</span>
                <div class="ribbon-buttons">
                    <button class="warning-delete-btn" onclick="TeamSetupScreen.openDeletePlayersDialog()">Delete</button>
                    <span class="close-btn" onclick="TeamSetupScreen.closeWarningRibbon()">×</span>
                </div>
            `;
            ribbon.className = 'message-ribbon warning';
            ribbon.classList.remove('hidden');
            ribbon.style.display = 'flex';
            this.updateEditButtonStates();
        } else {
            ribbon.classList.add('hidden');
            ribbon.style.display = 'none';
            ribbon.innerHTML = `
                <span id="message-text"></span>
                <button class="close-btn" onclick="hideMessage()">×</button>
            `;
            this.updateEditButtonStates();
        }
    },

    /**
     * Close the warning ribbon and uncheck all players
     */
    closeWarningRibbon() {
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateDeletePlayerRibbon();
    },

    /**
     * Open confirmation dialog before deleting players
     */
    openDeletePlayersDialog() {
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
                    <button class="secondary-btn" onclick="TeamSetupScreen.closeConfirmDeleteDialog()">Cancel</button>
                    <button class="primary-btn delete-btn" onclick="TeamSetupScreen.confirmDeletePlayers()">Confirm</button>
                </div>
            </div>
        `;
        
        confirmDialog.style.display = 'flex';
        confirmDialog.classList.add('active');
    },

    /**
     * Close the delete confirmation dialog
     */
    closeConfirmDeleteDialog() {
        const confirmDialog = document.getElementById('confirm-delete-dialog');
        if (confirmDialog) {
            confirmDialog.style.display = 'none';
            confirmDialog.classList.remove('active');
        }
        document.querySelectorAll('.player-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateDeletePlayerRibbon();
    },

    /**
     * Confirm and execute player deletion
     */
    confirmDeletePlayers() {
        const checkboxes = document.querySelectorAll('.player-checkbox:checked');
        const playerIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-player-id'));
        
        if (playerIds.length === 0) {
            hideMessage();
            return;
        }
        
        this.closeConfirmDeleteDialog();
        
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
        
        saveAppData();
        this.renderPlayersList();
        updatePlayerCounter();
        
        showMessage(`${deletedCount} player${deletedCount > 1 ? 's' : ''} removed successfully`, 'success');
    },

    /**
     * Edit a player by ID
     * @param {string} playerId - The ID of the player to edit
     */
    editPlayer(playerId) {
        const player = appState.players.find(p => p.id === playerId);
        if (!player) return;
        
        let editDialog = document.getElementById('edit-player-dialog');
        if (!editDialog) {
            editDialog = document.createElement('div');
            editDialog.id = 'edit-player-dialog';
            editDialog.className = 'dialog';
            document.getElementById('app').appendChild(editDialog);
        }
        
        editDialog.innerHTML = `
            <div class="dialog-content">
                <h2>Edit Player</h2>
                <div class="form-group">
                    <label for="edit-player-name">Name:</label>
                    <input type="text" id="edit-player-name" value="${player.name}">
                </div>
                <div class="form-group">
                    <label for="edit-jersey-number">Jersey Number:</label>
                    <input type="number" id="edit-jersey-number" value="${player.jerseyNumber}">
                </div>
                <div class="form-group">
                    <label for="edit-position">Position:</label>
                    <select id="edit-position">
                        <option value="Goalkeeper" ${player.position === 'Goalkeeper' ? 'selected' : ''}>Goalkeeper</option>
                        <option value="Defender" ${player.position === 'Defender' ? 'selected' : ''}>Defender</option>
                        <option value="Midfielder" ${player.position === 'Midfielder' ? 'selected' : ''}>Midfielder</option>
                        <option value="Striker" ${player.position === 'Striker' ? 'selected' : ''}>Striker</option>
                    </select>
                </div>
                <div class="dialog-buttons">
                    <button class="secondary-btn" onclick="TeamSetupScreen.closeEditDialog()">Cancel</button>
                    <button class="primary-btn" onclick="TeamSetupScreen.saveEditedPlayer('${playerId}')">Save</button>
                </div>
            </div>
        `;
        
        editDialog.style.display = 'flex';
        editDialog.classList.add('active');
    },

    /**
     * Close the player edit dialog
     */
    closeEditDialog() {
        const editDialog = document.getElementById('edit-player-dialog');
        if (editDialog) {
            editDialog.style.display = 'none';
            editDialog.classList.remove('active');
        }
    },

    /**
     * Save edited player data
     * @param {string} playerId - The ID of the player being edited
     */
    saveEditedPlayer(playerId) {
        const team = getCurrentTeam();
        const player = team.players.find(p => p.id === playerId);
        if (!player) return;
        
        const name = document.getElementById('edit-player-name').value.trim().toUpperCase();
        const jerseyNumber = parseInt(document.getElementById('edit-jersey-number').value);
        const position = document.getElementById('edit-position').value;
        
        if (!name || isNaN(jerseyNumber) || jerseyNumber < 0) {
            showMessage('Invalid player data', 'error');
            return;
        }
        
        player.name = name;
        player.jerseyNumber = jerseyNumber;
        player.position = position;
        
        saveAppData();
        this.closeEditDialog();
        this.renderPlayersList();
        showMessage('Player updated successfully', 'success');
    },

    /**
     * Update edit button disabled states based on checkbox selection
     * @private
     */
    updateEditButtonStates() {
        const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
        const editButtons = document.querySelectorAll('.player-action-btn');
        editButtons.forEach(btn => {
            btn.disabled = anyChecked;
        });
    }
};

// Expose globally
window.TeamSetupScreen = TeamSetupScreen;
