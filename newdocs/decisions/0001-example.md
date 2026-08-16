<!--
  WORKED EXAMPLE — showing the shape and the voice, using a decision already
  made in this project.
  Either verify it and keep it as 0001, or delete it once real records exist.

  The prose below passes the _STYLE.md self-check: zero em-dashes, zero banned
  antithesis constructions, zero uses of "we", no closing aphorism, and every
  claim points at something checkable. Run the check on it and see.
-->

# 0001. Mount every page of the document at once

**Status:** Accepted
**Date:** 2026-08-14

## Context

Acceptance criterion #1 requires search across the whole document.

The browser's own find (⌘F) only searches the DOM. A viewer that mounts one page at a time has one page in the DOM, so find reaches one page. The alternative is building search into the app: an index, a results list, scroll-to-match, and highlighting. That's a feature the platform already ships.

Cost of mounting everything is memory. A full-width page canvas is roughly 10 MB at devicePixelRatio 2, so 34 pages approach 350 MB. iOS Safari discards tabs for less.

## Decision

The viewer mounts all 34 pages continuously. Every page's text layer is in the DOM at all times. Only canvases near the viewport are painted.

## Alternatives

- **One page at a time.** Breaks whole-document find.
- **One page plus a hijacked ⌘F.** Reimplements a platform feature, and intercepting the browser's find shortcut is hostile.
- **Mount every canvas too.** The original plan. Ran into the memory ceiling above.

## Consequences

The text layer and the canvas are separated: find needs the text layer, which is cheap DOM; memory is spent by the canvas, which is windowed to three pages either side. One architecture on both device classes, with one tuning constant.

Page heights now have to be reserved from the API's dimensions before anything paints, or scroll targets land in the wrong place while the document loads.

Virtualization is the production answer at larger page counts, and it would take the text layer with it, which puts this decision back on the table.

## Revisit when

A document exceeds roughly 100 pages, or the canvas window stops being a fixed page count.
