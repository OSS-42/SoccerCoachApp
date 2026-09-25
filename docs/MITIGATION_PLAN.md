# ActionPitch — Audit Mitigation Plan

**Source:** `docs/AUDIT.md` (v2.4.77, 2026-09-24) · **Baseline:** tsc clean, 120/120 tests, 0 prod vulns
**Shape:** 4 releases, ~9 PRs. Each PR is small, has its own tests, and ships through the normal OTA flow unless marked **APK**. An APK change needs a new Play/native build because it touches the native shell or `build.gradle`.

## OTA vs new APK

Everything ships over OTA **except Release 3** (the Play Billing plugin and Capgo signed bundles, which change native code or native config) and the optional "serve the intro MP4 natively" item. The versionCode fix only takes effect the next time you build an APK. Users don't need to download anything for it.

## Decisions needed before starting

| # | Decision | Default in this plan |
|---|---|---|
| D1 | Is Pro/Lite going live soon, or is everything free for now? | **Decided 2026-09-24: not on the radar.** Keep the Pro code, set `LITE_USER_TEAMS = 2`, and park Release 3. |
| D2 | OTA integrity: SHA-256 checksum only, or Capgo signed/encrypted bundles? | **Checksum now** (Release 1), **signing later** (Release 3). Checksum stops a corrupt or swapped zip. Signing also protects against a compromised manifest. |
| D3 | Keep the GitHub/jsDelivr manifest mirrors? | **Remove them.** The droplet is the only source; offline falls back to the installed build. |
| D4 | Has any APK with versionCode ≥ 20477 already been uploaded to Play? | Assumed yes. The new scheme starts well above that. |

---

## Release 1 — "Safe at the field" (v2.5.0, **OTA only**) · ~1.5 days

Goal: close the high-severity items and the XSS before anything else ships.

### PR 1 — versionCode scheme (Audit #2) · build-time only, must land before the next APK · 30 min
- `android/app/build.gradle`: `computedVersionCode = major*1_000_000 + minor*1_000 + patch` (2.5.0 → 2005000, well above 20477).
- Add a Gradle check that fails the build if `patch > 999` or `minor > 999`.
- Bump `package.json` to **2.5.0** here, so the new APK and the OTA line start clean.
- **Done when:** `./gradlew assembleRelease` prints versionCode 2005000, and Play Console accepts the internal-track upload.

### PR 2 — Self-hosted icons (Audit #3, half of #5) · 1–2 h
- Remove the `fonts.googleapis.com` `<link>` from `index.html`.
- `npm i material-icons` and `import 'material-icons/iconfont/filled.css'` in `main.ts`. Vite bundles the woff2, so it works offline and inside OTA zips.
- Optional later: the app uses only **24 icons** (analytics, arrow_back, … visibility), so it could switch to inline SVGs and drop the ~130 kB font.
- **Done when:** the app shows icons in airplane mode on a freshly installed APK, and DevTools shows no request to `googleapis.com` or `gstatic.com`.

### PR 3 — Sanitize imports, escape attributes (Audit #4) · 2–3 h
- `domain/migrate.ts`: add `asId(value, fallback)`, which accepts `/^[A-Za-z0-9_-]{1,64}$/` and otherwise generates a fresh id with `ids.ts`. Keep an old→new map so `playerId`, `relatedPlayerId`, formation, `substitutes` and `unavailablePlayers` stay consistent.
- Clamp numbers: jersey `JERSEY_MIN..MAX`, `numPeriods` 1–8, `periodDuration` 1–120, scores 0–99, `gameSecond` ≥ 0.
- `parseImportJson` / `importBackup`: **drop `entitlement`** (and keep the current `role`/`roleChosen`) from imported data.
- Defense in depth: escape every `${…id}` in `reports.ts`, `teamSetup.ts` and `formation.ts` with `escapeHtml`, or set `dataset` after creating the element.
- **Tests:** a new `migrate.test.ts` case where a hostile id (`x"><img onerror=…>`) is replaced and references still resolve; out-of-range numbers are clamped; importing `"entitlement":"pro"` leaves the entitlement at `lite`.

### PR 4 — OTA checksum + host allow-list + minAppVersion (Audit #1, rest of #5) · ½ day
- `scripts/ota-publish.mjs`: the manifest is currently written **before** build and zip (around line 750). Move the manifest write after `ota-bundle.mjs`, compute `sha256(dist.zip)`, and add `"checksum"` to `latest.json`.
- `src/ota/config.ts`: delete `OTA_MANIFEST_FALLBACK_URLS` (D3), and replace `APP_BUNDLE_VERSION = '…'` with `__APP_VERSION__` (fixes part of #12).
- `src/ota/runOta.ts`:
  - reject the manifest unless `new URL(bundleUrl).origin === 'https://cdn-studiophoenix.net'`
  - require `checksum` and pass it to `CapacitorUpdater.download({ url, version, checksum })`
  - read the native version with `App.getInfo()`; if `cmpSemver(native, manifest.minAppVersion) < 0`, skip with the message "Update requires a newer app from Google Play"
- `ota-publish.mjs`: add a `--min-app <ver>` flag so a release that needs a new native shell raises `minAppVersion`.
- **Tests:** unit-test a pure `validateManifest()` extracted from `runOta.ts`: bad origin, missing checksum, minAppVersion too high, happy path.
- **Rollout:** OTA only. The installed shell already has Capgo 8.51 (whose `download()` accepts `checksum`) and `@capacitor/app`. The first bundle carrying this code is downloaded by the old, unchecked code; every update after that is verified.

### PR 5 — Privacy policy (Audit #5) · 30 min
- After PRs 2 and 4 land, the policy is true again: the only network host is `cdn-studiophoenix.net`. Add a line about Android Auto Backup (`allowBackup=true`: the save may be included in the user's Google backup).
- Update the Play Data safety form to match.

---

## Release 2 — "Don't lose a season" (v2.5.x, OTA) · ~1.5 days

### PR 6 — Native JSON backup export (Audit #6) · 2 h
- `lib/shareFile.ts`: generalize `shareNativePdf` into `saveOrShareFile(data, name, mime)`, with `saveOrSharePdf` as a wrapper.
- `settings.ts → export-json`: use `saveOrShareFile(json, 'actionpitch-backup-YYYY-MM-DD.json', 'application/json')`. On the web, use the deferred `revokeObjectURL` from `downloadPdf`.
- **Done when:** on the APK, Export opens the Android share sheet, and saving to Drive then re-importing restores the teams.

### PR 7 — Save durability (Audit #7) · ½ day
- `lib/storage.ts`:
  - wrap the main `setItem` in try/catch and return `{ ok: false, reason: 'quota' }`
  - `store.persist()`: if the write fails, still `emit()` and show one sticky error ("Storage full — export a backup").
  - Replace the rolling `.bak` with a **known-good snapshot**, `soccerCoachApp.v2.good`, written only on (a) game completed, (b) first launch of a new app version, (c) successful import. Never write it from the clock tick.
  - `loadSave()` order: main → good → legacy → fresh.
- Live game: persist `clock` + `currentGame` under `soccerCoachApp.v2.live` on the 10 s tick (small write), and merge it on hydrate. That also covers most of Audit #10.
- Native (optional, D-later): mirror the good snapshot to `Filesystem` (`Directory.Data`) so an OS WebView data wipe doesn't take the season with it.
- **Tests:** storage tests covering a quota throw, corrupt main falling back to good, and the tick not touching good.

---

## Release 3 — "Ready to charge" (only if D1 = go) · ~2–3 days

### PR 8 — Monetization wiring (Audit #8) · **APK**
- Add a Play Billing plugin (for example `@capgo/native-purchases` or RevenueCat) and implement `lib/billing.ts`.
- On launch and on Restore, set `entitlement` from Play only. Never trust the save file.
- Route `addTeam` through `canAddUserTeam` → `showPaywall('proMoreTeams')`. Apply `applyLiteReportCap` when a game completes, and warn *before* the oldest report is dropped.
- If D1 = free for now: instead, set `LITE_USER_TEAMS = 2` so users don't hit the invisible second-team wall, and delete `paywall.ts` until it's needed.
- Capgo **signed bundles** (D2): `npx @capgo/cli key create`, put the public key in `capacitor.config.ts`, and sign in `ota-publish.mjs`. This is **APK**, so ship it with the billing shell.

---

## Release 4 — Hardening & cleanup (ongoing, OTA) · ~2 days total

### PR 9 — CI gate (Audit #9) · 1 h — *can land any time, ideally first*
- Workflow: Node **22**; `npm ci && npm test && npm run build` before rsync.
- Put the droplet host key in a `SSH_KNOWN_HOSTS` secret, write it to `~/.ssh/known_hosts`, and remove `StrictHostKeyChecking=no` and `ssh-keyscan`.
- Add a PR workflow (test + build only, no deploy).
- `ota-publish.mjs`: run `npm test` before bundling, and refuse to publish a dirty git tree.

### Performance (Audit #10, #12b)
- `reportPdf.ts`: change to `const { jsPDF } = await import('jspdf')` inside the export function. That moves ~390 kB (jsPDF, html2canvas, DOMPurify) out of the startup chunk. **Done when:** the main chunk is < 250 kB and there's no Vite size warning.
- `main.ts renderActive`: skip `fillTeamSelectors` and `paintLiveRosters` when only the clock changed. Emit a typed `{ kind: 'clock' }` change, or compare the `currentGame` reference.
- Intro MP4 (2 MB in every OTA zip): serve it natively in the APK, or compress to ≤ 500 kB.

### Accessibility (Audit #11)
- Add `aria-label` (i18n keys) to the 6 icon-only buttons.
- Move `toggleDialog` onto native `<dialog>` + `showModal()` (focus trap, Esc, `::backdrop`), keeping the `DIALOG_TOGGLE_EVENT` contract so the tutorial still works.

### Hygiene (Audit #12)
- Single version source: `capacitor.config.ts` reads `package.json`, and `ota/config.ts` uses `__APP_VERSION__`. Remove the regex edits in `ota-publish.mjs`.
- Update `README.md` (version, Pro notes, OTA flow).
- Move screenshots and store images from `src/assets/` to `store/`. Delete `app icon.png` (the duplicate), `serve.py`, and the template `com.getcapacitor.myapp` tests. Decide whether `.grok/` belongs in the repo.
- Use Conventional Commits from now on, so `changelog.ts` can eventually be generated.
- CSS: collapse `theme.css` overrides into custom properties and aim to cut `!important` from 156 to < 20. Low priority; do it opportunistically.
- Bump `vitest` to 5.x (clears 3 of the 5 dev-only audit advisories). Track `@capacitor/cli` for the `uuid` fix.

---

## Timeline at a glance

| Week | Ships | Audit items closed |
|---|---|---|
| 1 | PR 9 (CI), Release 1 (PRs 1–5) via OTA | #1 (partial), #2, #3, #4, #5, #9 |
| 2 | Release 2 (PRs 6–7) via OTA | #6, #7, #10 (partial) |
| 3 | jspdf lazy-load, render skip, a11y | #10, #11, #12b |
| When D1 is decided | Release 3 | #1 (signing), #8 |
| Ongoing | Hygiene | #12 |

## Verification checklist per release
- [ ] `npx tsc -b`, `npm test`, `npm run build` green in CI
- [ ] Fresh APK install **offline**: icons render, the app boots past the OTA screen, a game can be tracked
- [ ] OTA from the previous version → new version on a real device (and a tampered checksum is rejected)
- [ ] Export → import round trip on Android and on the web
- [ ] Hostile backup file (bad ids, `"entitlement":"pro"`) imports safely
- [ ] Privacy policy and Play Data safety reviewed if network behaviour changed
