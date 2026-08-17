# Attribution worksheet

**This is scratch, not a document.** Mark it up, fold the answers into the ledger
in [04-process.md](04-process.md), then delete this file.

Every commit, in order. Mark each one:

- **A** — Andrew drove it: the idea, the call, or the diagnosis
- **C** — Claude Code drove it: proposed and built with Andrew approving
- **A/C** — Andrew asked, Claude worked out how
- **C→A** — Claude proposed, Andrew corrected or reversed it
- **—** — housekeeping, not worth a line in the ledger

The ledger already covers 08-14 and 08-16. **The gap is 08-15**, rows marked `?`.

---

## 08-14 — the first build

| | Commit | Who |
|---|---|---|
| | Scaffold Vite + React + TS with design docs and mock assets | A — stack choice, scope |
| | UI: Add Tailwind 4 and shadcn/ui (Radix base) | A proposed shadcn |
| | Add data layer and react-pdf demo harness | A — checked react-pdf himself before committing |
| | docs: mobile & desktop views | A — wireframes |
| | Build the review shell, and fix everything three reviewers found | A/C |
| | Build the document viewer, closing the seek/measure seam | C — continuous scroll, reading line |
| | Use American English throughout | A |
| | docs: architecture.md | C |
| | Add submit gating, routing, a documents list, and VERA branding | A — branding, `canSubmit` shape |
| | All green — 28 unit, 174 browser, tsc, lint, build | — |

## 08-15 — the gap

| | Commit | Who |
|---|---|---|
| ? | Add the done worklist, and close the loop from submit back to the queue | *(you said: Andrew)* |
| ? | Add per-issue notes and spreadsheet-style keyboard navigation | *(you said: Andrew — the notes. The ARIA grid?)* |
| ? | Add scroll tracking, fix seeks dropped before the document mounts | A |
| ? | Give the guide its own Help button, open findings on the page bar | A |
| ? | Fix a skip link the tracking feature broke, and what two reviews found | Odin |
| ? | Make the docs describe the build, and the touch-target test earn its name | **C** |
| ? | Make the demo reset visible without a reload | **A foudn this bug** |
| ? | Reset the address bar along with the demo data | **A foudn this bug** |
| ? | Fix the blank screen on Safari below 18.4, and stop hiding names | *(you said: debugged by Andrew, fixed by Claude)* |
| ? | Wwrite down the Safari fix | **c** |
| ? | Point the live link at vera.andrewbaldock.com, version the build, set the wordmark in Goldman | *(you said: branding = Andrew. Deployment = Claude)* |
| ? | Show the app on real devices, and true up the docs | A — real hardware is his |
| ? | include development-approach writeup | **A & C ** |
| ? | Restore the pointer cursor Tailwind v4 takes away | **A foudn this bug** |
| ? | version bump / Editorial review | — |

**Two I flagged in the ledger as unresolved and would not guess:**

- **Scroll tracking becoming a user setting** rather than a fixed behavior. The decision-log row argues *"both behaviors are defensible and neither is obviously right, which is the signal that it belongs to the user."* Andrew suggested thi sfeature  as a way to help that tension.  let the user choose


## 08-16 — v1.1.0

Already in the ledger. For checking:

| | Commit | Who |
|---|---|---|
| | Improving docs before a 100% manual rewrite (×2) | A — the docs restructure was his call |
| | Apply the diminished-alternative rule to source comments | A — his diagnosis, Claude applied it |
| | Fix secondary-text contrast, strip the reviewer note off the reset | C→A — Andrew reported dark mode; Claude found light was worse |
| | Add a floating page counter to the document viewer | A/C |
| | Let the thumb strip close, and give it real page images | A — collapse, pull tab, and *render at any size* |
| | Ship v1.1.0: version stamping, CI, licence, release notes | C, with Andrew choosing deploy-on-green |
| | Rewrite the README | A — his draft; Claude filled gaps and fixed the tables |

---

## What the ledger is for

Not credit. A walk-through where someone asks *"why is it like this?"* and the
answer has to be yours. Anything marked **C** that you cannot defend out loud is
worth either learning properly or cutting.

The reverse matters too. **C→A** rows are the strongest evidence in the file,
because they are the ones where you overruled a plausible answer and were right.
