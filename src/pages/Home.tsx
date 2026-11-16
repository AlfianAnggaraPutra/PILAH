import { useState } from 'react'
import { Bin } from '@/components/brand/Bin'
import { SortGame } from '@/components/home/SortGame'
import { ButtonLink } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { GUIDE, OUT_OF_SCOPE, STATS } from '@/lib/content'
import { ITEMS, type WasteKind } from '@/lib/items'
import { cn } from '@/lib/utils'

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'camera',
    title: 'Foto satu benda',
    text: 'Buka kamera atau pilih foto dari galeri. Satu foto untuk satu benda, latar polos lebih baik.',
  },
  {
    icon: 'cpu',
    title: 'PILAH membaca polanya',
    text: 'Foto dikecilkan jadi 64 × 64, diubah ke grayscale, lalu dibaca CNN langsung di perangkatmu.',
  },
  {
    icon: 'recycle',
    title: 'Buang ke tong yang tepat',
    text: 'Kamu dapat jenis sampahnya, seberapa yakin modelnya, dan cara menanganinya.',
  },
]

function Hero() {
  return (
    <section className="pola-titik relative overflow-hidden bg-rimba-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_78%_62%,rgb(63_191_119/0.2),transparent_70%),radial-gradient(35%_40%_at_100%_0%,rgb(255_194_71/0.14),transparent_70%),linear-gradient(180deg,transparent_60%,rgb(6_26_22/0.7))]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pt-28 pb-14 sm:px-6 md:pt-32 lg:grid-cols-[1fr_1.02fr] lg:gap-6 lg:pt-36 lg:pb-24">
        <div className="max-w-xl">
          <h1 className="text-[2.6rem] leading-[1.06] font-bold tracking-tight sm:text-6xl lg:text-[4.1rem]">
            Sampah ini masuk tong yang mana?
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-mint/80">
            Foto sampahnya, dan PILAH memberi tahu apakah itu organik atau anorganik. Semuanya
            dihitung di perangkatmu, fotonya tidak dikirim ke mana pun.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to="/klasifikasi" variant="gold" size="lg">
              <Icon name="scan" size={20} />
              Pindai sampah
            </ButtonLink>
            <ButtonLink to="/tentang#cara-kerja" variant="glass" size="lg">
              Lihat cara kerjanya
            </ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-mint/70">
            {(
              [
                ['shield', 'Foto tidak diunggah'],
                ['users', 'Tanpa akun'],
                ['cpu', 'Model 0,5 MB, jalan di browser'],
              ] as const
            ).map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2">
                <Icon name={icon} size={17} className="text-daun-terang" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-[2rem] bg-white/[0.04] p-4 ring-1 ring-white/10 sm:p-6">
          <p className="mb-2 px-1 font-display text-sm font-semibold text-emas-terang">
            Coba dulu, sebelum memotret
          </p>
          <SortGame />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <h2 className="text-3xl leading-tight font-bold sm:text-[2.6rem]">
            Masalahnya bukan cuma banyaknya sampah, tapi tercampurnya.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-redup">
            Sampah organik bisa jadi kompos atau biogas, anorganik bisa didaur ulang. Keduanya
            butuh cara olah yang berbeda, dan begitu tercampur dalam satu kantong, sebagian besar
            berakhir di TPA. Memilah sejak dari rumah juga diamanatkan UU Nomor 18 Tahun 2008.
          </p>
        </Reveal>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-10">
          {STATS.map((s, i) => (
            <Reveal as="li" key={s.label} delay={i * 90} className="border-t-2 border-rimba-900 pt-5">
              <p className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                <CountUp value={s.value} digits={s.digits} delay={i * 90} />
                <span className="ml-1 text-xl font-semibold text-redup sm:text-2xl">{s.unit}</span>
              </p>
              <p className="mt-2 text-[0.95rem] leading-snug text-teks">{s.label}</p>
              <p className="mt-2 text-xs text-redup/80">{s.source}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section className="bg-mint/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="max-w-md text-3xl font-bold sm:text-4xl">Cukup tiga langkah</h2>
          <p className="max-w-sm text-redup">Tidak perlu daftar, tidak perlu pasang aplikasi.</p>
        </Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal
              as="li"
              key={s.title}
              delay={i * 110}
              className="group relative rounded-[1.75rem] bg-white p-7 shadow-lembut ring-1 ring-garis/70 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-angkat"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-rimba-900 text-emas transition-transform duration-300 group-hover:-rotate-6">
                  <Icon name={s.icon} size={22} />
                </span>
                <span className="font-display text-5xl font-bold text-mint" aria-hidden>
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-redup">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Guide() {
  const [kind, setKind] = useState<WasteKind>('organik')
  const g = GUIDE[kind]
  const items = Object.values(ITEMS).filter((i) => i.kind === kind)
  const org = kind === 'organik'
  return (
    <section id="panduan" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-28">
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl font-bold sm:text-4xl">Organik atau anorganik?</h2>
        <p className="mt-4 text-lg text-redup">
          Dua kelas yang dikenali PILAH, beserta apa yang sebaiknya kamu lakukan dengan masing-masing.
        </p>
      </Reveal>

      <div
        role="tablist"
        aria-label="Jenis sampah"
        className="mt-10 inline-flex rounded-full bg-white p-1.5 shadow-lembut ring-1 ring-garis"
      >
        {(['organik', 'anorganik'] as const).map((k) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={kind === k}
            aria-controls="panel-panduan"
            onClick={() => setKind(k)}
            className={cn(
              'relative rounded-full px-6 py-2.5 font-display text-sm font-semibold transition-colors duration-300',
              kind === k
                ? k === 'organik'
                  ? 'bg-daun text-rimba-900'
                  : 'bg-emas text-rimba-900'
                : 'text-redup hover:text-teks',
            )}
          >
            {GUIDE[k].title}
          </button>
        ))}
      </div>

      <div
        key={kind}
        id="panel-panduan"
        role="tabpanel"
        aria-labelledby={`tab-${kind}`}
        className={cn(
          'halaman-masuk mt-6 grid gap-8 overflow-hidden rounded-[2rem] p-7 ring-1 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12',
          org ? 'bg-mint ring-daun/30' : 'bg-krem ring-emas/40',
        )}
      >
        <div className="flex flex-col items-center justify-center">
          <Bin kind={kind} interactive className="w-40 sm:w-48" />
          <div className="mt-6 flex flex-wrap justify-center gap-1">
            {items.map((it, i) => (
              <img
                key={it.id}
                src={it.src}
                alt={it.label}
                title={it.label}
                className="size-14 transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-6 sm:size-16"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold">{g.title}</h3>
          <p className="mt-3 leading-relaxed text-teks/85">{g.summary}</p>
          <p className="mt-5 text-sm font-semibold text-teks">Contohnya</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.examples.map((e) => (
              <li
                key={e}
                className="rounded-full bg-white/80 px-3.5 py-1.5 text-sm ring-1 ring-black/5"
              >
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-semibold text-teks">Yang bisa kamu lakukan</p>
          <ol className="mt-3 space-y-3">
            {g.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-semibold',
                    org ? 'bg-daun-tua text-white' : 'bg-rimba-900 text-emas',
                  )}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium">
            <Icon name={org ? 'leaf' : 'recycle'} size={17} />
            Bisa diolah menjadi: {g.becomes}
          </p>
        </div>
      </div>

      <p className="mt-6 flex max-w-3xl gap-3 text-sm leading-relaxed text-redup">
        <Icon name="info" size={18} className="mt-0.5 shrink-0" />
        {OUT_OF_SCOPE}
      </p>
    </section>
  )
}

function Privacy() {
  return (
    <section className="px-3 sm:px-6">
      <Reveal className="pola-titik relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-rimba-900 px-7 py-14 text-white sm:px-12 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-daun/20 blur-3xl"
        />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-emas ring-1 ring-white/15">
              <Icon name="shield" size={28} />
            </span>
            <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Fotomu tetap di perangkatmu</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-mint/75">
              Model PILAH hanya sekitar 0,5 MB dan dijalankan langsung oleh browser. Tidak ada
              server yang menerima, menyimpan, atau melihat foto yang kamu pindai.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-4">
            {[
              ['0', 'foto dikirim ke server'],
              ['64 × 64', 'piksel yang dibaca model'],
              ['131.185', 'parameter hasil pelatihan'],
              ['0,5 MB', 'ukuran model'],
            ].map(([v, l]) => (
              <li key={l} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="font-display text-2xl font-bold text-emas angka">{v}</p>
                <p className="mt-1 text-sm text-mint/70">{l}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-6 md:py-28">
      <Reveal>
        <div className="mx-auto flex w-fit items-end gap-3">
          <Bin kind="organik" interactive className="w-20 sm:w-24" />
          <Bin kind="anorganik" interactive className="w-20 sm:w-24" />
        </div>
        <h2 className="mx-auto mt-8 max-w-2xl text-3xl font-bold sm:text-[2.6rem] sm:leading-tight">
          Ada sampah di dekatmu? Pindai sekarang.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-redup">
          Butuh beberapa detik saja, dan kamu jadi tahu harus dibuang ke mana.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/klasifikasi" size="lg">
            <Icon name="scan" size={20} />
            Mulai pindai
          </ButtonLink>
          <ButtonLink to="/tentang" variant="secondary" size="lg">
            Tentang penelitian ini
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Steps />
      <Guide />
      <Privacy />
      <FinalCta />
    </>
  )
}
