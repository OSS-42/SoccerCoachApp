package com.soccercoach.tracker.ui.report

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.soccercoach.tracker.R
import com.soccercoach.tracker.SoccerCoachApp
import com.soccercoach.tracker.databinding.FragmentReportBinding
import com.soccercoach.tracker.databinding.FragmentReportLandBinding
import java.io.File

class ReportFragment : Fragment() {
    
    private var _portraitBinding: FragmentReportBinding? = null
    private val portraitBinding get() = _portraitBinding!!
    
    private var _landscapeBinding: FragmentReportLandBinding? = null
    private val landscapeBinding get() = _landscapeBinding!!
    
    private val isLandscape: Boolean
        get() = resources.configuration.orientation == 
                android.content.res.Configuration.ORIENTATION_LANDSCAPE
    
    private val viewModel: ReportViewModel by viewModels {
        ReportViewModel.ReportViewModelFactory(
            (requireActivity().application as SoccerCoachApp).gameRepository,
            (requireActivity().application as SoccerCoachApp).playerRepository
        )
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return if (isLandscape) {
            _landscapeBinding = FragmentReportLandBinding.inflate(inflater, container, false)
            landscapeBinding.root
        } else {
            _portraitBinding = FragmentReportBinding.inflate(inflater, container, false)
            portraitBinding.root
        }
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupGameSelector()
        setupExportButtons()
        observeViewModel()
    }
    
    private fun setupGameSelector() {
        viewModel.completedGames.observe(viewLifecycleOwner) { games ->
            val gameDisplayNames = games.map { 
                "${it.date.toString().substring(0, 10)} - ${it.opponentTeam} (${it.ourScore}-${it.opponentScore})" 
            }
            
            val adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_spinner_item,
                gameDisplayNames
            ).apply {
                setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            }
            
            if (isLandscape) {
                landscapeBinding.spinnerGames.adapter = adapter
                
                landscapeBinding.spinnerGames.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                        viewModel.selectGame(games[position].id)
                    }
                    
                    override fun onNothingSelected(parent: AdapterView<*>?) {
                        // No action needed
                    }
                }
            } else {
                portraitBinding.spinnerGames.adapter = adapter
                
                portraitBinding.spinnerGames.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                        viewModel.selectGame(games[position].id)
                    }
                    
                    override fun onNothingSelected(parent: AdapterView<*>?) {
                        // No action needed
                    }
                }
            }
        }
    }
    
    private fun setupExportButtons() {
        if (isLandscape) {
            landscapeBinding.buttonExportPdf.setOnClickListener {
                viewModel.generatePdfReport(requireContext()) { file ->
                    shareFile(file, "application/pdf")
                }
            }
            
            landscapeBinding.buttonExportImage.setOnClickListener {
                viewModel.generateImageReport(requireContext()) { file ->
                    shareFile(file, "image/png")
                }
            }
        } else {
            portraitBinding.buttonExportPdf.setOnClickListener {
                viewModel.generatePdfReport(requireContext()) { file ->
                    shareFile(file, "application/pdf")
                }
            }
            
            portraitBinding.buttonExportImage.setOnClickListener {
                viewModel.generateImageReport(requireContext()) { file ->
                    shareFile(file, "image/png")
                }
            }
        }
    }
    
    private fun observeViewModel() {
        viewModel.reportHtml.observe(viewLifecycleOwner) { html ->
            if (isLandscape) {
                landscapeBinding.webViewReport.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            } else {
                portraitBinding.webViewReport.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            }
        }
        
        viewModel.errorMessage.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrEmpty()) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_LONG).show()
            }
        }
    }
    
    private fun shareFile(file: File, mimeType: String) {
        val uri = androidx.core.content.FileProvider.getUriForFile(
            requireContext(),
            "${requireContext().packageName}.fileprovider",
            file
        )
        
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        
        startActivity(Intent.createChooser(intent, getString(R.string.share_report)))
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _portraitBinding = null
        _landscapeBinding = null
    }
}
