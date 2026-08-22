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
