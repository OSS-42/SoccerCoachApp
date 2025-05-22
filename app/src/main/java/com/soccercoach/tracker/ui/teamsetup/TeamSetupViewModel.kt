package com.soccercoach.tracker.ui.teamsetup

import androidx.lifecycle.*
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.data.repository.PlayerRepository
import kotlinx.coroutines.launch

class TeamSetupViewModel(
    private val playerRepository: PlayerRepository
) : ViewModel() {
    
    val allPlayers: LiveData<List<Player>> = playerRepository.allActivePlayers
    
    fun addPlayer(jerseyNumber: Int, name: String) {
        viewModelScope.launch {
            val player = Player(
                jerseyNumber = jerseyNumber,
                name = name
            )
            playerRepository.insert(player)
        }
    }
    
    fun updatePlayer(playerId: Long, jerseyNumber: Int, name: String) {
        viewModelScope.launch {
            playerRepository.getPlayerById(playerId)?.let { player ->
                val updatedPlayer = player.copy(
                    jerseyNumber = jerseyNumber,
                    name = name
                )
                playerRepository.update(updatedPlayer)
            }
        }
    }
    
    fun deletePlayer(playerId: Long) {
        viewModelScope.launch {
            playerRepository.getPlayerById(playerId)?.let { player ->
                val deactivatedPlayer = player.copy(active = false)
                playerRepository.update(deactivatedPlayer)
            }
        }
    }
    
    fun resetTeam() {
        viewModelScope.launch {
            playerRepository.deactivateAllPlayers()
        }
    }
    
    fun getPlayerById(playerId: Long, callback: (Player?) -> Unit) {
        viewModelScope.launch {
            val player = playerRepository.getPlayerById(playerId)
            callback(player)
        }
    }
    
    fun checkJerseyNumberAvailability(jerseyNumber: Int, playerId: Long = 0, callback: (Boolean) -> Unit) {
        viewModelScope.launch {
            val isAvailable = !playerRepository.isJerseyNumberTaken(jerseyNumber, playerId)
            callback(isAvailable)
        }
    }
    
    class TeamSetupViewModelFactory(
        private val playerRepository: PlayerRepository
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(TeamSetupViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return TeamSetupViewModel(playerRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
