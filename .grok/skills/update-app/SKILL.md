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

1. Bump semver + `APP_BUNDLE_VERSION` + `ota/latest.json` (CDN `bundleUrl`)
2. Build → `release/dist.zip` → SCP `/var/www/ota/sca/live/`
3. Cap sync + debug APK → SCP `/var/www/ota/sca/apk/` (size-verify, then delete other `actionpitch_*.apk`)
4. Commit + push + `gh release create ota-X.Y.Z`

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
