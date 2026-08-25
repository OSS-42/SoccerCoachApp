# Android APK + Droplet OTA (ActionPitch)

Ship a **Capacitor** APK that embeds the Vite web build, then **self-updates** from the **CDN droplet** on launch (Capgo updater + public `latest.json` / `dist.zip`).

This is the same pipeline as Mokkori 2169. It does **not** use DOragoug.

> **Why not GitHub raw?** Private repos 404 on devices. Channel tip + zip must be on a **public HTTPS** host.

## How it works

```
App cold start (native)
  → OTA screen
  → fetch https://cdn-studiophoenix.net/sca/live/latest.json
  → if manifest.version > installed bundle version
       download …/sca/live/dist.zip
       Capgo apply + reload WebView
  → intro video → Continue → home

Web browser builds skip OTA.
```

| Piece | Path / URL |
| --- | --- |
| Droplet files | `/var/www/ota/sca/live/latest.json` + `dist.zip` |
| Public base | `https://cdn-studiophoenix.net/sca/live` |
| Manifest | `https://cdn-studiophoenix.net/sca/live/latest.json` |
| Bundle zip | `https://cdn-studiophoenix.net/sca/live/dist.zip` |
| Sideload APK | `https://cdn-studiophoenix.net/sca/apk/actionpitch_X.Y.Z.apk` |
| Deploy | `scripts/ota-publish.mjs` via `.env.ota.local` |
| appId | `com.actionpitch.app` |

## Publish an update

```bash
npm run ota:publish -- --notes "What changed"
npm run ota:publish -- --dry-run
```

Requires `.env.ota.local` (see `.env.ota.example`) and `~/.ssh/id_ed25519_ota`.

## Nginx `/sca/` 404

Directories already exist on the droplet. If HTTP 404, run on the droplet (sudo):

```bash
bash scripts/ota-nginx-enable-sca.sh
```

## When you still need a new APK

Rebuild the native APK for Capacitor plugins, `appId`, icons, or Gradle/SDK changes. Web content ships through OTA.

```bash
npm run android:apk
```

## Play Store AAB (upload key)

Play needs a **signed `.aab`**, not the debug APK on the CDN.

```bash
npm run android:aab
```

Output: `release/actionpitch_X.Y.Z.aab` (gitignored).

The **upload keystore** lives only on this machine:

- `android/keystore/actionpitch-upload.jks`
- `android/keystore.properties`

Copy both to a password manager or encrypted backup. Losing them means you cannot ship Play updates until Google resets the upload key.

First Play upload: Testing → Internal testing → Create release → drop in the `.aab` → let **Play App Signing** stay on. Google keeps the app-signing key; you keep the upload key.
