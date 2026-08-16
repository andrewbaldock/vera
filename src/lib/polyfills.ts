/**
 * `URL.parse`, for browsers that predate it.
 *
 * `pdfjs-dist` calls `URL.parse(url, base)` with no fallback. It is a genuinely
 * recent addition — Chrome 126, Firefox 126, **Safari 18.4 (March 2025)** — so
 * on any iPad or Mac a year older than that it is `undefined`, pdf.js throws a
 * TypeError while resolving the worker, and React unmounts the tree. The symptom
 * is the whole app flashing once and going blank, with the stack pointing into a
 * vendor chunk rather than at anything we wrote.
 *
 * That is worth a polyfill rather than a browser-support note: this is a
 * document viewer for mortgage reviewers, who use the hardware their employer
 * issued them, and "upgrade your iPad" is not an answer a lender accepts.
 *
 * The behavior is the spec's: `URL.parse` returns `null` where `new URL` would
 * throw, which is the entire reason the method was added.
 */
export function installUrlParse() {
  if (typeof URL.parse === 'function') return

  URL.parse = function parse(url: string | URL, base?: string | URL): URL | null {
    try {
      return new URL(url as string, base as string)
    } catch {
      return null
    }
  }
}
