/**
 * Status pindaian yang dibagi antara halaman Pindai dan Hasil.
 * Hasil terakhir dan riwayat sesi disimpan ringkas di sessionStorage (thumbnail + matriks input 64×64),
 * sehingga halaman Hasil tetap utuh saat dimuat ulang dan model bisa menghitung ulang semua tahapnya.
 */
import { useSyncExternalStore } from 'react'
import type { Classification } from '@/lib/ml/classify'
import type { WasteKind } from '@/lib/items'

export interface HistoryItem {
  id: string
  at: number
  thumb: string
  /** Matriks input 64×64 dikuantisasi ke 0–255 lalu base64. */
  gray: string
  kind: WasteKind
  y: number
  uncertain: boolean
  name: string
}

interface State {
  file: File | null
  previewUrl: string | null
  result: Classification | null
  /** id riwayat yang sedang ditampilkan di halaman Hasil */
  currentId: string | null
  history: HistoryItem[]
}

const HISTORY_KEY = 'pilah:riwayat'
const MAX_HISTORY = 8

function loadHistory(): HistoryItem[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY)
    const arr = raw ? (JSON.parse(raw) as HistoryItem[]) : []
    return Array.isArray(arr) ? arr.filter((h) => h && typeof h.gray === 'string') : []
  } catch {
    return []
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  } catch {
    // Kuota penuh atau mode privat: coba simpan lebih sedikit, kalau tetap gagal abaikan.
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 3)))
    } catch {
      /* abaikan */
    }
  }
}

let state: State = {
  file: null,
  previewUrl: null,
  result: null,
  currentId: null,
  history: typeof window === 'undefined' ? [] : loadHistory(),
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

function revoke(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const classifyActions = {
  setFile(file: File | null) {
    revoke(state.previewUrl)
    set({ file, previewUrl: file ? URL.createObjectURL(file) : null, result: null, currentId: null })
  },

  /** Simpan hasil baru + tambahkan ke riwayat sesi. */
  async commitResult(result: Classification) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    set({ result, currentId: id })
    const thumb = state.previewUrl ? await makeThumb(state.previewUrl).catch(() => '') : ''
    const item: HistoryItem = {
      id,
      at: Date.now(),
      thumb,
      gray: encodeGray(result.trace.gray),
      kind: result.kind,
      y: result.y,
      uncertain: result.uncertain,
      name: state.file?.name ?? 'foto',
    }
    const history = [item, ...state.history.filter((h) => h.id !== id)].slice(0, MAX_HISTORY)
    saveHistory(history)
    set({ history })
  },

  /** Tampilkan kembali hasil dari riwayat (tanpa berkas asli, memakai thumbnail). */
  restore(item: HistoryItem, result: Classification) {
    revoke(state.previewUrl)
    set({ file: null, previewUrl: item.thumb || null, result, currentId: item.id })
  },

  clearHistory() {
    saveHistory([])
    set({ history: [] })
  },

  reset() {
    revoke(state.previewUrl)
    set({ file: null, previewUrl: null, result: null, currentId: null })
  },
}

export const getClassifyState = () => state

/* ------------------------------------------------------------------ */

export function encodeGray(gray: Float32Array): string {
  const bytes = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) bytes[i] = Math.max(0, Math.min(255, Math.round(gray[i] * 255)))
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

export function decodeGray(b64: string): Float32Array {
  const s = atob(b64)
  const out = new Float32Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) / 255
  return out
}

/** Thumbnail persegi 240 px (cover) untuk riwayat dan pemulihan halaman Hasil. */
async function makeThumb(url: string): Promise<string> {
  const img = new Image()
  img.src = url
  await img.decode()
  const side = 240
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
