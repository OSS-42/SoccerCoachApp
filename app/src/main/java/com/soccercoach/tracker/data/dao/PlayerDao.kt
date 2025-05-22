package com.soccercoach.tracker.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.soccercoach.tracker.data.Player

@Dao
interface PlayerDao {
    
    @Query("SELECT * FROM players WHERE active = 1 ORDER BY jerseyNumber")
    fun getAllActivePlayers(): LiveData<List<Player>>
    
    @Query("SELECT * FROM players WHERE active = 1 ORDER BY jerseyNumber")
    suspend fun getAllActivePlayersList(): List<Player>
    
    @Query("SELECT * FROM players WHERE id = :playerId")
    suspend fun getPlayerById(playerId: Long): Player?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(player: Player): Long
    
    @Update
    suspend fun update(player: Player)
    
    @Delete
    suspend fun delete(player: Player)
    
    @Query("UPDATE players SET active = 0")
    suspend fun deactivateAllPlayers()
    
    @Query("DELETE FROM players")
    suspend fun deleteAllPlayers()
    
    @Query("SELECT EXISTS(SELECT 1 FROM players WHERE jerseyNumber = :jerseyNumber AND active = 1 AND id != :playerId LIMIT 1)")
    suspend fun isJerseyNumberTaken(jerseyNumber: Int, playerId: Long = 0): Boolean
}
