import { Capacitor } from '@capacitor/core'

/** Android MimeTypeMap only treats ASCII filenames as having a known extension. */
export function safeFileName(name: string, ext: string, fallback: string): string {
  const trimmed = name.replace(new RegExp(`\\.${ext}$`, 'i'), '')
  const ascii = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
  return `${ascii || fallback}.${ext}`
}

export function pdfFileName(name: string): string {
  return safeFileName(name, 'pdf', 'report')
}

/** Capacitor Share on Android only accepts file: URLs, not bare paths. */
export function asFileUri(uri: string): string {
  if (uri.startsWith('file:') || uri.startsWith('content:')) return uri
  return uri.startsWith('/') ? `file://${uri}` : `file:///${uri}`
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x2000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += chunk) {
    let slice = ''
    const end = Math.min(i + chunk, bytes.length)
    for (let j = i; j < end; j += 1) slice += String.fromCharCode(bytes[j])
    parts.push(slice)
  }
  return btoa(parts.join(''))
}

function runningOnNative(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return typeof document !== 'undefined' && document.documentElement.classList.contains('is-native')
}

export type FileData = Blob | ArrayBuffer | string

function asBlob(data: FileData, mime: string): Blob {
  if (data instanceof Blob) return data
  return new Blob([typeof data === 'string' ? data : new Uint8Array(data)], { type: mime })
}

async function asBytes(data: FileData): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(await data.arrayBuffer())
}

function downloadFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Returns false when the user dismissed the share sheet. */
async function shareNativeFile(data: FileData, fileName: string): Promise<boolean> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const path = `exports/${fileName}`
  const bytes = await asBytes(data)
  if (!bytes.byteLength) throw new Error('empty file')
  await Filesystem.writeFile({
    path,
    data: bytesToBase64(bytes),
    directory: Directory.Cache,
    recursive: true,
  })
  const located = await Filesystem.getUri({ path, directory: Directory.Cache })
  const uri = asFileUri(located.uri)
  if (!uri.startsWith('file:')) throw new Error('Could not get a shareable file URL')
  try {
    await Share.share({
      title: fileName,
      files: [uri],
      dialogTitle: fileName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/cancel/i.test(message)) return false
    throw err
  }
  return true
}

/**
 * Web: download. iOS/Android WebViews ignore <a download>, so write to the cache
 * and open the share sheet (Save to Files, Drive, Mail…). False = user cancelled.
 */
export async function saveOrShareFile(data: FileData, fileName: string, mime: string): Promise<boolean> {
  if (runningOnNative()) return shareNativeFile(data, fileName)
  downloadFile(asBlob(data, mime), fileName)
  return true
}

export async function saveOrSharePdf(data: Blob | ArrayBuffer, name: string): Promise<void> {
  await saveOrShareFile(data, pdfFileName(name), 'application/pdf')
}
