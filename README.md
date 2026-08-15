# Football Live Action Tracker

Sideline tracker for youth/amateur coaches: roster, formation, live actions, reports.

**App version:** 2.0.0 (Vite + TypeScript rewrite). Old `dist_v2/` is kept as reference only.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes dist/
```

Data stays in the browser (`localStorage` key `soccerCoachApp.v2`). Saves from the old app (`soccerCoachApp2`) are migrated on first load. Empty rosters stay empty — no demo players.

## Product rules (v2)

- Two teams max.
- Mid-game refresh: match is saved; main menu shows **Resume Game**. Clock stays paused.
- **Start New Game** is blocked while a match is in progress.
- Season stats come from completed-game actions, not a mutable `player.stats` bag.
- Opponent own goal adds 1 to your score.
- Two yellows = send-off. Team yellow count is not wiped.
- Default formation is remembered per team + match type.
- French / dark mode / reset-stats button are gone.

## Layout

```
src/domain/   rules (clock, actions, formation, save migrate)
src/state/    one store, one save
src/screens/  UI
src/lib/      localStorage
dist_v2/      previous vanilla app (not built anymore)
```

OTA / APK is not wired yet. The planned CDN channel is `/sca/live` on the droplet (separate from Mokkori `/live`).
