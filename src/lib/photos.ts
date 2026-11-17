/**
 * Aturan menerima foto di halaman Pindai: format, ukuran, jumlah, dan duplikat.
 * Semua pengecekan dilakukan di browser; foto tidak pernah dikirim ke server.
 */

/** Batas jumlah foto dalam satu kali pindai. */
export const MAX_PHOTOS = 20
/** Batas ukuran per foto. Model hanya membaca citra 64 × 64, jadi foto lebih besar tidak menambah akurasi. */
export const MAX_BYTES = 15 * 1024 * 1024
/** Sisi terpendek minimal (piksel). */
export const MIN_SIDE = 32

/** Format yang diterima (dipakai juga untuk atribut `accept` pada input berkas). */
export const ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif'
const EXT_OK = /\.(jpe?g|png|webp|gif|bmp|avif|hei[cf])$/i
/** Teks ringkas untuk pengguna. */
export const FORMAT_TEXT = 'JPG, PNG, atau WebP'

export interface Rejected {
  name: string
  reason: string
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',')

export function extensionOf(name: string) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)

/**
 * Pengecekan cepat tanpa membuka gambar: format, berkas kosong, dan ukuran.
 * Mengembalikan alasan penolakan, atau null bila lolos.
 */
export function checkFile(f: File): string | null {
  const isImage = f.type.startsWith('image/') || EXT_OK.test(f.name)
  if (!isImage) {
    const ext = extensionOf(f.name)
    return ext ? `format .${ext} tidak didukung` : 'format berkas tidak dikenali'
  }
  // Gambar jenis lain (SVG, TIFF, ICO, ...) juga ditolak: model butuh foto biasa.
  if (!EXT_OK.test(f.name) && !/^image\/(jpeg|png|webp|gif|bmp|avif|hei[cf])$/i.test(f.type)) {
    const ext = extensionOf(f.name) || f.type.replace('image/', '').replace(/\+.*/, '')
    return `format .${ext} tidak didukung`
  }
  if (f.size === 0) return 'berkasnya kosong (0 KB)'
  if (f.size > MAX_BYTES) return `ukurannya ${mb(f.size)} MB, melebihi batas 15 MB per foto`
  return null
}

/** Kunci sederhana untuk mengenali foto yang sama dipilih dua kali. */
export const fileKey = (f: File) => `${f.name}|${f.size}`

/**
 * Pastikan gambar benar-benar bisa dibuka browser dan tidak terlalu kecil.
 * Mengembalikan alasan penolakan, atau null bila lolos.
 */
export async function checkDecodable(f: File): Promise<string | null> {
  const url = URL.createObjectURL(f)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    if (img.naturalWidth < MIN_SIDE || img.naturalHeight < MIN_SIDE) {
      return `gambarnya terlalu kecil (${img.naturalWidth} × ${img.naturalHeight} piksel, minimal ${MIN_SIDE} × ${MIN_SIDE})`
    }
    return null
  } catch {
    return isHeic(f)
      ? 'format HEIC (foto iPhone) belum bisa dibuka di browser ini'
      : 'berkasnya rusak atau tidak bisa dibuka sebagai gambar'
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface Screened {
  accepted: File[]
  rejected: Rejected[]
  /** Jumlah foto valid yang tidak ditambahkan karena batas MAX_PHOTOS. */
  overflow: number
  /** true bila daftar sudah penuh sebelum ada yang ditambahkan. */
  full: boolean
}

/**
 * Saring berkas yang baru dipilih: tolak yang tidak sesuai (dengan alasan), buang duplikat,
 * lalu ambil sebanyak sisa kuota. Berkas yang lolos dicek bisa dibuka atau tidak.
 */
export async function screenFiles(files: File[], existing: File[]): Promise<Screened> {
  const rejected: Rejected[] = []
  const seen = new Set(existing.map(fileKey))
  const candidates: File[] = []
  for (const f of files) {
    const reason = checkFile(f)
    if (reason) {
      rejected.push({ name: f.name || 'berkas tanpa nama', reason })
      continue
    }
    const key = fileKey(f)
    if (seen.has(key)) {
      rejected.push({ name: f.name, reason: 'foto yang sama sudah ada di daftar' })
      continue
    }
    seen.add(key)
    candidates.push(f)
  }
  const slots = Math.max(0, MAX_PHOTOS - existing.length)
  const full = slots === 0 && candidates.length > 0
  const take = candidates.slice(0, slots)
  const overflow = candidates.length - take.length
  const checks = await Promise.all(take.map(checkDecodable))
  const accepted: File[] = []
  take.forEach((f, i) => {
    const reason = checks[i]
    if (reason) rejected.push({ name: f.name, reason })
    else accepted.push(f)
  })
  return { accepted, rejected, overflow, full }
}
