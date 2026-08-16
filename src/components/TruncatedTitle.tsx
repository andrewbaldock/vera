import { useCallback, useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * A truncated name that will show you the rest of itself.
 *
 * Not the `title` attribute. That tooltip is the browser's: it never appears on
 * touch at all, waits about a second on a pointer, cannot be styled, and reads
 * in a system font that has nothing to do with the page. On a screen whose whole
 * job is identifying *which* loan file you are looking at, "hover and wait, on
 * some devices" is not an answer.
 *
 * A popover rather than a tooltip, because a tooltip is hover-only by design —
 * the WAI pattern says so, and Radix implements it that way deliberately. This
 * has to work under a thumb, so it opens on tap as well as on hover.
 *
 * It only becomes a control when the text is actually cut off. A name that fits
 * has nothing to reveal, and offering a button that opens a popover showing the
 * same string is worse than offering nothing: it is a promise of information
 * that isn't there.
 */
export function TruncatedTitle({
  text,
  className,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  as?: 'span' | 'h1'
}) {
  const ref = useRef<HTMLElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [open, setOpen] = useState(false)

  const measure = useCallback(() => {
    const element = ref.current
    if (!element) return
    // The only reliable test: what the text would need versus what it has.
    setTruncated(element.scrollWidth > element.clientWidth + 1)
  }, [])

  useEffect(() => {
    measure()
    // The panel is resizable and the window rotates, so this is not a
    // measure-once. A name that fits in landscape may not in portrait.
    const observer = new ResizeObserver(measure)
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [measure, text])

  const content = (
    <Tag ref={ref as never} className={cn('block truncate', className)}>
      {text}
    </Tag>
  )

  if (!truncated) return content

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          // Hover opens it on a pointer without waiting; tap opens it on touch,
          // which is what Radix's trigger already handles.
          onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
          aria-label={`Show the full name: ${text}`}
          // `w-full`, and it is load-bearing rather than cosmetic. A
          // shrink-to-fit button lets the text inside it stop being constrained,
          // so the measurement that decided to render this button then reports
          // "not truncated" and removes it — a loop that flickers and settles on
          // the wrong answer. Filling the container keeps the constraint
          // identical whether the control is there or not.
          className="block w-full min-w-0 cursor-help text-start focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-sm font-medium">{text}</PopoverContent>
    </Popover>
  )
}
