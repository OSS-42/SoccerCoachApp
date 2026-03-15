/**
 * SettingsScreen.js
 * Encapsulates settings screen rendering and configuration management
 */

const SettingsScreen = {
    /**
     * Render the settings screen with language and app configuration options
     */
    renderSettings() {
        const settingsContainer = document.getElementById('settings-container');
        if (!settingsContainer) return;

        const currentLanguage = appState.settings?.language || 'en';

        settingsContainer.innerHTML = `
            <div class="settings-group">
                <h3>Language</h3>
                <div class="setting-option">
                    <label>
                        <input type="radio" name="language" value="en" ${currentLanguage === 'en' ? 'checked' : ''} onchange="SettingsScreen.handleLanguageChange()">
                        English
                    </label>
                </div>
                <div class="setting-option">
                    <label>
                        <input type="radio" name="language" value="fr" ${currentLanguage === 'fr' ? 'checked' : ''} onchange="SettingsScreen.handleLanguageChange()">
                        French (Coming Soon)
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <h3>Game Settings</h3>
                <div class="setting-option">
                    <label for="default-substitution-time">Default Substitution Time (minutes):</label>
                    <input type="number" id="default-substitution-time" 
                           value="${appState.settings?.defaultSubstitutionTime || ''}"
                           onchange="SettingsScreen.updateSubstitutionTime(this.value)">
                </div>
                <div class="setting-option">
                    <label>
                        <input type="checkbox" id="substitution-default-checked"
                               ${appState.settings?.isSubstitutionDefaultChecked ? 'checked' : ''}
                               onchange="SettingsScreen.updateSubstitutionDefaultChecked()">
                        Default to checked for substitution time
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <h3>Data Management</h3>
                <button class="secondary-btn" onclick="SettingsScreen.openClearDataDialog()">
                    <span class="btn-text">Clear Data</span>
                    <span class="material-icons">delete</span>
                </button>
            </div>

            <div class="settings-group">
                <button class="primary-btn" onclick="SettingsScreen.saveSettings()">
                    <span class="btn-text">Save Settings</span>
                    <span class="material-icons">save</span>
                </button>
            </div>
        `;
    },

    /**
     * Handle language selection change
     */
    handleLanguageChange() {
        const checkedRadio = document.querySelector('input[name="language"]:checked');
        if (!checkedRadio) {
            showMessage('Please select a language', 'error');
            return;
        }

        const selectedLanguage = checkedRadio.value;

        if (selectedLanguage === 'fr') {
            showMessage('French language is not implemented yet.', 'error');
            const englishRadio = document.querySelector('input[name="language"][value="en"]');
            if (englishRadio) {
                englishRadio.checked = true;
            }
            appState.settings.language = 'en';
        } else {
            appState.settings.language = selectedLanguage;
        }
        
        saveAppData();
    },

    /**
     * Update default substitution time setting
     * @param {number} value - The substitution time in minutes
     */
    updateSubstitutionTime(value) {
        appState.settings.defaultSubstitutionTime = value ? parseInt(value) : null;
    },

    /**
     * Update substitution default checked setting
     */
    updateSubstitutionDefaultChecked() {
        const checkbox = document.getElementById('substitution-default-checked');
        appState.settings.isSubstitutionDefaultChecked = checkbox.checked;
    },

    /**
     * Save all settings changes to storage
     */
    saveSettings() {
        saveAppData();
        showMessage('Settings saved successfully', 'success');
    },

    /**
     * Open clear data confirmation dialog
     */
    openClearDataDialog() {
        let clearDialog = document.getElementById('clear-data-dialog');
        if (!clearDialog) {
            clearDialog = document.createElement('div');
            clearDialog.id = 'clear-data-dialog';
            clearDialog.className = 'dialog';
            document.getElementById('app').appendChild(clearDialog);
        }

        clearDialog.innerHTML = `
            <div class="dialog-content">
                <h2>Clear All Data?</h2>
                <p>This will delete all team data, players, games, and settings. This action cannot be undone.</p>
                <div class="dialog-buttons">
                    <button class="secondary-btn" onclick="SettingsScreen.closeDialog('clear-data-dialog')">Cancel</button>
                    <button class="primary-btn delete-btn" onclick="SettingsScreen.confirmClearData()">Clear All Data</button>
                </div>
            </div>
        `;

        clearDialog.style.display = 'flex';
        clearDialog.classList.add('active');
    },

    /**
     * Close a dialog by ID
     * @param {string} dialogId - The ID of the dialog to close
     */
    closeDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.style.display = 'none';
            dialog.classList.remove('active');
        }
    },

    /**
     * Confirm and execute clearing all data
     */
    confirmClearData() {
        // Reset app state
        appState.teamName = "My Team";
        appState.players = [];
        appState.games = [];
        appState.formationTemp = [];
        appState.currentGame = null;
        appState.settings = {
            language: 'en',
            defaultSubstitutionTime: null,
            isSubstitutionDefaultChecked: false,
            reusablePlayerIds: []
        };

        // Ensure db is synced first
        if (!window.db && StorageService.db) {
            window.db = StorageService.db;
        }

        // Save cleared state
        saveAppData();

        // Close dialog
        this.closeDialog('clear-data-dialog');

        // Show message and reset UI
        showMessage('All data cleared successfully', 'success');
        updateTeamNameUI();
        TeamSetupScreen.renderPlayersList();
        updatePlayerCounter();
        updateGameReportCounter();
    }
};

// Expose globally
window.SettingsScreen = SettingsScreen;
