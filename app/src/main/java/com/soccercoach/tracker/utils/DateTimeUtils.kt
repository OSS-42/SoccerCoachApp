package com.soccercoach.tracker.utils

import java.text.SimpleDateFormat
import java.util.*

object DateTimeUtils {
    
    /**
     * Formats game time in seconds to a readable MM:SS format
     */
    fun formatGameTime(seconds: Int): String {
        val minutes = seconds / 60
        val remainingSeconds = seconds % 60
        return String.format("%02d:%02d", minutes, remainingSeconds)
    }
    
    /**
     * Formats a Date object to a string using the specified format
     */
    fun formatDate(date: Date, pattern: String = "yyyy-MM-dd"): String {
        val dateFormat = SimpleDateFormat(pattern, Locale.getDefault())
        return dateFormat.format(date)
    }
    
    /**
     * Formats a Date object to a datetime string
     */
    fun formatDateTime(date: Date): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
        return dateFormat.format(date)
    }
    
    /**
     * Gets the start of the day for a given date
     */
    fun getStartOfDay(date: Date): Date {
        val calendar = Calendar.getInstance()
        calendar.time = date
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        return calendar.time
    }
    
    /**
     * Gets the end of the day for a given date
     */
    fun getEndOfDay(date: Date): Date {
        val calendar = Calendar.getInstance()
        calendar.time = date
        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        calendar.set(Calendar.MILLISECOND, 999)
        return calendar.time
    }
}
