import { describe, expect, it } from 'vitest'
import { asFileUri, bytesToBase64, pdfFileName } from './shareFile'

describe('pdf share helpers', () => {
  it('keeps an ASCII .pdf name that Android can MIME-sniff', () => {
    expect(pdfFileName('report-2026-08-15-vs-FC_Lyons.pdf')).toBe(
      'report-2026-08-15-vs-FC_Lyons.pdf',
    )
    expect(pdfFileName('report-2026-08-15-vs-Béziers.pdf')).toBe(
      'report-2026-08-15-vs-Beziers.pdf',
    )
  })

  it('turns a bare cache path into a file URL for Share', () => {
    expect(asFileUri('/data/user/0/com.actionpitch.app/cache/report.pdf')).toBe(
      'file:///data/user/0/com.actionpitch.app/cache/report.pdf',
    )
    expect(asFileUri('file:///tmp/report.pdf')).toBe('file:///tmp/report.pdf')
  })

  it('encodes PDF bytes without spreading a huge typed array', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff])
    expect(bytesToBase64(bytes)).toBe(btoa('%PDF-\xff'))
  })
})
