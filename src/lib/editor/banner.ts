/**
 * Emblem-banner support: runtime loading of the Noto Nastaliq Urdu webfont
 * via the FontFace API (no index.html / public changes needed) plus the
 * banner palette shared by the compositor.
 *
 * The font is fetched from Google Fonts at runtime, registered document-wide
 * (so canvas text AND DOM inputs both use it), and cached as a singleton
 * promise. If the network is unavailable the banner falls back to serif.
 */

export const BANNER_FONT_FAMILY = '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif'

/** Template palette (from the user's banner template). */
export const BANNER_COLORS = {
  greenDark: '#0e3d24',
  greenMid: '#145a32',
  gold: '#d4af37',
  cream: '#f7f3e8',
} as const

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap'
const FONT_FAMILY_NAME = 'Noto Nastaliq Urdu'

let fontsPromise: Promise<boolean> | null = null

/**
 * Load + register the Nastaliq webfont (idempotent). Resolves true when the
 * font is ready, false when we must fall back to serif. Never rejects.
 */
export function ensureBannerFonts(): Promise<boolean> {
  if (fontsPromise) return fontsPromise
  fontsPromise = (async () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return false
    if (typeof FontFace === 'undefined' || !document.fonts) return false
    // already registered (e.g. after HMR)? note: fonts.check() is useless here —
    // it returns true for families with no registered faces at all.
    let already = false
    for (const f of document.fonts) {
      if (f.family.replace(/"/g, '') === FONT_FAMILY_NAME && f.status === 'loaded') {
        already = true
        break
      }
    }
    if (already) return true
    try {
      const res = await fetch(FONT_CSS_URL)
      if (!res.ok) return false
      const css = await res.text()
      const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? []
      let registered = 0
      await Promise.all(
        blocks.map(async (block) => {
          const m = /url\((https:[^)]+?)\)\s*format\(['"](woff2|truetype|woff)['"]\)/.exec(block)
          const src = m?.[1]
          if (!src) return
          const weight = /font-weight:\s*(\d+)/.exec(block)?.[1] ?? '400'
          const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim()
          try {
            const face = new FontFace(FONT_FAMILY_NAME, `url(${src}) format('${m![2]}')`, {
              weight,
              ...(range ? { unicodeRange: range } : {}),
            })
            await face.load()
            document.fonts.add(face)
            registered++
          } catch {
            /* single subset failed — others may still work */
          }
        }),
      )
      if (!registered) return false
      try {
        await document.fonts.ready
      } catch {
        /* noop */
      }
      return true
    } catch {
      return false // offline / blocked — serif fallback
    }
  })()
  return fontsPromise
}
