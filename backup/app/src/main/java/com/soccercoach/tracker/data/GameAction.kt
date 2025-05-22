package com.soccercoach.tracker.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

enum class ActionType {
    PASS,
    GOAL_SCORED,
    GOAL_ALLOWED
}

@Entity(
    tableName = "game_actions",
    foreignKeys = [
        ForeignKey(
            entity = Game::class,
            parentColumns = ["id"],
            childColumns = ["gameId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Player::class,
            parentColumns = ["id"],
            childColumns = ["playerId"],
            onDelete = ForeignKey.SET_NULL
        )
    ],
    indices = [
        Index("gameId"),
        Index("playerId")
    ]
)
data class GameAction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val gameId: Long,
    val playerId: Long?,
    val actionType: ActionType,
    val gameTimeInSeconds: Int,  // Time in seconds from the start of the game
    val timestamp: Long  // Timestamp when the action was recorded
)
