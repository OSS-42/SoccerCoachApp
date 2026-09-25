import { beforeAll, describe, expect, it } from 'vitest'
import { OTA_SIGNING_KEYS, manifestSigningPayload, verifyManifestSignature } from './signature'

const base64 = (bytes: ArrayBuffer) => Buffer.from(bytes).toString('base64')

const manifest = {
  version: '2.5.3',
  bundleUrl: 'https://cdn-studiophoenix.net/sca/live/dist.zip',
  checksum: 'ab'.repeat(32),
  minAppVersion: '2.4.50',
}

let keys: { id: string; spki: string }[]
let privateKey: CryptoKey

async function signed(fields = manifest, key = privateKey, keyId = 'test-key') {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(manifestSigningPayload(fields)),
  )
  return { ...fields, keyId, signature: base64(sig) }
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  privateKey = pair.privateKey
  keys = [{ id: 'test-key', spki: base64(await crypto.subtle.exportKey('spki', pair.publicKey)) }]
})

describe('manifest signing payload', () => {
  it('covers every field that decides what is installed, in a fixed format', () => {
    expect(manifestSigningPayload(manifest)).toBe(
      [
        'actionpitch-ota-v1',
        'version=2.5.3',
        'bundleUrl=https://cdn-studiophoenix.net/sca/live/dist.zip',
        `checksum=${'ab'.repeat(32)}`,
        'minAppVersion=2.4.50',
      ].join('\n'),
    )
    expect(manifestSigningPayload({ ...manifest, minAppVersion: undefined })).toMatch(/minAppVersion=$/)
  })
})

describe('verifyManifestSignature', () => {
  it('accepts a manifest signed by a trusted key', async () => {
    expect(await verifyManifestSignature(await signed(), keys)).toBe('valid')
  })

  it.each([
    ['version', { version: '9.9.9' }],
    ['bundle URL', { bundleUrl: 'https://cdn-studiophoenix.net/sca/live/evil.zip' }],
    ['checksum', { checksum: 'cd'.repeat(32) }],
    ['minAppVersion', { minAppVersion: '1.0.0' }],
  ])('rejects a manifest whose %s was changed after signing', async (_field, change) => {
    const original = await signed()
    expect(await verifyManifestSignature({ ...original, ...change }, keys)).toBe('invalid')
  })

  it('rejects a signature from a key the app does not trust', async () => {
    const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
    expect(await verifyManifestSignature(await signed(manifest, other.privateKey), keys)).toBe('invalid')
    expect(await verifyManifestSignature(await signed(manifest, privateKey, 'someone-else'), keys)).toBe('unknown-key')
  })

  it('reports unsigned and garbled manifests', async () => {
    expect(await verifyManifestSignature(manifest, keys)).toBe('missing')
    expect(await verifyManifestSignature({ ...manifest, keyId: 'test-key', signature: '%%%' }, keys)).toBe('invalid')
    expect(await verifyManifestSignature({ ...manifest, keyId: 'test-key', signature: 'AAAA' }, keys)).toBe('invalid')
  })
})

describe('shipped signing keys', () => {
  it('are distinct P-256 public keys the WebView can import', async () => {
    expect(new Set(OTA_SIGNING_KEYS.map((key) => key.id)).size).toBe(OTA_SIGNING_KEYS.length)
    expect(OTA_SIGNING_KEYS.length).toBeGreaterThanOrEqual(2)
    for (const key of OTA_SIGNING_KEYS) {
      await expect(
        crypto.subtle.importKey('spki', Buffer.from(key.spki, 'base64'), { name: 'ECDSA', namedCurve: 'P-256' }, false, [
          'verify',
        ]),
      ).resolves.toBeDefined()
    }
  })
})
