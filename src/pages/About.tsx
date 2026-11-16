import { useEffect, useState, type ReactNode } from 'react'
import { ConvDemo, LossChart, PoolDemo, SigmoidDemo } from '@/components/about/Demos'
import { Slogan } from '@/components/brand/Brand'
import { ButtonLink } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import {
  DATASET,
  FAQ,
  INSTITUTION,
  PIPELINE,
  REFERENCES,
  RESEARCH_TITLE,
  SUPERVISOR,
  TEAM,
} from '@/lib/content'
import { loadModel } from '@/lib/ml/model'
import type { ModelMeta } from '@/lib/ml/types'
import { cn, fmt } from '@/lib/utils'

const SECTIONS = [
  { id: 'latar', label: 'Latar belakang' },
  { id: 'cara-kerja', label: 'Cara kerja' },
  { id: 'model', label: 'Model & data' },
  { id: 'tim', label: 'Tim' },
  { id: 'faq', label: 'Tanya jawab' },
  { id: 'referensi', label: 'Referensi' },
] as const

function useActiveSection() {
  const [active, setActive] = useState<string>(SECTIONS[0].id)
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
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
    <Reveal className="max-w-3xl">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {children && <div className="mt-4 text-lg leading-relaxed text-redup">{children}</div>}
    </Reveal>
  )
}

function Hero() {
  return (
    <section className="pola-titik relative overflow-hidden bg-rimba-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_85%_30%,rgb(63_191_119/0.2),transparent_70%),radial-gradient(30%_40%_at_10%_0%,rgb(255_194_71/0.12),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-20">
        <p className="font-display text-sm font-semibold text-emas-terang">Tentang PILAH</p>
        <h1 className="mt-4 max-w-4xl text-4xl leading-[1.08] font-bold tracking-tight sm:text-6xl">
          Dari rumus di makalah ke aplikasi yang bisa dipakai siapa saja.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mint/80">
          PILAH adalah bagian dari penelitian kami di {INSTITUTION.program} {INSTITUTION.university}:
          “{RESEARCH_TITLE}”. Setiap angka yang dihitung di website ini mengikuti persamaan yang
          sama dengan yang kami uraikan di makalah.
        </p>
        <p className="mt-6 text-sm text-mint/70">
          Nama PILAH berasal dari <Slogan className="font-semibold text-white" />.
        </p>
      </div>
    </section>
  )
}

function SubNav() {
  const active = useActiveSection()
  return (
    <nav
      aria-label="Bagian halaman"
      className="sticky top-16 z-30 border-b border-garis/70 bg-kertas/90 backdrop-blur-lg md:top-[4.5rem]"
    >
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-5 [&::-webkit-scrollbar]:hidden">
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
                'block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                active === s.id ? 'bg-rimba-900 text-white' : 'text-redup hover:bg-mint hover:text-teks',
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
    <section id="latar" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20 sm:px-6 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionHead title="Kenapa kami membuat PILAH">
          <p>
            Timbulan sampah nasional pada 2024 mencapai sekitar 34,6 juta ton, dan lebih dari separuhnya
            belum terkelola dengan baik. Sisa makanan dan plastik mendominasi, padahal keduanya butuh
            cara olah yang berbeda.
          </p>
          <p className="mt-4">
            Di fasilitas pengolahan, pemilahan masih banyak dilakukan manual. Prosesnya lambat, rawan
            keliru, dan berisiko bagi kesehatan petugas. Kami ingin menunjukkan bahwa komputer bisa
            belajar membedakan sampah organik dan anorganik dari foto, dan bahwa cara belajarnya bisa
            diuraikan langkah demi langkah dengan matematika.
          </p>
        </SectionHead>
        <Reveal delay={120} className="space-y-4">
          {(
            [
              ['book', 'Teoretis', 'Memahami cara kerja CNN dan backpropagation lewat perhitungan manual, bukan sekadar memanggil pustaka.'],
              ['recycle', 'Praktis', 'Menjadi dasar sistem pemilah otomatis, misalnya tempat sampah pintar atau pemilah di fasilitas pengolahan.'],
              ['users', 'Edukasi', 'Membantu siapa saja belajar memilah sampah dengan cara yang cepat dan menyenangkan.'],
            ] as [IconName, string, string][]
          ).map(([icon, title, text]) => (
            <div key={title} className="flex gap-4 rounded-[1.5rem] bg-white p-5 ring-1 ring-garis transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lembut">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-daun-tua">
                <Icon name={icon} size={21} />
              </span>
              <div>
                <h3 className="font-display font-semibold">Manfaat {title.toLowerCase()}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-redup">{text}</p>
              </div>
            </div>
          ))}
        </Reveal>
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
  hidden: 'Enam belas neuron menghitung z_in = v₀ + Σ xᵢvᵢⱼ, lalu ReLU meneruskan hanya nilai positif.',
  out: 'Satu neuron output menghitung y_in = w₀ + Σ zⱼwⱼ, lalu sigmoid mengubahnya menjadi peluang y. Jika y ≥ 0,5 hasilnya anorganik, selain itu organik.',
}

function HowItWorks() {
  const [stage, setStage] = useState<(typeof PIPELINE)[number]['id']>('conv')
  return (
    <section id="cara-kerja" className="scroll-mt-10 bg-mint/50">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
        <SectionHead title="Cara kerja CNN di PILAH">
          <p>
            Convolutional Neural Network membaca citra dalam dua tahap: ekstraksi ciri (konvolusi,
            ReLU, pooling) lalu klasifikasi (flatten, hidden layer, output). Ketuk tiap tahap untuk
            melihat penjelasannya.
          </p>
        </SectionHead>

        <Reveal className="mt-10">
          <ol className="flex snap-x gap-2 overflow-x-auto pb-3 lg:grid lg:grid-cols-7 lg:overflow-visible">
            {PIPELINE.map((p, i) => (
              <li key={p.id} className="relative shrink-0 snap-start lg:shrink">
                <button
                  type="button"
                  onClick={() => setStage(p.id)}
                  aria-pressed={stage === p.id}
                  className={cn(
                    'flex h-full w-40 flex-col rounded-2xl p-4 text-left transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-1 lg:w-full',
                    stage === p.id ? 'bg-rimba-900 text-white shadow-angkat' : 'bg-white ring-1 ring-garis hover:shadow-lembut',
                  )}
                >
                  <span className={cn('font-display text-xs font-semibold', stage === p.id ? 'text-emas' : 'text-redup')}>
                    Tahap {i + 1}
                  </span>
                  <span className="mt-1 font-display text-[0.95rem] leading-tight font-semibold">{p.name}</span>
                  <span className={cn('mt-auto pt-3 text-sm angka', stage === p.id ? 'text-mint/80' : 'text-redup')}>{p.size}</span>
                </button>
              </li>
            ))}
          </ol>
          <div key={stage} className="halaman-masuk mt-4 rounded-2xl bg-white p-5 leading-relaxed ring-1 ring-garis sm:p-6">
            <p className="font-display font-semibold">{PIPELINE.find((p) => p.id === stage)?.name}</p>
            <p className="mt-1.5 text-redup">{STAGE_TEXT[stage]}</p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6">
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-lembut ring-1 ring-garis sm:p-8">
            <h3 className="text-xl font-bold">Coba sendiri: konvolusi</h3>
            <p className="mt-2 mb-6 max-w-2xl text-redup">
              Angka contoh dari PPT Bab III. Kernel menimpa jendela 3 × 3, setiap pasangan angka
              dikalikan, lalu semuanya dijumlahkan bersama bias.
            </p>
            <ConvDemo />
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal className="rounded-[2rem] bg-white p-6 shadow-lembut ring-1 ring-garis sm:p-8">
              <h3 className="text-xl font-bold">Max pooling 2 × 2</h3>
              <p className="mt-2 mb-6 text-redup">Peta 4 × 4 diringkas menjadi 2 × 2.</p>
              <PoolDemo />
            </Reveal>
            <Reveal delay={100} className="rounded-[2rem] bg-white p-6 shadow-lembut ring-1 ring-garis sm:p-8">
              <h3 className="text-xl font-bold">Sigmoid dan keputusan kelas</h3>
              <p className="mt-2 mb-6 text-redup">Nilai y_in diubah menjadi peluang antara 0 dan 1.</p>
              <SigmoidDemo />
            </Reveal>
          </div>
        </div>

        <Reveal className="pola-titik mt-6 overflow-hidden rounded-[2rem] bg-rimba-900 p-6 text-white sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h3 className="text-2xl font-bold">Bagaimana model belajar</h3>
              <p className="mt-3 leading-relaxed text-mint/75">
                Model dilatih dengan backpropagation dan Stochastic Gradient Descent pada 1.600 citra
                latih. Untuk setiap citra, model menebak, menghitung error dengan Binary Cross-Entropy,
                lalu merambatkan error itu mundur untuk memperbaiki semua bobot dan kernel sedikit demi
                sedikit.
              </p>
              <dl className="mt-7 grid grid-cols-3 gap-3">
                {[
                  ['α', '0,01', 'learning rate'],
                  ['ε', '0,05', 'batas error'],
                  ['Eₘₐₖₛ', '50', 'epoch maksimum'],
                ].map(([k, v, l]) => (
                  <div key={k} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <dt className="text-xs text-mint/60">{l}</dt>
                    <dd className="mt-1 font-display text-lg font-bold whitespace-nowrap text-emas angka sm:text-xl">
                      {k} = {v}
                    </dd>
                  </div>
                ))}
              </dl>
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
                <li key={layer} className="flex items-center gap-4 rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.09]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emas font-display text-xs font-bold text-rimba-900">{i + 1}</span>
                  <span className="w-20 shrink-0 font-display text-sm font-semibold">{layer}</span>
                  <span className="min-w-0 flex-1 text-sm text-mint/85">
                    <span className="block font-medium text-white">{f}</span>
                    <span className="text-mint/60">{note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-garis">
      <p className="text-sm text-redup">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold angka">{fmt(value * 100, 2)}%</p>
      <p className="mt-2 text-xs leading-relaxed text-redup">{hint}</p>
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
    <section id="model" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20 sm:px-6 md:py-24">
      <SectionHead title="Model dan data">
        <p>
          Data diambil dari dataset {DATASET.name} di Kaggle, karya {DATASET.author}. Dari{' '}
          {DATASET.total.toLocaleString('id-ID')} citra, kami mengambil {DATASET.used.toLocaleString('id-ID')} secara
          acak dengan jumlah seimbang per kelas.
        </p>
      </SectionHead>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Reveal className="rounded-[2rem] bg-white p-6 ring-1 ring-garis sm:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="database" size={20} /> Alur data
          </h3>
          <ol className="mt-6 space-y-4">
            {[
              [`${DATASET.total.toLocaleString('id-ID')} citra`, `${DATASET.organik.toLocaleString('id-ID')} organik, ${DATASET.anorganik.toLocaleString('id-ID')} anorganik (recyclable)`],
              ['2.000 citra', '1.000 per kelas diambil acak; organik t = 0, anorganik t = 1'],
              ['1.600 latih, 400 uji', 'pembagian 80 : 20, masing-masing seimbang antar kelas'],
            ].map(([a, b], i) => (
              <li key={a} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rimba-900 font-display text-sm font-bold text-emas">{i + 1}</span>
                <div>
                  <p className="font-display font-semibold angka">{a}</p>
                  <p className="text-sm text-redup">{b}</p>
                </div>
              </li>
            ))}
          </ol>
          <a href={DATASET.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-daun-tua hover:underline">
            Lihat dataset di Kaggle <Icon name="external" size={14} />
          </a>
        </Reveal>

        <Reveal delay={100} className="rounded-[2rem] bg-white p-6 ring-1 ring-garis sm:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon name="layers" size={20} /> Arsitektur dan parameter
          </h3>
          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-garis text-left text-redup">
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
                <tr key={a} className="border-b border-garis/60">
                  <td className="py-2.5 pr-2">{a}</td>
                  <td className="py-2.5 pr-2 text-redup">{b}</td>
                  <td className="py-2.5 text-right">{c}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-semibold" colSpan={2}>Total</td>
                <td className="pt-3 text-right font-semibold">131.185</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-redup">Disimpan sebagai float32, sekitar 0,5 MB.</p>
        </Reveal>
      </div>

      <Reveal className="mt-6 rounded-[2rem] bg-rimba-900 p-6 text-white sm:p-8" id="evaluasi">
        <h3 className="font-display text-lg font-semibold">Hasil evaluasi pada 400 citra uji</h3>
        {m ? (
          <>
            <div className="mt-6 grid gap-3 text-teks sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Accuracy" value={m.accuracy} hint="Proporsi seluruh citra uji yang diklasifikasikan benar." />
              <Metric label="Precision" value={m.precision} hint="Dari yang ditebak anorganik, berapa yang memang anorganik." />
              <Metric label="Recall" value={m.recall} hint="Dari semua anorganik, berapa yang berhasil dikenali." />
              <Metric label="F1-score" value={m.f1} hint="Rata-rata harmonik precision dan recall." />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
              {m.tp !== undefined && (
                <table className="text-center text-sm angka" aria-label="Confusion matrix">
                  <thead>
                    <tr className="text-mint/60">
                      <th />
                      <th className="px-3 pb-2 font-medium">Prediksi anorganik</th>
                      <th className="px-3 pb-2 font-medium">Prediksi organik</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className="pr-3 text-right font-medium text-mint/60">Anorganik</th>
                      <td className="p-1"><span className="block rounded-xl bg-emas px-4 py-3 font-display text-lg font-bold text-rimba-900">TP {m.tp}</span></td>
                      <td className="p-1"><span className="block rounded-xl bg-white/10 px-4 py-3 font-display text-lg font-bold">FN {m.fn}</span></td>
                    </tr>
                    <tr>
                      <th className="pr-3 text-right font-medium text-mint/60">Organik</th>
                      <td className="p-1"><span className="block rounded-xl bg-white/10 px-4 py-3 font-display text-lg font-bold">FP {m.fp}</span></td>
                      <td className="p-1"><span className="block rounded-xl bg-daun px-4 py-3 font-display text-lg font-bold text-rimba-900">TN {m.tn}</span></td>
                    </tr>
                  </tbody>
                </table>
              )}
              {tr?.lossHistory && tr.lossHistory.length > 1 && (
                <div className="rounded-2xl bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-teks">
                    Rata-rata error per epoch ({tr.epochs} epoch, {tr.trainSize.toLocaleString('id-ID')} citra latih)
                  </p>
                  <LossChart loss={tr.lossHistory} epsilon={tr.epsilon} />
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 max-w-2xl leading-relaxed text-mint/75" data-testid="metrics-pending">
            Angka accuracy, precision, recall, dan F1-score akan tampil di sini setelah bobot hasil
            pelatihan dari notebook Colab dipasang. Kelas anorganik dipakai sebagai kelas positif.
          </p>
        )}
      </Reveal>

      <Reveal className="mt-6 rounded-[2rem] bg-krem p-6 ring-1 ring-emas/40 sm:p-8">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon name="alert" size={20} /> Batasan yang perlu kamu tahu
        </h3>
        <ul className="mt-4 grid gap-3 text-[0.95rem] leading-relaxed sm:grid-cols-2">
          {[
            'Model hanya mengenal dua kelas. Sampah B3 seperti baterai atau lampu tetap akan ditebak sebagai salah satunya.',
            'Citra diubah ke grayscale 64 × 64, jadi warna tidak ikut dipertimbangkan dan detail kecil bisa hilang.',
            'Foto kamera ponsel bisa berbeda dari foto dataset. Latar ramai atau beberapa benda sekaligus menurunkan keyakinan.',
            'Hasil adalah prediksi berbasis pola, bukan pemeriksaan bahan. Gunakan sebagai bantuan, bukan keputusan akhir.',
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emas-tua" />
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}

function Team() {
  return (
    <section id="tim" className="scroll-mt-10 bg-mint/50">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24">
        <SectionHead title="Tim pengembang">
          <p>
            Mahasiswa {INSTITUTION.program}, {INSTITUTION.department}, {INSTITUTION.faculty},{' '}
            {INSTITUTION.university}.
          </p>
        </SectionHead>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {TEAM.map((p, i) => (
            <Reveal
              key={p.nim}
              delay={i * 100}
              className="group flex items-center gap-5 rounded-[1.75rem] bg-white p-6 ring-1 ring-garis transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-angkat"
            >
              <span
                className={cn(
                  'grid size-20 shrink-0 place-items-center rounded-[1.4rem] font-display text-2xl font-bold transition-transform duration-300 group-hover:-rotate-6',
                  i === 0 ? 'bg-daun text-rimba-900' : 'bg-emas text-rimba-900',
                )}
                aria-hidden
              >
                {p.initials}
              </span>
              <div>
                <h3 className="font-display text-lg leading-snug font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-redup angka">NIM {p.nim}</p>
                <p className="text-sm text-redup">{INSTITUTION.program}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {SUPERVISOR && (
          <p className="mt-6 text-redup">
            {SUPERVISOR.role}: <span className="font-semibold text-teks">{SUPERVISOR.name}</span>
          </p>
        )}
        <Reveal className="mt-8 grid gap-4 sm:grid-cols-3">
          {(
            [
              ['cpu', 'Python + NumPy', 'Pelatihan dan evaluasi model di Google Colab, ditulis manual tanpa pustaka deep learning.'],
              ['layers', 'React + TypeScript', 'Antarmuka web dengan umpan maju CNN yang ditulis ulang langsung di browser.'],
              ['shield', 'Tanpa server', 'Dideploy statis di Vercel. Tidak ada basis data dan tidak ada foto yang dikirim.'],
            ] as [IconName, string, string][]
          ).map(([icon, t, d]) => (
            <div key={t} className="rounded-2xl bg-white/70 p-5 ring-1 ring-garis">
              <Icon name={icon} size={20} className="text-daun-tua" />
              <p className="mt-3 font-display font-semibold">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-redup">{d}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-10 px-5 py-20 sm:px-6 md:py-24">
      <SectionHead title="Tanya jawab" />
      <div className="mt-8 divide-y divide-garis rounded-[1.75rem] bg-white ring-1 ring-garis">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display font-semibold transition-colors hover:text-daun-tua">
              {f.q}
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mint transition-transform duration-300 group-open:rotate-180">
                <Icon name="chevronDown" size={18} />
              </span>
            </summary>
            <p className="-mt-1 pb-5 leading-relaxed text-redup group-open:animate-masuk">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function References() {
  return (
    <section id="referensi" className="mx-auto max-w-4xl scroll-mt-10 px-5 pb-24 sm:px-6">
      <SectionHead title="Referensi" />
      <ol className="mt-8 space-y-3 text-sm leading-relaxed text-redup">
        {REFERENCES.map((r) => (
          <li key={r} className="pl-8 -indent-8">
            {r}
          </li>
        ))}
      </ol>
      <div className="mt-14 flex flex-col items-start gap-4 rounded-[1.75rem] bg-rimba-900 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xl font-semibold">Sudah paham cara kerjanya? Coba langsung.</p>
        <ButtonLink to="/klasifikasi" variant="gold">
          <Icon name="scan" size={18} /> Pindai sampah
        </ButtonLink>
      </div>
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
      <Faq />
      <References />
    </>
  )
}
