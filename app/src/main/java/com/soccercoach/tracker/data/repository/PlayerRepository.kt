package com.soccercoach.tracker.data.repository

import androidx.lifecycle.LiveData
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.data.dao.PlayerDao

class PlayerRepository(private val playerDao: PlayerDao) {
    
    val allActivePlayers: LiveData<List<Player>> = playerDao.getAllActivePlayers()
    
    suspend fun getAllActivePlayersList(): List<Player> {
        return playerDao.getAllActivePlayersList()
    }
    
    suspend fun getPlayerById(playerId: Long): Player? {
        return playerDao.getPlayerById(playerId)
    }
    
    suspend fun insert(player: Player): Long {
        return playerDao.insert(player)
    }
    
    suspend fun update(player: Player) {
        playerDao.update(player)
    }
    
    suspend fun delete(player: Player) {
        playerDao.delete(player)
    }
    
    suspend fun deactivateAllPlayers() {
        playerDao.deactivateAllPlayers()
    }
    
    suspend fun deleteAllPlayers() {
        playerDao.deleteAllPlayers()
    }
    
    suspend fun isJerseyNumberTaken(jerseyNumber: Int, playerId: Long = 0): Boolean {
        return playerDao.isJerseyNumberTaken(jerseyNumber, playerId)
    }
}
