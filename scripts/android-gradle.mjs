/**
 * Run Gradle for the Capacitor Android project with a JDK 21+ JAVA_HOME.
 * Usage: node scripts/android-gradle.mjs assembleDebug
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = path.join(root, 'android')
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/android-gradle.mjs <gradle-task>…')
  process.exit(1)
}

const candidates = [
  process.env.JAVA_HOME,
  '/opt/homebrew/opt/openjdk@21',
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21',
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
].filter(Boolean)

function javaHomeOk(home) {
  if (!home) return false
  const bin = path.join(home, 'bin', 'java')
  if (!fs.existsSync(bin)) return false
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' })
  const out = `${r.stderr || ''}${r.stdout || ''}`
  const m = out.match(/version "(\d+)/)
  const major = m ? parseInt(m[1], 10) : 0
  return major >= 21
}

let javaHome = candidates.find(javaHomeOk)
if (!javaHome) {
  console.error(
    'Need JDK 21+ for Capacitor Android builds.\n' +
      '  brew install openjdk@21\n' +
      '  export JAVA_HOME=/opt/homebrew/opt/openjdk@21\n' +
      'See docs/ANDROID.md',
  )
  process.exit(1)
}

const env = { ...process.env, JAVA_HOME: javaHome }
env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
console.log(`[android-gradle] JAVA_HOME=${javaHome}`)
const result = spawnSync(gradlew, args, {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
