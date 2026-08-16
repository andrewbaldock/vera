# Production readiness

**Purpose:** what shipping this for real would require.
**Audience:** an engineering manager, or a security reviewer.
**Read time:** 6 minutes.
**Last reviewed:** <!-- DATE -->

<!--
  CEILING: 250 lines.
  THE RULE FOR THIS FILE: two halves, and the split is the whole value. Half one
  is what the demo already did right. Half two is what it deliberately didn't.
  Mixing them turns a credible document into a wish list.
-->

---

## Part 1 — Already built for it

<!-- PROMPT (100 words intro, then a table)
The things a demo could have skipped and didn't, because skipping them would
have meant rewriting rather than extending.
Table columns: Concern | What's there | Why it survives contact with production.
-->

## Part 2 — Out of scope here, mandatory for real

<!-- PROMPT (60 words intro)
Frame this as scope, not as oversight: every item below is absent on purpose,
and knowing it's absent is the point of the section.
-->

### Identity and access

<!-- PROMPT (bullets)
Auth, sessions, roles, and what the reviewer identity would have to become.
-->

### Data protection

<!-- PROMPT (bullets)
The document is a mortgage file. Encryption in transit and at rest, retention,
residency, what must never reach a log or an analytics call.
-->

### The audit trail

<!-- PROMPT (bullets)
Who accepted what, when, against which version. In a regulated industry this is
arguably the product, so give it more room than the sections around it.
-->

### Application security

<!-- PROMPT (bullets)
CSP, the PDF renderer's threat surface, untrusted file handling, dependency
policy.
-->

### Operations

<!-- PROMPT (bullets)
Error reporting, monitoring, performance budgets, what "down" means for this
screen and what the fallback is.
-->

### Delivery and quality

<!-- PROMPT (bullets)
CI gates, environments, release process, browser support policy and how it's
enforced rather than asserted.
LINK: RELEASES.md
-->

---

## What the demo does that production must not

<!-- PROMPT (table)
Columns: Demo behavior | Why it's fine here | What it becomes.
The sharpest section in the document, because it proves I know which of my own
shortcuts are shortcuts. Include the reset control, the fixture data, the inert
upload dialog, anything hardcoded.
-->
