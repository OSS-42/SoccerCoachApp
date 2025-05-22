package com.soccercoach.tracker.ui.report

import android.content.Context
import androidx.lifecycle.*
import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.Game
import com.soccercoach.tracker.data.GameAction
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.data.repository.GameRepository
import com.soccercoach.tracker.data.repository.PlayerRepository
import com.soccercoach.tracker.utils.DateTimeUtils
import com.soccercoach.tracker.utils.ImageExporter
import com.soccercoach.tracker.utils.PdfExporter
import kotlinx.coroutines.launch
import java.io.File

class ReportViewModel(
    private val gameRepository: GameRepository,
    private val playerRepository: PlayerRepository
) : ViewModel() {
    
    private val _completedGames = MutableLiveData<List<Game>>()
    val completedGames: LiveData<List<Game>> = _completedGames
    
    private val _selectedGame = MutableLiveData<Game?>()
    
    private val _reportHtml = MutableLiveData<String>()
    val reportHtml: LiveData<String> = _reportHtml
    
    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage
    
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    init {
        loadCompletedGames()
    }
    
    private fun loadCompletedGames() {
        viewModelScope.launch {
            val games = gameRepository.allGames.value?.filter { it.completed } ?: emptyList()
            _completedGames.value = games
            
            if (games.isNotEmpty()) {
                selectGame(games.first().id)
            }
        }
    }
    
    fun selectGame(gameId: Long) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val game = gameRepository.getGameById(gameId)
                _selectedGame.value = game
                
                if (game != null) {
                    generateReport(game)
                } else {
                    _errorMessage.value = "Game not found"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error loading game: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    private suspend fun generateReport(game: Game) {
        try {
            val actions = gameRepository.getActionsForGameList(game.id)
            val players = playerRepository.getAllActivePlayersList()
            val playerMap = players.associateBy { it.id }
            
            val reportGenerator = ReportGenerator(game, actions, playerMap)
            val reportHtml = reportGenerator.generateHtmlReport()
            
            _reportHtml.postValue(reportHtml)
        } catch (e: Exception) {
            _errorMessage.postValue("Error generating report: ${e.message}")
        }
    }
    
    fun generatePdfReport(context: Context, onPdfGenerated: (File) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val game = _selectedGame.value
                if (game == null) {
                    _errorMessage.value = "No game selected"
                    return@launch
                }
                
                val actions = gameRepository.getActionsForGameList(game.id)
                val players = playerRepository.getAllActivePlayersList()
                val playerMap = players.associateBy { it.id }
                
                val reportGenerator = ReportGenerator(game, actions, playerMap)
                val htmlContent = reportGenerator.generateHtmlReport()
                
                val pdfExporter = PdfExporter(context)
                val file = pdfExporter.generatePdf(
                    htmlContent,
                    "soccer_report_${game.id}_${System.currentTimeMillis()}.pdf"
                )
                
                onPdfGenerated(file)
            } catch (e: Exception) {
                _errorMessage.value = "Error generating PDF: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun generateImageReport(context: Context, onImageGenerated: (File) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val game = _selectedGame.value
                if (game == null) {
                    _errorMessage.value = "No game selected"
                    return@launch
                }
                
                val actions = gameRepository.getActionsForGameList(game.id)
                val players = playerRepository.getAllActivePlayersList()
                val playerMap = players.associateBy { it.id }
                
                val reportGenerator = ReportGenerator(game, actions, playerMap)
                val htmlContent = reportGenerator.generateHtmlReport()
                
                val imageExporter = ImageExporter(context)
                val file = imageExporter.generateImage(
                    htmlContent,
                    "soccer_report_${game.id}_${System.currentTimeMillis()}.png"
                )
                
                onImageGenerated(file)
            } catch (e: Exception) {
                _errorMessage.value = "Error generating image: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    class ReportViewModelFactory(
        private val gameRepository: GameRepository,
        private val playerRepository: PlayerRepository
    ) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(ReportViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return ReportViewModel(gameRepository, playerRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
