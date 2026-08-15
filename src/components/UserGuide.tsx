import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PRODUCT_NAME } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CircleHelp } from 'lucide-react'

/**
 * How to use it, from inside it. A compliance tool is used all day by people who
 * never read documentation, so the help lives where the work happens rather than
 * in a wiki nobody opens. It earns its place mostly for the keyboard grid, which
 * is faster than a mouse here and undiscoverable unless something says so.
 *
 * It is also where the app states what it does not do, so a user who knows why
 * is not a user filing a bug.
 */

/**
 * The guide's own control, so help is one press from the work rather than
 * behind the avatar with profile and log out — things you touch once a month,
 * beside the one thing a first-time user needs in the first minute. Icon-only:
 * a question mark in a circle needs no label at any width, and the header is
 * the most contested space in the app.
 */
export function HelpButton({ className }: { className?: string }) {
  return (
    <UserGuide
      trigger={
        <Button variant="ghost" size="icon" className={cn('size-11 shrink-0', className)}>
          <CircleHelp className="size-5" aria-hidden />
          <span className="sr-only">Using {PRODUCT_NAME}</span>
        </Button>
      }
    />
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded border border-b-2 bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium">
      {children}
    </kbd>
  )
}

function Row({ keys, children }: { keys: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="flex shrink-0 items-center gap-1">{keys}</span>
      <span className="text-muted-foreground">{children}</span>
    </div>
  )
}

export function UserGuide({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Using {PRODUCT_NAME}</DialogTitle>
          <DialogDescription>
            {PRODUCT_NAME} shows what an automated check found in a document and decides whether
            it can be submitted. It doesn’t fix anything — corrections are made by uploading a
            new version.
          </DialogDescription>
        </DialogHeader>

        <section className="text-sm">
          <h3 className="font-semibold">Working through a review</h3>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Critical and major must be fixed.</span>{' '}
              Minor issues can be accepted as-is — that’s your judgment to make, and you’ll be
              asked to confirm it.
            </li>
            <li>
              <span className="font-medium text-foreground">Selecting an issue</span> moves the
              document to its page. Landing on a page highlights the issues found there.
            </li>
            <li>
              <span className="font-medium text-foreground">The Done boxes are yours.</span> They
              record what you’ve handled and never affect whether you can submit — a document is
              only clear when a new version comes back clean.
            </li>
            <li>
              <span className="font-medium text-foreground">Notes are yours as well.</span> Add one
              to any issue to record what you found out — who you called, which document you
              checked, why a minor one is fine to accept. Select <span className="font-medium text-foreground">Note</span>{' '}
              on a row, or reach it with the keyboard.
            </li>
            <li>
              <span className="font-medium text-foreground">The severity counts are filters.</span>{' '}
              Select one to hide those issues. The count stays put, so the summary keeps telling
              you the truth about the document.
            </li>
          </ul>
        </section>

        <section className="text-sm">
          <h3 className="font-semibold">Keyboard</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The issue list behaves like a spreadsheet. It’s one stop away by{' '}
            <Key>Tab</Key>, and faster than the mouse once you’re in it.
          </p>
          <div className="mt-2 divide-y">
            <Row keys={<><Key>↑</Key><Key>↓</Key></>}>Move between issues</Row>
            <Row keys={<Key>Enter</Key>}>Open that issue’s page, without losing your place</Row>
            <Row keys={<><Key>→</Key><span className="text-muted-foreground">/</span><Key>Tab</Key></>}>
              Across the row — the note, then the Done box
            </Row>
            <Row keys={<><Key>←</Key><span className="text-muted-foreground">/</span><Key>⇧</Key><Key>Tab</Key></>}>
              Back toward the issue
            </Row>
            <Row keys={<Key>Space</Key>}>Tick an issue done</Row>
            <Row keys={<Key>Esc</Key>}>
              Leave a note without saving it — <Key>Enter</Key> saves, <Key>⇧</Key>
              <Key>Enter</Key> is a new line
            </Row>
            <Row keys={<><Key>⌘</Key><Key>F</Key></>}>
              Search the whole document — every page is loaded, so your browser’s own find
              reaches all of it
            </Row>
          </div>
        </section>

        <section className="text-sm">
          <h3 className="font-semibold">Worth knowing</h3>
          <ul className="mt-2 list-disc space-y-1.5 ps-5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Submitting can’t be undone.</span>{' '}
              There’s no reopening a review — corrections happen by uploading a new version,
              which comes back as a fresh review.
            </li>
            <li>
              <span className="font-medium text-foreground">The list can follow the document.</span>{' '}
              Scroll Tracking, in the list’s ⋮ menu, scrolls the issues along with the page you’re
              on. Turn it off and the list stays exactly where you put it — the issues on the page
              are still highlighted either way.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Notes carry across versions. Done ticks don’t.
              </span>{' '}
              A note is something you learned about the property — “confirmed the measurement by
              phone” is still true when a new version arrives, so it stays with the issue. A tick
              means “I’ve handled this”, and a new version is a new set of findings, so a tick
              carried over would tell you something was handled when it wasn’t. Ticks start clean
              each version; notes are waiting for you.
            </li>
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  )
}
