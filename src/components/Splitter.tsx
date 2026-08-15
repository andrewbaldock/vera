import { useRef, type RefObject } from 'react'
import { cn } from '@/lib/utils'

/**
 * The splitter between the issues panel and the document. Radix has no splitter
 * primitive, so this one is written to the WAI-ARIA window-splitter pattern
 * rather than left as a mouse-only affordance.
 *
 * Pointer Events, not mouse events: the full layout appears on a 1024px iPad in
 * portrait, so this is dragged with a thumb as often as with a cursor.
 * `touch-action: none` stops the drag from scrolling the page underneath, and
 * pointer capture keeps the drag alive when the finger outruns the 6px line. The
 * visible line stays a hairline while the grab zone is padded past 44px with a
 * pseudo-element, so the target is touch-legal without the splitter looking like
 * a piece of furniture.
 */

const STEP = 2

interface SplitterProps {
  /** Width of the left panel, as a percentage of the split container. */
  value: number
  onChange: (percent: number) => void
  containerRef: RefObject<HTMLDivElement | null>
  min?: number
  max?: number
  controls: string
  className?: string
}

export function Splitter({
  value,
  onChange,
  containerRef,
  min = 20,
  max = 50,
  controls,
  className,
}: SplitterProps) {
  function clamp(percent: number) {
    return Math.min(max, Math.max(min, percent))
  }

  /**
   * Offset between where the pointer went down and where the line is. Without
   * it, pressing anywhere in the grab zone snaps the splitter to the pointer, so
   * a tap 20px inside the document panel jumps the layout. Once react-pdf
   * mounts, that strip runs down the edge of every rendered page.
   */
  const grabOffset = useRef(0)

  function dragTo(clientX: number) {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0) return
    onChange(clamp(((clientX - grabOffset.current - bounds.left) / bounds.width) * 100))
  }

  function release(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: value - STEP,
      ArrowRight: value + STEP,
      Home: min,
      End: max,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    onChange(clamp(next))
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize issues panel"
      aria-controls={controls}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={(event) => {
        const line = event.currentTarget.getBoundingClientRect()
        grabOffset.current = event.clientX - (line.left + line.width / 2)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        dragTo(event.clientX)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative z-10 w-1.5 shrink-0 cursor-col-resize touch-none bg-border transition-colors',
        'hover:bg-focus-edge/60 focus-visible:bg-focus-edge focus-visible:outline-none',
        // The visible line is 6px; the target is not. The wide zone is for
        // coarse pointers only: under a mouse it would sit 20px over each panel
        // and steal clicks from the issue rows and from the left edge of every
        // page.
        "after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-['']",
        'pointer-coarse:after:-left-5 pointer-coarse:after:-right-5',
        className,
      )}
    />
  )
}
