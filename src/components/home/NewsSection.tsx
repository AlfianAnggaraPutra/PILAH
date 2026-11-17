import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { NEWS, unsplash, type NewsItem, type NewsTopic } from '@/lib/content'
import { trackSpotlight } from '@/lib/motion'
import { cn } from '@/lib/utils'

const TOPICS: ('Semua' | NewsTopic)[] = ['Semua', 'Kebijakan', 'TPA', 'Daur ulang', 'Gerakan warga']
const INITIAL = 7

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

function NewsImage({ item, featured }: { item: NewsItem; featured: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={cn(
        'from-kartu-2 via-panel to-rimba-950 relative overflow-hidden bg-linear-to-br',
        featured ? 'aspect-video lg:aspect-auto lg:h-full lg:min-h-84' : 'aspect-16/10',
      )}
    >
      {failed ? (
        <span className="absolute inset-0 grid place-items-center text-white/15">
          <Icon name="news" size={56} strokeWidth={1.4} />
        </span>
      ) : (
        <img
          src={unsplash(item.photo.id, featured ? 1200 : 720)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="ease-keluar size-full object-cover transition-transform duration-900 group-hover:scale-[1.07]"
        />
      )}
      <div
        aria-hidden
        className="from-rimba-950/90 via-rimba-950/20 absolute inset-0 bg-linear-to-t to-transparent"
      />
      <span className="absolute right-3 bottom-2.5 text-[10px] text-white/55">
        Foto ilustrasi: {item.photo.by} / Unsplash
      </span>
    </div>
  )
}

function NewsCard({ item, featured, delay }: { item: NewsItem; featured: boolean; delay: number }) {
  return (
    <Reveal
      as="li"
      gaya={featured ? 'skala' : 'naik'}
      delay={delay}
      className={cn(featured && 'md:col-span-2 lg:col-span-3')}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        onPointerMove={trackSpotlight}
        className={cn(
          'kartu sorot group hover:shadow-angkat flex h-full overflow-hidden rounded-[1.75rem] transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1.5 hover:border-white/20',
          featured ? 'flex-col lg:grid lg:grid-cols-[1.25fr_1fr]' : 'flex-col',
        )}
      >
        <NewsImage item={item} featured={featured} />
        <div
          className={cn(
            'flex flex-1 flex-col',
            featured ? 'p-6 sm:p-8 lg:justify-center lg:p-10' : 'p-5 sm:p-6',
          )}
        >
          <p className="text-redup flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-mint-teks font-semibold">{item.source}</span>
            <span aria-hidden className="bg-redup/60 size-1 rounded-full" />
            <time dateTime={item.date}>{fmtDate(item.date)}</time>
          </p>
          <h3
            className={cn(
              'group-hover:text-daun-terang mt-3 leading-snug font-semibold text-white transition-colors duration-300',
              featured ? 'text-2xl sm:text-3xl' : 'line-clamp-3 text-[1.05rem]',
            )}
          >
            {item.title}
          </h3>
          <p
            className={cn(
              'text-redup mt-3 text-sm leading-relaxed',
              featured
                ? 'sm:text-base'
                : 'group-hover:text-mint-teks line-clamp-3 transition-[color] duration-300',
            )}
          >
            {item.summary}
          </p>
          <span
            className={cn(
              'text-emas inline-flex items-center gap-1.5 pt-5 text-sm font-semibold',
              !featured && 'mt-auto',
            )}
          >
            Baca di {item.source}
            <Icon
              name="external"
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </a>
    </Reveal>
  )
}

export function NewsSection() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('Semua')
  const [all, setAll] = useState(false)
  const list = useMemo(() => NEWS.filter((n) => topic === 'Semua' || n.topic === topic), [topic])
  const shown = all ? list : list.slice(0, INITIAL)

  return (
    <section id="berita" className="relative overflow-hidden py-16 md:py-24">
      <div
        aria-hidden
        className="pola-kisi absolute inset-0 mask-[radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
      />
      <div
        aria-hidden
        className="bg-emas/[0.07] pointer-events-none absolute -top-24 right-[-10%] size-136 rounded-full blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <Reveal gaya="blur" className="max-w-2xl">
            <h2 className="text-3xl leading-tight font-bold sm:text-[2.75rem]">
              Kabar terbaru soal sampah di Indonesia
            </h2>
            <p className="text-redup mt-4 text-lg leading-relaxed">
              Kebijakan baru, cerita warga, dan perkembangan daur ulang. Ringkasannya kami tulis
              singkat, berita lengkapnya bisa kamu baca di sumber aslinya.
            </p>
          </Reveal>
          <Reveal gaya="kanan" delay={120}>
            <div role="toolbar" aria-label="Saring topik berita" className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={topic === t}
                  onClick={() => {
                    setTopic(t)
                    setAll(false)
                  }}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,transform] duration-300 hover:-translate-y-0.5',
                    topic === t
                      ? 'text-rimba-950 bg-white'
                      : 'text-redup bg-white/6 ring-1 ring-white/10 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <ul
          key={topic}
          className="mt-12 grid auto-rows-auto gap-5 md:grid-cols-2 lg:grid-cols-3"
          data-testid="berita"
        >
          {shown.map((n, i) => (
            <NewsCard
              key={n.url}
              item={n}
              featured={i === 0 && topic === 'Semua'}
              delay={(i % 3) * 90}
            />
          ))}
        </ul>

        {list.length > INITIAL && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              className="group font-display inline-flex h-12 items-center gap-2 rounded-full bg-white/6 px-6 text-sm font-semibold text-white ring-1 ring-white/15 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/10"
            >
              {all ? 'Tampilkan lebih sedikit' : `Lihat semua berita (${list.length})`}
              <Icon
                name="chevronDown"
                size={18}
                className={cn('transition-transform duration-300', all && 'rotate-180')}
              />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
