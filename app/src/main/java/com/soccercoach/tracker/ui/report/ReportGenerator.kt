package com.soccercoach.tracker.ui.report

import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.Game
import com.soccercoach.tracker.data.GameAction
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.utils.DateTimeUtils
import java.text.SimpleDateFormat
import java.util.*

class ReportGenerator(
    private val game: Game,
    private val actions: List<GameAction>,
    private val playerMap: Map<Long, Player>
) {
    
    fun generateHtmlReport(): String {
        val dateFormat = SimpleDateFormat("MMMM dd, yyyy", Locale.getDefault())
        val gameDate = dateFormat.format(game.date)
        
        // Calculate player statistics
        val playerStats = calculatePlayerStats()
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 16px;
                        color: #333;
                    }
                    h1 {
                        color: #2c3e50;
                        font-size: 24px;
                        margin-bottom: 16px;
                    }
                    h2 {
                        color: #3498db;
                        font-size: 20px;
                        margin-top: 24px;
                        margin-bottom: 12px;
                    }
                    .game-header {
                        background-color: #f5f5f5;
                        padding: 12px;
                        border-radius: 6px;
                        margin-bottom: 24px;
                    }
                    .score {
                        font-size: 22px;
                        font-weight: bold;
                        text-align: center;
                        margin: 12px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 24px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                </style>
            </head>
            <body>
                <div class="game-header">
                    <h1>Game Report</h1>
                    <p><strong>Date:</strong> ${gameDate}</p>
                    <p><strong>Opponent:</strong> ${game.opponentTeam}</p>
                    <div class="score">Our Team ${game.ourScore} - ${game.opponentScore} ${game.opponentTeam}</div>
                </div>
                
                <h2>Player Statistics</h2>
                <table>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Passes</th>
                        <th>Goals Scored</th>
                        <th>Goals Allowed</th>
                    </tr>
                    ${generatePlayerStatsRows(playerStats)}
                </table>
                
                <h2>Game Timeline</h2>
                <table>
                    <tr>
                        <th>Time</th>
                        <th>Player</th>
                        <th>Action</th>
                    </tr>
                    ${generateTimelineRows()}
                </table>
            </body>
            </html>
        """.trimIndent()
    }
    
    private fun calculatePlayerStats(): List<PlayerStats> {
        val statsMap = mutableMapOf<Long, PlayerStats>()
        
        // Initialize stats for all players
        playerMap.forEach { (id, player) ->
            statsMap[id] = PlayerStats(
                player = player,
                passes = 0,
                goalsScored = 0,
                goalsAllowed = 0
            )
        }
        
        // Count actions
        actions.forEach { action ->
            action.playerId?.let { playerId ->
                val stats = statsMap[playerId] ?: return@let
                
                when (action.actionType) {
                    ActionType.PASS -> stats.passes++
                    ActionType.GOAL_SCORED -> stats.goalsScored++
                    ActionType.GOAL_ALLOWED -> stats.goalsAllowed++
                }
            }
        }
        
        return statsMap.values.sortedBy { it.player.jerseyNumber }
    }
    
    private fun generatePlayerStatsRows(playerStats: List<PlayerStats>): String {
        return playerStats.joinToString("\n") { stats ->
            """
                <tr>
                    <td>${stats.player.jerseyNumber}</td>
                    <td>${stats.player.name}</td>
                    <td>${stats.passes}</td>
                    <td>${stats.goalsScored}</td>
                    <td>${stats.goalsAllowed}</td>
                </tr>
            """.trimIndent()
        }
    }
    
    private fun generateTimelineRows(): String {
        return actions.sortedBy { it.gameTimeInSeconds }.joinToString("\n") { action ->
            val timeFormatted = DateTimeUtils.formatGameTime(action.gameTimeInSeconds)
            val playerName = action.playerId?.let { playerId ->
                playerMap[playerId]?.let { "${it.name} (${it.jerseyNumber})" } ?: "Unknown Player"
            } ?: "Unknown Player"
            
            val actionText = when (action.actionType) {
                ActionType.PASS -> "Pass"
                ActionType.GOAL_SCORED -> "Goal Scored"
                ActionType.GOAL_ALLOWED -> "Goal Allowed"
            }
            
            """
                <tr>
                    <td>${timeFormatted}</td>
                    <td>${playerName}</td>
                    <td>${actionText}</td>
                </tr>
            """.trimIndent()
        }
    }
    
    data class PlayerStats(
        val player: Player,
        var passes: Int,
        var goalsScored: Int,
        var goalsAllowed: Int
    )
}
