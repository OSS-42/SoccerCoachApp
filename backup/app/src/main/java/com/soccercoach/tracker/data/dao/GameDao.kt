package com.soccercoach.tracker.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.soccercoach.tracker.data.Game
import java.util.Date

@Dao
interface GameDao {
    
    @Query("SELECT * FROM games ORDER BY date DESC")
    fun getAllGames(): LiveData<List<Game>>
    
    @Query("SELECT * FROM games WHERE completed = 0 LIMIT 1")
    fun getCurrentGame(): LiveData<Game?>
    
    @Query("SELECT * FROM games WHERE id = :gameId")
    suspend fun getGameById(gameId: Long): Game?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(game: Game): Long
    
    @Update
    suspend fun update(game: Game)
    
    @Delete
    suspend fun delete(game: Game)
    
    @Query("UPDATE games SET ourScore = ourScore + 1 WHERE id = :gameId")
    suspend fun incrementOurScore(gameId: Long)
    
    @Query("UPDATE games SET opponentScore = opponentScore + 1 WHERE id = :gameId")
    suspend fun incrementOpponentScore(gameId: Long)
    
    @Query("UPDATE games SET completed = 1 WHERE id = :gameId")
    suspend fun markGameAsCompleted(gameId: Long)
    
    @Query("SELECT * FROM games WHERE date BETWEEN :startDate AND :endDate ORDER BY date")
    suspend fun getGamesBetweenDates(startDate: Date, endDate: Date): List<Game>
}
