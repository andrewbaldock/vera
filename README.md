# UNDIRT — Uploaded New Doc Issue Review Tool

HomeVision frontend take-home: the **Review Page**.

A user uploads a document; the backend's AI processes it and reports issues that must be
resolved before submission. This page shows those issues, explains what is blocking
submission, and opens the gate when nothing critical or major remains.

**UNDIRT does no uploading. It is the gate.**

---

## Read this first

**[`docs/DESIGN.md`](docs/DESIGN.md)** is the record of every decision in this project — what
was chosen, what was rejected, and why. It was written *before* the code and is updated *as*
the code. If something here isn't explained there, that's a gap.

- [`docs/DESIGN.md`](docs/DESIGN.md) — scope, flow, decisions, decision log
- [`docs/wireframes/`](docs/wireframes/) — UX sketches, drawn before implementation
- [`docs/assignment.pdf`](docs/assignment.pdf) — the original brief

## Running it

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev      # http://localhost:1337
```

```sh
bun run build    # typecheck + production build
bun run lint
```

## Data

The API does not exist yet, so the app fetches a static mock over HTTP — a real async
boundary rather than a build-time import, so the loading and error states are honest.

- `public/review_mock.json` — the supplied mock response
- `public/docs/example_document.pdf` — the document it describes, served at
  `/docs/example_document.pdf`. The mock's `pdf_url` points at `example.com`; the app uses
  the local path instead.

## Stack

**Vite + React + TypeScript + Tailwind + shadcn/ui** (Radix underneath).

No SSR need for a post-upload page behind auth, so Vite rather than Next.js.

The component library is a deliberate call rather than a default. This page has about ten
controls, and browser-native accessibility covers most of them — but it is one screen of
four in the brief's own flow diagram, inside a product that will already have components to
reach for. Deciding "no library" from a ten-control sample is how component soup starts.

shadcn specifically, because it copies source into the repo rather than shipping a runtime
dependency: Radix supplies the hard behaviour, the skin stays ours to edit, tokens are CSS
variables, and the registry keeps it re-syncable rather than a fork.

The splitter is authored here, since Radix has no such primitive — a new addition to the
system rather than a gap in it. Full reasoning and the alternatives rejected are in
[`docs/DESIGN.md`](docs/DESIGN.md).

## Accessibility

Treated as a strength of this build, not a pass at the end — it's a compliance tool in a
regulated industry, used all day. Notable: submit is `aria-disabled` rather than `disabled`
so keyboard users actually reach it and hear why it's unavailable; severity is never colour
alone; the splitter implements the full WAI-ARIA window-splitter pattern.

The known limitation is stated plainly in [`docs/DESIGN.md`](docs/DESIGN.md#6c-accessibility):
a rendered PDF is not accessible, and no client-side work fixes that.
