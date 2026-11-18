/**
 * Status pindaian yang dibagi antara halaman Pindai dan Hasil.
 *
 * Satu sesi = daftar foto (maksimal 20) + hasilnya. Hasil disimpan ringkas di sessionStorage
 * (thumbnail + nilai y) hanya supaya halaman Hasil tetap utuh saat dimuat ulang.
 * Begitu pengguna meninggalkan halaman Hasil atau memulai pindaian baru (setelah konfirmasi),
 * sesi ini dihapus.
 */
import { useSyncExternalStore } from 'react'
import type { Classification } from '@/lib/ml/classify'

/** Foto yang sudah dipilih dan menunggu dikenali. */
export interface Photo {
  id: string
  file: File
  url: string
}

/** Satu foto yang sudah dikenali. */
export interface ScanItem {
  id: string
  name: string
  /** Gambar untuk ditampilkan: foto asli selama sesi berjalan, atau thumbnail setelah dimuat ulang. */
  src: string
  /** Thumbnail persegi (data URL JPEG), dipakai juga di laporan PDF. */
  thumb: string
  result: Classification
}

/** Bentuk tersimpan di sessionStorage. */
export interface SavedItem {
  id: string
  name: string
  thumb: string
  /** Peluang anorganik hasil model. */
  y: number
}

interface State {
  photos: Photo[]
  /** Foto yang sedang ditampilkan besar di bingkai. */
  activeId: string | null
  items: ScanItem[]
  /** Waktu pindaian selesai (ms), untuk laporan. */
  scannedAt: number | null
  /** Nama berkas yang gagal dikenali saat pindaian banyak foto. */
  failed: string[]
  /** Salinan tersimpan, untuk dipulihkan saat halaman Hasil dimuat ulang. */
  saved: { at: number; items: SavedItem[] } | null
}

const KEY = 'pilah:hasil'
const LEGACY_KEY = 'pilah:riwayat'

function loadSaved(): State['saved'] {
  try {
    sessionStorage.removeItem(LEGACY_KEY) // riwayat dari versi lama tidak dipakai lagi
    const raw = sessionStorage.getItem(KEY)
    const data = raw ? (JSON.parse(raw) as State['saved']) : null
    return data &&
      Array.isArray(data.items) &&
      data.items.length > 0 &&
      data.items.every((i) => typeof i.y === 'number' && Number.isFinite(i.y))
      ? data
      : null
  } catch {
    return null
  }
}

function persist(saved: State['saved']) {
  try {
    if (saved) sessionStorage.setItem(KEY, JSON.stringify(saved))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* kuota penuh atau mode privat: halaman Hasil tetap jalan, hanya tidak bisa dipulihkan */
  }
}

let state: State = {
  photos: [],
  activeId: null,
  items: [],
  scannedAt: null,
  failed: [],
  saved: typeof window === 'undefined' ? null : loadSaved(),
}
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useClassifyStore() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

function revoke(url: string | null | undefined) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

let seq = 0
const newId = () =>
  `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const classifyActions = {
  /** Tambahkan foto (sudah disaring). Foto pertama yang baru ditambahkan langsung ditampilkan. */
  addPhotos(files: File[]) {
    if (files.length === 0) return
    const added = files.map((file) => ({ id: newId(), file, url: URL.createObjectURL(file) }))
    set({ photos: [...state.photos, ...added], activeId: added[0].id })
  },

  /** Ganti satu foto (foto ulang / pilih ulang) tanpa mengubah urutannya. */
  replacePhoto(id: string, file: File) {
    const old = state.photos.find((p) => p.id === id)
    if (!old) return
    revoke(old.url)
    const fresh = { id: newId(), file, url: URL.createObjectURL(file) }
    set({ photos: state.photos.map((p) => (p.id === id ? fresh : p)), activeId: fresh.id })
  },

  removePhoto(id: string) {
    const i = state.photos.findIndex((p) => p.id === id)
    if (i < 0) return
    revoke(state.photos[i].url)
    const photos = state.photos.filter((p) => p.id !== id)
    const activeId =
      state.activeId === id ? (photos[Math.min(i, photos.length - 1)]?.id ?? null) : state.activeId
    set({ photos, activeId })
  },

  setActive(id: string) {
    if (state.photos.some((p) => p.id === id)) set({ activeId: id })
  },

  clearPhotos() {
    state.photos.forEach((p) => revoke(p.url))
    set({ photos: [], activeId: null })
  },

  /**
   * Simpan hasil pindaian. URL foto asli dipindahkan ke hasil (tidak dilepas),
   * karena masih dipakai di halaman Hasil.
   */
  async commitResults(entries: { photo: Photo; result: Classification }[], failed: string[] = []) {
    const thumbs = await Promise.all(entries.map((e) => makeThumb(e.photo.url).catch(() => '')))
    const items: ScanItem[] = entries.map((e, i) => ({
      id: e.photo.id,
      name: e.photo.file.name || 'foto',
      src: e.photo.url,
      thumb: thumbs[i],
      result: e.result,
    }))
    const at = Date.now()
    const saved = {
      at,
      items: items.map((it) => ({ id: it.id, name: it.name, thumb: it.thumb, y: it.result.y })),
    }
    persist(saved)
    // Foto yang tidak ikut dikenali (gagal) dilepas; yang berhasil kini dimiliki hasil.
    const kept = new Set(items.map((i) => i.id))
    state.photos.forEach((p) => {
      if (!kept.has(p.id)) revoke(p.url)
    })
    set({ items, scannedAt: at, failed, saved, photos: [], activeId: null })
  },

  /** Pulihkan hasil setelah halaman dimuat ulang (memakai thumbnail sebagai gambar). */
  restore(results: Classification[]) {
    const saved = state.saved
    if (!saved || results.length !== saved.items.length) return
    set({
      items: saved.items.map((s, i) => ({
        id: s.id,
        name: s.name,
        src: s.thumb,
        thumb: s.thumb,
        result: results[i],
      })),
      scannedAt: saved.at,
      failed: [],
    })
  },

  /** Hapus seluruh sesi: foto, hasil, dan salinan tersimpannya. */
  reset() {
    state.photos.forEach((p) => revoke(p.url))
    state.items.forEach((i) => revoke(i.src))
    persist(null)
    set({ photos: [], activeId: null, items: [], scannedAt: null, failed: [], saved: null })
  },
}

export const getClassifyState = () => state

/* ------------------------------------------------------------------ */

/** Thumbnail persegi 320 px (cover) untuk daftar hasil, laporan PDF, dan pemulihan halaman Hasil. */
async function makeThumb(url: string): Promise<string> {
  const img = new Image()
  img.src = url
  await img.decode()
  const side = 320
  const c = document.createElement('canvas')
  c.width = side
  c.height = side
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, side, side)
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  ctx.drawImage(
    img,
    (img.naturalWidth - s) / 2,
    (img.naturalHeight - s) / 2,
    s,
    s,
    0,
    0,
    side,
    side,
  )
  return c.toDataURL('image/jpeg', 0.82)
}
