package com.soccercoach.tracker.ui.teamsetup

import android.os.Bundle
import android.view.*
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.soccercoach.tracker.R
import com.soccercoach.tracker.SoccerCoachApp
import com.soccercoach.tracker.databinding.FragmentTeamSetupBinding

class TeamSetupFragment : Fragment() {
    
    private var _binding: FragmentTeamSetupBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: TeamSetupViewModel by viewModels {
        TeamSetupViewModel.TeamSetupViewModelFactory(
            (requireActivity().application as SoccerCoachApp).playerRepository
        )
    }
    
    private lateinit var playerAdapter: PlayerAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setHasOptionsMenu(true)
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTeamSetupBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerView()
        setupAddPlayerButton()
        observePlayers()
    }
    
    private fun setupRecyclerView() {
        playerAdapter = PlayerAdapter(
            onEditPlayer = { player ->
                showAddEditPlayerDialog(player.id)
            },
            onDeletePlayer = { player ->
                showDeletePlayerConfirmation(player.id)
            }
        )
        
        binding.recyclerViewPlayers.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = playerAdapter
        }
    }
    
    private fun setupAddPlayerButton() {
        binding.fabAddPlayer.setOnClickListener {
            showAddEditPlayerDialog()
        }
    }
    
    private fun observePlayers() {
        viewModel.allPlayers.observe(viewLifecycleOwner) { players ->
            playerAdapter.submitList(players)
            
            // Show empty state if no players
            if (players.isEmpty()) {
                binding.emptyStateLayout.visibility = View.VISIBLE
                binding.recyclerViewPlayers.visibility = View.GONE
            } else {
                binding.emptyStateLayout.visibility = View.GONE
                binding.recyclerViewPlayers.visibility = View.VISIBLE
            }
        }
    }
    
    private fun showAddEditPlayerDialog(playerId: Long = 0) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_edit_player, null)
        
        val jerseyNumberInput = dialogView.findViewById<TextInputEditText>(R.id.editTextJerseyNumber)
        val playerNameInput = dialogView.findViewById<TextInputEditText>(R.id.editTextPlayerName)
        
        val dialogTitle = if (playerId == 0L) R.string.add_player else R.string.edit_player
        
        // If editing, populate fields with existing data
        if (playerId != 0L) {
            viewModel.getPlayerById(playerId) { player ->
                player?.let {
                    jerseyNumberInput.setText(it.jerseyNumber.toString())
                    playerNameInput.setText(it.name)
                }
            }
        }
        
        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(dialogTitle)
            .setView(dialogView)
            .setPositiveButton(R.string.save, null) // We'll set the listener later to prevent automatic dismissal
            .setNegativeButton(R.string.cancel) { dialog, _ -> dialog.cancel() }
            .create()
        
        dialog.setOnShowListener {
            val positiveButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            positiveButton.setOnClickListener {
                val jerseyNumberText = jerseyNumberInput.text.toString()
                val playerName = playerNameInput.text.toString()
                
                if (jerseyNumberText.isBlank() || playerName.isBlank()) {
                    Toast.makeText(
                        requireContext(),
                        R.string.error_empty_fields,
                        Toast.LENGTH_SHORT
                    ).show()
                    return@setOnClickListener
                }
                
                val jerseyNumber = jerseyNumberText.toIntOrNull()
                if (jerseyNumber == null || jerseyNumber <= 0) {
                    Toast.makeText(
                        requireContext(),
                        R.string.error_invalid_jersey_number,
                        Toast.LENGTH_SHORT
                    ).show()
                    return@setOnClickListener
                }
                
                viewModel.checkJerseyNumberAvailability(jerseyNumber, playerId) { isAvailable ->
                    if (!isAvailable) {
                        Toast.makeText(
                            requireContext(),
                            R.string.error_jersey_number_taken,
                            Toast.LENGTH_SHORT
                        ).show()
                    } else {
                        if (playerId == 0L) {
                            viewModel.addPlayer(jerseyNumber, playerName)
                        } else {
                            viewModel.updatePlayer(playerId, jerseyNumber, playerName)
                        }
                        dialog.dismiss()
                    }
                }
            }
        }
        
        dialog.show()
    }
    
    private fun showDeletePlayerConfirmation(playerId: Long) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.delete_player)
            .setMessage(R.string.delete_player_confirmation)
            .setPositiveButton(R.string.delete) { _, _ ->
                viewModel.deletePlayer(playerId)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
    
    override fun onCreateOptionsMenu(menu: Menu, inflater: MenuInflater) {
        inflater.inflate(R.menu.menu_team_setup, menu)
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_reset_team -> {
                showResetTeamConfirmation()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
    
    private fun showResetTeamConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.reset_team)
            .setMessage(R.string.reset_team_confirmation)
            .setPositiveButton(R.string.reset) { _, _ ->
                viewModel.resetTeam()
                Toast.makeText(
                    requireContext(),
                    R.string.team_reset_success,
                    Toast.LENGTH_SHORT
                ).show()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
