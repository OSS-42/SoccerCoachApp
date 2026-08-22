/**
 * Zip dist/ for Capgo OTA / GitHub Release upload.
 * Usage: npm run build && npm run ota:bundle
 * Output: release/dist.zip
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const outDir = path.join(root, 'release')
const outZip = path.join(outDir, 'dist.zip')

if (!fs.existsSync(dist)) {
  console.error('dist/ missing — run npm run build first')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
if (fs.existsSync(outZip)) fs.unlinkSync(outZip)

// Capgo expects zip contents = root of web assets (index.html at top level)
execSync(`cd "${dist}" && zip -r "${outZip}" .`, { stdio: 'inherit' })

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
console.log(`\nCreated ${outZip}`)
console.log(`Next:`)
console.log(`  1. Create GitHub Release tag e.g. ota-${pkg.version}`)
console.log(`  2. Upload release/dist.zip`)
console.log(`  3. Edit ota/latest.json: version + bundleUrl to the release asset`)
console.log(`  4. git add ota/latest.json && git commit && git push`)
