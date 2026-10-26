#!/usr/bin/env node
// Generates the Invento icon set into frontend/public from one definition of the mark. No dependencies.
//   npm run icons
//
// The mark: an isometric box (the universal symbol for stock) of three shaded faces on a rounded square.
// It is drawn on a 32 x 32 grid so the SVG, the logo component and these PNGs always agree.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(OUT, { recursive: true })

const ACCENT = [14, 124, 102] // #0e7c66
const ACCENT_DARK = [52, 211, 168] // #34d3a8
const INK_ON_DARK = [4, 32, 26] // #04201a
const WHITE = [255, 255, 255]
// Hexagon of the box: top, upper-right, lower-right, bottom, lower-left, upper-left, plus the centre.
const H = { t: [16, 6], ur: [24.66, 11], lr: [24.66, 21], b: [16, 26], ll: [7.34, 21], ul: [7.34, 11], c: [16, 16] }
const GAP = 0.9 // each face shrinks 10% towards its own centre, leaving a thin seam between faces
const shrink = (pts) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return pts.map(([x, y]) => [+(cx + (x - cx) * GAP).toFixed(2), +(cy + (y - cy) * GAP).toFixed(2)])
}
const FACES = [
  { pts: shrink([H.t, H.ur, H.c, H.ul]), a: 1 }, // top
  { pts: shrink([H.ul, H.c, H.b, H.ll]), a: 0.72 }, // left
  { pts: shrink([H.c, H.ur, H.lr, H.b]), a: 0.5 }, // right
]

const inConvex = (x, y, pts) => {
  let sign = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
    if (cross !== 0) {
      if (sign === 0) sign = Math.sign(cross)
      else if (Math.sign(cross) !== sign) return false
    }
  }
  return true
}

const inRoundRect = (px, py, x, y, w, h, r) => {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

/**
 * Rasterise the mark at `size` px with 4x4 supersampling.
 *  shape: 'rounded' (transparent corners), 'square' (full bleed), as iOS and maskable icons want.
 *  inset: scale the box about the centre (maskable icons keep important art inside a safe circle).
 */
function render(size, { shape = 'rounded', inset = 1, bg = ACCENT, fg = WHITE } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const N = 4
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sj = 0; sj < N; sj++) {
        for (let si = 0; si < N; si++) {
          const x = ((i + (si + 0.5) / N) / size) * 32
          const y = ((j + (sj + 0.5) / N) / size) * 32
          const inBg = shape === 'square' || inRoundRect(x, y, 0, 0, 32, 32, 9)
          if (!inBg) continue
          let [cr, cg, cb] = bg
          const ux = 16 + (x - 16) / inset
          const uy = 16 + (y - 16) / inset
          for (const face of FACES) {
            if (inConvex(ux, uy, face.pts)) {
              cr = cr * (1 - face.a) + fg[0] * face.a
              cg = cg * (1 - face.a) + fg[1] * face.a
              cb = cb * (1 - face.a) + fg[2] * face.a
            }
          }
          r += cr; g += cg; b += cb; a += 1
        }
      }
      const o = (j * size + i) * 4
      if (a) {
        px[o] = Math.round(r / a)
        px[o + 1] = Math.round(g / a)
        px[o + 2] = Math.round(b / a)
        px[o + 3] = Math.round((a / (N * N)) * 255)
      }
    }
  }
  return px
}

// ---- PNG and ICO encoders -----------------------------------------------------------------------------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, rgba) {
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
/** An .ico holding PNG images (supported by every browser since IE9). */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

const write = (name, data) => {
  writeFileSync(path.join(OUT, name), data)
  console.log(`  ${name.padEnd(24)} ${(data.length / 1024).toFixed(1)} kB`)
}

console.log('Writing icons to frontend/public:')
const rounded = (n) => png(n, render(n))
write('favicon-16.png', rounded(16))
write('favicon-32.png', rounded(32))
write('favicon.ico', ico([16, 32, 48].map((size) => ({ size, data: rounded(size) }))))
write('apple-touch-icon.png', png(180, render(180, { shape: 'square', inset: 1.25 }))) // iOS rounds the corners itself
write('icon-192.png', rounded(192))
write('icon-512.png', rounded(512))
write('icon-maskable-512.png', png(512, render(512, { shape: 'square', inset: 0.78 }))) // art stays inside the safe zone

// The SVG favicon follows the browser's light/dark setting; PNGs above are the fallback.
const faces = FACES.map((f) => `<polygon points="${f.pts.map((p) => p.join(' ')).join(' ')}" class="b"${f.a < 1 ? ` opacity="${f.a}"` : ''}/>`).join('')
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
write(
  'favicon.svg',
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Invento"><style>.a{fill:${hex(ACCENT)}}.b{fill:#fff}@media (prefers-color-scheme:dark){.a{fill:${hex(ACCENT_DARK)}}.b{fill:${hex(INK_ON_DARK)}}}</style><rect width="32" height="32" rx="9" class="a"/>${faces}</svg>\n`,
  ),
)

write(
  'site.webmanifest',
  Buffer.from(
    JSON.stringify(
      {
        name: 'Invento',
        short_name: 'Invento',
        description: 'Live stock counts across all your warehouses, with reorder alerts before the shelf is empty.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f4f2',
        theme_color: hex(ACCENT),
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    ) + '\n',
  ),
)
