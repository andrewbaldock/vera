import { Document, Page } from 'react-pdf'
import '@/lib/pdf'

/**
 * Page one, rendered small. Its own module so it can be lazily imported: pdf.js
 * is ~420 KB and the documents list is the first screen anyone loads, so it must
 * not be in that bundle. The row reserves the space and this fills it when it
 * arrives.
 *
 * No text or annotation layer. Nothing here is selectable, searchable or
 * clickable — it is a picture of a page, and both layers cost DOM per glyph.
 */
export default function CoverPage({ url, width }: { url: string; width: number }) {
  return (
    <Document file={url} loading={null} error={null} noData={null}>
      <Page
        pageNumber={1}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={null}
        error={null}
      />
    </Document>
  )
}
