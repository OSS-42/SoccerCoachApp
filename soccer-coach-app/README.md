# Soccer Coach Tracker

A cross-platform web app for soccer coaches to track player statistics during games, manage substitutions, and generate comprehensive game reports.

## Features

### Team Management
- Create and manage your team roster with player names and jersey numbers
- Easily mark players as active/inactive for specific games
- Support for demo players to quickly test the app's functionality
- Edit player information at any time

### Game Tracking
- Full game management with timer and score tracking
- Record multiple types of player actions:
  - Goals scored by your team
  - Assists that led to goals
  - Goals allowed (defensive tracking)
  - Other stats customizable through settings
- Intuitive workflow for recording goals with associated assists
- Visual indicators showing player performance during the game

### Substitution Management
- Configurable countdown timer for managing player rotations
- Visual alerts when substitution time has elapsed
- Timer starts, pauses, and resets with simple button controls
- Persistent game time tracking independent of substitution timer

### Advanced Display Features
- Dark mode for night games and reduced eye strain
- Automatic orientation changes:
  - Game tracking and report screens in landscape for better visibility
  - Team setup and settings screens in portrait for easier data entry
- Responsive design adapts to any screen size

### Game Reports
- Detailed post-game analysis with player statistics
- Exportable reports for sharing with the team
- Historical game data stored for season-long tracking
- Sort and filter capabilities for finding specific information

### Multi-Device Support
- Export/import functionality to transfer data between devices
- No account required - complete privacy and control over your data
- Works offline with no internet connection needed
- Install as a standalone app on iOS and Android devices

## Detailed Usage Guide

### Setting Up Your Team
1. Start the app and navigate to "Team Setup"
2. Enter your team name at the top
3. Add players by clicking "Add Player"
4. For each player, enter:
   - Jersey number (must be unique)
   - Player name
   - Set active status (for game day roster)
5. Edit or delete players as needed

### Starting a Game
1. From the main menu, select "Start New Game"
2. Enter the opponent team name
3. Select the game date (defaults to today)
4. Set the substitution timer duration (in minutes)
5. Click "Start Game" to begin tracking

### During the Game
1. The game screen shows all active players in a grid
2. Click on a player to record an action:
   - Record goals, which will prompt for possible assist
   - Record assists, which will prompt for who scored
   - Record other stats as configured
3. Use the substitution timer controls to manage rotations:
   - Start - Begin the countdown
   - Pause - Temporarily stop the timer
   - Reset - Return timer to original duration
4. Track total game time independent of substitutions
5. End the game when finished to save all statistics

### Viewing Reports
1. Access the "Reports" section from the main menu
2. View a list of all completed games
3. Select any game to see detailed statistics
4. Export reports in various formats for sharing

## Installation Options

### Web Browser (Desktop or Mobile)
Simply open the HTML file in any modern web browser

### iOS Installation
1. Open the app in Safari
2. Tap the Share button (rectangle with arrow)
3. Select "Add to Home Screen"
4. Customize the name (optional)
5. Tap "Add" to create an icon on your home screen

### Android Installation
1. Open the app in Chrome
2. Tap the menu button (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Follow the prompts to add the icon to your home screen

## Technical Details

- Pure web app built with vanilla JavaScript, HTML5, and CSS3
- Offline-first architecture with localStorage for data persistence
- PWA-ready with app manifest for installability
- No backend server required - fully self-contained
- Designed for cross-platform compatibility
- Customizable through settings without coding knowledge

## Data Privacy

All data is stored locally on your device. No information is transmitted to external servers, ensuring complete privacy for your team's information.

## Changelog

### Version 1.1.0 (May 22, 2025)
- Added dark mode support
- No Assist button now in orange for better visibility
- Added game time elapsed tracking
- Optimized layout for landscape orientation in game and report screens
- Improved PWA support with app icons and manifest
- Enhanced player stats display with 2-row layout
- Changed goals allowed icon to red ball for better visibility
- Improved player name display in game screen
- Fixed dark mode timer background

### Version 1.0.0 (May 22, 2025)
- Initial release with core functionality
- Team management features
- Game tracking with player actions
- Substitution timer with alerts
- Report generation and export