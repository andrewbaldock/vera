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
import { Wordmark } from '@/components/Wordmark'
import { Link } from 'react-router'
import type { Review } from '@/types/review'

/**
 * The one header, in both shapes.
 *
 * The compact shape keeps a back chevron, a truncated title and an overflow;
 * version, upload date and reviewer move behind the `⋯` because they are
 * reference data you consult, not things you act on, and they lose the fight
 * for vertical space. At `lg` the same three facts come inline.
 *
 * The point of the `⋯` is that those facts *move* rather than disappear — an
 * inert button would mean the compact layout silently loses three pieces of
 * information the full one has, which is a different design, not a smaller one.
 */

interface DocumentFact {
  label: string
  value: string
}

function facts(review: Review): DocumentFact[] {
  return [
    { label: 'Version', value: `v${review.version}` },
    {
      label: 'Uploaded',
      value: new Date(review.uploaded_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
  ]
}

interface AppHeaderProps {
  review: Review
  /** The submit button, in the full shape only — compact carries it below. */
  actions?: React.ReactNode
  version: number
  onVersionChange: (version: number) => void
}

export function AppHeader({ review, actions, version, onVersionChange }: AppHeaderProps) {
  const documentFacts = facts(review).filter((fact) => fact.label !== 'Version')

  return (
    <header
      className={[
        'flex shrink-0 items-center gap-1 border-b bg-card lg:gap-4',
        'pt-[env(safe-area-inset-top)]',
        // An iPhone in landscape is 844x390 — still the compact layout — and
        // reports ~59px of inset on the sensor-housing side. Without these the
        // back link sits under the notch on a device we actively target.
        'pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]',
      ].join(' ')}
    >
      {/*
        A real href, never "#". Middle-click, copy-link and a screen reader all
        understand a URL; they understand a fragment that goes nowhere as a
        promise the app doesn't keep. The route doesn't exist in this build —
        it belongs to the Documents page in the spec's flow — but the link is
        honest about where it means to go.
      */}
      {/* Compact has no room for both the wordmark and a back affordance, and
          the back affordance is the one you need on a screen you are working
          inside. The wordmark is one tap away on the documents list. */}
      <Wordmark className="hidden lg:flex" />
      <span className="hidden h-5 w-px shrink-0 bg-border lg:block" aria-hidden />

      <Link
        to="/documents"
        className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-md pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="max-sm:sr-only">Documents</span>
      </Link>

      <h1 className="min-w-0 truncate py-3 text-sm font-semibold lg:text-base">
        {review.name.replace(/\.pdf$/i, '')}
      </h1>

      {/* The version is a control, not a fact — it changes what you are looking
          at, so it sits in the title bar rather than behind the overflow with
          the reference data. Same control in both shapes. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="min-h-11 shrink-0 gap-1 px-2 text-xs font-medium tabular-nums"
          >
            v{version}
            <ChevronDown className="size-3.5" aria-hidden />
            <span className="sr-only">Change version</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Version</DropdownMenuLabel>
          {REVIEW_DOCUMENT.versions.map((entry) => (
            <DropdownMenuItem
              key={entry.version}
              onSelect={() => onVersionChange(entry.version)}
              className="gap-4"
            >
              <span className="font-medium tabular-nums">v{entry.version}</span>
              <span className="text-muted-foreground">
                {new Date(entry.uploadedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {entry.version === version && <Check className="size-4" aria-hidden />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Everything after this is pushed to the far end. */}
      <span className="flex-1" aria-hidden />

      {/* Inline in the full shape; behind the ⋯ below it. Same three facts. */}
      <dl className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground lg:flex">
        {documentFacts.map((fact) => (
          <div key={fact.label} className="flex items-center gap-1">
            <dt className="sr-only">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>


      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-11 shrink-0 lg:hidden">
            <MoreHorizontal aria-hidden />
            <span className="sr-only">Document details</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50 min-w-56">
          <DropdownMenuLabel>Document details</DropdownMenuLabel>
          {documentFacts.map((fact) => (
            <DropdownMenuItem key={fact.label} disabled className="flex justify-between gap-6">
              <span className="shrink-0 text-muted-foreground">{fact.label}</span>
              <span className="font-medium whitespace-nowrap">{fact.value}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserMenu />

      {actions && <div className="hidden shrink-0 lg:block">{actions}</div>}
    </header>
  )
}
