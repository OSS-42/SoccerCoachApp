# ActionPitch (SoccerCoachApp) — Audit

**Commit:** `68c127e` (v2.4.77) · **Date:** 2026-09-24
**Scope:** I read the code of the web app (Vite + TypeScript), the Capacitor Android/iOS shells, the OTA pipeline, CI and the privacy policy.
**Checks run (2026-09-24, Linux, Node 22):**
- `tsc --noEmit`: **0 errors** (app + node configs)
- `vitest run`: **120/120 tests pass** (23 files, 1.8 s)
- `npm run build`: OK. `dist/` is **4.9 MB**, including a 2.0 MB intro MP4. The main chunk is **588 kB** (187 kB gzipped), over Vite's 500 kB warning.
- `npm audit`: **5 moderate, all dev-only** (`vitest`/`@vitest/mocker` GHSA-82fw-gwwq-j7x9; `uuid` via `@capacitor/cli`→`xcode` GHSA-w5hq-g745-h8pq). `npm audit --omit=dev`: **0 vulnerabilities** in what ships.

---

## Summary

The core is in good shape. The domain logic is pure and well separated (`src/domain/*`), there are about 120 unit tests, TypeScript runs in strict mode, the store is immutable, the clock uses wall time, and saves are migrated defensively. Most user text is HTML-escaped.

The risks are around the edges: the update channel, import/export, monetization that's only half built, and release hygiene.

| # | Severity | Area | Finding |
|---|---|---|---|
| 1 | **High** | OTA | Code bundles are installed without any integrity check. Fallback mirrors point at the public GitHub repo. |
| 2 | **High** | Android | `versionCode` will collide when the patch number reaches 100 (2.4.100 = 2.5.0 = 20500). |
| 3 | **High** | Offline/UX | Material Icons load from Google's CDN, so offline on the sideline the icons show as words ("edit", "delete"). |
| 4 | **Medium** | Security | XSS through imported backup files: IDs go into `innerHTML` without escaping. |
| 5 | **Medium** | Privacy | The privacy policy says the internet is used "only" for updates. That's not true (Google Fonts, GitHub, jsDelivr). |
| 6 | **Medium** | Native | JSON backup export uses `<a download>`, which does nothing in the Android WebView. |
| 7 | **Medium** | Data | The backup slot is only one write deep. Running out of storage throws an error nobody catches. |
| 8 | **Medium** | Monetization | Pro/Lite is half-wired: billing is stubbed, the paywall and report cap are dead code, and importing a backup can switch Pro on. |
| 9 | **Medium** | CI | Pushing to `main` deploys to production without running tests. SSH host key checking is turned off. |
| 10 | Low | Perf | The full save is written to localStorage twice every 10 s, and the live roster is rebuilt on each write. |
| 11 | Low | A11y | 6 icon-only buttons have no `aria-label`. There are no `aria-label`s anywhere in `index.html`. |
| 12b | Low | Build | `jspdf` is imported statically in `domain/reportPdf.ts`, which pulls jsPDF + html2canvas + DOMPurify (~390 kB) into startup. Use `await import('jspdf')` when a PDF is requested. Bump vitest to 5.x when convenient. |
| 12 | Low | Hygiene | The version lives in 3 places. There are 111 `!important` in `app.css`. Repo clutter. Commit messages carry no information. |

---

## 1. OTA update channel (High)

`src/ota/runOta.ts` fetches `latest.json`, then calls `CapacitorUpdater.download({ url: manifest.bundleUrl, … })` and `set()`. Whatever zip the manifest points to becomes the app's code, and that code has full access to the Capacitor plugins (Filesystem, Share).

- **No checksum or signature.** Capgo supports `checksum` on `download()` and end-to-end bundle encryption/signing (`npx @capgo/cli key create`, `privateKey`/`publicKey` in the config). Neither is used. The trust boundary is "whoever can write to the droplet or the CDN".
- **The fallback mirrors widen that boundary.** `OTA_MANIFEST_FALLBACK_URLS` includes `raw.githubusercontent.com/.../main/ota/latest.json` and jsDelivr. The repo is public. Anyone who gets push access to `main` (a compromised token, a compromised CI) can publish a manifest. If the droplet is down, every device follows it. jsDelivr also caches for up to 12 h, so a rollback there is slow.
- **The manifest's `bundleUrl` host isn't checked.** Only allow `https://cdn-studiophoenix.net/`.
- **`minAppVersion` is written but never read.** A bundle that needs a newer native shell (a new plugin) will install on old APKs and break.
- The primary URL is also listed again as the first fallback, which doubles the retries (4 attempts × 4 URLs, each with a 20 s timeout).

**Fix:** turn on Capgo signing (or at least send a SHA-256 `checksum` in the manifest and pass it to `download`). Allow-list the `bundleUrl` origin. Enforce `minAppVersion` against the native `App.getInfo().version`. Drop the GitHub/jsDelivr mirrors, or sign the manifest itself.

## 2. Android versionCode overflow (High)

`android/app/build.gradle`: `major*10000 + minor*100 + patch`. You're at patch **77**, and every OTA release bumps it. At 2.4.100 the code becomes 20500, the same as 2.5.0. Play rejects any upload whose versionCode isn't higher than the last one, and the 2.4.x line will land on codes that 2.5.x needs.

**Fix:** use `major*1_000_000 + minor*1_000 + patch`, or decouple the native versionCode from the OTA web version (it only needs to change when you ship a new APK).

## 3. Icons depend on the network (High for the use case)

`index.html` loads `https://fonts.googleapis.com/icon?family=Material+Icons`. The app is used offline at the field, and the APK has no copy of the font. Offline, or on a cold WebView cache, every `<span class="material-icons">edit</span>` shows the literal word, which breaks the tile layout.

**Fix:** self-host the font (for example the `material-icons` or `@fontsource/material-icons` npm package, or copy the woff2 into `public/`). Better still, inline the ~20 SVGs you actually use. That also fixes #5.

## 4. XSS through imported backups (Medium)

Names are escaped, but **IDs are interpolated raw** into HTML attributes:

- `reports.ts` → `data-view="${game.id}"`, `data-print="${game.id}"`, `data-game-id="${game.id}"`
- `teamSetup.ts` → `data-edit="${player.id}"`, `data-player-id="${player.id}"`
- `formation.ts` → `data-player-id="${playerId}"`

`migrate.ts` accepts any string as an id (`asString(rec.id, …)`). A backup JSON someone shares (from another coach or a club group chat) with `"id": "x\"><img src=x onerror=…>"` runs script when the reports or roster screen renders. In the APK that script can use the Filesystem/Share plugins.

**Fix:** in `migrate.ts`, reject or regenerate any id that doesn't match `/^[A-Za-z0-9_-]{1,64}$/`. Also escape (or `dataset`-assign) every interpolation, not only the text ones. Also clamp numbers during import (jersey 0–99, periods/durations to sane ranges).

## 5. Privacy policy doesn't match what the app does (Medium)

`docs/privacy.html` says: *"The app uses the internet only to check for and download in-app updates from our update server."* In practice the app also contacts:
- `fonts.googleapis.com` / `fonts.gstatic.com` on every launch (sends IP and user agent to Google)
- `raw.githubusercontent.com` and `cdn.jsdelivr.net` (OTA fallbacks)

That matters for Play's Data safety form and for Quebec's Law 25 / PIPEDA. Fixing #1 and #3 makes the policy true again.

## 6. JSON backup export on Android (Medium)

`settings.ts` exports with `Blob → <a download> → click()` and revokes the URL **right away**. In the Capacitor Android WebView, anchor downloads of `blob:` URLs are ignored, so on the APK nothing happens (while a "Backup saved" toast still shows). PDFs already go through a native Filesystem + Share path in `lib/shareFile.ts`. The JSON backup should use the same path. On the web, revoking right away can also cancel the download in Safari/Firefox. Use the deferred revoke already written in `downloadPdf`.

## 7. Save durability (Medium)

`lib/storage.ts → writeSave()` copies the current save into `.bak`, then writes the new one. The clock persists every 10 s during a game, so `.bak` is never more than 10 s older than the live save. If a migration bug or a bad import corrupts the state, the good copy is gone within one tick. `hydrate()` also calls `persist()` straight away at boot.

- If `localStorage.setItem` throws (quota, private mode), `persist()` throws before `emit()`. The in-memory state and the UI drift apart and the user gets no message. Storing the save twice doubles quota use.

**Fix:** keep a rotating "last known good" copy written at most daily or per app version (or only at game end). Wrap the main write in try/catch and show a clear message. Consider Capacitor Preferences or Filesystem on native. WebView localStorage can be wiped by the OS, and a coach's season lives there.

## 8. Monetization: half-built (Medium)

- `lib/billing.ts` is stubbed (always `false` / `'unavailable'`).
- `ui/paywall.ts → showPaywall`, `applyLiteReportCap`, `liteReportLimitReached` and `canAddUserTeam` are **never called**. Only `canSelectTeam` is enforced.
- As a result, a Lite user can still create a 2nd team (`teams.canAddTeam` checks `MAX_TEAMS=2`) but can't select it. The team silently disappears from the pickers.
- `importBackup(kind: 'full')` takes `entitlement` from the file, so editing `"entitlement":"pro"` in a backup unlocks Pro. On the web that's unavoidable, but on Android the entitlement should come from Play only (`queryPurchases` at launch), never from the save.

**Fix:** decide now whether Lite limits are live. If they aren't, remove the gating so users don't hit an invisible wall. If they are, route team creation through `canAddUserTeam` + `showPaywall`, and strip `entitlement` on import.

## 9. CI/CD (Medium)

`.github/workflows/deploy-to-DOragoug.yml`:
- It runs `npm run build` but **not `npm test`** before `rsync --delete` to production.
- It sets `-o StrictHostKeyChecking=no` right after `ssh-keyscan`, so the keyscan does nothing and there's no protection against a spoofed host. Store the known host key as a secret instead.
- It uses Node 20 (end of life April 2026). Move to 22 or 24.
- The OTA publish runs from a laptop (`scripts/ota-publish.mjs`, 890 lines) and has no tests or dry-run gate.

## 10. Runtime performance (Low)

Every 10 s during a game, `persistClock → persist → emit → renderActive` does the following:
- stringifies the **whole** save (every team, every game, every action) and writes it twice to localStorage
- re-runs `fillTeamSelectors()` (rebuilds 3 `<select>`s) and `paintLiveRosters()` (empties and rebuilds every player tile, with `statsFromActions` per player)

This is fine early in a season, but it grows with history on low-end Android phones. A rebuild can also land between the two taps of a double-tap (`DOUBLE_TAP_MS=320`). Suggestions: persist only `clock` and `currentGame` under their own key during a live game, and skip the re-render on clock-only emits (the labels are already updated by `updateClockLabels`).

## 11. Accessibility (Low)

- 6 of 85 buttons in `index.html` are icon-only with no accessible name, and there's no `aria-label` in the file. Screen readers read the ligature text ("close", "more_vert").
- Dialogs are `div`s toggled with `display` (`toggleDialog`): no `role="dialog"`, no focus trap, no Escape handling. Native `<dialog>` + `showModal()` would give you all three.
- The live tiles are `div`s with click handlers, so they aren't reachable by keyboard. That matters less on phones, but it matters for the web build.

## 12. Hygiene (Low)

- **The version is in 3 places**: `package.json`, `capacitor.config.ts` (`BUILTIN_WEB_VERSION`) and `src/ota/config.ts` (`APP_BUNDLE_VERSION`). `APP_VERSION` is already injected by Vite. Make `ota/config.ts` use `__APP_VERSION__`, and have `capacitor.config.ts` read `package.json`.
- `README.md` says v2.4.50 and describes pre-Pro behaviour ("Two teams max").
- `src/assets/` includes screenshots, `app icon.png` (a filename with a space) duplicating `app-icon.png`, and store images. Move the ones that aren't used at runtime to `docs/` or `store/`. The 2 MB intro MP4 ships in **every** OTA zip. Consider keeping it native-only or loading it once.
- `serve.py`: `directory = "dist" if … else "dist"`. It's unused, so delete it.
- `.grok/skills/` is committed.
- The history has 28 "chore: commit current workspace changes" commits and 8 "Deployed your application", which makes bisecting and changelogs hard. `domain/changelog.ts` is hand-maintained alongside them.
- CSS: `app.css` (5.5k lines) + `theme.css` (2.6k) with 156 `!important` between them suggests layers overriding each other. Merge the theme into CSS custom properties and delete the overrides.
- Android: `allowBackup="true"` lets Google backup restore localStorage, which is good for users. Say so in the privacy policy. `minifyEnabled false` is fine for a Capacitor shell.
- The template tests `ExampleUnitTest` / `ExampleInstrumentedTest` are still under `com.getcapacitor.myapp`.

---

## Suggested order

1. **Now:** fix the versionCode formula (#2), self-host the icons (#3), sanitize IDs on import (#4).
2. **Before the next Play release:** OTA checksum/signing + origin allow-list + `minAppVersion` (#1), privacy policy (#5), native JSON export (#6), tests in CI (#9).
3. **Before turning on Pro:** wire up or remove the gating, and take the entitlement from Play only (#8).
4. **Ongoing:** save durability (#7), live-game perf (#10), dialogs/a11y (#11), cleanup (#12).
