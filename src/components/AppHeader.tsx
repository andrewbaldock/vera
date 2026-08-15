import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserMenu } from '@/components/UserMenu'
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
}

export function AppHeader({ review, actions }: AppHeaderProps) {
  const documentFacts = facts(review)

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
      <a
        href="/documents"
        className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-md pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="max-sm:sr-only">Documents</span>
      </a>

      <h1 className="min-w-0 flex-1 truncate py-3 text-sm font-semibold lg:text-base">
        {review.name.replace(/\.pdf$/i, '')}
      </h1>

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
        <DropdownMenuContent align="end" className="z-50">
          <DropdownMenuLabel>Document details</DropdownMenuLabel>
          {documentFacts.map((fact) => (
            <DropdownMenuItem key={fact.label} disabled className="flex justify-between gap-6">
              <span className="text-muted-foreground">{fact.label}</span>
              <span className="font-medium">{fact.value}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserMenu user={review.user} />

      {actions && <div className="hidden shrink-0 lg:block">{actions}</div>}
    </header>
  )
}
