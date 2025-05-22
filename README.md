# Soccer Coach Tracker

A web-based application designed to help soccer coaches track player statistics, manage team data, and generate game reports.

## Features

- **Team Management**: Create and edit players with jersey numbers, mark players as active/inactive
- **Game Tracking**: Record goals, assists, saves, and goals allowed with a smart goal-assist workflow
- **Substitution Management**: Track player substitutions with configurable countdown timer
- **Statistics & Reporting**: Generate detailed game reports and export functionality (PDF/PNG)
- **Settings & Customization**: Multiple language support, dark mode toggle, configurable timers
- **Data Portability**: Import/export team data for cross-device usage

## Installation

No installation required! This is a client-side web application that runs entirely in the browser.

1. Simply open the `index.html` file in a modern web browser
2. Alternatively, serve the files using any web server

## Usage

### Team Setup
- Add players with jersey numbers
- Set players as active or inactive for games
- Customize your team name

### Game Management
- Create a new game with opponent team name and date
- Record player actions (goals, assists, saves, goals allowed)
- Use the substitution timer to track player rotations
- Monitor game elapsed time alongside substitution timer

### Reports
- View detailed game statistics
- Export reports in various formats
- Browse game history

## Offline Functionality

The app uses browser localStorage for data persistence, ensuring all your data is saved even without an internet connection.

## Changelog

### Version 1.3.0 (2025-05-22)
- Added orange "No Assist" button for better visibility
- Implemented dark mode with toggle switch in settings
- Added game time elapsed counter alongside substitution timer
- Set landscape orientation for game and report screens
- Improved header styling in game view
- Fixed various UI issues for better user experience

### Version 1.2.0 (2025-05-15)
- Added multi-language support (English, French)
- Implemented import/export functionality for team data
- Enhanced player statistics with detailed breakdowns
- Added game history with searchable records
- Improved timer functionality with pause/reset options
- Fixed bugs in player selection during game tracking

### Version 1.1.0 (2025-05-08)
- Added smart goal-assist workflow
- Implemented report generation and export options
- Enhanced UI with material design icons
- Added configurable substitution timer
- Improved mobile responsiveness for different devices
- Fixed data persistence issues

### Version 1.0.0 (2025-05-01)
- Initial release with core functionality
- Basic team management (add, edit, delete players)
- Game tracking with basic statistics
- Simple substitution timer
- Local storage implementation for offline use

## License

This project is available for free use by soccer coaches and teams.

## Future Development

Future planned features include:
- Player position tracking
- Shot tracking (on/off target)
- Card tracking (yellow/red)
- Game events timeline
- Cloud synchronization across devices