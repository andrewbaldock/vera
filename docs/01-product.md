# Product

**Purpose:** what this screen is, who it's for, and where its edges are.
**Audience:** anyone, including non-engineers.
**Read time:** 5 minutes.
**Last reviewed:** 2026-08-16

---

## The problem

Fictional Jane Cooper needs legal documents to be accurate and well groomed. Manual
review of a large PDF is tedious, time-consuming and error-prone.

**VERA — Uploaded New Doc Issue Review Tool.**

Today, AI can scan a document and produce an issue report. VERA is the UI on top of
that: it lets Jane review what the automation found, quickly and in context. She
tracks which issues to fix before uploading the next version of the document, with the
goal of arriving at a clean version — no critical or major errors — that can be
greenlit and submitted.

---

## Who uses it

Jane is a reviewer, not an author. She did not write the document and she is not going
to rewrite it here — she decides whether it is good enough to go, and she is
accountable for that decision afterwards.

She works through several documents a day, at a desk and on an iPad, and she already
knows the domain cold. What she does not know is *this* document: where its problems
are, how many of them matter, and whether she has dealt with them all. A finding that
says "page 18" is useful to her; one that says "there are 25 issues" is not.

Two pressures shape everything on the screen. She is fast, so anything that costs a
click she does 25 times is expensive. And she is accountable, so a screen that lets her
submit something defective is worse than a screen that slows her down.

## What this screen does

- **Shows the document and the findings side by side**, so a finding can be read
  against the page it came from without leaving the screen.
- **Says what is blocking submission**, in a verdict that stays put rather than
  scrolling away — and says so just as clearly when nothing is blocking.
- **Takes her to the evidence.** Click a finding, the document scrolls to that page,
  and anything else on that page is surfaced with it.
- **Maps the whole document at a glance.** The page strip down the edge is navigation
  and heatmap at once: it shows where the problems cluster before she has read any.
- **Lets her keep her place.** A done tick and a note per issue, so a long review
  survives being interrupted.
- **Refuses to submit a defective document**, and offers the thing that *is* available
  instead — uploading a new version.
- **Confirms the judgment call.** Submitting with minor issues outstanding asks her to
  say so once, because it is a one-way door.
- **Works on the device she has**, in the right shape for each, and is fully operable
  from a keyboard.

## Where it sits in the flow

The brief's flow has four screens. This build is the third one.

```
Upload Page ──upload──> Processing Page ──completes, version+1──> [ REVIEW PAGE ] ──submit──> Submitted Page
     ^                                                                   │
     └───────────────────── "fix issues and re-upload" ──────────────────┘
```

Everything upstream and downstream belongs to teammates. The loop back to Upload is the
product's real cycle, and it exits this page.

---

## Scope

### In

- Mock API → Review Page receives & uses the mock JSON response.
- Render the PDF on screen, with page-level markup indicating where issues are.
- Sidebar issues list, grouped/marked by the three severities.
- Whole-document text search via native `CMD+F` / `Ctrl+F`.
- The page knows when only minor issues remain, and lets the user sign off on the review.
- The mock JSON carries a working URL to the local PDF so the document actually loads.
- Header: document title, version number selector, uploaded-at. Help menu that opens the
  keystroke guide. Small user avatar/menu (the API gives us a user, so show one).
- A back link to the demo document list.
- **Works properly on iPhone and iPad**, in the right shape for each — not a squeezed
  desktop layout. Tested on real devices.

### Out

Not our call. The assignment draws these lines itself.

- **The user fixing anything in the browser.** Fixes happen in the user's own system, by
  regenerating the document. The spec is explicit.
- **Any real backend.** Mock response only.
- **Actually submitting.** The submit endpoint doesn't exist yet; the brief says to skip
  the call. UI only.
- **Creating a new version / the upload flow.** That's the Upload Page — a teammate's
  ticket in the spec's own flow diagram.

---

## Acceptance criteria

| # | Criterion | Satisfied by |
|---|---|---|
| 1 | See the document, search text across the entire PDF with CMD+F | A text layer for **every** page, all in the DOM at once, so the platform's own find can reach any of them. Canvases render only near the viewport — see [03-architecture.md](03-architecture.md) for why that separation matters. |
| 2 | Cannot submit until all critical + major are resolved; minor may be ignored | `canSubmit(review)` derived from the review data alone. It takes a whole `Review`, so a filtered list, a hidden severity or a ticked checkbox cannot reach it: the separation is a type error, not a rule to remember. Blocked, the page doesn't offer submit at all; it offers *Upload new version*, which is the action that exists. |
| 3 | The page clearly communicates what's blocking submission | A verdict above the list, outside the scroller so it cannot scroll away, tied to the specific blockers rather than a generic disabled button, and it reads the opposite just as well once nothing is blocking. |

---

## The data

Read from the real `review_mock.json` — 34 pages, 25 issues (4 critical, 8 major, 13
minor), status `on_review`, version `2`.

- **The JSON is metadata + defect list. It contains no document text at all.** Pages
  carry only `page_num`, `height`, `width`. That rules out reconstructing the document
  from data — the PDF must be rendered, not rebuilt.
- **Page dimensions (612×792, US Letter in points)** tell the browser how to size and
  lay out each page.
- **An issue carries `title`, `description`, `severity`, `page`.** `page` is an integer.
  There are **no coordinates, no bounding boxes, no text offsets.** From the data alone
  we can point at a page; we cannot point at a line.
- **`version: 2`** means the user has already been through this loop once. The API
  returns only the current version, so we have no history to show.
- **No `resolved` field on an issue** — by design. Resolution happens outside the app,
  proven by a new version, never asserted in the UI.
- **With this mock, submit is BLOCKED** (12 blockers).

### Demoing the submittable state

The supplied mock only ever shows one half of the product. Submission is blocked in it,
so nothing in it can demonstrate the screen that says *you can submit this* — which is
half of acceptance criterion 3.

So there is a second fixture: `review_mock_clean.json`, the same report with the
critical and major findings resolved. It is presented as **version 3 of the same
document**, not as a second document and not as a debug flag.

That framing is doing real work. Two documents with byte-identical pages would be a
fiction a reviewer notices. A version is the truth — it is exactly what the product's
own loop produces when Jane fixes the findings and uploads again, and the loop happens
outside this app. The version lives in the URL (`?v=3`), so each state is a link that
survives a paste and a reload.

v3 still carries its minor findings, deliberately. A clean document that submits without
comment would make submission a formality; leaving the minors in keeps it a judgment
call, which is what the brief says it is.
