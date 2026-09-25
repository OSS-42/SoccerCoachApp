# ActionPitch

Sideline tracker for youth/amateur coaches and spectators: roster, formation, live actions, reports.
Published on the [App Store](https://apps.apple.com/ca/app/action-pitch/id6810484374) (iPhone); the
Android APK is sideloaded from the droplet. Both run the same Vite web app inside a Capacitor shell.

The version lives only in `package.json` (Vite, `src/ota/config.ts` and `capacitor.config.ts` read it).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes dist/
```

## Publish

```bash
npm run ota:publish -- --notes "What changed"
```

Before publishing, add the new version at the top of `src/domain/changelog.ts` (English and French). The
in-app "What's new" shows the two newest entries, and the script refuses to publish a version without one.

One command ships everything (see `scripts/ota-publish.mjs`):

- checks the change log entry and the GitHub `workflow` permission (when workflow files changed), then runs the tests, builds, zips `dist/` and writes `ota/latest.json` with the zip's SHA-256
- uploads `dist.zip`, then `latest.json`, then `docs/privacy.html` to the droplet (privacy page is verified live)
- builds and uploads the sideload APK
- commits, pushes `main` (which triggers the web deploy workflow) and creates the GitHub Release

Installed apps pick the new bundle up on the next cold start. Phones verify the checksum and only accept
bundles from `https://cdn-studiophoenix.net`. Use `--min-app X.Y.Z` when a bundle needs a newer native
shell (new Capacitor plugin); older shells then keep their current bundle.

Secrets stay local: `.env.ota.local` (droplet SSH settings), SSH keys and keystores are gitignored, and the
publish script refuses to commit secret-looking files or content.

## Data

- Saved on the device in `localStorage` (`soccerCoachApp.v2`). Older keys migrate on first load.
- A last-known-good snapshot (`soccerCoachApp.v2.good`) is written on first launch of each version, after
  every finished game and before an import. On iOS/Android it is mirrored to
  `Library/actionpitch/last-good-save.json` and restored automatically if the WebView storage is wiped.
- Backups export as JSON through the system share sheet; imports are sanitized (ids, numbers, entitlement).

## Notes

- French is in Settings. Language survives Clear All Data.
- Clock uses wall time (keeps running if the phone locks).
- Native appId: `com.actionpitch.app`. OTA channel: `https://cdn-studiophoenix.net/sca/live`.
- Privacy policy: `docs/privacy.html`, served at `https://cdn-studiophoenix.net/sca/privacy.html`.
