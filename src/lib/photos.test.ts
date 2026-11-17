import { describe, expect, it } from 'vitest'
import { checkFile, extensionOf, MAX_BYTES, MAX_PHOTOS } from './photos'

const file = (name: string, type: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type })

describe('aturan berkas foto', () => {
  it('menerima JPG, PNG, dan WebP', () => {
    expect(checkFile(file('a.jpg', 'image/jpeg'))).toBe(null)
    expect(checkFile(file('b.png', 'image/png'))).toBe(null)
    expect(checkFile(file('c.webp', 'image/webp'))).toBe(null)
    expect(checkFile(file('tanpa-ekstensi', 'image/jpeg'))).toBe(null)
  })
  it('menolak .txt, .pdf, dan SVG dengan menyebut formatnya', () => {
    expect(checkFile(file('catatan.txt', 'text/plain'))).toBe('format .txt tidak didukung')
    expect(checkFile(file('dokumen.pdf', 'application/pdf'))).toBe('format .pdf tidak didukung')
    expect(checkFile(file('logo.svg', 'image/svg+xml'))).toBe('format .svg tidak didukung')
    expect(checkFile(file('berkas', ''))).toBe('format berkas tidak dikenali')
  })
  it('menolak berkas kosong dan berkas di atas 15 MB', () => {
    expect(checkFile(file('kosong.jpg', 'image/jpeg', 0))).toBe('berkasnya kosong (0 KB)')
    expect(checkFile(file('besar.jpg', 'image/jpeg', MAX_BYTES + 1))).toBe(
      'ukurannya 15,0 MB, melebihi batas 15 MB per foto',
    )
  })
  it('batas jumlah foto per pindaian adalah 20', () => {
    expect(MAX_PHOTOS).toBe(20)
  })
  it('membaca ekstensi berkas', () => {
    expect(extensionOf('Foto.JPEG')).toBe('jpeg')
    expect(extensionOf('arsip')).toBe('')
  })
})
