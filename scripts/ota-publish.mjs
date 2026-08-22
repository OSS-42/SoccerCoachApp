/**
 * Full OTA publish pipeline → GitHub.
 *
 * 1. Bump semver (patch by default)
 *  2. Commit the current app changes first (so source edits land before OTA metadata)
 *  3. Sync package.json + src/ota/config.ts + capacitor.config.ts Capgo version + ota/latest.json
 *  4. Build web + zip dist → release/dist.zip
 *  5. Commit version/channel files
 *  6. Push branch
 *  7. Create GitHub Release tag ota-X.Y.Z with dist.zip
 *
 * Usage:
 *   npm run ota:publish
 *   npm run ota:publish -- --bump minor
 *   npm run ota:publish -- --version 0.2.0 --notes "Cards + OTA polish"
 *   npm run ota:publish -- --dry-run
 *
 * Requires: git, gh (authenticated: gh auth login), network.
 */
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = path.join(root, 'package.json')
const configPath = path.join(root, 'src/ota/config.ts')
const capacitorConfigPath = path.join(root, 'capacitor.config.ts')
const manifestPath = path.join(root, 'ota/latest.json')
const zipPath = path.join(root, 'release/dist.zip')
const apkFilePrefix = 'actionpitch'
/** Default deploy key — must match the key on the OTA host (not DOragoug / github keys). */
const DEFAULT_OTA_SSH_KEY = path.join(os.homedir(), '.ssh', 'id_ed25519_ota')

function expandPath(input) {
  return String(input)
    .replace(/^~(?=\/|$)/, os.homedir())
    .replace(/\$\{HOME\}/g, os.homedir())
    .replace(/\$HOME/g, os.homedir())
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    // Expand $HOME / ${HOME} / ~
    val = expandPath(val)
    // Project .env.ota.local wins over a wrong shell export (e.g. id_ed25519 vs id_ed25519_ota)
    process.env[key] = val
  }
}

// Optional local env (not committed): OTA_DEPLOY_* vars
loadEnvFile(path.join(root, '.env.ota.local'))

const args = parseArgs(process.argv.slice(2))

function parseArgs(argv) {
  const out = {
    bump: 'patch',
    version: null,
    notes: null,
    dryRun: false,
    skipPush: false,
    skipRelease: false,
    deploy: false,
    /** Also stage common app paths (not android build junk). */
    includeApp: true,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--bump') out.bump = argv[++i] || 'patch'
    else if (a === '--version') out.version = argv[++i]
    else if (a === '--notes') out.notes = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--no-push') out.skipPush = true
    else if (a === '--no-release') out.skipRelease = true
    else if (a === '--deploy') out.deploy = true
    else if (a === '--channel-only') out.includeApp = false
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/ota-publish.mjs [options]
  --bump patch|minor|major   Semver bump (default: patch)
  --version X.Y.Z            Set exact version (skips bump)
  --notes "text"             Release notes
  --dry-run                  Print plan only
  --no-push                  Do not git push
  --no-release               Do not create GitHub Release
  --deploy                   Upload latest.json + dist.zip + APK to OTA host via SSH/SCP
  --channel-only             Only commit ota version files (not broader app)`)
      process.exit(0)
    } else {
      console.error(`Unknown arg: ${a}`)
      process.exit(1)
    }
  }
  return out
}

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`)
  if (args.dryRun && opts.mutate) {
    console.log('  (dry-run — skipped)')
    return ''
  }
  return execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    stdio: opts.silent ? 'pipe' : 'inherit',
    env: process.env,
  })
}

function runSilent(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim()
}

function envValue(name) {
  const raw = process.env[name]
  if (!raw) return null
  const value = raw.trim()
  return value.length > 0 ? value : null
}

function stripTrailingSlash(input) {
  return input.endsWith('/') ? input.slice(0, -1) : input
}

/**
 * Prefer OTA_DEPLOY_SSH_KEY when it exists.
 * Common footgun: shell/env points at ~/.ssh/id_ed25519 (missing) while the
 * real OTA key is ~/.ssh/id_ed25519_ota — auto-correct that case.
 */
function resolveOtaSshKey() {
  const candidates = []
  const fromEnv = envValue('OTA_DEPLOY_SSH_KEY')
  if (fromEnv) candidates.push(expandPath(fromEnv))
  candidates.push(DEFAULT_OTA_SSH_KEY)
  // last-resort common names (only if they exist)
  candidates.push(path.join(os.homedir(), '.ssh', 'id_ed25519'))

  const seen = new Set()
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    if (fs.existsSync(candidate)) {
      if (fromEnv && expandPath(fromEnv) !== candidate) {
        console.warn(
          `\n⚠ OTA_DEPLOY_SSH_KEY was "${expandPath(fromEnv)}" (missing).\n` +
            `  Using existing key instead: ${candidate}\n`,
        )
      }
      return candidate
    }
  }

  if (fromEnv) {
    die(
      `OTA_DEPLOY_SSH_KEY not found: ${expandPath(fromEnv)}\n` +
        `  Expected OTA key at: ${DEFAULT_OTA_SSH_KEY}\n` +
        `  Fix: export OTA_DEPLOY_SSH_KEY="$HOME/.ssh/id_ed25519_ota"\n` +
        `  Or edit .env.ota.local`,
    )
  }
  return null
}

/** Canonical APK sideload dir on the droplet (not under Capgo /live). */
const DEFAULT_APK_REMOTE_DIR = '/var/www/ota/sca/apk'

/**
 * APK dir: OTA_DEPLOY_APK_REMOTE_DIR, else DEFAULT, else sibling of live.
 */
function resolveApkRemoteDir(liveRemoteDir) {
  const fromEnv = envValue('OTA_DEPLOY_APK_REMOTE_DIR')
  if (fromEnv) return stripTrailingSlash(fromEnv)
  // Always prefer the documented path when deploying to our OTA host layout
  if (liveRemoteDir && /\/ota\/live\/?$/.test(stripTrailingSlash(liveRemoteDir))) {
    return DEFAULT_APK_REMOTE_DIR
  }
  if (!liveRemoteDir) return DEFAULT_APK_REMOTE_DIR
  const live = stripTrailingSlash(liveRemoteDir)
  return `${path.posix.dirname(live)}/apk`
}

/** Public base for APKs: https://cdn…/live → https://cdn…/apk */
function resolveApkBaseUrl(liveBaseUrl) {
  const fromEnv = envValue('OTA_DEPLOY_APK_BASE_URL')
  if (fromEnv) return stripTrailingSlash(fromEnv)
  if (!liveBaseUrl) return null
  const live = stripTrailingSlash(liveBaseUrl)
  if (live.endsWith('/live')) return `${live.slice(0, -'/live'.length)}/apk`
  const parent = live.replace(/\/[^/]+$/, '')
  return parent ? `${parent}/apk` : null
}

function deployConfig(bundleFileName) {
  const target = envValue('OTA_DEPLOY_SSH')
  const remoteDir = envValue('OTA_DEPLOY_REMOTE_DIR')
  const baseUrlRaw = envValue('OTA_DEPLOY_BASE_URL')
  const baseUrl = baseUrlRaw ? stripTrailingSlash(baseUrlRaw) : null
  const keyFile = resolveOtaSshKey()
  const port = envValue('OTA_DEPLOY_SSH_PORT')
  const enabled = args.deploy || Boolean(target || remoteDir || baseUrl)
  const bundleUrl = baseUrl ? `${baseUrl}/${bundleFileName}` : null
  const apkRemoteDir = resolveApkRemoteDir(remoteDir)
  const apkBaseUrl = resolveApkBaseUrl(baseUrl)

  return {
    enabled,
    target,
    remoteDir,
    baseUrl,
    keyFile,
    port,
    bundleUrl,
    bundleFileName,
    apkRemoteDir,
    apkBaseUrl,
  }
}

function gitStatus() {
  try {
    return runSilent('git status --porcelain')
  } catch {
    return ''
  }
}

/**
 * Stage everything that is not gitignored (tracked mods + untracked).
 * User wants full workspace commits on publish, not a path whitelist.
 */
function stageAllWorkspace() {
  run('git add -A', { mutate: true })
}

function stagePaths(paths) {
  for (const p of paths) {
    const abs = path.join(root, p)
    if (fs.existsSync(abs)) {
      try {
        run(`git add -- "${p}"`, { mutate: true })
      } catch {
        /* path may be empty / ignored */
      }
    }
  }
}

function commitMessageFile(message, notes) {
  const msgFile = path.join(root, '.git/OTA_COMMIT_MSG')
  fs.writeFileSync(msgFile, `${message}\n\n${notes}\n`)
  return msgFile
}

function commitStaged(message, notes) {
  if (args.dryRun) {
    console.log(`would commit: ${message}`)
    return
  }
  const msgFile = commitMessageFile(message, notes)
  try {
    execFileSync('git', ['commit', '-F', msgFile], {
      cwd: root,
      stdio: 'inherit',
    })
  } catch {
    // nothing staged
    console.warn('git commit skipped (nothing to commit?)')
  } finally {
    try {
      fs.unlinkSync(msgFile)
    } catch {
      /* */
    }
  }
}

function copyFileIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    die(`Missing expected file: ${sourcePath}`)
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.copyFileSync(sourcePath, targetPath)
}

function bumpSemver(v, kind) {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) throw new Error(`Invalid semver: ${v}`)
  let [, a, b, c] = m.map(Number)
  if (kind === 'major') {
    a += 1
    b = 0
    c = 0
  } else if (kind === 'minor') {
    b += 1
    c = 0
  } else {
    c += 1
  }
  return `${a}.${b}.${c}`
}

function ensureTools() {
  try {
    runSilent('git rev-parse --is-inside-work-tree')
  } catch {
    die('Not a git repository')
  }
  if (!args.skipRelease) {
    try {
      runSilent('gh --version')
    } catch {
      die('GitHub CLI (gh) required. Install: brew install gh && gh auth login')
    }
    // gh auth status exits 1 when logged out; capture combined output
    let authOut = ''
    try {
      authOut = execSync('gh auth status 2>&1', {
        cwd: root,
        encoding: 'utf8',
      })
    } catch (e) {
      authOut = String(e.stdout || '') + String(e.stderr || '') + String(e.message || '')
    }
    if (!/Logged in to/i.test(authOut)) {
      die('gh is not authenticated. Run: gh auth login')
    }
  }
}

function ensureDeployTools() {
  try {
    runSilent('command -v ssh')
  } catch {
    die('OpenSSH client required for deploy (ssh not found)')
  }
  try {
    runSilent('command -v scp')
  } catch {
    die('OpenSSH scp required for deploy (scp not found)')
  }
}

function sshArgsForDeploy(deploy) {
  // IdentitiesOnly: do not also try global ~/.ssh/config keys (e.g. DOragoug)
  const args = ['-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes']
  if (deploy.port) {
    args.push('-p', deploy.port)
  }
  if (deploy.keyFile) {
    args.push('-i', deploy.keyFile)
  } else {
    die(
      'No OTA SSH key found. Create ~/.ssh/id_ed25519_ota or set OTA_DEPLOY_SSH_KEY',
    )
  }
  return args
}

function scpArgsForDeploy(deploy) {
  const args = ['-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes']
  if (deploy.port) {
    args.push('-P', deploy.port)
  }
  if (deploy.keyFile) {
    args.push('-i', deploy.keyFile)
  } else {
    die(
      'No OTA SSH key found. Create ~/.ssh/id_ed25519_ota or set OTA_DEPLOY_SSH_KEY',
    )
  }
  return args
}

function deployArtifacts({ deploy, manifestFile, zipFile }) {
  if (!deploy.enabled) return

  if (!deploy.target || !deploy.remoteDir || !deploy.baseUrl) {
    die(
      'Deploy requires OTA_DEPLOY_SSH, OTA_DEPLOY_REMOTE_DIR, and OTA_DEPLOY_BASE_URL',
    )
  }

  ensureDeployTools()

  if (args.dryRun) {
    console.log(`would deploy to ${deploy.target}:${deploy.remoteDir}`)
    console.log(`would upload: ${manifestFile} and ${zipFile}`)
    return
  }

  const sshArgs = sshArgsForDeploy(deploy)
  const scpArgs = scpArgsForDeploy(deploy)

  console.log(`\n[deploy] using SSH key: ${deploy.keyFile}`)
  console.log(`$ ssh … ${deploy.target} mkdir -p ${deploy.remoteDir}`)
  execFileSync(
    'ssh',
    [...sshArgs, deploy.target, 'mkdir', '-p', deploy.remoteDir],
    { cwd: root, stdio: 'inherit' },
  )

  console.log(`$ scp … ${manifestFile} ${zipFile} ${deploy.target}:${deploy.remoteDir}/`)
  execFileSync(
    'scp',
    [...scpArgs, manifestFile, zipFile, `${deploy.target}:${deploy.remoteDir}/`],
    { cwd: root, stdio: 'inherit' },
  )

  console.log(`✓ OTA files deployed: ${deploy.baseUrl}/latest.json and ${deploy.bundleUrl}`)
}

/**
 * Ensure remote APK dir exists (deploy ACL or sudo once).
 * Returns nothing; dies on failure.
 */
function ensureRemoteApkDir(deploy) {
  const dir = deploy.apkRemoteDir
  const remoteScript = `
set -e
DIR=${JSON.stringify(dir)}
if [ -d "$DIR" ] && [ -w "$DIR" ]; then
  exit 0
fi
if mkdir -p "$DIR" 2>/dev/null && [ -w "$DIR" ]; then
  exit 0
fi
if command -v sudo >/dev/null 2>&1; then
  sudo mkdir -p "$DIR"
  sudo chown "$(id -u)":"$(id -g)" "$DIR"
  sudo chmod u+rwx "$DIR"
  exit 0
fi
echo "cannot create writable APK dir: $DIR" >&2
exit 1
`.trim()

  execFileSync('ssh', [...sshArgsForDeploy(deploy), deploy.target, 'bash', '-s'], {
    cwd: root,
    stdio: ['pipe', 'inherit', 'inherit'],
    input: remoteScript,
  })
}

/**
 * Upload versioned APK to /var/www/ota/apk/, verify size, then delete other *.apk.
 * Only removes previous APKs after the new file is confirmed on the host.
 */
function deployApkArtifact({ deploy, apkFile, version }) {
  if (!deploy.enabled) return

  if (!deploy.target || !deploy.apkRemoteDir) {
    die('APK deploy requires OTA_DEPLOY_SSH and a resolvable APK remote dir')
  }
  if (!args.dryRun && !fs.existsSync(apkFile)) {
    die(`Missing APK for deploy: ${apkFile}`)
  }

  const apkName = path.basename(apkFile)
  const remotePath = `${stripTrailingSlash(deploy.apkRemoteDir)}/${apkName}`
  const publicUrl = deploy.apkBaseUrl
    ? `${deploy.apkBaseUrl}/${apkName}`
    : remotePath
  const localSize = args.dryRun ? 0 : fs.statSync(apkFile).size

  ensureDeployTools()

  if (args.dryRun) {
    console.log(`would ensure dir ${deploy.target}:${deploy.apkRemoteDir}`)
    console.log(`would scp ${apkFile} → ${deploy.target}:${remotePath}`)
    console.log(
      `would verify remote size, then delete other *.apk in ${deploy.apkRemoteDir} (keep ${apkName})`,
    )
    return publicUrl
  }

  const sshArgs = sshArgsForDeploy(deploy)
  const scpArgs = scpArgsForDeploy(deploy)

  console.log(`\n[deploy-apk] ${apkName} → ${deploy.target}:${deploy.apkRemoteDir}/`)
  ensureRemoteApkDir(deploy)

  // List previous APKs (informational) before upload
  let previous = ''
  try {
    previous = execFileSync(
      'ssh',
      [
        ...sshArgs,
        deploy.target,
        `ls -1 ${JSON.stringify(deploy.apkRemoteDir)}/*.apk 2>/dev/null || true`,
      ],
      { cwd: root, encoding: 'utf8' },
    ).trim()
  } catch {
    previous = ''
  }
  if (previous) {
    console.log(`[deploy-apk] existing on host:\n${previous}`)
  } else {
    console.log('[deploy-apk] no previous APKs on host')
  }

  console.log(`$ scp … ${apkFile} ${deploy.target}:${remotePath}`)
  execFileSync('scp', [...scpArgs, apkFile, `${deploy.target}:${remotePath}`], {
    cwd: root,
    stdio: 'inherit',
  })

  // Verify upload succeeded (size match) before deleting anything
  const remoteStat = execFileSync(
    'ssh',
    [
      ...sshArgs,
      deploy.target,
      `stat -c %s ${JSON.stringify(remotePath)} 2>/dev/null || stat -f %z ${JSON.stringify(remotePath)}`,
    ],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  const remoteSize = parseInt(remoteStat, 10)
  if (!Number.isFinite(remoteSize) || remoteSize !== localSize) {
    die(
      `APK upload verify failed: local ${localSize} bytes, remote reported "${remoteStat}". ` +
        `Previous APKs left untouched.`,
    )
  }
  console.log(`[deploy-apk] verified remote size ${remoteSize} bytes`)

  // Delete only other APKs (keep the one we just uploaded)
  const cleanupScript = `
set -e
DIR=${JSON.stringify(deploy.apkRemoteDir)}
KEEP=${JSON.stringify(apkName)}
PREFIX=${JSON.stringify(apkFilePrefix + '_')}
shopt -s nullglob
for f in "$DIR"/"$PREFIX"*.apk; do
  base=$(basename "$f")
  if [ "$base" != "$KEEP" ]; then
    echo "removing previous APK: $f"
    rm -f "$f"
  fi
done
echo "kept: $DIR/$KEEP"
`.trim()

  execFileSync('ssh', [...sshArgs, deploy.target, 'bash', '-s'], {
    cwd: root,
    stdio: ['pipe', 'inherit', 'inherit'],
    input: cleanupScript,
  })

  // Prove on-disk presence in the publish log (SSH, not HTTP)
  const remoteLs = execFileSync(
    'ssh',
    [...sshArgs, deploy.target, `ls -lh ${JSON.stringify(deploy.apkRemoteDir)}`],
    { cwd: root, encoding: 'utf8' },
  ).trim()
  console.log(`[deploy-apk] remote listing:\n${remoteLs}`)

  // HTTP check — nginx must expose location /apk/ (root /var/www/ota)
  if (deploy.apkBaseUrl) {
    try {
      const head = execFileSync(
        'curl',
        ['-sSI', '--max-time', '20', publicUrl],
        { cwd: root, encoding: 'utf8' },
      )
      const statusLine = head.split(/\r?\n/).find((l) => /^HTTP\//i.test(l)) || ''
      if (/200/.test(statusLine)) {
        console.log(`✓ APK HTTP OK: ${publicUrl}`)
      } else {
        console.warn(`
⚠ APK is on disk at ${remotePath} but HTTP is not serving it.
  ${statusLine || head.slice(0, 120)}
  URL: ${publicUrl}

  Cause: nginx only allows /live/ and returns 404 for /apk/.
  On the droplet (needs sudo), add location /apk/ next to /live/, then:
    sudo nginx -t && sudo systemctl reload nginx

  Snippet:
    location /apk/ {
        try_files $uri =404;
        default_type application/vnd.android.package-archive;
        add_header Cache-Control "no-cache" always;
        add_header Access-Control-Allow-Origin "*" always;
        sendfile on;
    }
`)
      }
    } catch (e) {
      console.warn(
        `[deploy-apk] could not HTTP-check ${publicUrl}: ${e instanceof Error ? e.message : e}`,
      )
    }
  }

  console.log(`✓ APK on droplet: ${remotePath}`)
  console.log(`  public URL:     ${publicUrl}`)
  return publicUrl
}

function die(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

function githubSlug() {
  const url = runSilent('git remote get-url origin')
  // git@github.com:owner/repo.git or https://github.com/owner/repo.git
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/)
  if (!m) die(`Cannot parse GitHub repo from origin: ${url}`)
  return m[1]
}

function main() {
  console.log('=== ActionPitch OTA publish ===')
  if (args.dryRun) console.log('(dry-run mode)')

  ensureTools()

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const oldVersion = pkg.version
  const newVersion = args.version || bumpSemver(oldVersion, args.bump)
  const tag = `ota-${newVersion}`
  const slug = githubSlug()
  const deploy = deployConfig('dist.zip')
  const bundleUrl = deploy.bundleUrl ?? `https://github.com/${slug}/releases/download/${tag}/dist.zip`
  const branch = runSilent('git rev-parse --abbrev-ref HEAD')
  const notes =
    args.notes ||
    `OTA content update v${newVersion}\n\nActionPitch`

  console.log(`
Repo:     ${slug}
Branch:   ${branch}
Version:  ${oldVersion} → ${newVersion}
Tag:      ${tag}
Bundle:   ${bundleUrl}
Deploy:   ${deploy.enabled ? 'enabled' : 'disabled'}
SSH key:  ${deploy.keyFile || '(none — set OTA_DEPLOY_SSH_KEY or use ~/.ssh/id_ed25519_ota)'}
`)

  // --- commit ALL current changes first (tracked + untracked, respect .gitignore) ---
  if (gitStatus()) {
    stageAllWorkspace()
    if (gitStatus()) {
      commitStaged('chore: commit current workspace changes', notes)
    }
  }

  // --- version files ---
  pkg.version = newVersion
  if (!args.dryRun) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  } else {
    console.log(`would write package.json version ${newVersion}`)
  }

  let config = fs.readFileSync(configPath, 'utf8')
  if (!/APP_BUNDLE_VERSION\s*=\s*['"][^'"]+['"]/.test(config)) {
    die('APP_BUNDLE_VERSION not found in src/ota/config.ts')
  }
  config = config.replace(
    /APP_BUNDLE_VERSION\s*=\s*['"][^'"]+['"]/,
    `APP_BUNDLE_VERSION = '${newVersion}'`,
  )
  if (!args.dryRun) fs.writeFileSync(configPath, config)
  else console.log(`would set APP_BUNDLE_VERSION = '${newVersion}'`)

  // Capgo defaults the native shell to "1.0" when this is missing/stale.
  // "1.0" > "0.1.x" and blocks every 0.x OTA tip — keep in lockstep with APP_BUNDLE_VERSION.
  let capConfig = fs.readFileSync(capacitorConfigPath, 'utf8')
  if (!/BUILTIN_WEB_VERSION\s*=\s*['"][^'"]+['"]/.test(capConfig)) {
    die('BUILTIN_WEB_VERSION not found in capacitor.config.ts')
  }
  capConfig = capConfig.replace(
    /BUILTIN_WEB_VERSION\s*=\s*['"][^'"]+['"]/,
    `BUILTIN_WEB_VERSION = '${newVersion}'`,
  )
  if (!args.dryRun) fs.writeFileSync(capacitorConfigPath, capConfig)
  else console.log(`would set BUILTIN_WEB_VERSION = '${newVersion}'`)

  const prevManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const manifest = {
    version: newVersion,
    minAppVersion: prevManifest.minAppVersion || newVersion,
    notes: notes.split('\n')[0].slice(0, 200),
    bundleUrl,
  }
  if (!args.dryRun) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  } else {
    console.log('would write ota/latest.json:', manifest)
  }

  // --- build + zip ---
  run('npm run build', { mutate: true })
  run('node scripts/ota-bundle.mjs', { mutate: true })
  if (!args.dryRun && !fs.existsSync(zipPath)) {
    die(`Missing ${zipPath} after bundle`)
  }
  if (!args.dryRun) {
    const mb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1)
    console.log(`\n✓ Bundle ready (${mb} MB): ${zipPath}`)
  }

  // --- optional deploy (droplet / static host) ---
  deployArtifacts({
    deploy,
    manifestFile: manifestPath,
    zipFile: zipPath,
  })

  // --- build APK ---
  run('npm run cap:sync', { mutate: true })
  run('node scripts/android-gradle.mjs assembleDebug', { mutate: true })

  const builtApkPath = path.join(root, 'android/app/build/outputs/apk/debug', `${apkFilePrefix}_${newVersion}.apk`)
  const releaseApkPath = path.join(root, 'release', `actionpitch_${newVersion}.apk`)
  if (!args.dryRun) {
    copyFileIfExists(builtApkPath, releaseApkPath)
    const apkMb = (fs.statSync(releaseApkPath).size / (1024 * 1024)).toFixed(1)
    console.log(`✓ APK ready (${apkMb} MB): ${releaseApkPath}`)
  } else {
    console.log(`would copy ${builtApkPath} → ${releaseApkPath}`)
  }

  // --- APK sideload on droplet (/var/www/ota/apk) after successful content deploy ---
  const apkPublicUrl = deployApkArtifact({
    deploy,
    apkFile: releaseApkPath,
    version: newVersion,
  })

  // --- git commit version + any leftover workspace changes ---
  if (args.includeApp) {
    stageAllWorkspace()
  } else {
    stagePaths([
      'package.json',
      'src/ota/config.ts',
      'capacitor.config.ts',
      'ota/latest.json',
    ])
  }

  const status = gitStatus()

  if (!status && !args.dryRun) {
    console.log('\n(no file changes to commit — continuing to release if needed)')
  } else {
    const msg = `ota: release v${newVersion}`
    commitStaged(msg, notes)
  }

  if (!args.skipPush) {
    run(`git push -u origin HEAD`, { mutate: true })
  }

  // --- GitHub Release ---
  if (!args.skipRelease) {
    // Idempotent: delete existing tag/release only if --force not set; fail clearly
    let exists = false
    try {
      runSilent(`gh release view "${tag}"`)
      exists = true
    } catch {
      exists = false
    }

    if (exists) {
      die(
        `Release ${tag} already exists. Bump version further or: gh release delete ${tag} -y`,
      )
    }

    const notesFile = path.join(root, '.git/OTA_RELEASE_NOTES')
    if (!args.dryRun) fs.writeFileSync(notesFile, notes)
    try {
      run(
        `gh release create "${tag}" "${zipPath}" "${releaseApkPath}" --title "OTA v${newVersion}" --notes-file "${notesFile}" --target "${branch}"`,
        { mutate: true },
      )
    } finally {
      if (!args.dryRun) {
        try {
          fs.unlinkSync(notesFile)
        } catch {
          /* */
        }
      }
    }
  }

  const apkUrlLine =
    apkPublicUrl ||
    (deploy.enabled && deploy.apkBaseUrl
      ? `${deploy.apkBaseUrl}/actionpitch_${newVersion}.apk`
      : `release/actionpitch_${newVersion}.apk`)

  console.log(`
════════════════════════════════════════
✓ OTA v${newVersion} published
  Channel:  ota/latest.json → ${newVersion}
  Release:  https://github.com/${slug}/releases/tag/${tag}
  Zip:      ${bundleUrl}
  APK local: release/actionpitch_${newVersion}.apk
  APK CDN:  ${deploy.enabled ? apkUrlLine : 'deploy disabled'}
  Deploy:   ${deploy.enabled ? `${deploy.baseUrl}/latest.json` : 'disabled'}

Installed APKs will download content OTA on next cold start.
Sideload native shell from the APK CDN URL when needed.
════════════════════════════════════════
`)
}

// Only run when executed as CLI (not when imported for tests/helpers)
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main()
}
