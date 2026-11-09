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

3. Push to `main`. The announce workflow mails every subscriber about each title that
   was not in `src/writings.json` before the push, unless it carries `announce: false`.

Essays open at `/#/writings/<slug>`; that is the address the email links to.

## Subscriptions

The "Subscribe to email updates" form on the home page posts to `api/subscribe.js`,
which stores the address in the project's private Vercel Blob store
(`writings-subscribers`, connected to the Vercel project; Vercel sets
`BLOB_READ_WRITE_TOKEN` on the project for it). Each address is one record at
`subscribers/<sha256 of the address>.json` holding the address, a random token, and
the date. `api/unsubscribe.js` deletes a record when its link is followed; the
announce email carries that link and the one-click `List-Unsubscribe` headers.

`scripts/announce-writings.mjs` runs in GitHub Actions on each push that changes
`src/writings.json`. It reads the records from the store and sends one message per
subscriber over SMTP with nodemailer. It needs these repository secrets:

| Secret | Value |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | The store token from the Vercel project's environment variables |
| `SMTP_USER` | The sending mailbox. For Gmail, the address. For Resend, `resend`. |
| `SMTP_PASS` | For Gmail, an app password (needs 2-Step Verification). For Resend, the API key. |
| `SMTP_HOST` | Optional. Defaults to `smtp.gmail.com`; Resend is `smtp.resend.com`. |
| `SMTP_PORT` | Optional. Defaults to `465`. |
| `MAIL_FROM` | Optional. Defaults to `Arjun Mathur <SMTP_USER>`. |

Without the three required secrets the job fails and says which are missing.
`DRY_RUN=1 node scripts/announce-writings.mjs` renders the email and counts
subscribers without sending.

To see who is subscribed, link the project in an empty folder outside the repo and
list the store:

```
npx -y vercel@latest link --yes --project arjun-mathur-website --scope arjun-mathur-s-projects
npx -y vercel@latest blob list --prefix subscribers/
npx -y vercel@latest blob get subscribers/<id>.json --access private
```
