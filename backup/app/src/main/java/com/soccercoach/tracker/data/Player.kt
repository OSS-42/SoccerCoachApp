package com.soccercoach.tracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "players")
data class Player(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val jerseyNumber: Int,
    val name: String,
    val active: Boolean = true
)
