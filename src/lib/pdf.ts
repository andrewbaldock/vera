import { pdfjs } from 'react-pdf'

/**
 * pdf.js worker configuration, done once.
 *
 * The worker's version must match the `pdfjs-dist` that `react-pdf` loads or it
 * throws at runtime, which is why `pdfjs-dist` is a pinned direct dependency
 * rather than reached for through the hoisted tree. Resolving it through
 * `import.meta.url` lets Vite bundle the installed file instead of trusting a
 * CDN copy to agree.
 *
 * Importing this module is the whole API. It lives on its own so the viewer and
 * the `/demo` harness configure the same worker once, rather than each at its
 * own module scope.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * No `options` are passed to `<Document>`. The usual additions are `cMapUrl` and
 * `standardFontDataUrl` pointed at a CDN, which makes rendering depend on a
 * third-party host at runtime, not something to hand a lender's compliance tool.
 * The supplied document needs neither; if one ever does, they get bundled from
 * the pinned `pdfjs-dist` rather than fetched, and this is where that goes.
 *
 * react-pdf compares `options` by reference, so an inline object literal
 * re-triggers the entire document load on every render.
 */
export {}
