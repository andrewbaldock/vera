# Production readiness

**Purpose:** what shipping this for real would require.
**Audience:** an engineering manager, or a security reviewer.
**Read time:** 6 minutes.
**Last reviewed:** 2026-08-16

---

## Part 1 — In scope, and already seamed for it

**`useReview` swaps a fixture for an endpoint, and the validator does not change.** The URL becomes
`/api/reviews/:id?version=n`, `withLocalPdf()` goes with the fixture that made it necessary, and
`pdf_url` becomes a short-lived signed URL. **`isReview()` stays exactly as it is:** a boundary
that already refuses `issues: null` and an unrecognized severity does not care whether the JSON
came from `public/` or from a service. The real error, today going to `console.error`, goes to the
error reporter instead.

**`Issue.page` gains coordinates, and the markers move onto the page.** Location is the API's to
return: the model that found "page 18 shows $308,120" knew where it was looking, and
[the decision log](09-decisions.md) rejected every client-side way of guessing. An optional `bbox` is
additive in `isReview()` and in the viewer: wrappers are already reserved at known dimensions, so a
normalized box is an overlay above `z-index: 3`. **The status bar stays**, because a quarter of
these findings are absences and an absence has nothing to point at.

**`CANVAS_WINDOW` becomes geometry.** A fixed count of 3 pages either side, sized for the tallest
panel the split view can produce; a landscape exhibit or a very tall window breaks that, and it
should be measured against the scroll container. At hundreds of pages the wrappers need virtualizing
too, the one change that costs acceptance criterion #1, since find only reaches text in the DOM.
The answer is then a search UI over `pdf.js`'s extracted text, which [the decision log](09-decisions.md)
declined *because the platform already had one*; that reasoning inverts the moment virtualization
takes the platform's away.

**The thumb strip's ceiling is raised, not removed.** Its scale is
`max(fit, floor)`, where the fit is
`min((columnHeight − gaps) / totalPageHeight, columnWidth / widestPage)` and the floor is a
minimum segment height in rem. Below the floor the strip scrolls rather than shrinking further,
and it scrolls *itself* — driven by the focused page, with a scrub near an edge advancing it —
because a `touch-action: none` scrub surface has no gesture left for the user to scroll with.

What is still true at scale: the strip mounts one element per page, so a two-hundred-page
document is two hundred DOM nodes and, once page images are on, two hundred lazily-rendered
canvases behind a windowing constant that does not yet exist for the strip the way it does for
the viewer. That is the work a real page count would need.

**Submit becomes a mutation, with two paths this build does not have.** Today it writes to
`localStorage` and plays a fixed sequence: `SUBMITTING_MS` 1500 plus `LANDED_MS` 1200, 2.7 seconds
regardless of what happened. In production the phases follow the request:

- **Failure.** The one irreversible action in the app currently cannot fail. It needs an error
  state that leaves the review submittable.
- **Conflict.** A reviewer can sit on v2 while v3 is uploaded underneath them. A `409` means *this
  review is no longer current*, and submitting a stale version is exactly what the rule prevents.
  The client sends the version it is looking at; the response accepts it or prompts a reload.

An idempotency key belongs on the request too: a retried round trip must not submit twice.

**`lib/session` becomes auth's answer, and the distinction already exists.** It is one constant, but
it deliberately does not read the user from the review: **the review carries the user it is assigned
to, the session carries the person at the keyboard.** Treating that coincidence as structure is how
an app ends up unable to show a supervisor someone else's review. **`lib/documents` becomes a
fetch** the same way, with assignment, filtering and pagination belonging to the Documents Page
ticket.

**`user_issue_meta` becomes a real API, and the model is already right.** Done is keyed by
`(user, document, version, issue)`, a note by `(user, document, issue)`: "I have handled this"
expires when a new version arrives, "the appraiser confirmed the measurement by phone" does not.
Those are two `localStorage` namespaces with exactly those shapes, so the swap is a change of
transport, not of model. It also needs the open question in `lib/notes.ts` answered: **do issue ids
survive a re-parse?** If not, notes need a content hash.

**The accessibility limitation is real and not ours to fix client-side.** pdf.js paints a canvas
and overlays positioned text spans; headings, tables and reading order do not survive. Find works
because the text is in the DOM, which is not the same as the document being navigable by a screen
reader. The fix belongs to whatever *produces* the PDF: a tagged PDF, or an accessible HTML
rendering served alongside.

---

## Part 2 — Out of scope for a demo, mandatory for production

None of this exists in this build. Each line matters here because **a mortgage collateral file is
nonpublic personal information about a named borrower at a known address**, and the reviewer's
decisions on it are the lender's record of due diligence.

### Identity and access

| | Why it matters here |
|---|---|
| **Authentication** | There is no anonymous view of a loan file. |
| **Authorization** | A review is scoped to a lender and an assignment, enforced server-side, never in the client. |
| **RBAC** | Reviewer, supervisor, auditor and admin want different rights over one file, and only some may submit. |
| **Session management and timeout** | Shared workstations; an idle tab showing a borrower's appraisal is a disclosure. |

### Data protection

| | Why it matters here |
|---|---|
| **Encryption in transit** | TLS and HSTS. A PDF fetched over anything else is a loan file on the wire. |
| **Encryption at rest** | Documents and findings both: the findings quote the document verbatim. |
| **PII / NPI under GLBA** | Appraisals carry borrower name, address and valuation, so the Safeguards Rule reaches this client too. |
| **Data retention and deletion** | Loan files have statutory retention, so "delete my data" cannot delete what the lender must keep. |
| **Legal review of retention** | That schedule is counsel's determination, not an engineering default. |
| **Virus scanning and content validation on upload** | Users upload arbitrary PDFs, and pdf.js parses them in every reviewer's browser. |

### The audit trail

**A product argument rather than a security one.** The reviewer's notes and decisions *are* the
compliance record. When a loan is challenged months later the question is who saw a finding, what
they concluded and when, and that has to be a record rather than a memory. So: **immutable,
append-only logging of who viewed which document, who marked what done, what a note said, and who
submitted with which minor findings accepted as-is.** It is also why the reviewer's layer is a
separate API from the review: different owners, different write permissions, different audit
requirements.

### Web application security

| | Why it matters here |
|---|---|
| **CSP** | The cheapest defense around a renderer that parses untrusted files; `pdfjs-dist` needs its worker allowed explicitly. |
| **XSS** | Issue titles and descriptions are model-generated text about an uploaded document. |
| **CSRF** | Submit is a one-way, irreversible state change on a loan file. |
| **Rate limiting** | Document endpoints hand out signed URLs to NPI; enumeration is the attack, not volume. |

### Operations

| | Why it matters here |
|---|---|
| **Monitoring, alerting, error reporting** | A viewer that silently fails to render is indistinguishable from a clean document. |
| **Disaster recovery and backups** | Stated as RPO and RTO: a lost audit trail is a compliance incident, not just lost work. |
| **SOC 2 and regulatory obligations** | Lenders will not onboard a vendor without it, and it constrains logging and access review from day one. |
| **Load testing** | Volume is bursty and deadline-driven; the number that matters is concurrent PDF renders. |
| **CDN and caching** | `vercel.json` already fingerprints assets as immutable and holds `index.html` at `no-cache`; documents are the harder half — signed, short-lived, never cached at a shared edge. |

### Delivery and quality

**CI already exists**, so this row belongs in Part 1 and is here only because the rest of the
section is about what is missing. Every push to `main` and every pull request runs lint, types, the production build, both suites across Chromium and WebKit; `main` deploys only if all of it passed,
then re-reads `/version.json` to confirm the live build is that commit rather than trusting a
200. The build names itself in the app and at that endpoint.

What is still missing:

| | Why it matters here |
|---|---|
| **Performance budgets and RUM** | The memory ceiling behind `CANVAS_WINDOW` is *reasoned*, not proven: the iOS Simulator runs on the Mac's RAM. |
| **Feature flags** | Bounding boxes and virtualization both change the viewer, the riskiest component. |
| **Dependency and supply-chain scanning** | The renderer parsing every loan file is a third-party dependency: pinning, an SBOM, CVE alerting. |
| **Browser support policy** | `scrollend`, `dvh` and `env(safe-area-inset-*)` are all load-bearing and all have a support floor — and this is no longer hypothetical. `pdfjs-dist` calls `URL.parse`, which is Safari 18.4 (March 2025), so on an iPad running 17.4 it is `undefined`, pdf.js throws while resolving its worker, and the whole app went blank. A dependency's floor is the product's floor, and nothing in the build declared one. It is polyfilled and tested by removing the API, but the general answer is a stated support matrix and CI that runs against it. |
| **i18n and localization readiness** | Strings are inline today, and dates, currency and page numbers all localize differently. |

---

---

## What the demo does that production must not

- **`localStorage` is the data store.** Submissions, done marks and notes live on the device
  (`lib/submission.ts`, `lib/progress.ts`, `lib/notes.ts`), every write wrapped in a `try` because
  Safari in private browsing throws. That is all the durability there is.
- **Submit takes a fixed 2.7 seconds, cannot fail, and has no conflict path.** It is theater,
  labeled as theater in the code; production drives the phases off the request.
- **The upload dialog is inert**, because VERA does not upload: that screen is a teammate's
  ticket, and the dialog exists so a blocked state shows where the loop goes.
- **`clear()` un-submits a review.** There is no reopened status in the enum and no un-submit in
  the flow; it exists so an evaluator can walk the review through to submission more than once.
