/**
 * TeamSetupScreen.js - Refactored
 * Manages team setup screen rendering and player management
 * 
 * Key Changes:
 * - Removed all references to legacy appState.players
 * - Uses getTeamPlayers() and getCurrentTeam() throughout
 * - Cleaner separation of concerns
 * - Better error handling and defensive programming
 * - Simplified methods with single responsibilities
 */

const TeamSetupScreen = {
    // =====================================================================
    // RENDERING METHODS
    // =====================================================================
    
    /**
     * Main render function - displays current team's players list
     */
    renderPlayersList() {
        console.log('🔄 TeamSetupScreen.renderPlayersList() - START');
        
        const playersList = document.getElementById('players-list');
        if (!playersList) {
            console.error('   ❌ ERROR: players-list element not found!');
            return;
        }
        
        // Get current team and its players
        const team = getCurrentTeam();
        if (!team) {
            console.warn('   ⚠️  No team found');
            playersList.innerHTML = '<div class="empty-state">No team selected</div>';
            this.updatePlayerCounter(0);
            return;
        }
        
        const players = team.players || [];
        console.log(`   Team: "${team.name}" (${team.id})`);
        console.log(`   Players: ${players.length}`);
        
        // Clear list
        playersList.innerHTML = '';
        
        // Update counter
        this.updatePlayerCounter(players.length);
        
        // Show empty state if no players
        if (players.length === 0) {
            playersList.innerHTML = '<div class="empty-state">No players added yet</div>';
            console.log('   ✓ Empty state displayed');
            return;
        }
        
        // Check if any checkboxes are checked (for disable logic)
        const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
        
        // Sort and render each player
        const sortedPlayers = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
        sortedPlayers.forEach((player, idx) => {
            this.renderPlayerItem(playersList, player, idx, anyChecked);
        });
        
        console.log(`   ✓ Rendered ${players.length} players`);
    },
    
    /**
     * Render a single player item in the list
     */
    renderPlayerItem(container, player, idx, editButtonDisabled) {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.setAttribute('data-player-id', player.id);
        
        // Build the player display HTML with proper styling
        playerItem.innerHTML = `
            <div class="jersey-number">${player.jerseyNumber}</div>
            <div class="player-info">
                <div class="player-name-block">
                    <div class="player-name-main">${this.formatPlayerName(player.name)}</div>
                    <div class="player-position-text">(${player.position})</div>
                </div>
            </div>
            <div class="player-actions">
                <button class="player-action-btn" 
                        onclick="TeamSetupScreen.editPlayer('${player.id}')" 
                        title="Edit player" 
                        ${editButtonDisabled ? 'disabled' : ''}>
                    <span class="material-icons">edit</span>
                </button>
                <input type="checkbox" 
                       class="player-checkbox" 
                       data-player-id="${player.id}" 
                       onchange="TeamSetupScreen.updateDeletePlayerRibbon()">
            </div>
        `;
        
        container.appendChild(playerItem);
        console.log(`      [${idx}] ${player.name} #${player.jerseyNumber} (${player.position})`);
    },
    
    /**
     * Format player name for display
     */
    formatPlayerName(name) {
        if (!name) return '(No name)';
        return name.toUpperCase().substring(0, 20); // Limit length for display
    },
    
    /**
     * Update player counter display
     */
    updatePlayerCounter(count) {
        const counter = document.getElementById('team-player-counter');
        if (counter) {
            counter.textContent = count;
        }
    },
    
    // =====================================================================
    // PLAYER DELETION METHODS
    // =====================================================================
    
    /**
     * Show/hide delete warning ribbon based on checkbox states
     */
    updateDeletePlayerRibbon() {
        const checkboxes = document.querySelectorAll('.player-checkbox:checked');
        const ribbon = document.getElementById('message-ribbon');
        
        if (!ribbon) {
            console.error('Message ribbon not found');
            return;
        }
        
        if (checkboxes.length > 0) {
            // Show delete warning
            clearTimeout(window.messageTimeout);
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
            // Hide delete warning
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
        document.querySelectorAll('.player-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateDeletePlayerRibbon();
    },
    
    /**
     * Update edit button disabled states
     */
    updateEditButtonStates() {
        const anyChecked = document.querySelectorAll('.player-checkbox:checked').length > 0;
        document.querySelectorAll('.player-action-btn').forEach(btn => {
            btn.disabled = anyChecked;
        });
    },
    
    /**
     * Open confirmation dialog for player deletion
     */
    openDeletePlayersDialog() {
        const checkboxes = document.querySelectorAll('.player-checkbox:checked');
        const playerIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-player-id'));
        
        if (playerIds.length === 0) {
            showMessage('No players selected', 'error');
            return;
        }
        
        let confirmDialog = document.getElementById('confirm-delete-dialog');
        if (!confirmDialog) {
            confirmDialog = document.createElement('div');
            confirmDialog.id = 'confirm-delete-dialog';
            confirmDialog.className = 'dialog';
            document.getElementById('app').appendChild(confirmDialog);
        }
        
        const playerCount = playerIds.length;
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
            this.closeConfirmDeleteDialog();
            return;
        }
        
        console.log(`🗑️  Deleting ${playerIds.length} player(s)...`);
        
        // Get the current team and remove players
        const team = getCurrentTeam();
        if (!team || !team.players) {
            console.error('Team or players not found');
            showMessage('Error: Team not found', 'error');
            return;
        }
        
        let deletedCount = 0;
        playerIds.forEach(playerId => {
            const playerIndex = team.players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                const player = team.players[playerIndex];
                console.log(`   Removed: ${player.name} #${player.jerseyNumber}`);
                team.players.splice(playerIndex, 1);
                deletedCount++;
            }
        });
        
        console.log(`   ✓ ${deletedCount} players deleted`);
        
        this.closeConfirmDeleteDialog();
        saveAppData();
        this.renderPlayersList();
        updatePlayerCounter();
        
        showMessage(
            `${deletedCount} player${deletedCount > 1 ? 's' : ''} removed successfully`,
            'success'
        );
    },

    
    // =====================================================================
    // PLAYER EDIT METHODS
    // =====================================================================
    
    /**
     * Open edit dialog for a player
     */
    editPlayer(playerId) {
        console.log(`✏️  editPlayer() called for player ${playerId}`);
        
        // Get current team
        const team = getCurrentTeam();
        if (!team) {
            console.error('No team found');
            showMessage('Error: Team not found', 'error');
            return;
        }
        
        // Find player
        const player = team.players.find(p => p.id === playerId);
        if (!player) {
            console.error(`Player ${playerId} not found in team "${team.name}"`);
            showMessage(`Player not found in team "${team.name}"`, 'error');
            return;
        }
        
        console.log(`   Found player: ${player.name} #${player.jerseyNumber} (${player.position})`);
        
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
                    <input type="text" 
                           id="edit-player-name" 
                           value="${this.formatForInput(player.name)}"
                           placeholder="Player name">
                </div>
                <div class="form-group">
                    <label for="edit-jersey-number">Jersey Number:</label>
                    <input type="number" 
                           id="edit-jersey-number" 
                           value="${player.jerseyNumber}"
                           min="0"
                           max="99">
                </div>
                <div class="form-group">
                    <label for="edit-position">Position:</label>
                    <select id="edit-position">
                        <option value="Goalkeeper" ${player.position === 'Goalkeeper' ? 'selected' : ''}>Goalkeeper</option>
                        <option value="Defender" ${player.position === 'Defender' ? 'selected' : ''}>Defender</option>
                        <option value="Midfielder" ${player.position === 'Midfielder' ? 'selected' : ''}>Midfielder</option>
                        <option value="Striker" ${player.position === 'Striker' ? 'selected' : ''}>Striker</option>
                        <option value="Forward" ${player.position === 'Forward' ? 'selected' : ''}>Forward</option>
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
     */
    saveEditedPlayer(playerId) {
        console.log(`💾 saveEditedPlayer() called for player ${playerId}`);
        
        // Get current team
        const team = getCurrentTeam();
        if (!team) {
            console.error('Team not found');
            showMessage('Error: Team not found', 'error');
            return;
        }
        
        // Find player
        const player = team.players.find(p => p.id === playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            showMessage('Player not found', 'error');
            return;
        }
        
        // Get form values
        const name = document.getElementById('edit-player-name').value.trim().toUpperCase();
        const jerseyNumber = parseInt(document.getElementById('edit-jersey-number').value);
        const position = document.getElementById('edit-position').value;
        
        // Validate
        if (!name) {
            showMessage('Please enter a player name', 'error');
            return;
        }
        
        if (isNaN(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99) {
            showMessage('Jersey number must be between 0 and 99', 'error');
            return;
        }
        
        // Check for duplicate jersey numbers (excluding current player)
        const hasDuplicate = team.players.some(p => 
            p.id !== playerId && p.jerseyNumber === jerseyNumber
        );
        if (hasDuplicate) {
            showMessage('Another player already has this jersey number', 'error');
            return;
        }
        
        // Update player
        console.log(`   Old: ${player.name} #${player.jerseyNumber}`);
        player.name = name;
        player.jerseyNumber = jerseyNumber;
        player.position = position;
        console.log(`   New: ${player.name} #${player.jerseyNumber}`);
        
        // Save and refresh
        this.closeEditDialog();
        saveAppData();
        this.renderPlayersList();
        showMessage(`Player "${name}" updated successfully`, 'success');
    },
    
    /**
     * Escape string for use in HTML attributes
     */
    formatForInput(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    
    // =====================================================================
    // DIAGNOSTICS & HELPERS
    // =====================================================================
    
    /**
     * Debug: Log current team and player state
     */
    debugState() {
        const team = getCurrentTeam();
        console.log('🔍 TeamSetupScreen.debugState():');
        console.log(`   Teams in appState: ${appState.teams?.length || 0}`);
        if (team) {
            console.log(`   Current team: "${team.name}" (${team.id})`);
            console.log(`   Players in team: ${team.players?.length || 0}`);
            team.players?.forEach(p => {
                console.log(`      - ${p.name} #${p.jerseyNumber} (${p.position})`);
            });
        } else {
            console.log(`   ❌ No team found!`);
            console.log(`   currentTeamId: ${appState.currentTeamId}`);
        }
    },
    
    /**
     * Update player counter display
     */
    updatePlayerCounter(count) {
        const counter = document.getElementById('team-player-counter');
        if (counter) {
            counter.textContent = count;
        }
    }
};

// Expose globally
window.TeamSetupScreen = TeamSetupScreen;
