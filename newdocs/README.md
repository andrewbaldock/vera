# Documentation

**Purpose:** index for this folder, and instructions for filling it in.
**Audience:** me now; a reader later.
**Read time:** 2 minutes.
**Last reviewed:** <!-- DATE -->

---

## Status

This folder is a **template being filled in**. It replaces [`../docs/`](../docs/) when done, at which point `newdocs/` is renamed to `docs/` and the old folder is archived or deleted.

Nothing here ships until it's filled. The ugly folder name is the safety catch.

---

## Reading order

Files are numbered so a directory listing sorts into the order a stranger should read them.

| # | File | Answers |
|---|---|---|
| 00 | [00-readme-root.md](00-readme-root.md) | *(template for the repo's root README)* |
| 01 | [01-product.md](01-product.md) | What is this and who is it for? |
| 02 | [02-design.md](02-design.md) | Why does it look and behave like this? |
| 03 | [03-architecture.md](03-architecture.md) | How is it built? |
| 04 | [04-process.md](04-process.md) | How was it built, and by whom? |
| 05 | [05-testing.md](05-testing.md) | How do I know it works? |
| 06 | [06-accessibility.md](06-accessibility.md) | Who can use it? |
| 07 | [07-production.md](07-production.md) | What would shipping for real require? |
| 08 | [08-roadmap.md](08-roadmap.md) | What's missing, and what's next? |

Supporting:

| Path | Holds |
|---|---|
| [decisions/](decisions/) | One file per architectural decision (ADRs) |
| [assets/](assets/) | Diagrams, wireframes, screenshots |
| [RELEASES.md](RELEASES.md) | Version history *(moves to repo root when filled)* |
| [_STYLE.md](_STYLE.md) | The voice contract |
| [_release-email.md](_release-email.md) | Template for the per-release email |

---

## How to fill these in

**Read [_STYLE.md](_STYLE.md) first.** It's the whole point of the rewrite.

Every heading has a prompt underneath it in an HTML comment:

```markdown
## The problem

<!-- PROMPT (120 words)
What is broken, for whom, before this app exists.
AVOID: explaining the industry. AVOID: "in today's landscape".
-->
```

Comments don't render, so a half-filled document still looks finished on GitHub. Delete each prompt as you replace it — a leftover prompt in a shipped doc is worse than a missing section.

The word count in each prompt is a **budget, not a target**. Coming in under it is always fine.

`<!-- DATE -->` markers want an ISO date (`2026-08-16`) when you touch the file.

---

## Rules for the set

1. **One job per file.** If a paragraph would fit equally well in two docs, it belongs in neither — it belongs in an ADR they both link to.
2. **Decisions live in [decisions/](decisions/), not in prose.** The narrative docs say *what* and link to the ADR for *why*. This is what keeps 02 and 03 short.
3. **The root README is the only doc most people read.** It gets the most editing attention, not the least.
4. **No doc explains another doc.** Link and move on.

---

## Reusing this template

Strip the VERA-specific prompts and this is the skeleton for any project of this size. What travels:

- The numbered reading order and the arc behind it: what & why → what it looks like → how it's built → how it was built → how it's proven → how it ships → what's next.
- The header block on every file.
- The prompt-in-a-comment mechanic.
- [_STYLE.md](_STYLE.md), with the budgets re-measured against the new project's drafts.
- [decisions/](decisions/), unchanged.

What doesn't: everything in 01, and every prompt that names a VERA component.
