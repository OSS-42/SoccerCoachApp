package com.soccercoach.tracker.ui.main

import androidx.lifecycle.*
import com.soccercoach.tracker.data.repository.GameRepository
import com.soccercoach.tracker.data.repository.PlayerRepository

class MainViewModel(
    private val playerRepository: PlayerRepository,
    private val gameRepository: GameRepository
) : ViewModel() {
    
    val hasPlayers: LiveData<Boolean> = Transformations.map(playerRepository.allActivePlayers) { players ->
        players.isNotEmpty()
    }
    
    val hasCurrentGame: LiveData<Boolean> = Transformations.map(gameRepository.currentGame) { game ->
        game != null
    }
    
    class MainViewModelFactory(
        private val playerRepository: PlayerRepository,
        private val gameRepository: GameRepository
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return MainViewModel(playerRepository, gameRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
