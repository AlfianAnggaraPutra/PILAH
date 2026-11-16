import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { ConvDemo, LossChart, PoolDemo, SigmoidDemo } from '@/components/about/Demos'
import { BgPhoto } from '@/components/ui/BgPhoto'
import { ButtonLink } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal, WordsIn } from '@/components/ui/Reveal'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  DATASET,
  INSTITUTION,
  PHOTOS,
  PIPELINE,
  PROJECT_LABEL,
  REFERENCES,
  RESEARCH_TITLE,
  SUPERVISOR,
  TEAM,
} from '@/lib/content'
import { loadModel } from '@/lib/ml/model'
import type { ModelMeta } from '@/lib/ml/types'
import { trackSpotlight } from '@/lib/motion'
import { cn, fmt } from '@/lib/utils'

const delay = (ms: number) => ({ '--tunda': `${ms}ms` }) as CSSProperties

const SECTIONS = [
  { id: 'latar', label: 'Latar belakang' },
  { id: 'cara-kerja', label: 'Cara kerja' },
  { id: 'model', label: 'Model & data' },
  { id: 'tim', label: 'Tim' },
  { id: 'referensi', label: 'Referensi' },
] as const

function useActiveSection() {
  const [active, setActive] = useState<string>(SECTIONS[0].id)
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return active
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Reveal gaya="blur" className="max-w-3xl">
      <h2 className="text-3xl leading-tight font-bold tracking-tight sm:text-[2.6rem]">{title}</h2>
      {children && <div className="text-redup mt-4 text-lg leading-relaxed">{children}</div>}
    </Reveal>
  )
}

function Hero() {
  return (
    <section
      onPointerMove={trackSpotlight}
      className="sorot butir relative isolate overflow-hidden"
    >
      <BgPhoto
        id={PHOTOS.tentang.id}
        eager
        className="opacity-50"
        imgClassName="animate-kenburns"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-latar)_5%,rgb(5_26_21/0.8)_45%,rgb(5_26_21/0.45)),linear-gradient(180deg,transparent_60%,var(--color-latar))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_55%_at_85%_30%,rgb(63_191_119/0.2),transparent_70%),radial-gradient(30%_40%_at_10%_0%,rgb(255_194_71/0.1),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-36 pb-20 sm:px-6 md:pt-44 md:pb-28">
        <h1 className="max-w-4xl text-[2.6rem] leading-[1.06] font-bold tracking-tight text-white sm:text-6xl lg:text-[4.2rem]">
          <WordsIn text="Teknologi kecil untuk kebiasaan besar." start={100} />
        </h1>
        <p
          className="masuk-blur text-mint-teks/85 mt-7 max-w-2xl text-lg leading-relaxed sm:text-xl"
          style={delay(550)}
        >
          PILAH lahir dari keinginan sederhana: membuat memilah sampah terasa mudah bagi siapa saja.
          Kenali alasan kami membuatnya, cara kerjanya, dan orang-orang di baliknya.
        </p>
        <div className="masuk mt-9 flex flex-wrap gap-3" style={delay(700)}>
          <ButtonLink to="/klasifikasi" size="lg">
            <Icon name="scan" size={19} /> Coba PILAH
          </ButtonLink>
          <a
            href="#cara-kerja"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('cara-kerja')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="kilau font-display inline-flex h-14 items-center gap-2 rounded-full bg-white/6 px-7 font-semibold text-white ring-1 ring-white/15 backdrop-blur transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/11"
          >
            Lihat cara kerjanya
          </a>
        </div>
      </div>
    </section>
  )
}

function SubNav() {
  const active = useActiveSection()
  return (
    <nav
      aria-label="Bagian halaman"
      className="bg-latar/80 sticky top-16 z-30 border-y border-white/6 backdrop-blur-xl md:top-18"
    >
      <ul className="mx-auto flex max-w-6xl scrollbar-none gap-1 overflow-x-auto px-3 py-2 sm:px-5 [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
                history.replaceState(null, '', `#${s.id}`)
              }}
              className={cn(
                'block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300',
                active === s.id
                  ? 'bg-emas text-rimba-950'
                  : 'text-redup hover:bg-white/6 hover:text-white',
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Background() {
  return (
    <section id="latar" className="mx-auto max-w-6xl scroll-mt-12 px-5 py-24 sm:px-6 md:py-28">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionHead title="Kenapa kami membuat PILAH">
          <p>
            Timbulan sampah nasional pada 2024 mencapai sekitar 34,6 juta ton, dan lebih dari
            separuhnya belum terkelola dengan baik. Sisa makanan dan plastik mendominasi, padahal
            keduanya butuh cara olah yang berbeda.
          </p>
          <p className="mt-4">
            Di banyak tempat, pemilahan masih dikerjakan manual: lambat, rawan keliru, dan berisiko
            bagi kesehatan petugas. Kami ingin menunjukkan bahwa komputer bisa belajar membedakan
            sampah organik dan anorganik dari foto, dan cara belajarnya bisa dijelaskan langkah demi
            langkah dengan matematika.
          </p>
        </SectionHead>
        <div className="space-y-4">
          {(
            [
              [
                'book',
                'Untuk ilmu pengetahuan',
                'Memahami cara kerja CNN dan backpropagation lewat perhitungan manual, bukan sekadar memanggil pustaka.',
              ],
              [
                'recycle',
                'Untuk pengelolaan sampah',
                'Menjadi dasar sistem pemilah otomatis, misalnya tempat sampah pintar atau pemilah di fasilitas pengolahan.',
              ],
              [
                'users',
                'Untuk masyarakat',
                'Membantu siapa saja belajar memilah sampah dengan cara yang cepat dan menyenangkan.',
              ],
            ] as [IconName, string, string][]
          ).map(([icon, title, text], i) => (
            <Reveal key={title} gaya="kanan" delay={i * 110}>
              <div
                onPointerMove={trackSpotlight}
                className="kartu sorot group flex gap-4 rounded-3xl p-5 transition-[transform,border-color] duration-500 hover:-translate-y-0.5 hover:border-white/20"
              >
                <span className="bg-daun/15 text-daun-terang grid size-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon name={icon} size={21} />
                </span>
                <div>
                  <h3 className="font-display font-semibold">{title}</h3>
                  <p className="text-redup mt-1 text-[0.95rem] leading-relaxed">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const STAGE_TEXT: Record<(typeof PIPELINE)[number]['id'], string> = {
  input:
    'Foto diperkecil menjadi 64 × 64 piksel, diubah ke grayscale dengan Gray = 0,299R + 0,587G + 0,114B, lalu setiap piksel dibagi 255 sehingga nilainya di antara 0 dan 1.',
  pad: 'Tepi matriks diberi satu baris dan satu kolom bernilai 0 di setiap sisi (q = (k − 1)/2 = 1) agar hasil konvolusi tetap berukuran 64 × 64.',
  conv: 'Delapan kernel 3 × 3 digeser ke seluruh citra. Tiap kernel belajar mengenali ciri tertentu, seperti tepi atau tekstur. ReLU lalu mengubah nilai negatif menjadi 0.',
  pool: 'Setiap jendela 2 × 2 diwakili nilai terbesarnya. Ukuran peta turun menjadi 32 × 32 dan posisi nilai terbesar dicatat untuk propagasi balik.',
  flat: 'Delapan peta 32 × 32 disusun baris demi baris menjadi satu vektor x berisi 8.192 angka.',
  hidden:
    'Enam belas neuron menghitung z_in = v₀ + Σ xᵢvᵢⱼ, lalu ReLU meneruskan hanya nilai positif.',
  out: 'Satu neuron output menghitung y_in = w₀ + Σ zⱼwⱼ, lalu sigmoid mengubahnya menjadi peluang y. Jika y ≥ 0,5 hasilnya anorganik, selain itu organik.',
}

function HowItWorks() {
  const [stage, setStage] = useState<(typeof PIPELINE)[number]['id']>('conv')
  return (
    <section
      id="cara-kerja"
      className="bg-latar-2 relative scroll-mt-12 overflow-hidden py-24 md:py-28"
    >
      <div
        aria-hidden
        className="pola-kisi absolute inset-0 mask-[radial-gradient(70%_50%_at_50%_20%,black,transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHead title="Cara kerja CNN di PILAH">
          <p>
            Convolutional Neural Network membaca citra dalam dua tahap: ekstraksi ciri (konvolusi,
            ReLU, pooling) lalu klasifikasi (flatten, hidden layer, output). Ketuk tiap tahap untuk
            melihat penjelasannya.
          </p>
        </SectionHead>

        <Reveal gaya="naik" className="mt-10">
          <ol className="flex snap-x scrollbar-none gap-2 overflow-x-auto pb-3 lg:grid lg:grid-cols-7 lg:overflow-visible">
            {PIPELINE.map((p, i) => (
              <li key={p.id} className="relative shrink-0 snap-start lg:shrink">
                <button
                  type="button"
                  onClick={() => setStage(p.id)}
                  aria-pressed={stage === p.id}
                  className={cn(
                    'flex h-full w-40 flex-col rounded-2xl p-4 text-left transition-[transform,background-color,box-shadow,border-color] duration-300 hover:-translate-y-1 lg:w-full',
                    stage === p.id
                      ? 'border-emas/50 bg-emas/10 border shadow-[0_18px_40px_-18px_rgb(255_194_71/0.6)]'
                      : 'kartu hover:border-white/20',
                  )}
                >
                  <span
                    className={cn(
                      'font-display text-xs font-semibold',
                      stage === p.id ? 'text-emas' : 'text-redup',
                    )}
                  >
                    Tahap {i + 1}
                  </span>
                  <span className="font-display mt-1 text-[0.95rem] leading-tight font-semibold text-white">
                    {p.name}
                  </span>
                  <span
                    className={cn(
                      'angka mt-auto pt-3 text-sm',
                      stage === p.id ? 'text-emas-terang' : 'text-redup',
                    )}
                  >
                    {p.size}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div
            key={stage}
            className="halaman-masuk kartu mt-4 rounded-2xl p-5 leading-relaxed sm:p-6"
          >
            <p className="font-display font-semibold text-white">
              {PIPELINE.find((p) => p.id === stage)?.name}
            </p>
            <p className="text-redup mt-1.5">{STAGE_TEXT[stage]}</p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6">
          <Reveal gaya="skala" className="kartu rounded-4xl p-6 sm:p-8">
            <h3 className="text-xl font-bold">Coba sendiri: konvolusi</h3>
            <p className="text-redup mt-2 mb-6 max-w-2xl">
              Angka contoh dari makalah. Kernel menimpa jendela 3 × 3, setiap pasangan angka
              dikalikan, lalu semuanya dijumlahkan bersama bias.
            </p>
            <ConvDemo />
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal gaya="kiri" className="kartu rounded-4xl p-6 sm:p-8">
              <h3 className="text-xl font-bold">Max pooling 2 × 2</h3>
              <p className="text-redup mt-2 mb-6">Peta 4 × 4 diringkas menjadi 2 × 2.</p>
              <PoolDemo />
            </Reveal>
            <Reveal gaya="kanan" delay={100} className="kartu rounded-4xl p-6 sm:p-8">
              <h3 className="text-xl font-bold">Sigmoid dan keputusan kelas</h3>
              <p className="text-redup mt-2 mb-6">
                Nilai y_in diubah menjadi peluang antara 0 dan 1.
              </p>
              <SigmoidDemo />
            </Reveal>
          </div>
        </div>

        <Reveal gaya="tirai" className="mt-6">
          <div className="butir relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(135deg,var(--color-kartu-2),var(--color-rimba-950))] p-6 sm:p-10">
            <div
              aria-hidden
              className="bg-emas/10 pointer-events-none absolute -top-24 -right-24 size-80 rounded-full blur-3xl"
            />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <h3 className="text-2xl font-bold">Bagaimana model belajar</h3>
                <p className="text-redup mt-3 leading-relaxed">
                  Model dilatih dengan backpropagation dan Stochastic Gradient Descent pada 1.600
                  citra latih. Untuk setiap citra, model menebak, menghitung error dengan Binary
                  Cross-Entropy, lalu merambatkan error itu mundur untuk memperbaiki semua bobot dan
                  kernel sedikit demi sedikit.
                </p>
                <ul className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    [
                      'α',
                      '0,01',
                      'learning rate',
                      'Seberapa besar langkah perbaikan bobot di setiap data.',
                    ],
                    [
                      'ε',
                      '0,05',
                      'batas error',
                      'Pelatihan berhenti bila rata-rata error sudah di bawah nilai ini.',
                    ],
                    [
                      'Eₘₐₖₛ',
                      '50',
                      'epoch maksimum',
                      'Batas berapa kali seluruh data latih diputar.',
                    ],
                  ].map(([k, v, l, tip]) => (
                    <li key={k} className="min-w-0">
                      <Tooltip tip={tip} className="w-full">
                        <span className="block w-full rounded-2xl bg-white/5 px-3 py-3.5 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/9 sm:p-4">
                          <span className="text-redup block text-xs">{l}</span>
                          <span className="font-display text-emas angka mt-1 block text-base font-bold sm:text-xl sm:whitespace-nowrap">
                            {k} = {v}
                          </span>
                        </span>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </div>
              <ol className="space-y-2">
                {[
                  ['Output', 'δₖ = t − y', 'koreksi wⱼ dan w₀'],
                  ['Hidden', 'δⱼ = δₖwⱼ f′(z_inⱼ)', 'koreksi vᵢⱼ dan v₀ⱼ'],
                  ['Flatten', 'δxᵢ = Σ δⱼvᵢⱼ', 'disusun menjadi δP'],
                  ['Pooling', 'ke posisi nilai terbesar', 'menghasilkan δR'],
                  ['ReLU', 'δC = δR · f′(C)', 'hanya posisi C > 0'],
                  ['Konvolusi', 'ΔK = α ΣΣ δC · I', 'koreksi kernel dan bias'],
                ].map(([layer, f, note], i) => (
                  <li
                    key={layer}
                    className="group flex items-center gap-4 rounded-2xl bg-white/4 px-4 py-3 ring-1 ring-white/10 transition-[background-color,transform] duration-300 hover:translate-x-1 hover:bg-white/8"
                  >
                    <span className="bg-emas font-display text-rimba-950 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-transform duration-300 group-hover:scale-110">
                      {i + 1}
                    </span>
                    <span className="font-display w-20 shrink-0 text-sm font-semibold">
                      {layer}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium text-white">{f}</span>
                      <span className="text-redup">{note}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div
      onPointerMove={trackSpotlight}
      className="kartu sorot group rounded-2xl p-5 transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-white/20"
    >
      <p className="text-redup text-sm">{label}</p>
      <p className="font-display angka mt-1 text-3xl font-bold text-white">
        {fmt(value * 100, 2)}%
      </p>
      <p className="text-redup group-hover:text-mint-teks mt-2 text-xs leading-relaxed transition-colors duration-300">
        {hint}
      </p>
    </div>
  )
}

function ModelSection() {
  const [meta, setMeta] = useState<ModelMeta | null>(null)
  const [mock, setMock] = useState(false)
  useEffect(() => {
    loadModel()
      .then((m) => {
        setMeta(m.meta)
        setMock(m.isMock)
      })
      .catch(() => undefined)
  }, [])
  const m = !mock ? meta?.metrics : undefined
  const tr = !mock ? meta?.training : undefined

  return (
    <section id="model" className="mx-auto max-w-6xl scroll-mt-12 px-5 py-24 sm:px-6 md:py-28">
      <SectionHead title="Model dan data">
        <p>
          Data diambil dari dataset {DATASET.name} di Kaggle, karya {DATASET.author}. Dari{' '}
          {DATASET.total.toLocaleString('id-ID')} citra, kami mengambil{' '}
          {DATASET.used.toLocaleString('id-ID')} secara acak dengan jumlah seimbang per kelas.
        </p>
      </SectionHead>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Reveal gaya="kiri" className="kartu rounded-4xl p-6 sm:p-8">
          <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Icon name="database" size={20} className="text-daun-terang" /> Alur data
          </h3>
          <ol className="relative mt-6 space-y-5">
            <span
              aria-hidden
              className="from-daun/60 to-emas/40 absolute top-3 bottom-3 left-4 w-px bg-linear-to-b"
            />
            {[
              [
                `${DATASET.total.toLocaleString('id-ID')} citra`,
                `${DATASET.organik.toLocaleString('id-ID')} organik, ${DATASET.anorganik.toLocaleString('id-ID')} anorganik (recyclable)`,
              ],
              ['2.000 citra', '1.000 per kelas diambil acak; organik t = 0, anorganik t = 1'],
              ['1.600 latih, 400 uji', 'pembagian 80 : 20, masing-masing seimbang antarkelas'],
            ].map(([a, b], i) => (
              <li key={a} className="relative flex gap-4">
                <span className="bg-emas font-display text-rimba-950 ring-kartu relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ring-4">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display angka font-semibold text-white">{a}</p>
                  <p className="text-redup text-sm">{b}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href={DATASET.url}
            target="_blank"
            rel="noreferrer"
            className="group text-emas hover:text-emas-terang mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            Lihat dataset di Kaggle
            <Icon
              name="external"
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </Reveal>

        <Reveal gaya="kanan" delay={100} className="kartu rounded-4xl p-6 sm:p-8">
          <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Icon name="layers" size={20} className="text-daun-terang" /> Arsitektur dan parameter
          </h3>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="text-redup border-b border-white/10 text-left">
                <th className="pb-2 font-medium">Lapisan</th>
                <th className="pb-2 font-medium">Keluaran</th>
                <th className="pb-2 text-right font-medium">Parameter</th>
              </tr>
            </thead>
            <tbody className="angka">
              {[
                ['Konvolusi 8 × (3 × 3) + ReLU', '8 × 64 × 64', '80'],
                ['Max pooling 2 × 2', '8 × 32 × 32', '0'],
                ['Flatten', '8.192', '0'],
                ['Hidden 16 neuron, ReLU', '16', '131.088'],
                ['Output 1 neuron, sigmoid', '1', '17'],
              ].map(([a, b, c]) => (
                <tr
                  key={a}
                  className="border-b border-white/6 transition-colors duration-200 hover:bg-white/4"
                >
                  <td className="py-2.5 pr-2 text-white">{a}</td>
                  <td className="text-redup py-2.5 pr-2">{b}</td>
                  <td className="py-2.5 text-right text-white">{c}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-semibold text-white" colSpan={2}>
                  Total
                </td>
                <td className="text-emas pt-3 text-right font-semibold">131.185</td>
              </tr>
            </tbody>
          </table>
          <p className="text-redup mt-4 text-xs">Disimpan sebagai float32, sekitar 0,5 MB.</p>
        </Reveal>
      </div>

      <Reveal gaya="skala" className="mt-6" id="evaluasi">
        <div className="butir relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(135deg,var(--color-kartu-2),var(--color-rimba-950))] p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">Hasil evaluasi pada 400 citra uji</h3>
          {m ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Accuracy"
                  value={m.accuracy}
                  hint="Proporsi seluruh citra uji yang diklasifikasikan benar."
                />
                <Metric
                  label="Precision"
                  value={m.precision}
                  hint="Dari yang ditebak anorganik, berapa yang memang anorganik."
                />
                <Metric
                  label="Recall"
                  value={m.recall}
                  hint="Dari semua anorganik, berapa yang berhasil dikenali."
                />
                <Metric
                  label="F1-score"
                  value={m.f1}
                  hint="Rata-rata harmonik precision dan recall."
                />
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
                {m.tp !== undefined && (
                  <table className="angka text-center text-sm" aria-label="Confusion matrix">
                    <thead>
                      <tr className="text-redup">
                        <th />
                        <th className="px-3 pb-2 font-medium">Prediksi anorganik</th>
                        <th className="px-3 pb-2 font-medium">Prediksi organik</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th className="text-redup pr-3 text-right font-medium">Anorganik</th>
                        <td className="p-1">
                          <span className="bg-emas font-display text-rimba-950 block rounded-xl px-4 py-3 text-lg font-bold">
                            TP {m.tp}
                          </span>
                        </td>
                        <td className="p-1">
                          <span className="font-display block rounded-xl bg-white/10 px-4 py-3 text-lg font-bold">
                            FN {m.fn}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th className="text-redup pr-3 text-right font-medium">Organik</th>
                        <td className="p-1">
                          <span className="font-display block rounded-xl bg-white/10 px-4 py-3 text-lg font-bold">
                            FP {m.fp}
                          </span>
                        </td>
                        <td className="p-1">
                          <span className="bg-daun font-display text-rimba-950 block rounded-xl px-4 py-3 text-lg font-bold">
                            TN {m.tn}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
                {tr?.lossHistory && tr.lossHistory.length > 1 && (
                  <div className="rounded-2xl bg-white/4 p-4 ring-1 ring-white/10">
                    <p className="mb-2 text-sm font-semibold text-white">
                      Rata-rata error per epoch ({tr.epochs} epoch,{' '}
                      {tr.trainSize.toLocaleString('id-ID')} citra latih)
                    </p>
                    <LossChart loss={tr.lossHistory} epsilon={tr.epsilon} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-redup mt-3 max-w-2xl leading-relaxed" data-testid="metrics-pending">
              Angka accuracy, precision, recall, dan F1-score akan tampil di sini setelah bobot
              hasil pelatihan dari notebook Colab dipasang. Kelas anorganik dipakai sebagai kelas
              positif.
            </p>
          )}
        </div>
      </Reveal>

      <Reveal gaya="naik" className="mt-6">
        <div className="border-emas/25 bg-krem/50 rounded-4xl border p-6 sm:p-8">
          <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Icon name="alert" size={20} className="text-emas" /> Batasan yang perlu kamu tahu
          </h3>
          <ul className="text-mint-teks/90 mt-4 grid gap-3 text-[0.95rem] leading-relaxed sm:grid-cols-2">
            {[
              'Model hanya mengenal dua kelas. Sampah B3 seperti baterai atau lampu tetap akan ditebak sebagai salah satunya.',
              'Citra diubah ke grayscale 64 × 64, jadi warna tidak ikut dipertimbangkan dan detail kecil bisa hilang.',
              'Foto kamera ponsel bisa berbeda dari foto dataset. Latar ramai atau beberapa benda sekaligus menurunkan keyakinan.',
              'Hasil adalah prediksi berbasis pola, bukan pemeriksaan bahan. Gunakan sebagai bantuan, bukan keputusan akhir.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="bg-emas mt-2 size-1.5 shrink-0 rounded-full" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}

function Team() {
  return (
    <section id="tim" className="bg-latar-2 relative scroll-mt-12 overflow-hidden py-24 md:py-28">
      <div
        aria-hidden
        className="pola-titik absolute inset-0 mask-[radial-gradient(60%_60%_at_50%_40%,black,transparent)] opacity-40"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHead title="Tim pengembang">
          <p>
            Dibuat sebagai {PROJECT_LABEL.toLowerCase()} oleh mahasiswa {INSTITUTION.program},{' '}
            {INSTITUTION.department}, {INSTITUTION.faculty}, {INSTITUTION.university}.
          </p>
          <p className="text-redup/80 mt-2 text-base">Penelitian: “{RESEARCH_TITLE}”.</p>
        </SectionHead>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {TEAM.map((p, i) => (
            <Reveal key={p.nim} gaya={i === 0 ? 'kiri' : 'kanan'} delay={i * 100}>
              <div
                onPointerMove={trackSpotlight}
                className="kartu sorot group hover:shadow-angkat flex items-center gap-5 rounded-[1.75rem] p-6 transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1 hover:border-white/20"
              >
                <span
                  className={cn(
                    'font-display text-rimba-950 grid size-20 shrink-0 place-items-center rounded-[1.4rem] text-2xl font-bold transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-6',
                    i === 0
                      ? 'from-daun-terang to-daun bg-linear-to-br'
                      : 'from-emas-terang to-emas bg-linear-to-br',
                  )}
                  aria-hidden
                >
                  {p.initials}
                </span>
                <div>
                  <h3 className="font-display text-lg leading-snug font-semibold">{p.name}</h3>
                  <p className="text-redup angka mt-1 text-sm">NIM {p.nim}</p>
                  <p className="text-redup text-sm">{INSTITUTION.program}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        {SUPERVISOR && (
          <p className="text-redup mt-6">
            {SUPERVISOR.role}: <span className="font-semibold text-white">{SUPERVISOR.name}</span>
          </p>
        )}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {(
            [
              [
                'cpu',
                'Python + NumPy',
                'Pelatihan dan evaluasi model di Google Colab, ditulis manual tanpa pustaka deep learning.',
              ],
              [
                'layers',
                'React + TypeScript',
                'Antarmuka web dengan umpan maju CNN yang ditulis ulang langsung di browser.',
              ],
              [
                'shield',
                'Tanpa server',
                'Dideploy statis di Vercel. Tidak ada basis data dan tidak ada foto yang dikirim.',
              ],
            ] as [IconName, string, string][]
          ).map(([icon, t, d], i) => (
            <Reveal key={t} gaya="naik" delay={i * 90}>
              <div className="group h-full rounded-2xl bg-white/3 p-5 ring-1 ring-white/10 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/6">
                <Icon
                  name={icon}
                  size={20}
                  className="text-daun-terang transition-transform duration-300 group-hover:scale-125"
                />
                <p className="font-display mt-3 font-semibold text-white">{t}</p>
                <p className="text-redup mt-1 text-sm leading-relaxed">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function References() {
  return (
    <section id="referensi" className="mx-auto max-w-4xl scroll-mt-12 px-5 py-24 sm:px-6">
      <SectionHead title="Referensi" />
      <Reveal gaya="naik">
        <ol className="text-redup mt-8 space-y-3 text-sm leading-relaxed">
          {REFERENCES.map((r) => (
            <li
              key={r}
              className="hover:text-mint-teks pl-8 -indent-8 transition-colors duration-200"
            >
              {r}
            </li>
          ))}
        </ol>
      </Reveal>
      <Reveal gaya="skala" className="mt-14">
        <div className="flex flex-col items-start gap-4 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(120deg,var(--color-mint),var(--color-kartu))] p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-xl font-semibold">
            Sudah paham cara kerjanya? Coba langsung.
          </p>
          <ButtonLink to="/klasifikasi">
            <Icon name="scan" size={18} /> Pindai sampah
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  )
}

export default function About() {
  return (
    <>
      <Hero />
      <SubNav />
      <Background />
      <HowItWorks />
      <ModelSection />
      <Team />
      <References />
    </>
  )
}
