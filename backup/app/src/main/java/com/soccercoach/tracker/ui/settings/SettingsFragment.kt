package com.soccercoach.tracker.ui.settings

import android.content.SharedPreferences
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.preference.PreferenceManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.soccercoach.tracker.R
import com.soccercoach.tracker.SoccerCoachApp
import com.soccercoach.tracker.databinding.FragmentSettingsBinding
import java.util.Locale

class SettingsFragment : Fragment() {
    
    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!
    
    private val viewModel: SettingsViewModel by viewModels {
        SettingsViewModel.SettingsViewModelFactory(
            (requireActivity().application as SoccerCoachApp).playerRepository
        )
    }
    
    private lateinit var sharedPreferences: SharedPreferences
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        sharedPreferences = PreferenceManager.getDefaultSharedPreferences(requireContext())
        
        setupLanguageSelector()
        setupResetButton()
    }
    
    private fun setupLanguageSelector() {
        // Get current language from preferences or default to system
        val currentLanguage = sharedPreferences.getString("language", "") ?: ""
        
        // Set language radio button
        when (currentLanguage) {
            "en" -> binding.radioEnglish.isChecked = true
            "es" -> binding.radioSpanish.isChecked = true
            else -> binding.radioSystemDefault.isChecked = true
        }
        
        // Set language change listener
        binding.radioGroupLanguage.setOnCheckedChangeListener { _, checkedId ->
            val languageCode = when (checkedId) {
                R.id.radio_english -> "en"
                R.id.radio_spanish -> "es"
                else -> ""
            }
            
            if (languageCode != currentLanguage) {
                sharedPreferences.edit().putString("language", languageCode).apply()
                showLanguageChangeDialog()
            }
        }
    }
    
    private fun setupResetButton() {
        binding.buttonResetTeam.setOnClickListener {
            showResetTeamConfirmation()
        }
    }
    
    private fun showLanguageChangeDialog() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.language_changed)
            .setMessage(R.string.restart_app_message)
            .setPositiveButton(R.string.ok, null)
            .show()
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
