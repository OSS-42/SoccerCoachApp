package com.soccercoach.tracker.ui.game

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.soccercoach.tracker.data.Player
import com.soccercoach.tracker.databinding.ItemPlayerGridBinding

class PlayerGridAdapter(
    private val onPlayerClicked: (Player) -> Unit
) : ListAdapter<Player, PlayerGridAdapter.PlayerGridViewHolder>(PlayerDiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PlayerGridViewHolder {
        val binding = ItemPlayerGridBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return PlayerGridViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: PlayerGridViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class PlayerGridViewHolder(private val binding: ItemPlayerGridBinding) :
        RecyclerView.ViewHolder(binding.root) {
        
        fun bind(player: Player) {
            binding.textViewJerseyNumber.text = player.jerseyNumber.toString()
            binding.textViewPlayerName.text = player.name
            
            binding.root.setOnClickListener {
                onPlayerClicked(player)
            }
        }
    }
    
    private class PlayerDiffCallback : DiffUtil.ItemCallback<Player>() {
        override fun areItemsTheSame(oldItem: Player, newItem: Player): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Player, newItem: Player): Boolean {
            return oldItem == newItem
        }
    }
}
