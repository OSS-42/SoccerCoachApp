/**
 * Signed OTA manifests. The publish script (Node) and the app (WebView) both import this
 * file, so the signed payload can never drift between them. Keep it dependency-free.
 *
 * Public halves only. Private keys stay on the publishing Mac (~/.config/actionpitch/).
 * To rotate: ship a bundle that trusts the new key while the manifest is still signed
 * with a key the *previous* bundle trusts.
 */
export const OTA_SIGNING_KEYS: readonly { id: string; spki: string }[] = [
  {
    id: 'primary-5f3eed95',
    spki: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE6QAlzAakSWP/KF5Xs1AN0DN3UWfs1B/2Sa8dkkscs9B/f3hQr2KTa7vA7xnFJ2orP2xELCbZop/jFbNRIoBUvQ==',
  },
  {
    id: 'backup-c4c78cf4',
    spki: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWlqiZsB1JyMlmmslbbF3EiOlu498JhjRCfSi0ZFm4LrU5UdJluEjPtE0S9NpaYlMU4Lg7ypSh8myJGL3/cXx2A==',
  },
]

export type SignedFields = {
  version: string
  bundleUrl: string
  checksum: string
  minAppVersion?: string
}

export type SignatureStatus = 'valid' | 'missing' | 'unknown-key' | 'invalid' | 'unsupported'

/** Every field that decides what gets installed is covered; notes are display-only. */
export function manifestSigningPayload(fields: SignedFields): string {
  return [
    'actionpitch-ota-v1',
    `version=${fields.version}`,
    `bundleUrl=${fields.bundleUrl}`,
    `checksum=${fields.checksum}`,
    `minAppVersion=${fields.minAppVersion ?? ''}`,
  ].join('\n')
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** ECDSA P-256 / SHA-256, signature in IEEE P1363 (r‖s) form as WebCrypto expects. */
export async function verifyManifestSignature(
  manifest: SignedFields & { keyId?: string; signature?: string },
  keys: readonly { id: string; spki: string }[] = OTA_SIGNING_KEYS,
): Promise<SignatureStatus> {
  if (!manifest.keyId || !manifest.signature) return 'missing'
  const entry = keys.find((key) => key.id === manifest.keyId)
  if (!entry) return 'unknown-key'
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return 'unsupported'
  const spki = fromBase64(entry.spki)
  const signature = fromBase64(manifest.signature)
  if (!spki || !signature) return 'invalid'
  let key: CryptoKey
  try {
    key = await subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  } catch {
    return 'unsupported'
  }
  try {
    const data = new TextEncoder().encode(manifestSigningPayload(manifest))
    const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, data)
    return ok ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}
