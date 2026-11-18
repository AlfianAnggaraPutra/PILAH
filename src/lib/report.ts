/**
 * Laporan PDF hasil pindaian banyak foto. Dibuat langsung di browser dengan pdf-lib
 * (dimuat hanya saat tombol "Unduh PDF" ditekan), tanpa server.
 *
 * Susunan: kepala laporan, A. Informasi pindaian, B. Ringkasan hasil, C. Sebaran hasil,
 * D. Rincian per foto (tabel bergambar), E. Panduan penanganan, F. Catatan penting.
 */
import type { PDFDocument, PDFFont, PDFImage, PDFPage, RGB } from 'pdf-lib'
import {
  adviceFor,
  confidenceOf,
  tally,
  verdictOf,
  VERDICT_LABEL,
  LOW_CONFIDENCE,
  type Verdict,
} from '@/lib/advice'
import { HANDLING, OUT_OF_SCOPE } from '@/lib/content'
import { fmt } from '@/lib/utils'
import type { ScanItem } from '@/store/classifyStore'

const PAGE_W = 595.28
const PAGE_H = 841.89
const M = 56
const CW = PAGE_W - 2 * M
const BOTTOM = 76 // batas bawah isi (di atasnya footer)

/** Teks Indonesia aman untuk font standar PDF (WinAnsi); karakter lain diganti. */
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
export function pdfSafe(s: string) {
  const cleaned = s
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[−‐‑]/g, '-')
    .replace(/\s+/g, ' ')
  // Per code point (emoji dihitung satu); karakter di luar WinAnsi dibuang.
  return Array.from(cleaned)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0
      return (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_ANSI_EXTRA.includes(ch)
    })
    .join('')
    .replace(/ {2,}/g, ' ')
}

const pctText = (v: number, d = 1) => `${fmt(v * 100, d)}%`

export function reportNumber(items: ScanItem[], at: number) {
  let h = 2166136261
  for (const ch of items.map((i) => i.id).join('|') + at) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return `PLH-${(h >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
}

export function formatDate(at: number) {
  const d = new Date(at)
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time, full: `${date}, pukul ${time}` }
}

export function reportFileName(at: number) {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, '0')
  return `Laporan-PILAH-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.pdf`
}

async function dataUrlBytes(url: string) {
  const b64 = url.slice(url.indexOf(',') + 1)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function buildReport(
  items: ScanItem[],
  at: number,
  failed: string[] = [],
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const hex = (h: string) =>
    rgb(
      parseInt(h.slice(1, 3), 16) / 255,
      parseInt(h.slice(3, 5), 16) / 255,
      parseInt(h.slice(5, 7), 16) / 255,
    )
  const C = {
    rimba: hex('#0b2b26'),
    rimbaTeks: hex('#123a33'),
    emas: hex('#e6a817'),
    emasTua: hex('#9a6a00'),
    krem: hex('#fff6de'),
    teks: hex('#1c2a26'),
    redup: hex('#66766f'),
    garis: hex('#d9e2de'),
    zebra: hex('#f4f7f5'),
    kolom: hex('#eef3f0'),
    putih: rgb(1, 1, 1),
    mintPudar: hex('#a9d6be'),
    track: hex('#e8edea'),
  }
  const TONE: Record<Verdict, RGB> = {
    organik: hex('#1f7a4d'),
    anorganik: hex('#b47b00'),
    ragu: hex('#5b6a64'),
  }
  const FILL: Record<Verdict, RGB> = {
    organik: hex('#3fbf77'),
    anorganik: hex('#f0b429'),
    ragu: hex('#9aa8a2'),
  }

  const doc: PDFDocument = await PDFDocument.create()
  const no = reportNumber(items, at)
  const when = formatDate(at)
  doc.setTitle('Laporan Hasil Pindaian Sampah - PILAH')
  doc.setSubject(`Hasil klasifikasi ${items.length} foto sampah (organik/anorganik)`)
  doc.setAuthor('PILAH')
  doc.setCreator('PILAH (Pilih Langkah Bijak untuk Sampah)')
  doc.setProducer('PILAH')
  doc.setLanguage('id-ID')
  doc.setCreationDate(new Date(at))

  const F = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    it: await doc.embedFont(StandardFonts.HelveticaOblique),
  }

  const images: (PDFImage | null)[] = await Promise.all(
    items.map(async (it) => {
      try {
        return it.thumb ? await doc.embedJpg(await dataUrlBytes(it.thumb)) : null
      } catch {
        return null
      }
    }),
  )

  const results = items.map((i) => i.result)
  const t = tally(results)
  const isMock = results.some((r) => r.isMock)
  const metrics = results[0]?.meta.metrics

  /* ---------------- alat bantu menggambar ---------------- */
  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H])
  let y = 0 // jarak dari atas halaman

  const text = (
    s: string,
    x: number,
    top: number,
    size: number,
    font: PDFFont = F.reg,
    color: RGB = C.teks,
  ) => page.drawText(pdfSafe(s), { x, y: PAGE_H - top - size * 0.8, size, font, color })
  const width = (s: string, size: number, font: PDFFont = F.reg) =>
    font.widthOfTextAtSize(pdfSafe(s), size)
  const textRight = (
    s: string,
    right: number,
    top: number,
    size: number,
    font: PDFFont = F.reg,
    color: RGB = C.teks,
  ) => text(s, right - width(s, size, font), top, size, font, color)
  const textCenter = (
    s: string,
    cx: number,
    top: number,
    size: number,
    font: PDFFont = F.reg,
    color: RGB = C.teks,
  ) => text(s, cx - width(s, size, font) / 2, top, size, font, color)
  const rect = (
    x: number,
    top: number,
    w: number,
    h: number,
    color?: RGB,
    border?: RGB,
    bw = 0.8,
  ) =>
    page.drawRectangle({
      x,
      y: PAGE_H - top - h,
      width: w,
      height: h,
      color,
      borderColor: border,
      borderWidth: border ? bw : 0,
    })
  const round = (
    x: number,
    top: number,
    w: number,
    h: number,
    r: number,
    color?: RGB,
    border?: RGB,
    bw = 0.8,
  ) => {
    const rr = Math.min(r, w / 2, h / 2)
    const d = `M ${rr} 0 H ${w - rr} Q ${w} 0 ${w} ${rr} V ${h - rr} Q ${w} ${h} ${w - rr} ${h} H ${rr} Q 0 ${h} 0 ${h - rr} V ${rr} Q 0 0 ${rr} 0 Z`
    page.drawSvgPath(d, {
      x,
      y: PAGE_H - top,
      color,
      borderColor: border,
      borderWidth: border ? bw : 0,
    })
  }
  const line = (
    x1: number,
    top1: number,
    x2: number,
    top2: number,
    color: RGB = C.garis,
    thickness = 0.8,
  ) =>
    page.drawLine({
      start: { x: x1, y: PAGE_H - top1 },
      end: { x: x2, y: PAGE_H - top2 },
      thickness,
      color,
    })

  /** Pecah teks menjadi baris sesuai lebar (kata yang terlalu panjang dipotong per huruf). */
  function wrap(s: string, size: number, maxW: number, font: PDFFont = F.reg) {
    const words = pdfSafe(s).split(' ')
    const lines: string[] = []
    let cur = ''
    const push = (w: string) => {
      const next = cur ? `${cur} ${w}` : w
      if (font.widthOfTextAtSize(next, size) <= maxW) {
        cur = next
        return
      }
      if (cur) lines.push(cur)
      if (font.widthOfTextAtSize(w, size) <= maxW) {
        cur = w
        return
      }
      let part = ''
      for (const ch of w) {
        if (font.widthOfTextAtSize(part + ch, size) > maxW) {
          lines.push(part)
          part = ch
        } else part += ch
      }
      cur = part
    }
    words.forEach(push)
    if (cur) lines.push(cur)
    return lines
  }
  /** Tulis paragraf, kembalikan tingginya. */
  function para(
    s: string,
    x: number,
    top: number,
    size: number,
    maxW: number,
    font: PDFFont = F.reg,
    color: RGB = C.teks,
    lead = 1.45,
  ) {
    const ls = wrap(s, size, maxW, font)
    ls.forEach((l, i) => text(l, x, top + i * size * lead, size, font, color))
    return ls.length * size * lead
  }
  function ellipsize(s: string, size: number, maxW: number, font: PDFFont = F.reg) {
    let out = pdfSafe(s)
    if (font.widthOfTextAtSize(out, size) <= maxW) return out
    while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxW) out = out.slice(0, -1)
    return `${out}…`
  }

  function runningHeader() {
    text('Laporan Hasil Pindaian Sampah', M, 34, 8.5, F.it, C.redup)
    textRight(when.date, PAGE_W - M, 34, 8.5, F.it, C.redup)
    line(M, 50, PAGE_W - M, 50)
  }
  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H])
    runningHeader()
    y = 70
  }
  function ensure(h: number) {
    if (y + h > PAGE_H - BOTTOM) newPage()
  }
  /** Judul bagian. `keep`: tinggi isi pertama yang harus ikut di halaman yang sama (hindari judul yatim). */
  function section(label: string, keep = 40) {
    ensure(40 + keep)
    y += 6
    text(label, M, y, 13, F.bold, C.rimbaTeks)
    y += 20
    line(M, y, PAGE_W - M, y)
    page.drawRectangle({ x: M, y: PAGE_H - y - 1.6, width: 52, height: 3, color: C.emas })
    y += 14
  }

  /* ---------------- kepala laporan ---------------- */
  rect(0, 0, PAGE_W, 112, C.rimba)
  page.drawRectangle({ x: 0, y: PAGE_H - 116, width: PAGE_W, height: 4, color: C.emas })
  let lx = M
  for (const ch of 'PILAH') {
    text(ch, lx, 38, 30, F.bold, C.putih)
    lx += width(ch, 30, F.bold) + 7
  }
  text('Pilih Langkah Bijak untuk Sampah', M, 78, 10, F.it, C.emas)
  textRight('LAPORAN HASIL PINDAIAN', PAGE_W - M, 40, 12.5, F.bold, C.putih)
  textRight('Klasifikasi Sampah Organik dan Anorganik', PAGE_W - M, 60, 9.5, F.reg, C.putih)
  textRight('Model CNN (Convolutional Neural Network)', PAGE_W - M, 76, 8.5, F.it, C.mintPudar)
  y = 144

  y += para(
    `Dokumen ini memuat hasil pindaian ${t.total} foto sampah menggunakan PILAH. Setiap foto dikenali oleh model Convolutional Neural Network (CNN) yang dilatih untuk membedakan sampah organik dan anorganik. Simpan dokumen ini sebagai catatan, atau gunakan sebagai panduan saat memilah dan membuang sampah.`,
    M,
    y,
    10,
    CW,
  )
  y += 14

  /* ---------------- A. Informasi pindaian ---------------- */
  section('A.  Informasi Pindaian')
  const info: [string, string][] = [
    ['Tanggal pindaian', when.full],
    [
      'Jumlah foto',
      `${t.total} foto berhasil dikenali${failed.length ? `, ${failed.length} foto gagal diproses` : ''}`,
    ],
    ['Nomor laporan', no],
    ['Metode', 'Convolutional Neural Network (CNN)'],
    [
      'Status model',
      isMock ? 'Mode demo (model hasil pelatihan belum dipasang)' : 'Model hasil pelatihan',
    ],
  ]
  const rowH = 22
  const keyW = 150
  round(M, y, CW, rowH * info.length, 5, undefined, C.garis)
  info.forEach(([k, v], i) => {
    const top = y + i * rowH
    rect(M + 0.6, top + 0.6, keyW, rowH - 1.2, C.kolom)
    if (i > 0) line(M, top, PAGE_W - M, top)
    text(k, M + 12, top + 6.5, 9.5, F.bold, C.rimbaTeks)
    text(v, M + keyW + 14, top + 6.5, 9.5, F.reg, C.teks)
  })
  line(M + keyW + 0.6, y, M + keyW + 0.6, y + rowH * info.length)
  y += rowH * info.length + 16

  /* ---------------- B. Ringkasan hasil ---------------- */
  section('B.  Ringkasan Hasil', 100)
  const boxH = 92
  round(M, y, CW, boxH, 8, C.krem, C.emas, 1.2)
  const split = M + CW * 0.6
  text('SEBAGIAN BESAR SAMPAHMU', M + 24, y + 17, 7.5, F.bold, C.redup)
  const cx = (split + PAGE_W - M) / 2
  if (t.top) {
    const n = t[t.top]
    text(VERDICT_LABEL[t.top], M + 24, y + 32, 28, F.bold, TONE[t.top])
    text(`${n} dari ${t.total} foto`, M + 24, y + 68, 10, F.it, C.redup)
    textCenter(pctText(n / t.total), cx, y + 22, 26, F.bold, C.emasTua)
    textCenter('dari seluruh foto', cx, y + 55, 8.5, F.reg, C.redup)
    textCenter('yang dipindai', cx, y + 67, 8.5, F.reg, C.redup)
  } else {
    text('Seimbang', M + 24, y + 32, 28, F.bold, C.rimbaTeks)
    text('Tidak ada kelompok yang lebih banyak', M + 24, y + 68, 10, F.it, C.redup)
    textCenter(`${t.total} foto`, cx, y + 22, 26, F.bold, C.emasTua)
    textCenter('berhasil dikenali', cx, y + 55, 8.5, F.reg, C.redup)
  }
  line(split, y + 16, split, y + boxH - 16, C.emas, 0.8)
  y += boxH + 16

  /* ---------------- C. Sebaran hasil ---------------- */
  const rows: Verdict[] = ['organik', 'anorganik', 'ragu']
  const chartH = 26 + rows.length * 26 + 22
  section('C.  Sebaran Hasil', chartH + 26)
  round(M, y, CW, chartH, 6, undefined, C.garis)
  const bx = M + 118
  const bw = CW - 118 - 92
  rows.forEach((k, i) => {
    const top = y + 18 + i * 26
    const n = t[k]
    text(VERDICT_LABEL[k], M + 18, top + 1, 10.5, F.bold, C.teks)
    round(bx, top - 1, bw, 13, 6.5, C.track)
    if (n > 0) round(bx, top - 1, Math.max(13, (bw * n) / t.total), 13, 6.5, FILL[k])
    text(
      `${n} foto (${pctText(n / t.total)})`,
      bx + bw + 12,
      top + 1,
      9.5,
      n > 0 ? F.bold : F.reg,
      n > 0 ? C.teks : C.redup,
    )
  })
  const axisTop = y + 18 + rows.length * 26 + 2
  line(bx, axisTop, bx + bw, axisTop, C.redup, 0.6)
  ;[0, 25, 50, 75, 100].forEach((v) => {
    const x = bx + (bw * v) / 100
    line(x, axisTop, x, axisTop + 3, C.redup, 0.6)
    textCenter(`${v}%`, x, axisTop + 6, 7, F.reg, C.redup)
  })
  y += chartH + 7
  textCenter(
    'Gambar 1. Sebaran hasil klasifikasi seluruh foto yang dipindai.',
    PAGE_W / 2,
    y,
    8.5,
    F.it,
    C.teks,
  )
  y += 26

  /* ---------------- D. Rincian per foto ---------------- */
  section('D.  Rincian per Foto', 40 + 16 + 24 + 62)
  y += para(
    'Setiap baris memuat foto yang kamu pindai, hasil klasifikasinya, tingkat keyakinan model, serta catatan dan saran penanganannya.',
    M,
    y,
    9.5,
    CW,
    F.reg,
    C.teks,
  )
  y += 8
  const cols = [
    { key: 'no', title: 'No', w: 28 },
    { key: 'foto', title: 'Foto', w: 62 },
    { key: 'hasil', title: 'Hasil', w: 96 },
    { key: 'yakin', title: 'Keyakinan', w: 74 },
    { key: 'catatan', title: 'Catatan dan saran penanganan', w: CW - 28 - 62 - 96 - 74 },
  ]
  // Posisi x tiap kolom = jumlah lebar kolom sebelumnya.
  let edge = M
  const colX = cols.map((c) => {
    const x = edge
    edge += c.w
    return x
  })
  const tableHead = () => {
    rect(M, y, CW, 24, C.rimba)
    cols.forEach((c, i) => text(c.title, colX[i] + 8, y + 8, 8.5, F.bold, C.putih))
    y += 24
  }
  text('Tabel 1. Hasil klasifikasi setiap foto sampah.', M, y, 9, F.bold, C.teks)
  y += 16
  tableHead()
  items.forEach((it, idx) => {
    const r = it.result
    const v = verdictOf(r)
    const note = wrap(adviceFor(r), 8.5, cols[4].w - 16)
    const allName = wrap(it.name, 7, cols[2].w - 16)
    const nameLines =
      allName.length > 2
        ? [allName[0], ellipsize(allName.slice(1).join(''), 7, cols[2].w - 16)]
        : allName
    const h = Math.max(62, 14 + note.length * 12.5, 30 + nameLines.length * 9 + 8)
    if (y + h > PAGE_H - BOTTOM) {
      newPage()
      tableHead()
    }
    if (idx % 2 === 1) rect(M, y, CW, h, C.zebra)
    line(M, y + h, PAGE_W - M, y + h)
    textCenter(String(idx + 1), colX[0] + cols[0].w / 2, y + 12, 9, F.reg, C.teks)
    const img = images[idx]
    const s = 46
    if (img) page.drawImage(img, { x: colX[1] + 8, y: PAGE_H - (y + 8) - s, width: s, height: s })
    else rect(colX[1] + 8, y + 8, s, s, C.track)
    rect(colX[1] + 8, y + 8, s, s, undefined, C.garis, 0.6)
    text(VERDICT_LABEL[v], colX[2] + 8, y + 11, 10, F.bold, TONE[v])
    if (v === 'ragu') text(`cenderung ${r.kind}`, colX[2] + 8, y + 24, 7.5, F.it, C.redup)
    nameLines.forEach((l, i) =>
      text(l, colX[2] + 8, y + (v === 'ragu' ? 36 : 26) + i * 9, 7, F.reg, C.redup),
    )
    const conf = confidenceOf(r)
    text(pctText(conf), colX[3] + 8, y + 11, 10, F.bold, conf < LOW_CONFIDENCE ? C.emasTua : C.teks)
    round(colX[3] + 8, y + 26, cols[3].w - 20, 4.5, 2.25, C.track)
    round(colX[3] + 8, y + 26, Math.max(4.5, (cols[3].w - 20) * conf), 4.5, 2.25, FILL[v])
    note.forEach((l, i) => text(l, colX[4] + 8, y + 11 + i * 12.5, 8.5, F.reg, C.teks))
    y += h
  })
  y += 22

  /* ---------------- E. Panduan penanganan ---------------- */
  section('E.  Panduan Penanganan', 130)
  const guides: { title: string; color: RGB; lines: string[]; foot?: string }[] = []
  ;(['organik', 'anorganik'] as const).forEach((k) => {
    if (t[k] === 0) return
    guides.push({
      title: `Sampah ${k} (${t[k]} foto)`,
      color: TONE[k],
      lines: HANDLING[k].steps.map((st) => `${st.title}: ${st.text}`),
      foot: `Dapat diolah menjadi: ${HANDLING[k].becomes.join(', ').toLowerCase()}. ${HANDLING[k].avoid}`,
    })
  })
  if (t.ragu > 0) {
    guides.push({
      title: `Foto yang belum yakin (${t.ragu} foto)`,
      color: TONE.ragu,
      lines: [
        'Foto ulang satu benda saja dan dekatkan kamera agar bendanya memenuhi bingkai.',
        'Gunakan latar polos seperti lantai atau meja, dengan cahaya yang cukup.',
        'Bila masih ragu, periksa bahannya: dari makhluk hidup berarti organik; plastik, logam, kaca, atau kertas olahan berarti anorganik.',
      ],
    })
  }
  guides.forEach((g) => {
    const body = g.lines.map((l) => wrap(l, 9.5, CW - 52))
    const foot = g.foot ? wrap(g.foot, 9, CW - 36, F.it) : []
    const h =
      34 +
      body.reduce((a, b) => a + b.length * 14 + 4, 0) +
      (foot.length ? foot.length * 13 + 8 : 0) +
      8
    ensure(h + 12)
    round(M, y, CW, h, 6, C.krem)
    rect(M, y, 3.5, h, C.emas)
    text(g.title, M + 18, y + 14, 10.5, F.bold, g.color)
    let ty = y + 34
    body.forEach((ls, i) => {
      text(`${i + 1}.`, M + 18, ty, 9.5, F.bold, C.teks)
      ls.forEach((l, j) => text(l, M + 34, ty + j * 14, 9.5, F.reg, C.teks))
      ty += ls.length * 14 + 4
    })
    foot.forEach((l, i) => text(l, M + 18, ty + 4 + i * 13, 9, F.it, C.redup))
    y += h + 12
  })
  ensure(60)
  y += 4 + para(OUT_OF_SCOPE, M, y + 4, 8.5, CW, F.it, C.redup)
  y += 18

  /* ---------------- F. Catatan penting ---------------- */
  section('F.  Catatan Penting', 60)
  const notes = [
    'Hasil berasal dari model CNN yang membaca pola warna, bentuk, dan tekstur pada foto, bukan dari pemeriksaan bahan secara langsung.',
    metrics
      ? `Pada data uji (${metrics.testSize} citra), akurasi model adalah ${pctText(metrics.accuracy)}.`
      : null,
    `Keyakinan di bawah ${pctText(LOW_CONFIDENCE, 0)} menandakan hasil sebaiknya dicek ulang. Label "Belum yakin" berarti peluang organik dan anorganik hampir seimbang.`,
    isMock
      ? 'Laporan ini dibuat dalam mode demo: model hasil pelatihan belum dipasang, sehingga hasil klasifikasi di atas masih acak dan tidak boleh dijadikan acuan.'
      : null,
    failed.length
      ? `Foto yang gagal diproses dan tidak termasuk dalam laporan: ${failed.join(', ')}.`
      : null,
    'Foto diproses langsung di perangkatmu dan tidak dikirim ke server mana pun.',
  ].filter((n): n is string => !!n)
  notes.forEach((n) => {
    const ls = wrap(n, 9.5, CW - 16)
    ensure(ls.length * 14 + 6)
    page.drawCircle({ x: M + 4, y: PAGE_H - y - 5, size: 2.2, color: C.emas })
    ls.forEach((l, i) =>
      text(
        l,
        M + 16,
        y + i * 14,
        9.5,
        F.reg,
        isMock && n.includes('mode demo') ? C.emasTua : C.teks,
      ),
    )
    y += ls.length * 14 + 6
  })

  /* ---------------- footer semua halaman ---------------- */
  const pages = doc.getPages()
  pages.forEach((p, i) => {
    page = p
    line(M, PAGE_H - 50, PAGE_W - M, PAGE_H - 50)
    text(`PILAH | Pilih Langkah Bijak untuk Sampah | ${no}`, M, PAGE_H - 42, 8, F.reg, C.redup)
    textRight(`Halaman ${i + 1} dari ${pages.length}`, PAGE_W - M, PAGE_H - 42, 8, F.reg, C.redup)
  })

  return doc.save()
}

/** Buat laporan lalu unduh sebagai berkas PDF. */
export async function downloadReport(items: ScanItem[], at: number, failed: string[] = []) {
  const bytes = await buildReport(items, at, failed)
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reportFileName(at)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
