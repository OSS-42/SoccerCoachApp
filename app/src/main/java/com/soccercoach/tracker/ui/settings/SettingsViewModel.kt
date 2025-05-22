package com.soccercoach.tracker.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.soccercoach.tracker.data.repository.PlayerRepository
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val playerRepository: PlayerRepository
) : ViewModel() {
    
    fun resetTeam() {
        viewModelScope.launch {
            playerRepository.deactivateAllPlayers()
        }
    }
    
    class SettingsViewModelFactory(
        private val playerRepository: PlayerRepository
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(SettingsViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return SettingsViewModel(playerRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
