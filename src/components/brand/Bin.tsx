/**
 * Tong sampah PILAH (gaya 3D-clay, selaras dengan ikon Fluent Emoji 3D).
 * Tanpa pustaka animasi: tutup berputar lewat transisi CSS (variabel --tutup) dengan easing pegas,
 * badan "penyet" lewat Web Animations API.
 */
import { forwardRef, useId, useState, type CSSProperties, type HTMLAttributes } from 'react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { BIN_RATIO, BIN_VIEWBOX, INK, LID_OPEN, PATHS, THEMES, type BinKind } from './binArt'

type Hinge = 'left' | 'right'
export const defaultHinge = (kind: BinKind): Hinge => (kind === 'organik' ? 'left' : 'right')
const safeId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '')

/** Sudut tutup saat terbuka: engsel kiri berputar ke kiri (negatif), kanan ke kanan. */
export const openAngle = (kind: BinKind) => (defaultHinge(kind) === 'left' ? -LID_OPEN : LID_OPEN)

function Defs({ kind, uid }: { kind: BinKind; uid: string }) {
  const t = THEMES[kind]
  return (
    <defs>
      <linearGradient id={`${uid}body`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={t.d} />
        <stop offset=".26" stopColor={t.l} />
        <stop offset=".6" stopColor={t.b} />
        <stop offset="1" stopColor={t.d2} />
      </linearGradient>
      <linearGradient id={`${uid}shade`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={INK} stopOpacity="0" />
        <stop offset=".42" stopColor={INK} stopOpacity="0" />
        <stop offset="1" stopColor={INK} stopOpacity=".24" />
      </linearGradient>
      <linearGradient id={`${uid}lid`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={t.lid1} />
        <stop offset="1" stopColor={t.lid2} />
      </linearGradient>
      <linearGradient id={`${uid}handle`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={t.handle1} />
        <stop offset="1" stopColor={t.handle2} />
      </linearGradient>
      <linearGradient id={`${uid}mouth`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#06201A" />
        <stop offset="1" stopColor="#14413A" />
      </linearGradient>
      <radialGradient id={`${uid}ground`} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor={INK} stopOpacity=".28" />
        <stop offset="1" stopColor={INK} stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function BackArt({ kind, uid }: { kind: BinKind; uid: string }) {
  const t = THEMES[kind]
  return (
    <>
      <ellipse cx="100" cy="228" rx="72" ry="9" fill={`url(#${uid}ground)`} />
      <ellipse cx="100" cy="72" rx="80" ry="11.5" fill={t.l} />
      <ellipse cx="100" cy="72.5" rx="72" ry="8.6" fill={`url(#${uid}mouth)`} />
    </>
  )
}

function Emblem({ kind }: { kind: BinKind }) {
  const t = THEMES[kind]
  if (kind === 'organik') {
    return (
      <>
        <path d={PATHS.leaf} transform="translate(0 3)" fill={INK} opacity=".22" />
        <path d={PATHS.leaf} fill="#F6FCF8" />
        <path
          d={PATHS.leafRib}
          fill="none"
          stroke={t.d}
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".85"
        />
      </>
    )
  }
  return (
    <>
      <path d={PATHS.bottle} transform="translate(0 3)" fill={INK} opacity=".22" />
      <path d={PATHS.bottle} fill="#FFFBEF" />
      <path d={PATHS.bottleBand} fill={t.b} opacity=".9" />
    </>
  )
}

function FrontArt({ kind, uid }: { kind: BinKind; uid: string }) {
  const t = THEMES[kind]
  return (
    <>
      <path d={PATHS.body} fill={`url(#${uid}body)`} />
      <path d={PATHS.body} fill={`url(#${uid}shade)`} />
      <path d={PATHS.streak} fill="#fff" opacity=".24" />
      <Emblem kind={kind} />
      <path d={PATHS.rimFront} fill="none" stroke={t.l} strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

function Lid({ uid, hinge, hidden }: { uid: string; hinge: Hinge; hidden?: boolean }) {
  return (
    <g
      data-lid
      className="tutup-tong"
      style={{
        transformOrigin: hinge === 'left' ? '0% 100%' : '100% 100%',
        opacity: hidden ? 0 : 1,
      }}
    >
      <rect x="78" y="38" width="44" height="22" rx="11" fill={`url(#${uid}handle)`} />
      <rect x="87" y="41.5" width="26" height="4" rx="2" fill="#fff" opacity=".32" />
      <rect x="10" y="54" width="180" height="25" rx="12.5" fill={`url(#${uid}lid)`} />
      <rect x="22" y="57.5" width="156" height="5" rx="2.5" fill="#fff" opacity=".42" />
      <rect x="16" y="73" width="168" height="4.5" rx="2.25" fill={INK} opacity=".13" />
    </g>
  )
}

const svgBase = 'absolute inset-0 h-full w-full overflow-visible'

/** Variabel CSS untuk sudut dan easing tutup. */
export function lidStyle(kind: BinKind, open: boolean, closeSpring = true): CSSProperties {
  const s = spring(300, 13, 0.9)
  return {
    '--tutup': `${open ? openAngle(kind) : 0}deg`,
    '--tutup-ease': closeSpring ? s.easing : undefined,
    '--tutup-durasi': `${s.duration}ms`,
  } as CSSProperties
}

/**
 * Satu lapisan tong. Dipakai berpasangan (back z rendah, front z tinggi) agar benda
 * yang dijatuhkan terlihat masuk ke dalam tong.
 * `lid` menentukan apakah tutup digambar di lapisan ini: saat terbuka tutup ada di belakang benda,
 * saat tertutup di depan.
 */
export const BinLayer = forwardRef<
  HTMLDivElement,
  {
    kind: BinKind
    layer: 'back' | 'front'
    lid: boolean
  } & HTMLAttributes<HTMLDivElement>
>(function BinLayer({ kind, layer, lid, className, ...rest }, ref) {
  const uid = safeId(useId())
  return (
    <div ref={ref} className={cn('absolute', className)} aria-hidden {...rest}>
      <svg viewBox={BIN_VIEWBOX} className={svgBase}>
        <Defs kind={kind} uid={uid} />
        {layer === 'back' ? (
          <BackArt kind={kind} uid={uid} />
        ) : (
          <g data-body style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
            <FrontArt kind={kind} uid={uid} />
          </g>
        )}
        <Lid uid={uid} hinge={defaultHinge(kind)} hidden={!lid} />
      </svg>
    </div>
  )
})

/** Animasi "penyet" kecil saat tong menerima benda. */
export function squish(root: Element | null) {
  const body = root?.querySelector('[data-body]')
  body?.animate(
    [
      { transform: 'scale(1, 1)' },
      { transform: 'scale(1.06, 0.9)' },
      { transform: 'scale(0.98, 1.03)' },
      { transform: 'scale(1, 1)' },
    ],
    { duration: 420, easing: 'ease-out' },
  )
}

/** Tong utuh (satu SVG). Bila `interactive`, tutup membuka saat disorot atau difokus. */
export function Bin({
  kind,
  open = false,
  interactive = false,
  className,
}: {
  kind: BinKind
  open?: boolean
  interactive?: boolean
  className?: string
}) {
  const uid = safeId(useId())
  const [hover, setHover] = useState(false)
  const isOpen = open || (interactive && hover)
  return (
    <div
      className={cn('relative', className)}
      style={{ aspectRatio: String(BIN_RATIO), ...lidStyle(kind, isOpen) }}
      onPointerEnter={interactive ? () => setHover(true) : undefined}
      onPointerLeave={interactive ? () => setHover(false) : undefined}
    >
      <svg viewBox={BIN_VIEWBOX} className={svgBase} aria-hidden>
        <Defs kind={kind} uid={uid} />
        <BackArt kind={kind} uid={uid} />
        <FrontArt kind={kind} uid={uid} />
        <Lid uid={uid} hinge={defaultHinge(kind)} />
      </svg>
    </div>
  )
}
