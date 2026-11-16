import { useEffect, useState } from 'react'
import { ProcessExplorer } from '@/components/result/ProcessExplorer'
import { SortReveal } from '@/components/result/SortReveal'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { GUIDE } from '@/lib/content'
import { classifyInput } from '@/lib/ml/classify'
import { useCountUp } from '@/lib/motion'
import { useNavigate } from '@/lib/router'
import { cn, fmt } from '@/lib/utils'
import { classifyActions, decodeGray, useClassifyStore } from '@/store/classifyStore'

function SplitBar({ y }: { y: number }) {
  // Dibulatkan satu desimal dan dibuat berjumlah tepat 100%.
  const pOrg = Math.round((1 - y) * 1000) / 10
  const pAno = Math.round((100 - pOrg) * 10) / 10
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 400)
    return () => clearTimeout(t)
  }, [])
  const org = useCountUp(pOrg, { start: go, duration: 1000 })
  const ano = useCountUp(pAno, { start: go, duration: 1000 })
  return (
    <div role="img" aria-label={`Peluang organik ${fmt(pOrg, 1)} persen, anorganik ${fmt(pAno, 1)} persen`}>
      <div className="flex justify-between text-sm font-semibold">
        <span className="flex items-center gap-2 text-daun-tua">
          <span className="size-2.5 rounded-full bg-daun" /> Organik
        </span>
        <span className="flex items-center gap-2 text-emas-tua">
          Anorganik <span className="size-2.5 rounded-full bg-emas" />
        </span>
      </div>
      <div className="relative mt-2 flex h-4 overflow-hidden rounded-full bg-garis/60">
        <div
          className="h-full bg-daun transition-[width] duration-1000 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ width: go ? `${pOrg}%` : '0%' }}
        />
        <div className="flex-1" />
        <div
          className="h-full bg-emas transition-[width] duration-1000 ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ width: go ? `${pAno}%` : '0%' }}
        />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
      </div>
      <div className="mt-2 flex justify-between font-display text-2xl font-bold angka" aria-hidden>
        <span>{fmt(org, 1)}%</span>
        <span>{fmt(ano, 1)}%</span>
      </div>
    </div>
  )
}

function Empty() {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-5 pt-28 pb-20 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-mint text-daun-tua">
        <Icon name="scan" size={34} strokeWidth={1.7} />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Belum ada hasil untuk ditampilkan</h1>
      <p className="mt-3 text-lg text-redup">Pindai satu foto dulu, hasilnya akan muncul di sini.</p>
      <ButtonLink to="/klasifikasi" size="lg" className="mt-8">
        <Icon name="scan" size={19} /> Pindai sampah
      </ButtonLink>
    </section>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const { result, previewUrl, history, currentId } = useClassifyStore()
  const [restoring, setRestoring] = useState(!result && history.length > 0)
  const [copied, setCopied] = useState(false)

  // Halaman dimuat ulang: pulihkan pindaian terakhir dari riwayat sesi dan hitung ulang.
  useEffect(() => {
    if (result || history.length === 0) {
      setRestoring(false)
      return
    }
    let dead = false
    const item = history.find((h) => h.id === currentId) ?? history[0]
    classifyInput(decodeGray(item.gray))
      .then((res) => !dead && classifyActions.restore(item, res))
      .catch(() => undefined)
      .finally(() => !dead && setRestoring(false))
    return () => {
      dead = true
    }
  }, [result, history, currentId])

  if (!result) return restoring ? <div className="min-h-[80vh]" aria-busy="true" /> : <Empty />

  const { kind, confidence, uncertain, y, isMock } = result
  const g = GUIDE[kind]
  const org = kind === 'organik'
  const title = uncertain ? 'PILAH belum yakin' : org ? 'Sampah organik' : 'Sampah anorganik'

  async function share() {
    const text = uncertain
      ? `PILAH belum yakin dengan sampah ini (peluang anorganik ${fmt(y * 100, 1)}%).`
      : `Menurut PILAH, ini sampah ${kind} (keyakinan ${fmt(confidence * 100, 1)}%).`
    const data = { title: 'Hasil pindaian PILAH', text, url: window.location.origin }
    try {
      if (navigator.share) await navigator.share(data)
      else {
        await navigator.clipboard.writeText(`${text} ${data.url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      }
    } catch {
      /* dibatalkan pengguna */
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 pb-24 sm:px-6 md:pt-32">
      <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="pola-titik relative order-2 flex min-h-[22rem] flex-col lg:order-1 lg:min-h-[26rem] items-center justify-between gap-6 overflow-hidden rounded-[2rem] bg-rimba-900 px-6 pt-6 pb-6">
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-2/3',
              uncertain
                ? 'bg-[radial-gradient(60%_60%_at_50%_100%,rgb(255_255_255/0.12),transparent)]'
                : org
                  ? 'bg-[radial-gradient(60%_60%_at_50%_100%,rgb(63_191_119/0.35),transparent)]'
                  : 'bg-[radial-gradient(60%_60%_at_50%_100%,rgb(255_194_71/0.3),transparent)]',
            )}
          />
          <span
            className={cn(
              'relative self-start rounded-full px-3.5 py-1.5 font-display text-sm font-semibold',
              uncertain ? 'bg-white/10 text-white ring-1 ring-white/20' : org ? 'bg-daun text-rimba-900' : 'bg-emas text-rimba-900',
            )}
          >
            {uncertain ? 'Antara dua tong' : `Masuk tong ${kind}`}
          </span>
          <div className="relative my-auto">
            <SortReveal key={currentId ?? 'x'} kind={kind} src={previewUrl} uncertain={uncertain} />
          </div>
          {previewUrl && (
            <div className="relative flex items-center gap-3 self-stretch rounded-2xl bg-white/[0.07] p-2 pr-4 ring-1 ring-white/10">
              <img src={previewUrl} alt="Foto yang dipindai" className="size-12 rounded-xl object-cover" />
              <p className="text-sm text-mint/75">Foto yang kamu pindai</p>
            </div>
          )}
        </div>

        <div className="order-1 flex flex-col lg:order-2">
          {isMock && (
            <p role="status" className="mb-5 flex items-start gap-2.5 rounded-2xl bg-krem p-3.5 text-sm ring-1 ring-emas/50">
              <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-emas-tua" />
              Mode demo: hasil ini memakai bobot acak, bukan model terlatih.
            </p>
          )}
          <p className="text-sm font-semibold text-redup">Hasil pindaian</p>
          <h1
            data-testid="verdict"
            className={cn(
              'mt-1 text-4xl font-bold tracking-tight sm:text-5xl',
              uncertain ? 'text-teks' : org ? 'text-daun-tua' : 'text-teks',
            )}
          >
            {title}
          </h1>
          <p className="mt-3 text-lg text-redup">
            {uncertain
              ? 'Peluang organik dan anorganik hampir seimbang. Coba foto ulang dengan satu benda saja, latar polos, dan cahaya cukup.'
              : `Model yakin ${fmt(confidence * 100, 1)}% bahwa ini sampah ${kind}.`}
          </p>

          <div className="mt-7">
            <SplitBar key={currentId ?? 'x'} y={y} />
          </div>

          {!uncertain && (
            <div className={cn('mt-8 rounded-[1.75rem] p-6 ring-1', org ? 'bg-mint ring-daun/30' : 'bg-krem ring-emas/40')}>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon name={org ? 'leaf' : 'recycle'} size={20} />
                Yang sebaiknya kamu lakukan
              </h2>
              <ol className="mt-4 space-y-3">
                {g.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className={cn('grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold', org ? 'bg-daun-tua text-white' : 'bg-rimba-900 text-emas')}>
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-teks/75">Bisa diolah menjadi: {g.becomes.toLowerCase()}.</p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => {
                classifyActions.reset()
                navigate('/klasifikasi')
              }}
            >
              <Icon name="camera" size={19} /> Pindai lagi
            </Button>
            <Button size="lg" variant="secondary" onClick={() => document.getElementById('proses')?.scrollIntoView({ behavior: 'smooth' })}>
              Lihat proses hitungnya
            </Button>
            <Button size="lg" variant="ghost" onClick={share} aria-live="polite">
              <Icon name={copied ? 'check' : 'share'} size={18} /> {copied ? 'Teks disalin' : 'Bagikan'}
            </Button>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-redup">
            Ini tebakan model berdasarkan pola gambar, bukan pemeriksaan langsung. Kalau ragu, lihat
            bahan bendanya: dari makhluk hidup berarti organik, dari plastik, logam, kaca, atau kertas
            olahan berarti anorganik.
          </p>
        </div>
      </section>

      <div className="mt-14">
        <ProcessExplorer result={result} />
      </div>
    </div>
  )
}
