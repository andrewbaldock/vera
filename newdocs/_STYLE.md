# Voice

**Purpose:** the writing contract for every file in this folder.
**Audience:** me, while filling these in.
**Read time:** 3 minutes.
**Last reviewed:** <!-- DATE -->

Read this before writing. Re-read it before calling a doc done.

---

## The one rule

**Write what you would say out loud in an interview, then cut a third.**

Everything below is a specific way of failing that rule.

---

## Person

**First person singular.** "I decided", "I got this wrong", "I'd do it differently".

I built this alone. "We" on a solo project is the loudest tell there is — it either sounds like corporate throat-clearing or like I'm hiding who made the calls. The whole value of these docs is that a person made decisions and can defend them.

Exception: "we" is fine when genuinely describing a team practice or the reader and me together ("if we trace a click through the tree"). Never for my own decisions.

**Measured on the current docs:** 46 instances of we/our/us against 24 of I/my.

---

## The banned construction

**Antithesis.** "X rather than Y." "Not a Y, an X." "Instead of Y, X."

It is a genuinely good rhetorical move. Used once a page it lands. Used 216 times it becomes the texture of the prose and it reads as generated, because it is the single most recognizable LLM sentence shape.

**Budget: 1 per 500 words.** Current density is 1 per 112.

When the urge hits, just state the thing:

> ~~Arithmetic rather than CSS, because both CSS equivalents fail.~~
> The scale factor is computed in JS. Both CSS versions break on documents this fixture doesn't contain.

The second is shorter, says more, and sounds like a person.

---

## The diminished alternative

The worse version of the above, and the more common one. It invents a weak thing the feature *isn't*, then beats it:

> The page number, which makes the strip a map **rather than a gradient**.
> The `height`/`width` fields turn out to be what makes navigation correct, **not just strip decoration**.
> Version scoping **is not tidiness** — a tick carried from v2 would claim a defect v3 never raised.
> Accessibility is a strength, **not a checklist pass**.
> `z-10` **is not arbitrary**: react-pdf's `.textLayer` is `z-index: 2`.

Nobody ever said the page numbers were a gradient. Nobody proposed the dimensions were decoration. The alternative is invented so the real answer can beat it, which is selling, and a reader who notices it once stops trusting the rest.

**The test:** was the "not Y" half ever actually on the table?

| | |
|---|---|
| **Y was genuinely considered** | It's an alternative. It belongs in an ADR's Alternatives section, with its own reason for losing. |
| **Y was never considered** | Delete the clause. The sentence is finished without it. |

Applied:

> ~~The page number, which makes the strip a map rather than a gradient.~~
> Each segment carries its page number.

> ~~The `height`/`width` fields turn out to be what makes navigation correct, not just strip decoration.~~
> Page wrappers reserve their height from the API's `height` and `width` before the canvas paints.

> ~~Version scoping is not tidiness — a tick carried from v2 would claim a defect v3 never raised.~~
> Ticks are scoped to review plus version. A tick carried from v2 would claim a defect that v3 never raised.

> ~~`z-10` is not arbitrary: react-pdf's `.textLayer` is `z-index: 2`.~~
> `z-10` clears react-pdf's `.textLayer` (`z-index: 2`) and `.annotationLayer` (`z-index: 3`).

The third one keeps its reason and loses only the editorial. That's the pattern: **the fact and the reason stay, the claim about how good the fact is goes.**

### When there was a real choice

Name both options and why one won. Flat, no verdict on how clever it was:

> The choice was between mounting one page at a time and mounting all 34. All 34, because the browser's find only searches the DOM and whole-document search is an acceptance criterion.

That sentence is the seed of an ADR. If a paragraph starts doing this, move it to [decisions/](decisions/) and link it. **This is the mechanism that keeps 02 and 03 short:** every place tempted into a sales comparison is a place a decision record belongs.

### The general rule

State facts. Let the reader decide whether they're impressive. If a fact needs an adjacent sentence explaining its significance, either the fact is weak or the reader is being told what to think.

---

## Punctuation

**Em-dashes: 1 per 300 words.** Currently 1 per 142. They're doing work that a period or a colon should do. Convert most of them to full stops and the prose gets faster.

**Semicolons: sparingly.** They usually mean two sentences wearing a trench coat.

**Parentheses for asides only.** If the aside is load-bearing, it isn't an aside.

---

## Sentences

- Average under 20 words. Hard cap around 35.
- Vary the length. Three medium sentences in a row is a lull.
- Contractions on. "Doesn't", "it's", "I'd".
- Active voice. "The observer measures the column", not "the column is measured".
- No sentence fragments used for emphasis. Not one.

---

## Structure

- **Lead with the answer.** First sentence of a section says the conclusion. Then the reasoning.
- **Tables for anything with three or more parallel items.** Prose lists of specs are hard to scan and easy to pad.
- **Code and links over description.** `[ThumbStrip.tsx:90](../src/components/ThumbStrip.tsx#L90)` beats a paragraph paraphrasing what the file does.
- **Every claim is checkable.** It links to code, a test, a decision record, or a measurement. A claim that can't be checked gets cut.

---

## The ban list

Cut on sight:

| Don't write | Why |
|---|---|
| "It's worth noting that" | Then note it. |
| "In today's landscape" | Nobody has ever needed this sentence. |
| "Simply", "just", "obviously" | If it were obvious I wouldn't be documenting it. |
| "Robust", "seamless", "leverage", "delve" | Brochure words. |
| "This is not X, it's Y" | See antithesis, above. |
| A closing aphorism | The section ends when the information ends. |
| "Best practices" | Say which practice and why. |
| Emoji in headings | No. |

---

## Length budgets

Hard ceilings. If a doc is over, cut — don't split.

| File | Ceiling |
|---|---|
| Root `README.md` | 150 lines |
| Each numbered doc | 250 lines |
| Each ADR | 60 lines |
| **Whole set** | **8,000 words** |

Current set is 24,158 words. The target is roughly a third of that.

---

## The self-check

Before marking a doc done:

1. Read it out loud. Anywhere I stumble, the sentence is wrong.
2. Search for `rather than`, `, not `, `instead of`. Count them against the budget.
3. **Search for `not just`, `not only`, `is not a`, `not arbitrary`, `not tidiness`.** Every hit is a diminished alternative. Delete it, or promote it to an ADR.
4. Search for `—`. Count against the budget.
5. Search for ` we `, ` our `. Should be near zero.
6. Any sentence whose only job is to say a previous sentence was clever: cut it.
7. Every heading: could a reader skip this section and lose nothing? Then cut it.
8. Line count against the ceiling above.

```sh
# From the repo root, against one file. Set F to the file being checked.
F=newdocs/02-design.md

echo -n "antithesis  "; grep -oiE "rather than|, not |instead of" $F | wc -l
echo -n "diminished  "; grep -oiE "not just|not only|not merely|isn't just|is not a|not arbitrary" $F | wc -l
echo -n "em-dashes   "; grep -o "—" $F | wc -l
echo -n "we/our/us   "; grep -oiE "\b(we|our|us)\b" $F | wc -l
echo -n "words       "; wc -w < $F
```

Budgets, per 500 words: antithesis ≤ 1, diminished alternatives **0**, em-dashes ≤ 1.7.
