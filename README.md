# ActionPitch

Sideline tracker for youth/amateur coaches: roster, formation, live actions, reports.

**Version:** 2.4.50

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes dist/ (CI deploys this)
```

Data stays in the browser (`soccerCoachApp.v2`). Older saves (`soccerCoachApp2`) migrate on first load. Those storage keys are unchanged so existing browsers keep their teams and games after the ActionPitch rename.

Push to `main` still deploys the Vite **web** build via GitHub Actions. The **Android APK** updates through the droplet OTA channel (Capgo + `latest.json` / `dist.zip`). See `docs/ANDROID.md`.

```bash
npm run ota:publish -- --notes "What changed"
```

## Notes

- Two teams max, plus a built-in DEMO TEAM (23 players).
- French is in Settings. Language survives Clear All Data.
- Clock uses wall time (keeps running if the phone locks).
- Native appId: `com.actionpitch.app`. Channel: `https://cdn-studiophoenix.net/sca/live`.
