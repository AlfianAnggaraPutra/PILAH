import { useState, type CSSProperties } from 'react'
import { Bin } from '@/components/brand/Bin'
import { FaqSection } from '@/components/home/FaqSection'
import { NewsSection } from '@/components/home/NewsSection'
import { SortGame } from '@/components/home/SortGame'
import { BgPhoto } from '@/components/ui/BgPhoto'
import { ButtonLink } from '@/components/ui/Button'
import { CountUp } from '@/components/ui/CountUp'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal, WordsIn } from '@/components/ui/Reveal'
import { Tooltip } from '@/components/ui/Tooltip'
import { GUIDE, OUT_OF_SCOPE, PHOTOS, STATS } from '@/lib/content'
import { ITEMS, type WasteKind } from '@/lib/items'
import { trackSpotlight } from '@/lib/motion'
import { cn } from '@/lib/utils'

const delay = (ms: number) => ({ '--tunda': `${ms}ms` }) as CSSProperties

const PERKS: { icon: IconName; label: string; tip: string }[] = [
  {
    icon: 'gift',
    label: 'Gratis, tanpa akun',
    tip: 'Langsung pakai tanpa daftar, login, atau memasang aplikasi.',
  },
  {
    icon: 'zap',
    label: 'Hasil dalam hitungan detik',
    tip: 'Foto dikenali langsung di HP atau laptopmu, jadi tidak perlu menunggu antrean server.',
  },
  {
    icon: 'lock',
    label: 'Privasi terjaga',
    tip: 'Fotomu tidak dikirim ke mana pun dan tidak kami simpan. Semua proses terjadi di perangkatmu sendiri.',
  },
]

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'camera',
    title: 'Foto satu benda',
    text: 'Buka kamera atau pilih foto dari galeri. Satu foto untuk satu benda, dengan latar yang polos.',
  },
  {
    icon: 'sparkle',
    title: 'PILAH mengenalinya',
    text: 'PILAH membaca bentuk dan tekstur bendanya, lalu menimbang apakah itu organik atau anorganik.',
  },
  {
    icon: 'recycle',
    title: 'Buang ke tong yang tepat',
    text: 'Kamu mendapat jenis sampahnya, seberapa yakin hasilnya, dan cara menanganinya.',
  },
]

function Hero() {
  return (
    <section
      onPointerMove={trackSpotlight}
      className="sorot butir relative isolate flex min-h-[100svh] items-center overflow-hidden"
    >
      <BgPhoto id={PHOTOS.hero.id} eager className="opacity-60" imgClassName="animate-kenburns" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-latar)_0%,rgb(5_26_21/0.88)_38%,rgb(5_26_21/0.45)_72%,rgb(5_26_21/0.7)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_78%_60%,rgb(63_191_119/0.22),transparent_70%),radial-gradient(35%_40%_at_100%_0%,rgb(255_194_71/0.14),transparent_70%),linear-gradient(180deg,transparent_65%,var(--color-latar))]"
      />
      <div aria-hidden className="pola-titik absolute inset-0 opacity-40" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-28 pb-24 sm:px-6 md:pt-32 lg:grid-cols-[1fr_1.02fr] lg:gap-8">
        <div className="max-w-xl">
          <p
            className="masuk-blur text-mint-teks inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-1.5 pr-4 pl-2 text-sm ring-1 ring-white/10 backdrop-blur"
            style={delay(50)}
          >
            <span className="bg-daun/20 relative grid size-6 place-items-center rounded-full">
              <span className="bg-daun absolute size-2 animate-[denyut_2.2s_ease-in-out_infinite] rounded-full" />
            </span>
            Pilah sampah jadi lebih mudah
          </p>
          <h1 className="mt-6 text-[2.7rem] leading-[1.05] font-bold tracking-tight text-white sm:text-6xl lg:text-[4.2rem]">
            <WordsIn text="Sampah ini masuk tong yang mana?" start={150} />
          </h1>
          <p
            className="masuk-blur text-mint-teks/85 mt-6 max-w-lg text-lg leading-relaxed"
            style={delay(650)}
          >
            Foto sampahnya, PILAH langsung memberi tahu apakah itu organik atau anorganik, lengkap
            dengan cara membuangnya yang benar.
          </p>
          <div className="masuk mt-9 flex flex-wrap gap-3" style={delay(800)}>
            <ButtonLink to="/klasifikasi" size="lg">
              <Icon name="scan" size={20} />
              Pindai sampah
            </ButtonLink>
            <ButtonLink to="/#panduan" variant="secondary" size="lg">
              Panduan memilah
            </ButtonLink>
          </div>
          <ul className="text-mint-teks/80 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {PERKS.map((p, i) => (
              <li key={p.label} className="masuk" style={delay(950 + i * 90)}>
                <Tooltip tip={p.tip} side="bottom">
                  <span className="group hover:border-daun-terang flex items-center gap-2 border-b border-dashed border-white/20 pb-0.5 transition-colors hover:text-white">
                    <Icon
                      name={p.icon}
                      size={17}
                      className="text-daun-terang transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6"
                    />
                    {p.label}
                  </span>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>

        <div className="masuk-skala kartu relative rounded-[2rem] p-4 sm:p-6" style={delay(450)}>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="font-display text-emas-terang text-sm font-semibold">
              Coba dulu, sebelum memotret
            </p>
            <span className="text-redup flex items-center gap-1.5 text-xs">
              <Icon name="mouse" size={14} /> Seret atau ketuk
            </span>
          </div>
          <SortGame />
        </div>
      </div>

      <a
        href="#masalah"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('masalah')?.scrollIntoView({ behavior: 'smooth' })
        }}
        aria-label="Gulir ke bawah"
        className="masuk text-redup absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs transition-colors hover:text-white md:flex"
        style={delay(1400)}
      >
        <span className="grid h-9 w-6 justify-center rounded-full border border-white/25 pt-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/70" />
        </span>
      </a>
    </section>
  )
}

function Problem() {
  return (
    <section id="masalah" className="relative overflow-hidden py-24 md:py-32">
      <BgPhoto id={PHOTOS.masalah.id} className="opacity-[0.16]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--color-latar),rgb(5_26_21/0.6)_30%,rgb(5_26_21/0.6)_70%,var(--color-latar))]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal gaya="kiri">
          <h2 className="text-3xl leading-tight font-bold sm:text-[2.75rem]">
            Masalahnya bukan cuma banyaknya sampah, tapi tercampurnya.
          </h2>
          <p className="text-redup mt-5 text-lg leading-relaxed">
            Sampah organik bisa jadi kompos, anorganik bisa didaur ulang. Begitu keduanya tercampur
            dalam satu kantong, kebanyakan berakhir menumpuk di TPA. Memilah dari rumah adalah
            langkah paling sederhana untuk mengubahnya.
          </p>
          <p className="text-redup/80 mt-6 hidden text-sm [@media(hover:hover)]:block">
            Arahkan kursor ke angka untuk melihat sumber datanya.
          </p>
        </Reveal>
        <ul className="grid grid-cols-2 gap-4 sm:gap-5">
          {STATS.map((s, i) => (
            <Reveal as="li" key={s.label} delay={i * 110} gaya="skala">
              <div
                onPointerMove={trackSpotlight}
                className="kartu sorot group h-full rounded-[1.6rem] p-5 transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-white/20 sm:p-6"
              >
                <p className="font-display text-[2.1rem] leading-none font-bold tracking-tight text-white sm:text-5xl">
                  <CountUp value={s.value} digits={s.digits} delay={i * 110} />
                  <span className="text-daun-terang ml-1 text-lg font-semibold sm:text-2xl">
                    {s.unit}
                  </span>
                </p>
                <p className="text-mint-teks mt-3 text-[0.95rem] leading-snug">{s.label}</p>
                <p className="text-redup mt-3 border-t border-white/10 pt-3 text-xs transition-[opacity,transform] duration-500 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                  Sumber: {s.source}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section className="bg-latar-2 relative overflow-hidden py-24 md:py-28">
      <div
        aria-hidden
        className="pola-kisi absolute inset-0 [mask-image:radial-gradient(60%_70%_at_50%_50%,black,transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal gaya="blur" className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-[2.75rem]">Cukup tiga langkah</h2>
          <p className="text-redup mt-4 text-lg">
            Tidak perlu daftar dan tidak perlu memasang aplikasi.
          </p>
        </Reveal>
        <ol className="relative mt-14 grid gap-5 md:grid-cols-3">
          <li
            aria-hidden
            className="from-daun/0 via-daun/50 to-emas/0 pointer-events-none absolute top-[3.6rem] right-[17%] left-[17%] hidden h-px bg-gradient-to-r md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 140} gaya="naik">
              <div
                onPointerMove={trackSpotlight}
                className="kartu sorot group hover:border-daun/40 hover:shadow-cahaya h-full rounded-[1.75rem] p-7 text-center transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-1.5"
              >
                <span className="from-daun to-daun-tua text-rimba-950 relative mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br shadow-[0_10px_30px_-10px_rgb(63_191_119/0.7)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon name={s.icon} size={24} />
                  <span className="bg-emas font-display text-rimba-950 ring-latar-2 absolute -top-2 -right-2 grid size-6 place-items-center rounded-full text-xs font-bold ring-4">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="text-redup mt-2 leading-relaxed">{s.text}</p>
              </div>
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
    <section id="panduan" className="relative overflow-hidden py-24 md:py-32">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal gaya="kiri" className="max-w-2xl">
            <h2 className="text-3xl font-bold sm:text-[2.75rem]">Organik atau anorganik?</h2>
            <p className="text-redup mt-4 text-lg">
              Kenali ciri masing-masing, dan apa yang sebaiknya kamu lakukan setelah memilahnya.
            </p>
          </Reveal>
          <Reveal gaya="kanan" delay={100}>
            <div
              role="tablist"
              aria-label="Jenis sampah"
              className="inline-flex rounded-full bg-white/[0.05] p-1.5 ring-1 ring-white/10"
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
                    'font-display relative rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-300',
                    kind === k
                      ? k === 'organik'
                        ? 'bg-daun text-rimba-950'
                        : 'bg-emas text-rimba-950'
                      : 'text-redup hover:text-white',
                  )}
                >
                  {GUIDE[k].title}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal gaya="skala" className="mt-10">
          <div
            key={kind}
            id="panel-panduan"
            role="tabpanel"
            aria-labelledby={`tab-${kind}`}
            className="halaman-masuk relative isolate grid gap-10 overflow-hidden rounded-[2.25rem] border border-white/10 p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14"
          >
            <BgPhoto
              id={org ? PHOTOS.organik.id : PHOTOS.anorganik.id}
              width={1400}
              className="-z-10 opacity-30"
            />
            <div
              aria-hidden
              className={cn(
                'absolute inset-0 -z-10',
                org
                  ? 'bg-[linear-gradient(110deg,rgb(15_58_44/0.97)_30%,rgb(15_58_44/0.8)_65%,rgb(15_58_44/0.55))]'
                  : 'bg-[linear-gradient(110deg,rgb(53_43_16/0.97)_30%,rgb(53_43_16/0.82)_65%,rgb(53_43_16/0.55))]',
              )}
            />
            <div className="flex flex-col items-center justify-center">
              <Bin
                kind={kind}
                interactive
                className="w-40 drop-shadow-[0_24px_30px_rgb(0_0_0/0.45)] sm:w-48"
              />
              <p className="mt-3 hidden text-xs text-white/50 [@media(hover:hover)]:block">
                Arahkan kursor ke tong untuk membukanya
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-1.5">
                {items.map((it) => (
                  <li key={it.id}>
                    <Tooltip tip={it.label} width="w-auto whitespace-nowrap">
                      <img
                        src={it.src}
                        alt={it.label}
                        className="size-14 transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-2 hover:scale-110 hover:rotate-6 sm:size-16"
                      />
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className={cn('text-3xl font-bold', org ? 'text-daun-terang' : 'text-emas-terang')}
              >
                {g.title}
              </h3>
              <p className="text-mint-teks/90 mt-3 leading-relaxed">{g.summary}</p>
              <p className="mt-6 text-sm font-semibold text-white">Contohnya</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {g.examples.map((e) => (
                  <li
                    key={e}
                    className="rounded-full bg-white/[0.08] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/10 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    {e}
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-sm font-semibold text-white">Yang bisa kamu lakukan</p>
              <ol className="mt-3 space-y-3">
                {g.steps.map((s, i) => (
                  <li key={s} className="group flex gap-3">
                    <span
                      className={cn(
                        'font-display grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold transition-transform duration-300 group-hover:scale-110',
                        org ? 'bg-daun text-rimba-950' : 'bg-emas text-rimba-950',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="text-mint-teks/90 pt-0.5 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
                <Icon
                  name={org ? 'leaf' : 'recycle'}
                  size={17}
                  className={org ? 'text-daun-terang' : 'text-emas'}
                />
                Bisa diolah menjadi: {g.becomes}
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <p className="text-redup flex max-w-3xl gap-3 text-sm leading-relaxed">
            <Icon name="info" size={18} className="text-emas mt-0.5 shrink-0" />
            {OUT_OF_SCOPE}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-3 py-24 sm:px-6 md:py-28">
      <Reveal gaya="tirai" className="mx-auto max-w-6xl">
        <div className="butir relative isolate overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-16 text-center sm:px-12 md:py-20">
          <BgPhoto
            id={PHOTOS.ajakan.id}
            width={1600}
            className="-z-10 opacity-45"
            imgClassName="animate-kenburns"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_50%_100%,rgb(63_191_119/0.3),transparent_70%),linear-gradient(180deg,rgb(5_26_21/0.85),rgb(5_26_21/0.65)_50%,rgb(5_26_21/0.9))]"
          />
          <div className="mx-auto flex w-fit items-end gap-3">
            <Bin
              kind="organik"
              interactive
              className="w-20 transition-transform duration-500 hover:-translate-y-1 sm:w-24"
            />
            <Bin
              kind="anorganik"
              interactive
              className="w-20 transition-transform duration-500 hover:-translate-y-1 sm:w-24"
            />
          </div>
          <h2 className="mx-auto mt-8 max-w-2xl text-3xl font-bold sm:text-5xl sm:leading-tight">
            Ada sampah di dekatmu? Pindai sekarang.
          </h2>
          <p className="text-mint-teks/85 mx-auto mt-4 max-w-lg text-lg">
            Cukup beberapa detik, dan kamu jadi tahu harus dibuang ke mana.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/klasifikasi" size="lg">
              <Icon name="scan" size={20} />
              Mulai pindai
            </ButtonLink>
            <ButtonLink to="/tentang" variant="secondary" size="lg">
              Tentang PILAH
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Steps />
      <Guide />
      <NewsSection />
      <FaqSection />
      <FinalCta />
    </>
  )
}
