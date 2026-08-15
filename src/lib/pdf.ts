import { pdfjs } from 'react-pdf'

/**
 * pdf.js worker configuration, done once.
 *
 * The worker's version must match the `pdfjs-dist` that `react-pdf` loads, or
 * it throws at runtime — which is why `pdfjs-dist` is a pinned direct
 * dependency rather than something we reach for through the hoisted tree.
 * Resolving it through `import.meta.url` lets Vite bundle the file it actually
 * installed, instead of trusting a CDN copy to agree.
 *
 * Importing this module is the whole API. It lives on its own so the viewer and
 * the `?demo` harness configure the same worker exactly once, instead of each
 * doing it at their own module scope and quietly disagreeing.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * No `options` are passed to `<Document>`.
 *
 * The usual additions are `cMapUrl` and `standardFontDataUrl` pointed at a CDN,
 * which quietly makes rendering depend on a third-party host at runtime — not
 * something to hand a lender's compliance tool. The supplied document needs
 * neither. If a document ever does, they get bundled from the pinned
 * `pdfjs-dist` rather than fetched, and this is where that goes.
 *
 * Worth knowing if it is added later: react-pdf compares `options` by
 * reference, so an inline object literal re-triggers the entire document load
 * on every render.
 */
export {}
