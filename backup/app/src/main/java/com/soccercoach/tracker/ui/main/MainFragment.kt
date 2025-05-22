package com.soccercoach.tracker.ui.main

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.soccercoach.tracker.R
import com.soccercoach.tracker.SoccerCoachApp
import com.soccercoach.tracker.databinding.FragmentMainBinding

class MainFragment : Fragment() {
    
    private var _binding: FragmentMainBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: MainViewModel by viewModels {
        MainViewModel.MainViewModelFactory(
            (requireActivity().application as SoccerCoachApp).playerRepository,
            (requireActivity().application as SoccerCoachApp).gameRepository
        )
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMainBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupClickListeners()
        observeCurrentGame()
    }
    
    private fun setupClickListeners() {
        binding.btnTeamSetup.setOnClickListener {
            findNavController().navigate(R.id.action_mainFragment_to_teamSetupFragment)
        }
        
        binding.btnStartGame.setOnClickListener {
            findNavController().navigate(R.id.action_mainFragment_to_gameFragment)
        }
        
        binding.btnReports.setOnClickListener {
            findNavController().navigate(R.id.action_mainFragment_to_reportFragment)
        }
        
        binding.btnSettings.setOnClickListener {
            findNavController().navigate(R.id.action_mainFragment_to_settingsFragment)
        }
    }
    
    private fun observeCurrentGame() {
        viewModel.hasCurrentGame.observe(viewLifecycleOwner) { hasGame ->
            binding.btnStartGame.text = if (hasGame) {
                getString(R.string.continue_game)
            } else {
                getString(R.string.start_new_game)
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
