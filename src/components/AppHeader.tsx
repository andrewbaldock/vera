import { Check, ChevronDown, ChevronLeft, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { REVIEW_DOCUMENT } from '@/lib/documents'
import { UserMenu } from '@/components/UserMenu'
import { HelpButton } from '@/components/UserGuide'
import { Wordmark } from '@/components/Wordmark'
import { TruncatedTitle } from '@/components/TruncatedTitle'
import { PRODUCT_NAME } from '@/lib/brand'
import { Link } from 'react-router'
import type { Review } from '@/types/review'

/**
 * The one header, in both shapes. The compact shape keeps a back chevron, a
 * truncated title, the version control and an overflow.
 *
 * What moves is the upload date, and only below `sm`: it rides the version
 * button, because it describes the version rather than the document, and when
 * the title needs that room it steps back to the `⋯` menu. Nothing is dropped.
 * A compact layout that lost a fact the full one shows would be a different
 * design rather than a smaller one.
 *
 * The version itself never moves — it is a control, not reference data, and a
 * control you have to open a menu to find is one you will not use.
 */

interface DocumentFact {
  label: string
  value: string
  /** Set when the value is a moment, so it renders as a real `<time>`. */
  iso?: string
}

/**
 * Date *and* time, because versions of the same document arrive on the same day
 * and a bare date makes two of them look like one event. It is also the fact a
 * reviewer is asked about months later — which upload was being looked at — so
 * it carries the machine-readable timestamp rather than only the rendering.
 */
function uploadedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * What the ⋯ menu carries below `lg`. No version here: it has its own control
 * beside the title at every width, and a detail list that repeats a control
 * sitting six inches away is noise. This used to build the version and filter
 * it back out by matching the label string, which quietly turned a rename into
 * a behavior change.
 */
function facts(review: Review): DocumentFact[] {
  return [{ label: 'Uploaded', value: uploadedAt(review.uploaded_at), iso: review.uploaded_at }]
}

interface AppHeaderProps {
  review: Review
  /** The submit button, in the full shape only. Compact carries it below. */
  actions?: React.ReactNode
  version: number
  onVersionChange: (version: number) => void
}

export function AppHeader({ review, actions, version, onVersionChange }: AppHeaderProps) {
  const documentFacts = facts(review)

  return (
    <header
      className={[
        'flex shrink-0 items-center gap-1 border-b bg-card lg:gap-4',
        'pt-[env(safe-area-inset-top)]',
        // An iPhone in landscape is 844x390, still the compact layout, and
        // reports ~59px of inset on the sensor-housing side. Without these the
        // back link sits under the notch.
        'pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]',
      ].join(' ')}
    >
      {/*
        A real href, never "#". Middle-click, copy-link and a screen reader all
        understand a URL, and understand a fragment that goes nowhere as a
        promise the app doesn't keep.
      */}
      {/* Compact has no room for both the wordmark and a back affordance, and
          the back affordance is the one you need on a screen you are working
          inside. The wordmark is one tap away on the documents list. */}
      {/* The wordmark goes home, because every product's does and a mark that
          does nothing when clicked reads as a broken link rather than a
          decision. Same destination as the back link beside it: this app has
          one place to go back to. */}
      <Link
        to="/documents"
        aria-label={`${PRODUCT_NAME} home`}
        className="hidden rounded-md focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none lg:flex"
      >
        <Wordmark />
      </Link>
      <span className="hidden h-5 w-px shrink-0 bg-border lg:block" aria-hidden />

      <Link
        to="/documents"
        // `min-w-11` as well as `min-h-11`: below `sm` the word is `sr-only` and
        // only the chevron is left, which is 24px wide — a tall target you still
        // have to hit edge-on.
        className="flex min-h-11 min-w-11 shrink-0 items-center gap-0.5 rounded-md pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="max-sm:sr-only">Documents</span>
      </Link>

      {/* The one truncated name with nowhere else to read it. The queue's rows
          truncate too, but each row is a link and tapping it opens the document,
          which puts the full name here — and a popover trigger inside an anchor
          is a control nested in a control. */}
      <div className="min-w-0">
        <TruncatedTitle
          as="h1"
          text={review.name.replace(/\.pdf$/i, '')}
          className="py-3 text-sm font-semibold lg:text-base"
        />
      </div>

      {/* The version is a control, not a fact: it changes what you are looking
          at, so it sits in the title bar rather than behind the overflow with
          the reference data. Same control in both shapes. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="min-h-11 shrink-0 gap-1.5 px-2 text-xs font-medium tabular-nums"
          >
            v{version}
            {/* The upload date belongs to the version, so it rides the control
                that changes it rather than floating at the far end of the bar
                where it read as a fact about the document. Dropped below `sm`,
                where the title needs the room; the ⋯ menu still carries it. */}
            <time
              dateTime={review.uploaded_at}
              className="hidden text-[11px] font-normal text-muted-foreground sm:inline"
            >
              {uploadedAt(review.uploaded_at)}
            </time>
            <ChevronDown className="size-3.5" aria-hidden />
            <span className="sr-only">Change version</span>
          </Button>
        </DropdownMenuTrigger>
        {/* Wide enough for a date carrying a time, plus the tick on the current
            version. At `min-w-44` the timestamp clipped mid-word. */}
        <DropdownMenuContent align="start" className="min-w-72">
          <DropdownMenuLabel>Version</DropdownMenuLabel>
          {REVIEW_DOCUMENT.versions.map((entry) => (
            <DropdownMenuItem
              key={entry.version}
              onSelect={() => onVersionChange(entry.version)}
              className="gap-4"
            >
              <span className="font-medium tabular-nums">v{entry.version}</span>
              {/* The time is what tells two same-day uploads apart, which is
                  the only reason this list needs a date at all. */}
              <time
                dateTime={entry.uploadedAt}
                className="flex-1 whitespace-nowrap text-muted-foreground"
              >
                {uploadedAt(entry.uploadedAt)}
              </time>
              {entry.version === version && <Check className="size-4" aria-hidden />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Everything after this is pushed to the far end. */}
      <span className="flex-1" aria-hidden />

      {/* No inline facts in the full shape: the version and its upload date are
          both on the version control now, and repeating them at the far end of
          the bar said the same thing twice in two places. The ⋯ menu below `lg`
          still carries them, because the date is dropped from the button there. */}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-11 shrink-0 lg:hidden">
            <MoreHorizontal aria-hidden />
            <span className="sr-only">Document details</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50 min-w-56">
          <DropdownMenuLabel>Document details</DropdownMenuLabel>
          {/* Label above value, not beside it. Side by side, "Uploaded" plus a
              date carrying a time needs more width than a 390px phone leaves a
              menu, and the value is what gets clipped — the half worth reading.
              Stacked, it fits whatever the width turns out to be. */}
          {documentFacts.map((fact) => (
            <DropdownMenuItem
              key={fact.label}
              disabled
              className="flex-col items-start gap-0.5 py-1.5"
            >
              <span className="text-xs text-muted-foreground">{fact.label}</span>
              <span className="font-medium">
                {fact.iso ? <time dateTime={fact.iso}>{fact.value}</time> : fact.value}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <HelpButton />
      <UserMenu />

      {actions && <div className="hidden shrink-0 lg:block">{actions}</div>}
    </header>
  )
}
