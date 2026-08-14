# Wireframes

Drawn in Google Drawings **before** the implementation, as a way of settling the layout and
the flow rather than reverse-justifying whatever the code ended up doing.

**Export:** [`UNDIRT_wireframes.svg`](UNDIRT_wireframes.svg)
**Source (live):** https://docs.google.com/drawings/d/1P1lXCZPaLolqYNq0aOk2XJNdWGl8UmqJt4W83rlUnVE/edit?usp=sharing

The final implementation may differ — the sketches record intent, not a spec.

## What the sketch establishes

- **Three regions** — header, issues list on the left, PDF viewer on the right, split by a
  draggable resizer.
- **The verdict leads.** *"12 issues must be fixed before you can submit"* sits above the
  list, with the severity breakdown beneath it. Acceptance criterion #3 is answered by the
  first thing you read, not by a caption next to a disabled button.
- **A status bar above the viewer** names the page in focus and the issues on it.
- **A severity strip** down the right edge — one proportional rectangle per page, numbered,
  marked with a coloured bar per issue on that page.
- **A checkbox per issue** — the user's private notepad, never an input to `canSubmit`.

Reasoning for each of these is in [`../DESIGN.md`](../DESIGN.md).
