---
name: depurple
description: "Two passes over docs, READMEs, code comments and commit messages. (1) Strips prose that sells instead of stating: invented alternatives (\"not just a bird, a bird that ROARS\"), metaphors standing in for mechanisms (the gate, the theater), personified UI that lies or deserves things, closing zingers, restated clauses, \"we\" on solo work. (2) Verifies the claims are actually true: stale counts, absolutes with counterexamples, features the docs still say were cut, implied verification that never happened, broken cross-references. Use when the user says depurple, asks to de-AI or de-slop prose, says writing sounds like AI or marketing, wants docs plainer or in their own voice, or asks whether the docs are accurate, truthful, consistent or up to date."
---

# /depurple

Two passes over the same text.

1. **Prose that sells instead of stating** — tells the reader how to feel about a
   fact instead of giving them the fact.
2. **Claims that are not true** — counts that have drifted, absolutes with
   counterexamples, features the docs still say were cut.

The second is the one that matters. Purple prose is a nuisance; a false claim is
a defect, and a reader who catches one stops trusting the rest of the document.

## Usage

```
/depurple                     the docs and comments changed on this branch
/depurple docs/               a folder
/depurple README.md           one file
/depurple --report            find and list, change nothing
/depurple --claims            skip the prose pass, verify claims only
```

Default is **report first, then fix on approval**. Never silently rewrite
someone's writing.

## The one rule

> State the fact. Let the reader decide whether it is impressive.

If a sentence exists to make a previous sentence sound better, cut it.

---

## The seven patterns

Hunt these in order. The first two are the highest-yield by a distance.

### 1. The invented alternative

The tell: a weaker thing the subject *isn't*, invented so the real thing can beat
it. *"Not just a bird — a bird that ROARS."*

```
The page number, which makes the strip a map rather than a gradient.
The height fields turn out to be what makes navigation correct, not just strip decoration.
`z-10` is not arbitrary: react-pdf's .textLayer is z-index 2.
Accessibility is a strength, not a checklist pass.
```

Nobody said the strip was a gradient. Nobody proposed the dimensions were
decoration.

**The test — was the "not Y" half ever actually on the table?**

| | |
|---|---|
| **Y was genuinely considered** | It is a real alternative. It belongs in a decision record with its own reason for losing. |
| **Y was never considered** | Delete the clause. The sentence is finished without it. |

```diff
- The page number, which makes the strip a map rather than a gradient.
+ Each segment carries its page number.

- `z-10` is not arbitrary: react-pdf's .textLayer is z-index 2.
+ `z-10` clears react-pdf's .textLayer (z-index 2) and .annotationLayer (z-index 3).
```

The fact and the reason stay. The claim about how good the fact is goes.

### 2. Metaphor instead of mechanism

A picture standing in for a description. Usually one invented word that then
spreads through a whole codebase.

```
the gate · the submit gate · open the gate · gate closed
theater, and the honest kind
component soup
a panel that feels possessed
where discoverability goes to die
```

Replace with the domain's own words. *The gate* → *the submit rule*. *Open the
gate* → *allow submission*.

**Check the blast radius.** One coined metaphor is rarely in one place — grep the
whole repo including tests and commit messages. A single coinage in this
codebase had spread to 23 sites.

### 3. Personified UI

Interfaces that lie, deserve, earn, give up or admit things. It reads as wit the
first time and as evasion by the fourth, because a component that "lies" is a
component whose actual behavior nobody has described.

Grep for the verbs:

```sh
grep -rniE '\b(lies|lying|a lie|lie told|refuses|admits|deserves|earns|gave up|pretends|insists|wants to|promises|complains|betrays|forgets)\b' .
```

Real hits, and what they became:

```diff
- a control labeled with something it refuses to perform is a lie told on every
- render, and disabling it only makes the lie quieter
+ a control labelled with an action it will not carry out is wrong every time it
+ renders, and disabling it only makes it quieter about being wrong

- the back button stops lying about where you are
+ the back button lands where you expect

- it is a different thing to look at, so it deserves an address
+ it is a different thing to look at, so it gets an address

- this recovers the whole-document view that the status bar gave up
+ the status bar only ever describes the page you are on

- that forces one addition and earns one for free
+ that forces one addition, and one more falls out of it
```

**Do not over-correct.** Ordinary technical usage is not personification:

| Fine | Not fine |
|---|---|
| the validator **refuses** `issues: null` | the button **refuses** to perform |
| `canSubmit` **reads** the review | the panel feels **possessed** |
| the app **refuses** to submit a defective document | the back button **lies** |

The line: a function acting on input is a description. A component with feelings,
morals or entitlements is a metaphor.

### 4. The closing zinger

The information ends, then one more sentence arrives for the applause.

```
That is stronger than a code review promising the same thing.
This is how you start to achieve UI harmony.
That is the mobile-first argument in its honest form.
```

Cut it, or replace it with the mechanism: *"The compiler enforces it."*

### 5. The restated clause

Says it, then says it again with different nouns.

```
it is 612pt of dense evidence, and squeezing it defeats the point of showing it
Verifying it needs a physical device, so the windowing is stated as reasoned rather than proven
```

Keep the half that carries information.

### 6. "We" on solo work

The loudest authorship tell there is. Count `we/our/us` against `I/my`. On a
solo project the ratio should be near zero.

Exception: genuine team practice, or the reader-and-writer together (*"if we
trace a click through the tree"*). Never for the author's own decisions.

### 7. Over-explanation

Three sentences about a two-state behavior nobody asked about. Implementation
detail written into reader-facing prose because it was interesting to build.

The test: **would the reader have asked?** If not, it belongs in a code comment
or a test name.

---

## Then verify the claims

**Purple prose is a nuisance. A false claim is a defect.** Do this pass second,
report it separately, and fix it first.

Bold text is where the claims are. An author bolds a sentence because they think
it matters, which makes it exactly where being wrong is most expensive. Start
there:

```sh
grep -rnoE '\*\*[^*]{15,}\*\*' docs/ README.md | cut -c1-160
```

Then take every one and ask: **how would I know this is true?** If there is no
way to check it, that is itself the finding.

### The five kinds that go stale

**Counts and measurements.** Run the thing.

```sh
bunx playwright test --list | tail -1     # against "244 tests across nine specs"
grep -c '^### [0-9]' docs/09-decisions.md # against "56-row log"
```

Every count in prose is a maintenance tax that will eventually be paid in
credibility. Prefer durable phrasing — "over 250", "both suites", "ten specs" —
so adding work cannot make a document lie.

**Absolutes.** `never`, `always`, `every`, `no X`, `nothing`, `the only`. Each is
a claim with a findable counterexample.

```
"Two things do NOT persist: split position, and sort order."   → panel sizes persist now
"Nothing essential is behind :hover"                            → go find one
"Every icon-only control has an accessible name"                → run axe
```

**Reversals.** A shipped feature that a doc still says was cut. These are the
worst kind, because the document argues *against* the thing the product does.

```
"The one gesture we do not support is pinch-to-zoom"   → shipped
"Explicitly not thumbnails"                             → shipped
```

Grep the release notes and the recent log for anything the docs still deny.

**Implied verification.** Passive phrasing that suggests work that never happened.

```diff
- how VoiceOver actually reads the page is a manual spot check, not a test
+ the page has not been run through VoiceOver
```

"is a spot check" implies someone checked. If nobody did, say nobody did.

**Cross-references.** Links and named files, after any rename.

```sh
grep -oE '\]\(([^)h#][^)]*)\)' FILE | sed 's/](//;s/)$//;s/#.*//' | while read p; do
  [ -e "$p" ] || echo "MISSING $p"
done
```

Check for stale *names* too, not just broken links — a doc referring to
`DESIGN.md §6d` after a restructure is wrong even where nothing is hyperlinked.

### Consistency across files

The same fact stated in two places will drift. Find every place a claim appears
and make them agree, or make one the owner and have the others link to it.

The tell: two documents describing the same suite, table or count. In one audit
a screen-reader claim appeared in three files and two of them contradicted the
third.

### Reporting this pass

Separately from the prose findings, and ordered by consequence:

```
| File:line | Claim | Verified? | Reality |
|---|---|---|---|
| README:168 | "244 tests, nine spec files" | NO  | 254 across 10 |
| 05:103 | "VoiceOver is a spot check" | NO  | never run |
| 06:131 | links PRODUCTION.md | BROKEN | renamed 07-production.md |
```

**Never soften a claim to make it true when the honest fix is to do the work.**
"Not run through VoiceOver" is a fine thing for a document to say. Quietly
rewording it to sound like it was is the one failure mode this pass exists to
prevent.

---

## Measuring

Run these before and after. They are for finding candidates, not for judging —
every hit needs a human read.

```sh
F=path/to/file.md
printf "invented    %s\n" "$(grep -oiE 'not just|not only|not merely|is not a|not arbitrary|rather than a' $F | wc -l)"
printf "antithesis  %s\n" "$(grep -oiE 'rather than|, not |instead of' $F | wc -l)"
printf "em-dashes   %s\n" "$(grep -o '—' $F | wc -l)"
printf "we/our/us   %s\n" "$(grep -oiE '\b(we|our|us)\b' $F | wc -l)"
printf "words       %s\n" "$(wc -w < $F)"
```

Budgets per 500 words:

| | |
|---|---|
| Invented alternatives | **0** |
| Antithesis (real ones) | ≤ 1 |
| Em-dashes | ≤ 1.7 |
| "we" on solo work | 0 |

**A high antithesis count is not automatically bad.** Most are real either/ors —
`grab` not `pointer`, `aria-disabled` not `disabled`. In one real audit only
**3% of ~290 hits** were genuine offenders. Report the density, then read them.

---

## Reporting

One table. Location, the offending text, the pattern, the proposed replacement.

```
| File:line | Was | Pattern | Proposed |
|---|---|---|---|
| README:107 | "they record intent, not a spec" | invented alternative | "so they still show what was intended before any code existed" |
```

Then let the author veto individually. Do not batch-apply to prose someone wrote
themselves without showing them first.

## Rules

- **Never apply the budgets to the user's own writing unless they ask.** These
  rules exist for generated prose. A human's voice is the goal, not the target.
- **Facts and breakage outrank style.** Broken links, stale counts and false
  claims get fixed first and reported separately.
- **Keep the reason, cut the flourish.** Most offenders are one clause bolted to
  a good sentence.
- **A comment that argues against a reader's likely assumption is legitimate.**
  `// Not an IntersectionObserver: its callbacks only fire on threshold
  crossings` is documenting a real trap, not selling.
- **Check tests and commit messages too.** Coined metaphors leak into test names
  and stay there.

## When not to run this

- User-facing copy that is deliberately warm.
- Marketing pages, where selling is the job.
- Anything the user has already said is finished.
