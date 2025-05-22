package com.soccercoach.tracker.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.GameAction

@Dao
interface GameActionDao {
    
    @Query("SELECT * FROM game_actions WHERE gameId = :gameId ORDER BY gameTimeInSeconds")
    fun getActionsForGame(gameId: Long): LiveData<List<GameAction>>
    
    @Query("SELECT * FROM game_actions WHERE gameId = :gameId ORDER BY gameTimeInSeconds")
    suspend fun getActionsForGameList(gameId: Long): List<GameAction>
    
    @Query("SELECT * FROM game_actions WHERE gameId = :gameId AND playerId = :playerId ORDER BY gameTimeInSeconds")
    suspend fun getPlayerActionsForGame(gameId: Long, playerId: Long): List<GameAction>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(gameAction: GameAction): Long
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(gameActions: List<GameAction>)
    
    @Update
    suspend fun update(gameAction: GameAction)
    
    @Delete
    suspend fun delete(gameAction: GameAction)
    
    @Query("SELECT COUNT(*) FROM game_actions WHERE gameId = :gameId AND playerId = :playerId AND actionType = :actionType")
    suspend fun countPlayerActionsByType(gameId: Long, playerId: Long, actionType: ActionType): Int
    
    @Query("SELECT COUNT(*) FROM game_actions WHERE gameId = :gameId AND actionType = :actionType")
    suspend fun countActionsByType(gameId: Long, actionType: ActionType): Int
}
