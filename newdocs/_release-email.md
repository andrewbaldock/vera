# Release email

**Purpose:** the note that goes to David when a release ships.
**Last reviewed:** <!-- DATE -->

---

## When to send

**Not every tag.** Tag as often as is useful; email only when there's something worth opening the app for.

| Release | Send? |
|---|---|
| New user-visible capability | Yes |
| A fix to something he might have hit | Yes |
| A fix to something he'd never have seen | No |
| Documentation, tooling, refactors | No |
| Several small things, accumulated | Yes, batched into one note |

Of the three tags so far, v1.0.1 (a writeup) and v1.0.2 (a cursor fix) would both have been noise. The judgment to *not* send is part of what the sending demonstrates.

**One email per release, never a follow-up correction.** If something's wrong, it goes in the next one.

---

## Shape

Six lines and a link. He is evaluating a candidate, not subscribing to a product.

```
Subject: VERA v1.1.0 — <the change, in four or five words>

<Greeting>,

<One sentence: what prompted this.>

<Two or three sentences: what changed, in his terms. What he would notice if he
opened it. Not the implementation.>

<One line: anything that needs pointing at — a reversed decision, a known gap,
a specific thing worth trying.>

  vera.andrewbaldock.com
  Notes: github.com/andrewbaldock/vera/blob/main/RELEASES.md

<Sign-off>
```

### Rules

- **Subject names the change**, not the version alone. "VERA v1.1.0" tells him nothing on its own.
- **What he'd notice, not what I did.** "The interface has three text sizes now" beats "added a ui-scale context".
- **No apology for the previous version.** Post-release improvement is normal work. Framing it as a fix to something embarrassing invites him to go looking for the embarrassment.
- **No ask.** Not for feedback, not for a reply. He'll respond if he wants to.
- **Under 120 words.** If it needs more, the release notes need more and the email needs a link.

---

## Worked example

> **Subject:** VERA v1.1.0 — text size and document zoom
>
> Hi David,
>
> Someone reviewing VERA on my end found the interface type too small, and browser zoom turned out to be the wrong tool: it scales the document along with everything else.
>
> There's now a text size control in the account menu, with three stops, which scales the interface and leaves the document alone. The document has its own zoom in the page bar. The thumb strip stays legible at the larger sizes and scrolls when it needs to.
>
> The zoom control reverses a cut I'd documented in the original build. The reasoning for cutting it, and for changing my mind, is in the notes.
>
> &nbsp;&nbsp;vera.andrewbaldock.com
> &nbsp;&nbsp;Notes: github.com/andrewbaldock/vera/blob/main/RELEASES.md
>
> Andrew

Word count: 118. The reversal is volunteered in the third paragraph, which is the only part of the note doing any real work.

---

## Before sending

1. The live site is actually running the version being announced. Check it, don't assume the deploy went out.
2. `RELEASES.md` is pushed and the link resolves for a signed-out reader.
3. Read it out loud. Any sentence that sounds like a changelog gets rewritten or cut.
4. Word count under 120.
