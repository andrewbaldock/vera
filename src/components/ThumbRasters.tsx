import { Document, Page } from 'react-pdf'
import '@/lib/pdf'

/**
 * Real page images for the thumb strip, kept in their own module so that
 * react-pdf and pdf.js stay out of the entry chunk. The strip is reached from
 * `ReviewPage`, which is imported statically, so a direct import here would put
 * ~420 KB of rendering engine on the queue screen as well.
 *
 * Lazily loaded, and on the review page it costs nothing: the viewer has
 * already pulled the same chunk, so these arrive with it.
 *
 * The original build decided against thumbnails, and was right about the
 * picture: at 44px a page image is a grey smudge and you cannot tell page 22
 * from page 23. It was wrong about what the picture is for. A cover sheet, a
 * table and a photo page are three different shapes even as a smudge, and that
 * is enough to navigate by, so these render at every width — the page number
 * and the severity marks carry the reading either way.
 */

export function RasterDocument({
  url,
  fallback,
  children,
}: {
  url: string
  /**
   * The strip with no page images in it. `<Document>` renders this *instead of*
   * its children until the file has parsed, so without it the whole strip
   * blinks out while pdf.js works.
   *
   * It must contain no `<Page>`: this slot renders outside the document
   * context, and a `<Page>` there throws react-pdf's "no document was
   * specified" invariant, which takes the app to the error boundary.
   */
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Document
      file={url}
      // Silent in every state, which is right: this is a second view of a
      // document the main viewer already reports on, so a "loading…" or an
      // error beside it is noise about something already said.
      loading={fallback}
      error={fallback}
      noData={fallback}
      className="contents"
    >
      {children}
    </Document>
  )
}

export function RasterPage({ pageNumber, width }: { pageNumber: number; width: number }) {
  return (
    <Page
      pageNumber={pageNumber}
      width={width}
      renderTextLayer={false}
      renderAnnotationLayer={false}
      loading=""
      error=""
      noData=""
      // Under the page number and the severity marks, which are the reason the
      // strip exists. The image is the backdrop they sit on.
      className="pointer-events-none absolute inset-0"
    />
  )
}
