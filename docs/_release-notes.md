# Writing release notes

**Purpose:** turning a tag hop into an entry in [`../RELEASES.md`](../RELEASES.md).
**Last reviewed:** 2026-08-16

---

## Get the raw material

```sh
git log --oneline v1.1.0..HEAD          # what changed
git diff --stat v1.1.0..HEAD            # how much, and where
bunx playwright test --list | tail -1   # the test count, for the notes
```

The commit subjects are a starting point and not the notes. They are written for
someone reading the diff; the notes are written for someone deciding whether to
open the app again.

## The shape

```
## vX.Y.Z — YYYY-MM-DD

One paragraph: what changed and why it matters. No bullets in it.

**Added** / **Changed** / **Fixed** — only the groups that apply.
One line each, in the reader's language.

**Notes** — anything that isn't a change: a reversed decision, a known gap,
something worth looking at specifically.
```

## Rules

- **Lead with the reason, not the work.** "Making it readable" beats "text size setting,
  thumb strip floor, contrast fix" — the list comes after, and the reason is what tells
  someone whether to care.
- **Write what a reader would notice.** *"The page strip is legible at large text sizes"*,
  never *"refactored the scale calculation"*.
- **Group by what it does to them**, not by which file moved. A single change often lands
  in Added and Fixed both; pick the one the reader experiences.
- **Thin releases say they are thin.** Inflating a docs-only tag costs credibility that a
  real release then has to spend. v1.0.1 was a document and v1.0.2 was a cursor, and both
  say so.
- **Volunteer the reversals.** A decision you changed, stated plainly, reads as judgement.
  Found by a reader instead, it reads as an oversight.
- **Newest first**, and never rewrite a shipped entry. Corrections go in the next one.

## Versioning

| | |
|---|---|
| **Patch** | Fixes. Nothing new to look at. |
| **Minor** | New user-visible capability. |
| **Major** | Reserved. This is a take-home; there is unlikely to be a 2.0. |

## Cutting the release

1. Bump `version` in `package.json` — it is what the app and `/version.json` report.
2. Write the entry in [`../RELEASES.md`](../RELEASES.md).
3. Commit, tag `vX.Y.Z`, push.
4. CI runs both suites and deploys from `main` only if they pass, then re-reads
   `/version.json` to confirm the live build is that commit.
5. Check the live site reports the version you just cut.

## If you are also telling someone

Six lines and a link. Say what prompted it, what they would notice, and anything worth
pointing at — then the URL and the notes. No ask, no apology for the previous version:
post-release improvement is normal work, and framing it as a fix to something embarrassing
invites them to go looking for the embarrassment.

Under 120 words. If it needs more, the notes need more and the message needs a link.
