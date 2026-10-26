import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../..')
const pub = (name: string) => path.join(root, 'public', name.replace(/^\//, ''))
const html = readFileSync(path.join(root, 'index.html'), 'utf8')
const manifest = JSON.parse(readFileSync(pub('site.webmanifest'), 'utf8')) as {
  name: string
  short_name: string
  icons: { src: string; sizes: string; type: string }[]
}

/** Width and height from a PNG's header. */
function pngSize(file: string) {
  const buf = readFileSync(file)
  expect(buf.subarray(0, 8).toString('hex'), `${file} is a PNG`).toBe('89504e470d0a1a0a')
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

describe('page metadata', () => {
  it('names the product Invento everywhere a person or a search engine would see it', () => {
    expect(html).toMatch(/<title>Invento \|/)
    expect(html).toMatch(/name="application-name" content="Invento"/)
    expect(html).toMatch(/property="og:site_name" content="Invento"/)
    expect(manifest.name).toBe('Invento')
    expect(manifest.short_name).toBe('Invento')
    expect(html).not.toMatch(/Inventory Management/)
  })

  it('describes the page and sets colours for both themes', () => {
    expect(html).toMatch(/name="description" content="[^"]{40,}"/)
    expect(html).toMatch(/theme-color" content="#f3f4f2" media="\(prefers-color-scheme: light\)"/)
    expect(html).toMatch(/theme-color" content="#0a0c0b" media="\(prefers-color-scheme: dark\)"/)
  })

  it('has a fallback for people with JavaScript off', () => {
    expect(html).toMatch(/<noscript>/)
  })
})

describe('icons', () => {
  const localLinks = [...html.matchAll(/<link[^>]+href="(\/[^"]+)"/g)].map((m) => m[1] as string)

  it('links the full icon set', () => {
    for (const href of ['/favicon.svg', '/favicon.ico', '/favicon-32.png', '/favicon-16.png', '/apple-touch-icon.png', '/site.webmanifest']) {
      expect(localLinks).toContain(href)
    }
  })

  it('has a file behind every link in index.html', () => {
    for (const href of localLinks) expect(existsSync(pub(href)), `${href} exists in public/`).toBe(true)
  })

  it('has the right pixel size for each PNG', () => {
    expect(pngSize(pub('favicon-16.png'))).toEqual({ w: 16, h: 16 })
    expect(pngSize(pub('favicon-32.png'))).toEqual({ w: 32, h: 32 })
    expect(pngSize(pub('apple-touch-icon.png'))).toEqual({ w: 180, h: 180 })
    expect(pngSize(pub('icon-192.png'))).toEqual({ w: 192, h: 192 })
    expect(pngSize(pub('icon-512.png'))).toEqual({ w: 512, h: 512 })
    expect(pngSize(pub('icon-maskable-512.png'))).toEqual({ w: 512, h: 512 })
  })

  it('lists real, correctly sized icons in the web app manifest, including a maskable one', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(pub(icon.src)), `${icon.src} exists`).toBe(true)
      const [w] = icon.sizes.split('x').map(Number)
      expect(pngSize(pub(icon.src)).w).toBe(w)
    }
    expect(JSON.stringify(manifest.icons)).toContain('maskable')
  })

  it('ships a multi-size .ico and an SVG that follows the browser theme', () => {
    const ico = readFileSync(pub('favicon.ico'))
    expect(ico.readUInt16LE(2)).toBe(1) // an icon file
    expect(ico.readUInt16LE(4)).toBe(3) // 16, 32 and 48 px
    const svg = readFileSync(pub('favicon.svg'), 'utf8')
    expect(svg).toMatch(/aria-label="Invento"/)
    expect(svg).toMatch(/prefers-color-scheme:dark/)
  })

  it('no longer ships the default Vite template artwork', () => {
    expect(existsSync(pub('icons.svg'))).toBe(false)
    expect(readFileSync(pub('favicon.svg'), 'utf8')).not.toContain('#863bff')
  })

  it('blocks search engines from the signed-in app only', () => {
    const robots = readFileSync(pub('robots.txt'), 'utf8')
    expect(robots).toMatch(/Allow: \//)
    for (const route of ['/dashboard', '/users', '/settings']) expect(robots).toContain(`Disallow: ${route}`)
  })
})
