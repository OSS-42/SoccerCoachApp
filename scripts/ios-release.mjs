/**
 * App Store build: archive + IPA for the current package.json version. Does NOT upload —
 * upload with Xcode Organizer or Transporter, then submit for review in App Store Connect.
 *
 *   npm run ios:release
 *
 * - MARKETING_VERSION = package.json version (this is the "native version" OTA minAppVersion checks)
 * - CURRENT_PROJECT_VERSION = major*1_000_000 + minor*1_000 + patch (same scheme as Android versionCode)
 * - Output: release/ios/<version>/App.ipa and release/ios/ActionPitch-<version>.xcarchive (gitignored)
 */
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pbxprojPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj')
const outDir = path.join(root, 'release/ios')

function die(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

function run(cmd, args) {
  console.log(`\n$ ${[cmd, ...args].join(' ')}`)
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
}

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version
const parts = version.split('.').map((n) => Number.parseInt(n, 10))
if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0) || parts[1] > 999 || parts[2] > 999) {
  die(`package.json version ${version} must be X.Y.Z with minor/patch ≤ 999`)
}
const buildNumber = String(parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2])

let pbxproj = fs.readFileSync(pbxprojPath, 'utf8')
const team = pbxproj.match(/DEVELOPMENT_TEAM = (\w+);/)?.[1]
if (!team) die('DEVELOPMENT_TEAM not found in the Xcode project')
pbxproj = pbxproj
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
fs.writeFileSync(pbxprojPath, pbxproj)
console.log(`✓ iOS version ${version} (build ${buildNumber}), team ${team}`)

run('npm', ['test'])
run('npm', ['run', 'build'])
run('npx', ['cap', 'sync', 'ios'])

const archivePath = path.join(outDir, `ActionPitch-${version}.xcarchive`)
const exportPath = path.join(outDir, version)
fs.rmSync(archivePath, { recursive: true, force: true })
fs.rmSync(exportPath, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

run('xcodebuild', [
  '-project', 'ios/App/App.xcodeproj',
  '-scheme', 'App',
  '-configuration', 'Release',
  '-destination', 'generic/platform=iOS',
  '-archivePath', archivePath,
  '-allowProvisioningUpdates',
  'archive',
])

const exportOptions = path.join(outDir, 'ExportOptions.plist')
fs.writeFileSync(
  exportOptions,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>teamID</key><string>${team}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
`,
)

run('xcodebuild', [
  '-exportArchive',
  '-archivePath', archivePath,
  '-exportPath', exportPath,
  '-exportOptionsPlist', exportOptions,
  '-allowProvisioningUpdates',
])

// --- verify what will be uploaded ---
const ipa = fs.readdirSync(exportPath).find((f) => f.endsWith('.ipa'))
if (!ipa) die(`No .ipa in ${exportPath}`)
const ipaPath = path.join(exportPath, ipa)
const unzip = (entry) => execSync(`unzip -p "${ipaPath}" "${entry}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const infoPlist = execSync(`unzip -p "${ipaPath}" "Payload/App.app/Info.plist" | plutil -convert json -o - -`, {
  encoding: 'utf8',
})
const info = JSON.parse(infoPlist)
const capConfig = JSON.parse(unzip('Payload/App.app/capacitor.config.json'))
const updater = capConfig.plugins?.CapacitorUpdater ?? {}
const problems = []
if (info.CFBundleShortVersionString !== version) problems.push(`CFBundleShortVersionString=${info.CFBundleShortVersionString}`)
if (info.CFBundleVersion !== buildNumber) problems.push(`CFBundleVersion=${info.CFBundleVersion}`)
if (updater.statsUrl !== '') problems.push(`Capgo statsUrl=${JSON.stringify(updater.statsUrl)} (telemetry on)`)
if (updater.version !== version) problems.push(`Capgo builtin version=${updater.version}`)
if (updater.autoUpdate !== false) problems.push(`Capgo autoUpdate=${updater.autoUpdate}`)
if (problems.length) die(`IPA check failed:\n  ${problems.join('\n  ')}`)

const mb = (fs.statSync(ipaPath).size / (1024 * 1024)).toFixed(1)
console.log(`
════════════════════════════════════════
✓ App Store build ready (not uploaded)
  Version:  ${version} (build ${buildNumber})
  IPA:      ${path.relative(root, ipaPath)} (${mb} MB)
  Archive:  ${path.relative(root, archivePath)}
  Checked:  version/build, Capgo builtin ${updater.version}, autoUpdate off, telemetry off

Upload: Xcode → Window → Organizer → Archives → Distribute App,
        or drag the IPA into Transporter. Then submit in App Store Connect.
════════════════════════════════════════
`)
