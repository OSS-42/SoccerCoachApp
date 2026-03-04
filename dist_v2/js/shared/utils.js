// Shared utility helpers (kept minimal and side-effect free)
window.getPlayerName = function(playerId) {
    if (!playerId) return 'Unknown Player';
    const player = appState.players ? appState.players.find(p => p.id === playerId) : null;
    return player ? `#${player.jerseyNumber} ${player.name}` : 'Unknown Player';
};

window.formatActionType = function(actionType) {
    const typeMap = {
        'goal': '⚽ Goal',
        'assist': '👟 Assist',
        'save': '🧤 Save',
        'goals_allowed': '🔴 Goal Allowed',
        'yellow_card': '🟨 Yellow Card',
        'red_card': '🟥 Red Card',
        'fault': '⚠️ Fault',
        'blocked_shot': '❌ Blocked Shot',
        'late_to_game': '⏰ Late to Game',
        'own_goal': '⚽ Own Goal',
        'shot_on_goal': '🎯 Shot on Goal'
    };
    return typeMap[actionType] || actionType;
};

window.formatTimestamp = function(timestamp) {
    if (!timestamp) return '';
    try {
        const d = new Date(timestamp);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch (e) {
        return String(timestamp);
    }
};

// Small helper to render a compact player stat table; used by report rendering
window.buildPlayerStatTable = function(stats) {
    let statTable = '<table class="player-stats-table">';
    if (stats.goals?.length > 0) statTable += `<tr><th>⚽</th><td>${stats.goals.length}</td></tr>`;
    if (stats.assists > 0) statTable += `<tr><th>👟</th><td>${stats.assists}</td></tr>`;
    if (stats.saves > 0) statTable += `<tr><th>🧤</th><td>${stats.saves}</td></tr>`;
    if (stats.shotOnGoal > 0) statTable += `<tr><th>🎯</th><td>${stats.shotOnGoal}</td></tr>`;
    if (stats.goalsAllowed > 0) statTable += `<tr><th><img src="img/red-soccer.png" style="width:18px;height:18px;"></th><td>${stats.goalsAllowed}</td></tr>`;
    if (stats.blockedShots > 0) statTable += `<tr><th>❌</th><td>${stats.blockedShots}</td></tr>`;
    if (stats.faults > 0) statTable += `<tr><th>⚠️</th><td>${stats.faults}</td></tr>`;
    if (stats.yellowCards?.length > 0) statTable += `<tr><th>🟨</th><td>${stats.yellowCards.length}</td></tr>`;
    const redCards = (stats.redCards?.length || 0) + (stats.yellowCards?.length >= 2 ? 1 : 0);
    if (redCards > 0) statTable += `<tr><th>🟥</th><td>${redCards}</td></tr>`;
    statTable += '</table>';
    return statTable;
};
