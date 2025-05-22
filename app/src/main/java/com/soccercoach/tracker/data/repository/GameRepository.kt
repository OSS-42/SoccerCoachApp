package com.soccercoach.tracker.data.repository

import androidx.lifecycle.LiveData
import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.Game
import com.soccercoach.tracker.data.GameAction
import com.soccercoach.tracker.data.dao.GameActionDao
import com.soccercoach.tracker.data.dao.GameDao
import java.util.Date

class GameRepository(
    private val gameDao: GameDao,
    private val gameActionDao: GameActionDao
) {
    
    val allGames: LiveData<List<Game>> = gameDao.getAllGames()
    val currentGame: LiveData<Game?> = gameDao.getCurrentGame()
    
    suspend fun getGameById(gameId: Long): Game? {
        return gameDao.getGameById(gameId)
    }
    
    fun getActionsForGame(gameId: Long): LiveData<List<GameAction>> {
        return gameActionDao.getActionsForGame(gameId)
    }
    
    suspend fun getActionsForGameList(gameId: Long): List<GameAction> {
        return gameActionDao.getActionsForGameList(gameId)
    }
    
    suspend fun getPlayerActionsForGame(gameId: Long, playerId: Long): List<GameAction> {
        return gameActionDao.getPlayerActionsForGame(gameId, playerId)
    }
    
    suspend fun createGame(opponentTeam: String): Long {
        val game = Game(
            date = Date(),
            opponentTeam = opponentTeam
        )
        return gameDao.insert(game)
    }
    
    suspend fun updateGame(game: Game) {
        gameDao.update(game)
    }
    
    suspend fun deleteGame(game: Game) {
        gameDao.delete(game)
    }
    
    suspend fun completeGame(gameId: Long) {
        gameDao.markGameAsCompleted(gameId)
    }
    
    suspend fun recordPlayerAction(
        gameId: Long,
        playerId: Long,
        actionType: ActionType,
        gameTimeInSeconds: Int
    ): Long {
        val action = GameAction(
            gameId = gameId,
            playerId = playerId,
            actionType = actionType,
            gameTimeInSeconds = gameTimeInSeconds,
            timestamp = System.currentTimeMillis()
        )
        
        // Update game score if action is a goal
        when (actionType) {
            ActionType.GOAL_SCORED -> gameDao.incrementOurScore(gameId)
            ActionType.GOAL_ALLOWED -> gameDao.incrementOpponentScore(gameId)
            else -> { /* No score update needed for other actions */ }
        }
        
        return gameActionDao.insert(action)
    }
    
    suspend fun getGamesBetweenDates(startDate: Date, endDate: Date): List<Game> {
        return gameDao.getGamesBetweenDates(startDate, endDate)
    }
    
    suspend fun countPlayerActionsByType(gameId: Long, playerId: Long, actionType: ActionType): Int {
        return gameActionDao.countPlayerActionsByType(gameId, playerId, actionType)
    }
    
    suspend fun countActionsByType(gameId: Long, actionType: ActionType): Int {
        return gameActionDao.countActionsByType(gameId, actionType)
    }
}
