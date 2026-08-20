# Football Live Action Tracker

Sideline tracker for youth/amateur coaches: roster, formation, live actions, reports.

**Version:** 2.4.46,

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes dist/ (CI deploys this)
```

Data stays in the browser (`soccerCoachApp.v2`). Older saves (`soccerCoachApp2`) migrate on first load.

Push to `main` deploys the Vite build to the existing DOragoug host.

## Notes

- Two teams max, plus a built-in DEMO TEAM (23 players).
- French is in Settings. Language survives Clear All Data.
- Clock uses wall time (keeps running if the phone locks).
- OTA / APK is not wired yet.
