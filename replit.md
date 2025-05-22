# Soccer Coach Tracker App

## Overview

Soccer Coach Tracker is an Android mobile application designed to help soccer coaches manage their teams, track game statistics, and generate reports. The app allows coaches to create and manage player rosters, record game events (passes, goals), track substitutions, and generate detailed game reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows the MVVM (Model-View-ViewModel) architecture pattern with a clear separation of concerns:

1. **UI Layer (View)**: Fragments and Activities that display data to the user
2. **ViewModel Layer**: Manages UI-related data, handles user interactions, and communicates with repositories
3. **Repository Layer**: Acts as a single source of truth for data access
4. **Data Layer**: Room database for local data persistence

The app uses Android Jetpack components (Navigation, Room, LiveData, ViewModel) to provide a robust and maintainable architecture.

## Key Components

### UI Components

1. **MainActivity**: The main entry point that hosts the Navigation component
2. **MainFragment**: The home screen with navigation options
3. **TeamSetupFragment**: Manages the team roster (add, edit, delete players)
4. **GameFragment**: Handles game tracking with different layouts for portrait and landscape orientations
5. **ReportFragment**: Displays and exports game reports
6. **SettingsFragment**: Allows users to configure app settings (language, etc.)

### Data Management

1. **Room Database**: Local SQLite database with three main entities:
   - Player: Stores player information (jersey number, name, active status)
   - Game: Records game details (date, opponent, score, completion status)
   - GameAction: Tracks in-game events (passes, goals) with timestamps

2. **Repositories**:
   - PlayerRepository: Manages player-related data operations
   - GameRepository: Handles game and game action operations

3. **ViewModels**:
   - TeamSetupViewModel: Manages player roster operations
   - GameViewModel: Handles game state and actions
   - ReportViewModel: Generates and exports game reports
   - SettingsViewModel: Manages app configuration
   - MainViewModel: Controls main screen navigation logic

### Utility Classes

1. **SubstitutionTimer**: Handles player substitution timing during games
2. **ReportGenerator**: Creates HTML reports from game data
3. **PdfExporter**: Converts reports to PDF format
4. **ImageExporter**: Exports reports as images
5. **DateTimeUtils**: Provides date and time formatting utilities

## Data Flow

1. **Player Management**:
   - User inputs player data via UI
   - ViewModel validates and passes data to PlayerRepository
   - Repository performs database operations through PlayerDao
   - LiveData observables update the UI with changes

2. **Game Tracking**:
   - User creates a new game or continues an existing one
   - GameViewModel maintains game state (time, score, actions)
   - Player actions are recorded through GameRepository to GameActionDao
   - UI is updated in real-time with game statistics

3. **Report Generation**:
   - User selects a completed game
   - ReportViewModel retrieves game data and creates an HTML report
   - Report can be viewed in the app or exported as PDF/image
   - Exported files are saved to external storage

## External Dependencies

The app uses the following external libraries:

1. **AndroidX Core Libraries**: Core Kotlin extensions, AppCompat
2. **AndroidX UI Components**: ConstraintLayout, RecyclerView
3. **AndroidX Lifecycle**: ViewModel, LiveData
4. **AndroidX Navigation**: Fragment navigation, UI navigation
5. **Room**: Database ORM for local storage
6. **Material Components**: Material Design UI elements
7. **iText**: PDF generation for reports

## Deployment Strategy

The application is built using Gradle and targets Android API level 21 (Android 5.0 Lollipop) and above, with a target SDK of 33 (Android 13). This ensures compatibility with a wide range of Android devices.

The app uses view binding to efficiently access UI components and implements different layouts for portrait and landscape orientations to optimize the user experience across device configurations.

The build process includes:
1. Compiling Kotlin source files
2. Processing resources
3. Generating APK file
4. Running the app on a device or emulator

The `.replit` configuration specifies that running the project will:
1. Execute Gradle to build a debug APK
2. Start a local HTTP server to serve the APK for installation
3. Wait for port 5000 to become available

This setup allows for easy development and testing in the Replit environment.

## Internationalization

The app supports multiple languages with resource files for:
- English (default)
- Spanish

The language can be changed through the settings menu, and the app respects system language settings.

## Future Development Considerations

1. **Cloud Synchronization**: Add Firebase integration for data backup and multi-device synchronization
2. **Enhanced Analytics**: Implement more detailed player performance metrics
3. **Team Management**: Support for managing multiple teams
4. **Media Support**: Add capability to record and attach photos/videos to player profiles and game events
5. **Real-time Collaboration**: Allow multiple coaches to collaborate during games