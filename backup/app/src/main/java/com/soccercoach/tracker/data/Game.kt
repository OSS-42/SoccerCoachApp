package com.soccercoach.tracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date

@Entity(tableName = "games")
data class Game(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val date: Date,
    val opponentTeam: String,
    val ourScore: Int = 0,
    val opponentScore: Int = 0,
    val completed: Boolean = false
)
