import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AppHeader } from '@/components/AppHeader'
import { DocumentPanel } from '@/components/DocumentPanel'
import type { SeekTarget } from '@/components/DocumentViewer'
import { IssuesPanel } from '@/components/IssuesPanel'
import { ReviewVerdict } from '@/components/ReviewVerdict'
import { Splitter } from '@/components/Splitter'
import { ThumbStrip } from '@/components/ThumbStrip'
import { useReview } from '@/hooks/useReview'
import { useDoneIssues } from '@/hooks/useDoneIssues'
import { useIssueNotes } from '@/hooks/useIssueNotes'
import { useScrollTracking } from '@/hooks/useScrollTracking'
import { PanelLeftOpen } from 'lucide-react'
import {
  ISSUES_MAX,
  ISSUES_MIN,
  STRIP_MAX,
  STRIP_MIN,
  usePanelSizes,
} from '@/hooks/usePanelSizes'
import { DEFAULT_VERSION, REVIEW_DOCUMENT, versionOf } from '@/lib/documents'
import {
  canSubmit,
  groupByPage,
  numberByPage,
  sortIssues,
  visibleIssues,
  type SortMode,
} from '@/lib/review'
import { cn } from '@/lib/utils'
import type { Review, Severity } from '@/types/review'
import type { Submission } from '@/lib/submission'
import { ReviewAction } from '@/components/ReviewAction'

/**
 * The shell. Two layouts, one component tree: which shape you get is decided in
 * CSS at `lg` (1024px), with no media-query hook, no branch and no second
 * subtree to drift out of sync. One tree also lets the Playwright suite prove
 * both shapes by resizing a single page.
 *
 * The boundary is 1024 rather than 768 because the full shape carries two
 * controls the compact shape does without, and both need room. It is a rule
 * about the window, not the device, which is what makes an iPad in Split View
 * come out right without a special case. The full shape is not "desktop": a 13"
 * iPad is 1024px wide in portrait, so it is a touch layout that sometimes has a
 * cursor.
 */

type Tab = 'issues' | 'document'

const TAB_LABEL: Record<Tab, string> = {
  issues: 'Issues',
  document: 'Document',
}

const DOCUMENT_PANEL_ID = 'document-panel'
const ISSUES_PANEL_ID = 'issues-panel'
const STRIP_ID = 'thumb-strip'

export function ReviewPage() {
  /**
   * The version lives in the URL, not in component state. It is a different
   * thing to look at, so it deserves an address someone can paste, reload and
   * bookmark. Component state would make the back button lie about where you
   * are.
   */
  const [params, setParams] = useSearchParams()
  const version = Number(params.get('v')) || DEFAULT_VERSION
  const selected = versionOf(REVIEW_DOCUMENT, version)

  const setVersion = useCallback(
    (next: number) => setParams({ v: String(next) }, { replace: false }),
    [setParams],
  )

  const navigate = useNavigate()
  const { state, submit } = useReview(selected.url)

  /**
   * Submitting returns you to the queue. The review page's own submitted state
   * still matters, since a review can arrive already submitted with no click
   * involved. Having just submitted one, though, the useful next screen is the
   * list you came from, where the row landing as finished is the confirmation.
   */
  const submitAndReturn = useCallback(() => {
    submit()
    navigate(`/documents?submitted=${REVIEW_DOCUMENT.id}`)
  }, [submit, navigate])

  if (state.status === 'loading') {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading review…</p>
      </Shell>
    )
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium">This review didn’t load.</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
      </Shell>
    )
  }

  return (
    <ReviewShell
      review={state.review}
      submission={state.submission}
      onSubmit={submitAndReturn}
      version={selected.version}
      onVersionChange={setVersion}
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh items-center justify-center bg-background p-6">{children}</div>
}

interface ReviewShellProps {
  review: Review
  submission: Submission | null
  onSubmit: () => void
  version: number
  onVersionChange: (version: number) => void
}

function ReviewShell({
  review,
  submission,
  onSubmit,
  version,
  onVersionChange,
}: ReviewShellProps) {
  const [tab, setTab] = useState<Tab>('issues')
  const { panels, setIssuesWidth, setStripWidth, openStrip } = usePanelSizes()
  /**
   * One value, three views of it: the thumb strip marks it, the issues on it
   * tint in the list, and the status bar names them. One piece of state rather
   * than three that can disagree.
   */
  const [focusedPage, setFocusedPage] = useState(1)
  /**
   * A request to move the document, not a statement about where it is. The nonce
   * is what makes "take me to page 13" work when you are already on page 13:
   * without it the effect never re-runs and the click does nothing.
   */
  const [seek, setSeek] = useState<SeekTarget>({ page: 1, nonce: 0, behavior: 'instant' })
  const splitRef = useRef<HTMLDivElement>(null)

  const [sort, setSort] = useState<SortMode>('page')
  /**
   * View state, not review state. It changes what the list shows and never what
   * the verdict says: the counts stay derived from the whole review, so the same
   * lozenges can both report and filter without lying.
   */
  const [hiddenSeverities, setHiddenSeverities] = useState<ReadonlySet<Severity>>(new Set())
  const [hideDone, setHideDone] = useState(false)
  const [scrollTracking, setScrollTracking] = useScrollTracking()
  const { done, toggle: toggleDone, clearAll: clearDone } = useDoneIssues(review)
  const { notes, setNote, clearAll: clearNotes } = useIssueNotes(review)

  const toggleSeverity = useCallback((severity: Severity) => {
    setHiddenSeverities((previous) => {
      const next = new Set(previous)
      if (next.has(severity)) next.delete(severity)
      else next.add(severity)
      return next
    })
  }, [])

  const issues = useMemo(() => numberByPage(review.issues), [review.issues])
  // Grouping is off the *unfiltered* list: the status bar and the thumb strip
  // describe the document, not the current view of the list.
  const issuesByPage = useMemo(() => groupByPage(issues), [issues])
  const listed = useMemo(
    () => sortIssues(visibleIssues(issues, hiddenSeverities, { done, hideDone }), sort, done),
    [issues, hiddenSeverities, sort, done, hideDone],
  )
  const submittable = canSubmit(review)
  const submitted = review.status === 'submitted'

  /**
   * The seam. Seeking *scrolls*; it never sets the focused page. Scroll position
   * is the single writer of `focusedPage`, via the viewer's reading line, so the
   * highlight always means "this is what you are looking at" rather than "this
   * is what you asked for". The two differ for the whole length of a smooth
   * scroll.
   *
   * Every control that means "take me to this page" comes through here, the
   * thumb strip included.
   */
  const seekToPage = useCallback((page: number, behavior: ScrollBehavior = 'smooth') => {
    setSeek((previous) => ({ page, nonce: previous.nonce + 1, behavior }))
  }, [])

  /** Dragging the strip should track the thumb, not animate to every page it passes. */
  const scrubToPage = useCallback(
    (page: number) => seekToPage(page, 'instant'),
    [seekToPage],
  )

  /** Tapping an issue is a seek *plus* a navigation, but only where tabs exist. */
  const openIssue = useCallback(
    (page: number) => {
      setTab('document')
      seekToPage(page)
    },
    [seekToPage],
  )

  const primaryAction = submitted ? null : (
    <ReviewAction review={review} submittable={submittable} onConfirm={onSubmit} />
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* First thing in the tab order, so a keyboard user does not walk
          twenty-five issues to reach the document they're being asked about. */}
      <a
        href={`#${DOCUMENT_PANEL_ID}`}
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to document
      </a>

      <AppHeader
        review={review}
        actions={primaryAction}
        version={version}
        onVersionChange={onVersionChange}
      />

      {/* Compact only. Two views is not a tab bar's job, and the bottom edge is
          already carrying the verdict and the submit button. */}
      <div role="tablist" aria-label="View" className="flex shrink-0 gap-1 border-b bg-card p-1.5 lg:hidden">
        {(Object.keys(TAB_LABEL) as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={value === 'issues' ? ISSUES_PANEL_ID : DOCUMENT_PANEL_ID}
            onClick={() => setTab(value)}
            className={cn(
              'min-h-11 flex-1 rounded-md text-sm font-medium transition-colors',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              tab === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent active:bg-accent',
            )}
          >
            {TAB_LABEL[value]}
          </button>
        ))}
      </div>

      <div
        ref={splitRef}
        style={{ '--issues-width': `${panels.issues}%` } as CSSProperties}
        // `relative` so a closed strip's pull tab can sit against the right
        // edge without taking any width from the document.
        className="relative flex min-h-0 flex-1 overflow-hidden"
      >
        <section
          id={ISSUES_PANEL_ID}
          aria-label="Issues found"
          className={cn(
            'flex min-h-0 w-full flex-col bg-card lg:w-[var(--issues-width)]',
            tab !== 'issues' && 'max-lg:hidden',
          )}
        >
          {/* Outside the scroller. Inside it, the answer to acceptance criterion
              #3 scrolls off the top of the panel, and in the full shape nothing
              else on screen carries the blocking count. */}
          <ReviewVerdict
            review={review}
            submission={submission}
            hidden={hiddenSeverities}
            onToggleSeverity={toggleSeverity}
            doneCount={done.size}
            hideDone={hideDone}
            onToggleDone={() => setHideDone((previous) => !previous)}
            className="shrink-0"
          />
          {/* The panel owns its own scroller, one level down: the sort toolbar
              has to sit above it so the scrollbar does not run past the header. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <IssuesPanel
              issues={listed}
              totalCount={issues.length}
              focusedPage={focusedPage}
              onSeek={openIssue}
              sort={sort}
              onSortChange={setSort}
              done={done}
              onToggleDone={toggleDone}
              onClearDone={clearDone}
              notes={notes}
              onNoteChange={setNote}
              onClearNotes={clearNotes}
              scrollTracking={scrollTracking}
              onScrollTrackingChange={setScrollTracking}
            />
          </div>
        </section>

        <Splitter
          className="hidden lg:block"
          label="Resize issues panel"
          value={panels.issues}
          onChange={setIssuesWidth}
          containerRef={splitRef}
          min={ISSUES_MIN}
          max={ISSUES_MAX}
          controls={ISSUES_PANEL_ID}
        />

        <main
          id={DOCUMENT_PANEL_ID}
          tabIndex={-1}
          className={cn(
            // min-w-0 all the way down, or a zoomed page pushes this panel
            // wider instead of scrolling inside it: a flex item defaults to
            // min-width:auto and will happily grow past its container.
            'flex min-h-0 w-full min-w-0 flex-col lg:w-auto lg:flex-1',
            tab !== 'document' && 'max-lg:hidden',
          )}
        >
          <DocumentPanel
            focusedPage={focusedPage}
            pages={review.document.pages}
            pdfUrl={review.document.pdf_url}
            issuesOnPage={issuesByPage.get(focusedPage) ?? []}
            seek={seek}
            onPageInView={setFocusedPage}
          />
        </main>

        {panels.stripOpen ? (
          <>
            {/*
              Measured from the container's right edge, so the value is the
              strip's own width and the document takes whatever is left. The
              step is negative because this panel is on the other side of its
              line: pressing right still moves the line right, which here means
              a narrower strip.

              Its minimum is 0 rather than the strip's own, so the strip can be
              dragged shut. The snap back up to a legal width happens in
              `setStripWidth`, which is also what decides that shut is shut.
            */}
            <Splitter
              className="hidden lg:block"
              label="Resize page strip"
              value={panels.strip ?? STRIP_MIN}
              onChange={setStripWidth}
              measure={(clientX, bounds) => bounds.right - clientX}
              step={-8}
              min={0}
              max={STRIP_MAX}
              containerRef={splitRef}
              controls={STRIP_ID}
            />

            <ThumbStrip
              id={STRIP_ID}
              className="hidden lg:flex"
              pages={review.document.pages}
              issuesByPage={issuesByPage}
              focusedPage={focusedPage}
              onSeek={scrubToPage}
              width={panels.strip}
              pdfUrl={review.document.pdf_url}
            />
          </>
        ) : (
          /*
            Closed, the strip costs no width at all and leaves a pull tab over
            the document's edge. Without a way back the only route to a control
            you dragged shut is clearing site data, and a panel that can be lost
            is a panel nobody dares to close.
          */
          <button
            type="button"
            onClick={openStrip}
            className={cn(
              'absolute top-1/2 right-0 z-20 hidden -translate-y-1/2 lg:flex',
              'h-12 w-4 items-center justify-center rounded-l-md border border-r-0 bg-card text-muted-foreground shadow-md transition-colors',
              'hover:w-5 hover:bg-accent hover:text-foreground active:bg-accent',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              // The tab stays small; the target does not. 16px of tab plus
              // 28px of zone is the 44px minimum the rest of this layout is
              // held to. Opened out to the left only, over the document, and
              // only for a finger — under a cursor it would sit there and take
              // the page's clicks.
              "after:absolute after:inset-y-0 after:right-0 after:content-['']",
              'pointer-coarse:after:-left-7 pointer-coarse:after:-top-3 pointer-coarse:after:-bottom-3',
            )}
          >
            <PanelLeftOpen className="size-3" aria-hidden />
            <span className="sr-only">Show page strip</span>
          </button>
        )}
      </div>

      {/* Compact only. The blocking count sits directly against the button it is
          blocking, and the bottom of the screen is both thumb reach and where
          iOS puts primary actions. */}
      <div className="flex shrink-0 items-center gap-3 border-t bg-card px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] lg:hidden">
        <ReviewVerdict review={review} submission={submission} compact />
        {primaryAction}
      </div>
    </div>
  )
}
