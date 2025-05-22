package com.soccercoach.tracker.ui.game

import android.os.CountDownTimer
import android.view.View
import android.widget.TextView
import kotlin.math.max

class SubstitutionTimer(
    private val timerView: View,
    private val timerTextView: TextView,
    initialDurationSeconds: Int,
    private val onTimerFinished: () -> Unit
) {
    
    private var durationInMillis = initialDurationSeconds * 1000L
    private var remainingTimeInMillis = durationInMillis
    private var isRunning = false
    private var countDownTimer: CountDownTimer? = null
    
    init {
        updateTimerDisplay()
    }
    
    fun start() {
        if (isRunning) return
        
        countDownTimer?.cancel()
        
        countDownTimer = object : CountDownTimer(remainingTimeInMillis, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                remainingTimeInMillis = millisUntilFinished
                updateTimerDisplay()
            }
            
            override fun onFinish() {
                remainingTimeInMillis = 0
                isRunning = false
                updateTimerDisplay()
                onTimerFinished()
            }
        }.start()
        
        isRunning = true
    }
    
    fun pause() {
        countDownTimer?.cancel()
        isRunning = false
    }
    
    fun reset() {
        countDownTimer?.cancel()
        remainingTimeInMillis = durationInMillis
        isRunning = false
        updateTimerDisplay()
    }
    
    fun stop() {
        countDownTimer?.cancel()
        countDownTimer = null
    }
    
    fun setDuration(durationSeconds: Int) {
        durationInMillis = durationSeconds * 1000L
        reset()
    }
    
    private fun updateTimerDisplay() {
        val seconds = max(0, remainingTimeInMillis / 1000).toInt()
        val minutes = seconds / 60
        val displaySeconds = seconds % 60
        
        val timeString = String.format("%02d:%02d", minutes, displaySeconds)
        timerTextView.text = timeString
    }
}
