import { Capacitor } from '@capacitor/core'

/** Android MimeTypeMap only treats ASCII filenames as having a .pdf extension. */
export function pdfFileName(name: string): string {
  const trimmed = name.replace(/\.pdf$/i, '')
  const ascii = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
  return `${ascii || 'report'}.pdf`
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

function asBlob(data: Blob | ArrayBuffer): Blob {
  if (data instanceof Blob) return data
  return new Blob([new Uint8Array(data)], { type: 'application/pdf' })
}

async function asBytes(data: Blob | ArrayBuffer): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(await data.arrayBuffer())
}

function downloadPdf(blob: Blob, name: string): void {
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

async function shareNativePdf(data: Blob | ArrayBuffer, name: string): Promise<void> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const fileName = pdfFileName(name)
  const path = `reports/${fileName}`
  const bytes = await asBytes(data)
  if (!bytes.byteLength) throw new Error('empty pdf')
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
    if (/cancel/i.test(message)) return
    throw err
  }
}

/** Web: download. Native WebView cannot use <a download>, so write + share. */
export async function saveOrSharePdf(data: Blob | ArrayBuffer, name: string): Promise<void> {
  const fileName = pdfFileName(name)
  if (runningOnNative()) {
    await shareNativePdf(data, fileName)
    return
  }
  downloadPdf(asBlob(data), fileName)
}
