package com.soccercoach.tracker.ui.game

import android.os.Handler
import android.os.Looper
import androidx.lifecycle.*
import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.Game
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.data.repository.GameRepository
import com.soccercoach.tracker.data.repository.PlayerRepository
import kotlinx.coroutines.launch

class GameViewModel(
    private val playerRepository: PlayerRepository,
    private val gameRepository: GameRepository
) : ViewModel() {
    
    private val _currentGameId = MutableLiveData<Long>(0)
    val currentGameId: LiveData<Long> = _currentGameId
    
    val currentGame: LiveData<Game?> = gameRepository.currentGame
    
    val players: LiveData<List<Player>> = playerRepository.allActivePlayers
    
    private val _gameTimeRunning = MutableLiveData<Boolean>(false)
    val gameTimeRunning: LiveData<Boolean> = _gameTimeRunning
    
    private val _currentGameTime = MutableLiveData<Int>(0)
    val currentGameTime: LiveData<Int> = _currentGameTime
    
    // Current game score: Pair(ourScore, opponentScore)
    private val _currentGameScore = MutableLiveData<Pair<Int, Int>>(Pair(0, 0))
    val currentGameScore: LiveData<Pair<Int, Int>> = _currentGameScore
    
    private val _substitutionTimerDuration = MutableLiveData<Int>(300) // 5 minutes by default
    val substitutionTimerDuration: LiveData<Int> = _substitutionTimerDuration
    
    private val handler = Handler(Looper.getMainLooper())
    private val gameTimeRunnable = object : Runnable {
        override fun run() {
            if (_gameTimeRunning.value == true) {
                _currentGameTime.value = (_currentGameTime.value ?: 0) + 1
                handler.postDelayed(this, 1000)
            }
        }
    }
    
    init {
        // Initialize with current game if exists
        viewModelScope.launch {
            currentGame.value?.let { game ->
                _currentGameId.value = game.id
                _currentGameScore.value = Pair(game.ourScore, game.opponentScore)
            }
        }
    }
    
    fun createNewGame(opponentTeam: String) {
        viewModelScope.launch {
            val gameId = gameRepository.createGame(opponentTeam)
            _currentGameId.value = gameId
            _currentGameTime.value = 0
            _gameTimeRunning.value = false
            _currentGameScore.value = Pair(0, 0)
        }
    }
    
    fun recordPlayerAction(playerId: Long, actionType: ActionType) {
        _currentGameId.value?.let { gameId ->
            if (gameId > 0) {
                viewModelScope.launch {
                    gameRepository.recordPlayerAction(
                        gameId = gameId,
                        playerId = playerId,
                        actionType = actionType,
                        gameTimeInSeconds = _currentGameTime.value ?: 0
                    )
                    
                    // Update the score
                    when (actionType) {
                        ActionType.GOAL_SCORED -> {
                            val currentScore = _currentGameScore.value ?: Pair(0, 0)
                            _currentGameScore.value = Pair(currentScore.first + 1, currentScore.second)
                        }
                        ActionType.GOAL_ALLOWED -> {
                            val currentScore = _currentGameScore.value ?: Pair(0, 0)
                            _currentGameScore.value = Pair(currentScore.first, currentScore.second + 1)
                        }
                        else -> {} // No score update for passes
                    }
                }
            }
        }
    }
    
    fun toggleGameTime() {
        if (_gameTimeRunning.value == true) {
            pauseGameTime()
        } else {
            startGameTime()
        }
    }
    
    fun startGameTime() {
        if (_gameTimeRunning.value != true) {
            _gameTimeRunning.value = true
            handler.post(gameTimeRunnable)
        }
    }
    
    fun pauseGameTime() {
        _gameTimeRunning.value = false
        handler.removeCallbacks(gameTimeRunnable)
    }
    
    fun setSubstitutionTimerDuration(durationInSeconds: Int) {
        _substitutionTimerDuration.value = durationInSeconds
    }
    
    fun endCurrentGame() {
        _currentGameId.value?.let { gameId ->
            if (gameId > 0) {
                viewModelScope.launch {
                    gameRepository.completeGame(gameId)
                }
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        handler.removeCallbacks(gameTimeRunnable)
    }
    
    class GameViewModelFactory(
        private val playerRepository: PlayerRepository,
        private val gameRepository: GameRepository
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(GameViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return GameViewModel(playerRepository, gameRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
