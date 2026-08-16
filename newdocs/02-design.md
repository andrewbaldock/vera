# Design

**Purpose:** why the screen looks and behaves the way it does.
**Audience:** designers, and engineers who want the reasoning.
**Read time:** 8 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: it is a narrative, not a ledger. Every "why" that runs
  past a paragraph belongs in decisions/ and gets linked from here. If this file
  starts growing a decision table, the table is in the wrong place.
-->

---

## The sketches, before any code

<!-- PROMPT (100 words + assets)
The wireframes, and what changed between them and the build. The interesting
content is the delta: what looked right on paper and didn't survive contact.
ASSET: assets/wireframes/
-->

## The flow

<!-- PROMPT (120 words)
Walk one reviewer through one document, start to finish. Present tense, second
person or third, consistent. This is the spine the rest of the file hangs off,
so write it before the sections below.
-->

---

## The layout

### Two shapes, and the boundary between them

<!-- PROMPT (150 words)
The two layouts, the breakpoint, and why it's that number. Cover why two and not
three, and why the rule is about the window rather than the device.
LINK: decisions/ for the full argument.
ASSET: assets/layouts/
-->

### The full shape is a touch layout

<!-- PROMPT (100 words)
Why the wide layout can't assume a mouse. The iPad number is the whole argument —
lead with it.
-->

### The compact shape

<!-- PROMPT (100 words)
One thing at a time, the view switcher, the bottom bar. What gets dropped and
what that costs.
-->

---

## The three regions

<!-- PROMPT (60 words)
Issues list, document, thumb strip. One sentence each on the job it does. Then
the sections below go deeper on the two that needed real decisions.
-->

### The issues list

<!-- PROMPT (120 words)
Sort order, filtering, the severity counts doing double duty, numbering that
survives a re-sort, the done checkbox. Each of these has an ADR — say what the
user sees and link for why.
-->

### The document

<!-- PROMPT (120 words)
Continuous scroll, the status bar standing in for annotation, why nothing is
drawn inside a page. The "no coordinates" fact from 01 is the root of this whole
section, so refer back to it rather than restating it.
-->

### The thumb strip

<!-- PROMPT (120 words)
One scrub control and not thirty-four buttons, what the segments encode, the
readout that follows the thumb. Cover the size floor and the scrolling behavior
at large text sizes.
LINK: decisions/ for the scale arithmetic.
-->

---

## The visual system

### Type

<!-- PROMPT (80 words)
The three faces and the job each one has. Why the wordmark's face is a separate
token from the interface's.
-->

### Color

<!-- PROMPT (120 words)
The token layer, and the rule that no component ever names a color. Severity as
product vocabulary. The separate fill and text tokens, with the contrast numbers
that forced the split — the measurements are the argument, so quote them.
-->

### Density

<!-- PROMPT (80 words)
The three size stops, what scales and what deliberately doesn't, and who this is
for. Note that the PDF is unaffected by design and zooms on its own control.
-->

### Motion

<!-- PROMPT (80 words)
The three animations, what each one signals, and why they're slow. Reduced-motion
handling.
-->

---

## What I'd change

<!-- PROMPT (100 words)
Given another week. Not a roadmap — that's 08 — but the design calls I'm least
settled on. A designer reading this will trust the rest of the file more for it.
-->

---

## Decisions

<!-- PROMPT
An index into decisions/, not a copy of it. One line per ADR: number, title, and
the one-clause outcome. Anything longer belongs in the ADR.
-->

See [decisions/](decisions/) for the full records.
