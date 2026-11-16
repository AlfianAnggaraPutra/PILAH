import apple from '@/assets/items/red-apple.webp'
import banana from '@/assets/items/banana.webp'
import bread from '@/assets/items/bread.webp'
import leaf from '@/assets/items/fallen-leaf.webp'
import greens from '@/assets/items/leafy-green.webp'
import can from '@/assets/items/canned-food.webp'
import cup from '@/assets/items/cup-with-straw.webp'
import lotion from '@/assets/items/lotion-bottle.webp'
import newspaper from '@/assets/items/newspaper.webp'
import box from '@/assets/items/package.webp'

export type WasteKind = 'organik' | 'anorganik'

export interface WasteItem {
  id: string
  label: string
  kind: WasteKind
  src: string
}

export const ITEMS: Record<string, WasteItem> = {
  apple: { id: 'apple', label: 'Apel', kind: 'organik', src: apple },
  banana: { id: 'banana', label: 'Pisang', kind: 'organik', src: banana },
  bread: { id: 'bread', label: 'Roti', kind: 'organik', src: bread },
  leaf: { id: 'leaf', label: 'Daun kering', kind: 'organik', src: leaf },
  greens: { id: 'greens', label: 'Sayuran', kind: 'organik', src: greens },
  can: { id: 'can', label: 'Kaleng', kind: 'anorganik', src: can },
  cup: { id: 'cup', label: 'Gelas plastik', kind: 'anorganik', src: cup },
  lotion: { id: 'lotion', label: 'Botol plastik', kind: 'anorganik', src: lotion },
  newspaper: { id: 'newspaper', label: 'Koran', kind: 'anorganik', src: newspaper },
  box: { id: 'box', label: 'Kardus', kind: 'anorganik', src: box },
}

export const ORGANIK = Object.values(ITEMS).filter((i) => i.kind === 'organik')
export const ANORGANIK = Object.values(ITEMS).filter((i) => i.kind === 'anorganik')
