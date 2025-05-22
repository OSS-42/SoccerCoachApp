package com.soccercoach.tracker.ui.game

import android.content.res.Configuration
import android.os.Bundle
import android.view.*
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.GridLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.soccercoach.tracker.R
import com.soccercoach.tracker.SoccerCoachApp
import com.soccercoach.tracker.data.ActionType
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.databinding.FragmentGameBinding
import com.soccercoach.tracker.databinding.FragmentGameLandBinding

class GameFragment : Fragment() {
    
    private var _portraitBinding: FragmentGameBinding? = null
    private val portraitBinding get() = _portraitBinding!!
    
    private var _landscapeBinding: FragmentGameLandBinding? = null
    private val landscapeBinding get() = _landscapeBinding!!
    
    private var isLandscape = false
    
    private val viewModel: GameViewModel by viewModels {
        GameViewModel.GameViewModelFactory(
            (requireActivity().application as SoccerCoachApp).playerRepository,
            (requireActivity().application as SoccerCoachApp).gameRepository
        )
    }
    
    private lateinit var playerGridAdapter: PlayerGridAdapter
    private lateinit var substitutionTimer: SubstitutionTimer
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setHasOptionsMenu(true)
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        isLandscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        
        return if (isLandscape) {
            _landscapeBinding = FragmentGameLandBinding.inflate(inflater, container, false)
            landscapeBinding.root
        } else {
            _portraitBinding = FragmentGameBinding.inflate(inflater, container, false)
            portraitBinding.root
        }
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        if (isLandscape) {
            setupLandscapeView()
        } else {
            setupPortraitView()
        }
        
        observeViewModel()
    }
    
    private fun setupPortraitView() {
        // Setup substitution timer
        substitutionTimer = SubstitutionTimer(
            portraitBinding.timerView,
            portraitBinding.textViewTimer,
            viewModel.substitutionTimerDuration.value ?: 300,
            onTimerFinished = {
                portraitBinding.timerView.setBackgroundResource(R.drawable.timer_background_alert)
            }
        )
        
        // Setup player grid
        playerGridAdapter = PlayerGridAdapter { player ->
            showPlayerActionDialog(player)
        }
        
        portraitBinding.recyclerViewPlayers.apply {
            layoutManager = GridLayoutManager(requireContext(), 3)
            adapter = playerGridAdapter
        }
        
        // Setup timer controls
        portraitBinding.buttonStartTimer.setOnClickListener {
            substitutionTimer.start()
        }
        
        portraitBinding.buttonResetTimer.setOnClickListener {
            substitutionTimer.reset()
            portraitBinding.timerView.setBackgroundResource(R.drawable.timer_background)
        }
        
        portraitBinding.buttonSetTimer.setOnClickListener {
            showSetTimerDialog()
        }
        
        // Check if we need to create a new game
        if (viewModel.currentGameId.value == 0L) {
            promptForOpponentTeam()
        }
    }
    
    private fun setupLandscapeView() {
        // Setup substitution timer
        substitutionTimer = SubstitutionTimer(
            landscapeBinding.timerView,
            landscapeBinding.textViewTimer,
            viewModel.substitutionTimerDuration.value ?: 300,
            onTimerFinished = {
                landscapeBinding.timerView.setBackgroundResource(R.drawable.timer_background_alert)
            }
        )
        
        // Setup player grid
        playerGridAdapter = PlayerGridAdapter { player ->
            showPlayerActionDialog(player)
        }
        
        landscapeBinding.recyclerViewPlayers.apply {
            layoutManager = GridLayoutManager(requireContext(), 4)
            adapter = playerGridAdapter
        }
        
        // Setup timer controls
        landscapeBinding.buttonStartTimer.setOnClickListener {
            substitutionTimer.start()
        }
        
        landscapeBinding.buttonResetTimer.setOnClickListener {
            substitutionTimer.reset()
            landscapeBinding.timerView.setBackgroundResource(R.drawable.timer_background)
        }
        
        landscapeBinding.buttonSetTimer.setOnClickListener {
            showSetTimerDialog()
        }
        
        // Game time tracker
        landscapeBinding.buttonStartGameTime.setOnClickListener {
            viewModel.toggleGameTime()
        }
        
        // Check if we need to create a new game
        if (viewModel.currentGameId.value == 0L) {
            promptForOpponentTeam()
        }
    }
    
    private fun observeViewModel() {
        viewModel.players.observe(viewLifecycleOwner) { players ->
            playerGridAdapter.submitList(players)
        }
        
        viewModel.gameTimeRunning.observe(viewLifecycleOwner) { isRunning ->
            if (isLandscape) {
                landscapeBinding.buttonStartGameTime.text = if (isRunning) {
                    getString(R.string.pause_game_time)
                } else {
                    getString(R.string.start_game_time)
                }
            }
        }
        
        viewModel.currentGameTime.observe(viewLifecycleOwner) { timeInSeconds ->
            val minutes = timeInSeconds / 60
            val seconds = timeInSeconds % 60
            val timeString = String.format("%02d:%02d", minutes, seconds)
            
            if (isLandscape) {
                landscapeBinding.textViewGameTime.text = timeString
            } else {
                portraitBinding.textViewGameTime.text = timeString
            }
        }
        
        viewModel.currentGameScore.observe(viewLifecycleOwner) { score ->
            val scoreText = "${score.first} - ${score.second}"
            if (isLandscape) {
                landscapeBinding.textViewScore.text = scoreText
            } else {
                portraitBinding.textViewScore.text = scoreText
            }
        }
        
        viewModel.currentGame.observe(viewLifecycleOwner) { game ->
            game?.let {
                val title = "${getString(R.string.vs)} ${game.opponentTeam}"
                activity?.title = title
            }
        }
        
        viewModel.substitutionTimerDuration.observe(viewLifecycleOwner) { durationSeconds ->
            substitutionTimer.setDuration(durationSeconds)
        }
    }
    
    private fun promptForOpponentTeam() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_opponent_team, null)
        
        val opponentTeamInput = dialogView.findViewById<EditText>(R.id.editTextOpponentTeam)
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.new_game)
            .setView(dialogView)
            .setCancelable(false)
            .setPositiveButton(R.string.start) { _, _ ->
                val opponentTeam = opponentTeamInput.text.toString()
                if (opponentTeam.isNotEmpty()) {
                    viewModel.createNewGame(opponentTeam)
                } else {
                    Snackbar.make(
                        if (isLandscape) landscapeBinding.root else portraitBinding.root,
                        R.string.error_opponent_team_empty,
                        Snackbar.LENGTH_SHORT
                    ).show()
                    requireActivity().onBackPressed()
                }
            }
            .setNegativeButton(R.string.cancel) { _, _ ->
                requireActivity().onBackPressed()
            }
            .show()
    }
    
    private fun showPlayerActionDialog(player: Player) {
        val options = arrayOf(
            getString(R.string.pass),
            getString(R.string.goal_scored),
            getString(R.string.goal_allowed)
        )
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("${player.name} (#${player.jerseyNumber})")
            .setItems(options) { _, which ->
                val actionType = when (which) {
                    0 -> ActionType.PASS
                    1 -> ActionType.GOAL_SCORED
                    2 -> ActionType.GOAL_ALLOWED
                    else -> null
                }
                
                actionType?.let {
                    viewModel.recordPlayerAction(player.id, it)
                    
                    val message = when (it) {
                        ActionType.PASS -> getString(R.string.pass_recorded)
                        ActionType.GOAL_SCORED -> getString(R.string.goal_scored_recorded)
                        ActionType.GOAL_ALLOWED -> getString(R.string.goal_allowed_recorded)
                    }
                    
                    Snackbar.make(
                        if (isLandscape) landscapeBinding.root else portraitBinding.root,
                        message,
                        Snackbar.LENGTH_SHORT
                    ).show()
                }
            }
            .show()
    }
    
    private fun showSetTimerDialog() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_set_timer, null)
        
        val minutesInput = dialogView.findViewById<EditText>(R.id.editTextMinutes)
        val secondsInput = dialogView.findViewById<EditText>(R.id.editTextSeconds)
        
        // Set current duration
        val currentDuration = viewModel.substitutionTimerDuration.value ?: 300
        minutesInput.setText((currentDuration / 60).toString())
        secondsInput.setText((currentDuration % 60).toString())
        
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.set_timer)
            .setView(dialogView)
            .setPositiveButton(R.string.set) { _, _ ->
                val minutes = minutesInput.text.toString().toIntOrNull() ?: 0
                val seconds = secondsInput.text.toString().toIntOrNull() ?: 0
                
                val totalSeconds = (minutes * 60) + seconds
                if (totalSeconds > 0) {
                    viewModel.setSubstitutionTimerDuration(totalSeconds)
                    substitutionTimer.reset()
                    
                    if (isLandscape) {
                        landscapeBinding.timerView.setBackgroundResource(R.drawable.timer_background)
                    } else {
                        portraitBinding.timerView.setBackgroundResource(R.drawable.timer_background)
                    }
                } else {
                    Toast.makeText(
                        requireContext(),
                        R.string.error_invalid_timer,
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
    
    override fun onCreateOptionsMenu(menu: Menu, inflater: MenuInflater) {
        inflater.inflate(R.menu.menu_game, menu)
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_end_game -> {
                showEndGameConfirmation()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
    
    private fun showEndGameConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.end_game)
            .setMessage(R.string.end_game_confirmation)
            .setPositiveButton(R.string.end_game) { _, _ ->
                viewModel.endCurrentGame()
                requireActivity().onBackPressed()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
    
    override fun onPause() {
        super.onPause()
        viewModel.pauseGameTime()
        substitutionTimer.pause()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        substitutionTimer.stop()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _portraitBinding = null
        _landscapeBinding = null
    }
}
