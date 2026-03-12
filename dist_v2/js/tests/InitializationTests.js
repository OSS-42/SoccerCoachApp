/**
 * Unit Tests for Initialization Logic (v1.12.43)
 * Tests: StateInit.js, loadAppData(), team creation, data migration
 * 
 * Run tests by including this file in index.html before app.js
 * Or call runAllInitTests() from console
 */

class InitializationTests {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const styles = {
            'pass': 'color: #4CAF50; font-weight: bold;',
            'fail': 'color: #F44336; font-weight: bold;',
            'test': 'color: #2196F3; font-weight: bold;',
            'info': 'color: #666;'
        };
        console.log(`%c[${timestamp}] ${message}`, styles[type] || styles.info);
    }
    
    assert(condition, testName, errorMsg = '') {
        if (condition) {
            this.log(`✅ PASS: ${testName}`, 'pass');
            this.passed++;
            this.results.push({ test: testName, status: 'PASS' });
        } else {
            this.log(`❌ FAIL: ${testName} - ${errorMsg}`, 'fail');
            this.failed++;
            this.results.push({ test: testName, status: 'FAIL', error: errorMsg });
        }
    }
    
    assertEquals(actual, expected, testName) {
        const match = actual === expected;
        const errorMsg = `Expected ${expected}, got ${actual}`;
        this.assert(match, testName, errorMsg);
    }
    
    assertGreaterThan(actual, minimum, testName) {
        const match = actual > minimum;
        const errorMsg = `Expected > ${minimum}, got ${actual}`;
        this.assert(match, testName, errorMsg);
    }
    
    // =====================================================================
    // TEST 1: StateInit.js initialization
    // =====================================================================
    testStateInitialization() {
        this.log('\n🧪 TEST 1: StateInit.js Initialization', 'test');
        
        // Check appState exists
        this.assert(window.appState !== undefined, 'appState is defined');
        
        // Check appState structure
        this.assert(Array.isArray(window.appState.teams), 'appState.teams is an array');
        this.assertEquals(window.appState.teams.length, 0, 'appState.teams starts as empty array');
        this.assertEquals(window.appState.currentTeamId, null, 'currentTeamId starts as null');
        
        // Check settings exist
        this.assert(window.appState.settings !== undefined, 'appState.settings exists');
        this.assert(window.appState.settings.language === 'en', 'Default language is English');
        
        // Check getCurrentTeam function
        this.assert(typeof window.getCurrentTeam === 'function', 'getCurrentTeam function exists');
    }
    
    // =====================================================================
    // TEST 2: createDefaultTeams function
    // =====================================================================
    testCreateDefaultTeams() {
        this.log('\n🧪 TEST 2: createDefaultTeams() Function', 'test');
        
        // Reset state
        window.appState.teams = [];
        window.appState.currentTeamId = null;
        
        // Check function exists
        this.assert(typeof window.createDefaultTeams === 'function', 'createDefaultTeams function exists');
        
        // Call function
        window.createDefaultTeams();
        
        // Verify teams were created
        this.assertEquals(window.appState.teams.length, 2, 'Creates exactly 2 teams');
        
        // Verify team structure
        const team1 = window.appState.teams[0];
        const team2 = window.appState.teams[1];
        
        this.assertEquals(team1.id, 't1', 'Team 1 has id=t1');
        this.assertEquals(team2.id, 't2', 'Team 2 has id=t2');
        
        this.assertEquals(team1.name, 'Team A', 'Team 1 name is "Team A"');
        this.assertEquals(team2.name, 'Team B', 'Team 2 name is "Team B"');
        
        // Verify team properties
        this.assert(Array.isArray(team1.players), 'Team 1 has players array');
        this.assert(Array.isArray(team1.games), 'Team 1 has games array');
        this.assert(team1.settings !== undefined, 'Team 1 has settings');
        
        this.assertEquals(window.appState.currentTeamId, 't1', 'currentTeamId set to t1');
    }
    
    // =====================================================================
    // TEST 3: migrateLegacyData function
    // =====================================================================
    testMigrateLegacyData() {
        this.log('\n🧪 TEST 3: migrateLegacyData() Function', 'test');
        
        // Check function exists
        this.assert(typeof window.migrateLegacyData === 'function', 'migrateLegacyData function exists');
        
        // Create legacy data
        window.appState.teams = [];
        window.appState.currentTeamId = null;
        window.appState.teamName = 'Legacy Team';
        window.appState.players = [
            { id: 'p1', firstName: 'John', lastName: 'Doe', shirtNumber: 1 },
            { id: 'p2', firstName: 'Jane', lastName: 'Smith', shirtNumber: 2 }
        ];
        window.appState.games = [];
        window.appState.unavailablePlayers = [];
        
        // Call migration
        window.migrateLegacyData();
        
        // Verify conversion
        this.assertEquals(window.appState.teams.length, 2, 'Migration creates 2 teams');
        
        const team1 = window.appState.teams[0];
        this.assertEquals(team1.name, 'Legacy Team', 'Team 1 uses migrated team name');
        this.assertEquals(team1.players.length, 2, 'Team 1 has migrated players');
        this.assertEquals(team1.players[0].firstName, 'John', 'Players migrated correctly');
        
        // Verify legacy fields cleaned up
        this.assert(window.appState.teamName === undefined, 'Legacy teamName field deleted');
        this.assert(window.appState.players === undefined, 'Legacy players field deleted');
    }
    
    // =====================================================================
    // TEST 4: localStorage handling
    // =====================================================================
    testLocalStorageHandling() {
        this.log('\n🧪 TEST 4: localStorage Handling', 'test');
        
        // Test clearing localStorage
        try {
            localStorage.removeItem('soccerCoachApp');
            localStorage.removeItem('soccerCoachApp2');
            this.log('Cleared all localStorage keys', 'info');
        } catch (e) {
            this.log('⚠️  Cannot access localStorage: ' + e.message, 'info');
            return;
        }
        
        // Verify localStorage is empty
        const hasNew = localStorage.getItem('soccerCoachApp2') !== null;
        const hasOld = localStorage.getItem('soccerCoachApp') !== null;
        
        this.assertEquals(hasNew || hasOld, false, 'localStorage is empty for fresh start');
        
        // Save new format data
        const testData = {
            teams: [
                { id: 't1', name: 'Test Team', players: [], games: [], settings: {}, unavailablePlayers: [], formationTemp: null }
            ],
            currentTeamId: 't1',
            settings: {}
        };
        
        try {
            localStorage.setItem('soccerCoachApp2', JSON.stringify(testData));
            const retrieved = JSON.parse(localStorage.getItem('soccerCoachApp2'));
            this.assertEquals(retrieved.teams.length, 1, 'Can save and retrieve data from localStorage');
            localStorage.removeItem('soccerCoachApp2');
        } catch (e) {
            this.log('⚠️  Cannot write to localStorage: ' + e.message, 'info');
        }
    }
    
    // =====================================================================
    // TEST 5: loadAppData() with fresh start
    // =====================================================================
    async testLoadAppDataFresh() {
        this.log('\n🧪 TEST 5: loadAppData() - Fresh Start (No Data)', 'test');
        
        // Clear localStorage
        localStorage.removeItem('soccerCoachApp');
        localStorage.removeItem('soccerCoachApp2');
        
        // Reset state
        window.appState.teams = [];
        window.appState.currentTeamId = null;
        
        // Load data
        await window.loadAppData();
        
        // Verify defaults created
        this.assertGreaterThan(window.appState.teams.length, 0, 'Teams created on fresh start');
        this.assertEquals(window.appState.teams.length, 2, 'Exactly 2 default teams created');
        this.assert(window.appState.currentTeamId !== null, 'currentTeamId is set');
        this.assert(window.appState.teams.some(t => t.id === window.appState.currentTeamId), 
                   'currentTeamId points to valid team');
    }
    
    // =====================================================================
    // TEST 6: loadAppData() with existing data
    // =====================================================================
    async testLoadAppDataExisting() {
        this.log('\n🧪 TEST 6: loadAppData() - With Existing Data', 'test');
        
        // Save test data
        const testData = {
            teams: [
                { 
                    id: 't1', 
                    name: 'Saved Team A', 
                    players: [{ id: 'p1', firstName: 'Player', lastName: 'One', shirtNumber: 1 }], 
                    games: [], 
                    settings: {}, 
                    unavailablePlayers: [], 
                    formationTemp: null 
                },
                { 
                    id: 't2', 
                    name: 'Saved Team B', 
                    players: [], 
                    games: [], 
                    settings: {}, 
                    unavailablePlayers: [], 
                    formationTemp: null 
                }
            ],
            currentTeamId: 't1',
            settings: {}
        };
        
        try {
            localStorage.setItem('soccerCoachApp2', JSON.stringify(testData));
            
            // Reset state
            window.appState.teams = [];
            window.appState.currentTeamId = null;
            
            // Load data
            await window.loadAppData();
            
            // Verify data loaded
            this.assertEquals(window.appState.teams.length, 2, 'Loaded 2 teams from localStorage');
            this.assertEquals(window.appState.teams[0].name, 'Saved Team A', 'Team A data loaded correctly');
            this.assertEquals(window.appState.teams[0].players.length, 1, 'Players loaded with team');
            this.assertEquals(window.appState.currentTeamId, 't1', 'currentTeamId loaded correctly');
        } finally {
            localStorage.removeItem('soccerCoachApp2');
        }
    }
    
    // =====================================================================
    // TEST 7: getCurrentTeam helper
    // =====================================================================
    testGetCurrentTeam() {
        this.log('\n🧪 TEST 7: getCurrentTeam() Helper Function', 'test');
        
        // Reset and create teams
        window.appState.teams = [];
        window.createDefaultTeams();
        
        // Get current team
        const currentTeam = window.getCurrentTeam();
        
        this.assert(currentTeam !== null, 'getCurrentTeam() returns a team');
        this.assertEquals(currentTeam.id, 't1', 'Returns correct team by currentTeamId');
        this.assertEquals(currentTeam.name, 'Team A', 'Team has correct name');
    }
    
    // =====================================================================
    // Main test runner
    // =====================================================================
    async runAll() {
        this.log('\n\n' + '='.repeat(70), 'test');
        this.log('🚀 INITIALIZATION UNIT TESTS (v1.12.43)', 'test');
        this.log('='.repeat(70) + '\n', 'test');
        
        try {
            this.testStateInitialization();
            this.testCreateDefaultTeams();
            this.testMigrateLegacyData();
            this.testLocalStorageHandling();
            await this.testLoadAppDataFresh();
            await this.testLoadAppDataExisting();
            this.testGetCurrentTeam();
        } catch (err) {
            this.log(`❌ FATAL ERROR: ${err.message}`, 'fail');
            console.error(err);
        }
        
        // Summary
        this.log('\n' + '='.repeat(70), 'test');
        this.log(`📊 TEST RESULTS`, 'test');
        this.log('='.repeat(70), 'test');
        this.log(`✅ Passed: ${this.passed}`, 'pass');
        this.log(`❌ Failed: ${this.failed}`, this.failed > 0 ? 'fail' : 'pass');
        this.log(`📈 Total: ${this.passed + this.failed}`, 'test');
        this.log('='.repeat(70) + '\n', 'test');
        
        if (this.failed === 0) {
            this.log('🎉 ALL TESTS PASSED! 🎉', 'pass');
        } else {
            this.log('⚠️  SOME TESTS FAILED - See details above', 'fail');
        }
        
        return {
            passed: this.passed,
            failed: this.failed,
            results: this.results
        };
    }
}

// Global function to run tests
window.runAllInitTests = async function() {
    if (!window.appState) {
        console.error('❌ appState not initialized - StateInit.js may not have loaded');
        return;
    }
    
    const tester = new InitializationTests();
    return await tester.runAll();
};

// Auto-run tests if this is a test page
if (document.title.includes('Test') || document.location.hash.includes('test')) {
    console.log('Test mode detected - will run tests after page loads');
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.runAllInitTests(), 1000);
    });
}
