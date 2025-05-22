package com.soccercoach.tracker

import android.app.Application
import com.soccercoach.tracker.data.AppDatabase
import com.soccercoach.tracker.data.repository.GameRepository
import com.soccercoach.tracker.data.repository.PlayerRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

class SoccerCoachApp : Application() {
    
    // Application scope
    private val applicationScope = CoroutineScope(SupervisorJob())
    
    // Database instance
    val database by lazy { AppDatabase.getDatabase(this, applicationScope) }
    
    // Repositories
    val playerRepository by lazy { PlayerRepository(database.playerDao()) }
    val gameRepository by lazy { GameRepository(database.gameDao(), database.gameActionDao()) }
}
