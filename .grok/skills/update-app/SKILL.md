---
name: update-app
description: >
  Publish ActionPitch OTA to CDN droplet + GitHub (semver, build, dist.zip,
  latest.json, SCP live+apk, push, release). Triggers: "lets update the app",
  "update the app", "publish OTA", "ship OTA", "release OTA", /update-app.
---

# Update app (Droplet OTA)

Run **without** step-by-step confirmation unless: `gh` logged out, force-push risk, dry-run only, or droplet SSH fails.

## Command

```bash
npm run ota:publish -- --notes "…"
# optional: --bump minor|major | --version X.Y.Z | --dry-run
```

Script: `scripts/ota-publish.mjs` · env: `.env.ota.local` (`OTA_DEPLOY_*`, key `~/.ssh/id_ed25519_ota`).

## Pipeline (script owns details)

0. Before running: add the new version's entry (en + fr) at the top of `src/domain/changelog.ts`; the script refuses to publish without it
1. Bump semver in `package.json` (the only version source)
2. `npm test` → build → `release/dist.zip` → `ota/latest.json` with the zip's SHA-256, signed with `~/.config/actionpitch/ota-signing-primary.pem` (never commit keys)
3. SCP `dist.zip` then `latest.json` to `/var/www/ota/sca/live/`; `docs/privacy.html` → `/var/www/ota/sca/privacy.html` (verified live)
4. Cap sync + debug APK → SCP `/var/www/ota/sca/apk/` (size-verify, then delete other `actionpitch_*.apk`)
5. Commit (secret paths/content abort) + push + `gh release create ota-X.Y.Z`

## Report (keep short)

Version, `…/sca/live/latest.json`, `…/sca/live/dist.zip`, `…/sca/apk/actionpitch_X.Y.Z.apk`. Content OTA = cold start; reinstall APK only for native/channel-URL changes.

## Prereqs

- Branch `main` (no force-push)
- `.env.ota.local` + `id_ed25519_ota`
- `gh auth` if release enabled

## Nginx `/sca/` 404

File on disk but HTTP 404 → run on droplet (sudo): `bash scripts/ota-nginx-enable-sca.sh`

## Verbosity

Prefer short status lines over long checklists. Do not re-explain the full OTA architecture unless asked.
