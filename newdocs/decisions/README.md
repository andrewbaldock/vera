# Decision records

**Purpose:** one file per architectural decision, so the narrative docs can stay short.
**Audience:** anyone asking "why is it like this?"
**Last reviewed:** <!-- DATE -->

---

## Why these exist as files

A decision log inside a design document grows until the document is a table. Splitting them out means [02-design.md](../02-design.md) and [03-architecture.md](../03-architecture.md) can say *what the thing does* and link here for *why*, and each decision gets a stable address that a commit message or a code comment can point at.

They're also the artifact that survives me. A year from now the reasoning is either written down or it's gone.

Format is [Michael Nygard's ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), lightly trimmed.

---

## Adding one

1. Copy [_template.md](_template.md) to `NNNN-short-kebab-title.md`. Numbers are sequential and never reused.
2. Fill it in. **Ceiling is 60 lines** — if it's longer, it's two decisions.
3. Link it from wherever the narrative docs mention the behavior.

## Changing one

**Never edit a decided ADR's Decision or Consequences.** Write a new one that supersedes it:

- New record gets `**Supersedes:** [0007](0007-....md)` in its header.
- Old record's status becomes `Superseded by [0019](0019-....md)`, and nothing else about it changes.

The reversal is the interesting part. An ADR you can watch change its mind is worth more than one that was always right.

## When something is *not* an ADR

- A style preference with no trade-off.
- A choice with one option.
- Anything that would be obvious to the next reader from the code alone.

If writing the Alternatives section is hard because there weren't any, it isn't a decision record.

---

## Index

<!-- PROMPT (table)
Columns: # | Decision | Status.
Newest last. Keep it to one line each — the point of the index is scanning.
Statuses: Accepted, Superseded by NNNN, Cut.
-->

| # | Decision | Status |
|---|---|---|
| [0001](0001-example.md) | *(example — delete once real records exist)* | Accepted |

---

## Backfilling from `docs/DESIGN.md`

The existing decision log at `../../docs/DESIGN.md` holds around 60 rows covering 2026-08-14 to 08-15. It's the source material, but **it is not a mechanical conversion** — most rows are a sentence or two and want expanding into real Context and Consequences, and several supersede each other in place rather than as separate records.

Suggested order: do the ten decisions a reviewer is most likely to ask about first, leave the rest as log rows, and add records for new decisions from here on.
