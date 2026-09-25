import { Capacitor } from '@capacitor/core'

/**
 * Native copy of the last known good save, outside the WebView's localStorage
 * (which iOS may clear under storage pressure). Library is backed up and never purged.
 */
const MIRROR_PATH = 'actionpitch/last-good-save.json'

export async function writeSaveMirror(json: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
  await Filesystem.writeFile({
    path: MIRROR_PATH,
    data: json,
    directory: Directory.Library,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export async function readSaveMirror(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem')
    const { data } = await Filesystem.readFile({
      path: MIRROR_PATH,
      directory: Directory.Library,
      encoding: Encoding.UTF8,
    })
    return typeof data === 'string' ? data : null
  } catch {
    return null
  }
}

export async function deleteSaveMirror(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Directory, Filesystem } = await import('@capacitor/filesystem')
    await Filesystem.deleteFile({ path: MIRROR_PATH, directory: Directory.Library })
  } catch {
    /* already gone */
  }
}
