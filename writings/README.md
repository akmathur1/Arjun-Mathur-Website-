# Writings

One markdown file per essay. `scripts/build-writings.mjs` turns this folder into
`src/writings.json`, the one file the home page list, the essay pages and the
announce workflow all read. STYLE.md and EDITOR-NOTES.md have no front matter, so
the generator skips them.

## Adding an essay

1. Write `writings/<slug>.md` with this front matter, then the body, then sources:

   ```
   ---
   title: "Jane Street and the Indian options market"
   date: 2026-10-29
   summary: "Two lines under the title on the home page. About 100–140 characters."
   tags: [markets, India]
   pinned: false
   ---

   Paragraphs separated by blank lines. No headers, no lists, no bold. *Italics* are
   the only inline markup rendered.

   Sources:
   - [Title](https://…)
   ```

   The Sources block stays in the markdown as the fact-checking record; the site does
   not show it.

   Optional keys: `tier: boxed` draws a hairline box around the entry on the home
   page; `pinned: true` puts it first with the heavy box and shadow (one essay at a
   time); `announce: false` keeps the subscriber email from going out for that entry.

2. Run `npm run writings` and commit the markdown together with `src/writings.json`.
   (`npm run build` runs the generator too, so a deploy can never ship out of sync.)

3. Push to `main`. The announce workflow mails subscribers about every title that
   was not in `src/writings.json` before the push, unless it carries `announce: false`.

Essays open at `/#/writings/<slug>`; that is the address the email links to.
