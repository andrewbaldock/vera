# Accessibility

**Purpose:** who can use this, verified how, and where it falls short.
**Audience:** an evaluator, and anyone maintaining it.
**Read time:** 5 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: no claim without a way to check it. Every guarantee
  points at a test, a measurement, or a named ARIA pattern. An accessibility
  document full of unverifiable assertions is worse than none.
-->

---

## The standard I aimed at

<!-- PROMPT (80 words)
Which level of which standard, and why that's the right bar for this product
rather than a generic aspiration. The users are people doing careful work all day
in a regulated industry — that's the argument.
-->

## What goes beyond a checklist

<!-- PROMPT (100 words)
Two or three things that took real design work rather than an attribute. These
are what separate "accessible" from "passes a scan", so lead with them.
-->

---

## Keyboard

<!-- PROMPT (table)
Columns: Control | Keys | Pattern followed.
Every interactive region: the splitter, the thumb strip, the issues list, the
dialogs. Column 3 names the WAI-ARIA pattern where there is one.
-->

## Screen reader

<!-- PROMPT (120 words)
What's announced, what deliberately isn't, and why. The suppressed announcements
are the interesting half — a live region that fires on every scrolled page is
worse than silence, and saying so demonstrates the judgment.
Name which readers were actually tested with. If a reader wasn't tested, don't
imply it was.
-->

## Color and contrast

<!-- PROMPT (100 words)
The measured ratios, both themes, both surfaces. Where a color failed and what
replaced it. Nothing carried by color alone — say how each of those signals is
also carried some other way.
LINK: the contrast spec in ../tests/.
-->

## Touch and pointer

<!-- PROMPT (100 words)
Minimum target size and where it's enforced, the drag surfaces, and what happens
to hover-only affordances on a device with no hover. The full layout appearing on
a touch screen is the fact that drives all of this.
-->

## Motion and preferences

<!-- PROMPT (80 words)
Reduced motion, and what each animation degrades to. Note that the signal is
preserved when the movement isn't — a state that only exists as an animation
disappears entirely for the people who asked for less motion.
-->

## Text size

<!-- PROMPT (80 words)
The three stops, what scales, and the reason this exists as an in-app control
rather than leaving it to browser zoom. Browser zoom scales the document canvas
along with everything else, which is the wrong outcome for someone who wants
bigger labels on a page they can already read.
-->

---

## The honest limitation

<!-- PROMPT (120 words)
A rendered PDF is not an accessible document, and no amount of work on this
screen changes that. Say what that means for a screen reader user in practice,
what the app does to mitigate it, and where the real fix lives (upstream, in the
document or the backend).
Ending on the limitation rather than burying it is the point of the section.
-->

## How this was verified

<!-- PROMPT (bullets)
Automated checks, manual passes, devices and readers used, and by whom. A
verification list is what turns everything above from a claim into a record.
-->
