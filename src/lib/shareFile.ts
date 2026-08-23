import { Capacitor } from '@capacitor/core'

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Web: share sheet or download. Native WebView cannot use <a download>. */
export async function saveOrSharePdf(blob: Blob, name: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Directory, Filesystem } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const file = await Filesystem.writeFile({
      path: name,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    })
    try {
      await Share.share({
        title: name,
        files: [file.uri],
        dialogTitle: name,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/cancel/i.test(message)) return
      throw err
    }
    return
  }

  const file = new File([blob], name, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
