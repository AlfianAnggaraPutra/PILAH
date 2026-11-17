import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import type { Photo } from '@/store/classifyStore'

/**
 * Deretan pratinjau semua foto yang sudah dipilih.
 * Ketuk foto untuk menampilkannya besar; tombol × merah di pojok kanan atas menghapusnya.
 */
export function PhotoStrip({
  photos,
  activeId,
  max,
  disabled,
  onSelect,
  onRemove,
  onAdd,
  onClearAll,
}: {
  photos: Photo[]
  activeId: string | null
  max: number
  disabled: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
  onClearAll: () => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const full = photos.length >= max

  // Foto yang sedang ditampilkan selalu terlihat di deretan (mis. setelah menambah banyak foto).
  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-photo="${activeId}"]`)
    if (!list || !el) return
    // Geser deretan secara horizontal saja (scrollIntoView bisa ikut menggulir halaman).
    const left = el.offsetLeft - list.offsetLeft
    if (left < list.scrollLeft) list.scrollTo({ left: left - 8, behavior: 'smooth' })
    else if (left + el.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollTo({ left: left + el.offsetWidth - list.clientWidth + 12, behavior: 'smooth' })
  }, [activeId])

  return (
    <div className="mt-3" data-testid="photo-strip">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-redup text-sm" aria-live="polite">
          <strong className={cn('angka font-semibold', full ? 'text-emas-terang' : 'text-white')}>
            {photos.length}
          </strong>{' '}
          dari {max} foto
          {full && <span className="text-emas-terang"> (batas maksimal)</span>}
        </p>
        {photos.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled}
            className="text-redup rounded-full px-3 py-1 text-sm transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
          >
            Hapus semua
          </button>
        )}
      </div>
      <ul
        ref={listRef}
        className="flex snap-x scrollbar-none gap-3 overflow-x-auto px-1 pt-2.5 pr-2.5 pb-1.5"
        aria-label="Foto yang akan dipindai"
      >
        {photos.map((p) => {
          const active = p.id === activeId
          return (
            <li key={p.id} data-photo={p.id} className="relative shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                disabled={disabled}
                aria-pressed={active}
                aria-label={`Lihat ${p.file.name}`}
                title={p.file.name}
                className={cn(
                  'bg-rimba-950 block size-16 overflow-hidden rounded-xl ring-2 transition-[box-shadow,transform,opacity] duration-200 sm:size-18',
                  active
                    ? 'ring-emas'
                    : 'opacity-75 ring-white/10 hover:opacity-100 hover:ring-white/40',
                )}
              >
                <img
                  src={p.url}
                  alt={`Pratinjau ${p.file.name}`}
                  className="size-full object-cover"
                  draggable={false}
                />
              </button>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                disabled={disabled}
                aria-label={`Hapus ${p.file.name}`}
                title="Hapus foto ini"
                className="ring-panel absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-red-500 text-white shadow-[0_4px_10px_rgb(0_0_0/0.4)] ring-2 transition-[transform,background-color] duration-200 hover:scale-110 hover:bg-red-600 disabled:hidden"
              >
                <Icon name="x" size={13} strokeWidth={3} />
              </button>
            </li>
          )
        })}
        {!full && (
          <li className="shrink-0 snap-start">
            <button
              type="button"
              onClick={onAdd}
              disabled={disabled}
              aria-label="Tambah foto"
              className="text-redup hover:border-emas hover:text-emas grid size-16 place-items-center rounded-xl border-2 border-dashed border-white/20 transition-colors duration-200 disabled:opacity-40 sm:size-18"
            >
              <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
                <Icon name="plus" size={20} />
                Tambah
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
