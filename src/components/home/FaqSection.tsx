import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { FAQ } from '@/lib/content'
import { Link } from '@/lib/router'
import { cn } from '@/lib/utils'

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="bg-latar-2 relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="pola-titik absolute inset-0 mask-[linear-gradient(to_bottom,black,transparent_70%)] opacity-50"
      />
      <div
        aria-hidden
        className="bg-daun/10 pointer-events-none absolute bottom-[-20%] left-[-10%] size-120 rounded-full blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal gaya="kiri" className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-emas grid size-14 place-items-center rounded-2xl bg-white/6 ring-1 ring-white/10">
            <Icon name="help" size={26} />
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-bold sm:text-[2.75rem]">
            Pertanyaan yang sering ditanyakan
          </h2>
          <p className="text-redup mt-4 text-lg leading-relaxed">
            Belum menemukan jawabannya? Halaman Tentang membahas cara kerja PILAH lebih lengkap.
          </p>
          <Link
            to="/tentang"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-white/6 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/10"
          >
            Pelajari tentang PILAH
            <Icon
              name="arrowRight"
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </Reveal>

        <ul className="space-y-3" data-testid="faq">
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal as="li" key={f.q} delay={i * 60}>
                <div
                  className={cn(
                    'kartu overflow-hidden rounded-[1.4rem] transition-[border-color,background-color] duration-300',
                    isOpen ? 'border-daun/40 bg-white/[0.07]' : 'hover:border-white/20',
                  )}
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-${i}`}
                      id={`faq-q-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group font-display flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[1.02rem] font-semibold text-white"
                    >
                      <span className="group-hover:text-daun-terang transition-colors duration-300">
                        {f.q}
                      </span>
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full transition-[transform,background-color,color] duration-500',
                          isOpen
                            ? 'bg-daun text-rimba-950 rotate-45'
                            : 'bg-white/[0.07] text-white group-hover:bg-white/15',
                        )}
                      >
                        <Icon name="plus" size={18} />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-${i}`}
                    role="region"
                    aria-labelledby={`faq-q-${i}`}
                    className={cn(
                      'ease-keluar grid transition-[grid-template-rows,opacity] duration-500',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-redup px-6 pb-6 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
