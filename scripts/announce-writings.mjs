// Run by .github/workflows/announce-writings.yml on every push to main that touches
// src/writings.json. Diffs the file against the pre-push commit; each writing that
// wasn't there before is mailed to every subscriber, one message each, over SMTP.
//
// Subscribers live in the project's private Vercel Blob store (writings-subscribers),
// one record per address at subscribers/<id>.json, written by api/subscribe.js and
// deleted by api/unsubscribe.js. Each record carries the token its unsubscribe link uses.
//
// Env (repository secrets unless noted):
//   BLOB_READ_WRITE_TOKEN  the store's token, shown under the Vercel project's env vars
//   SMTP_USER, SMTP_PASS   the sending mailbox. Gmail: the address and an app password.
//                          Resend: user "resend", pass the API key, host smtp.resend.com.
//   SMTP_HOST, SMTP_PORT   default smtp.gmail.com and 465
//   MAIL_FROM              default "Arjun Mathur <SMTP_USER>"
//   BEFORE_SHA             the commit to diff against; defaults to HEAD~1
//   SITE_URL               defaults to https://arjunkmathur.com
//   DRY_RUN=1              render and count instead of sending
//
// Run locally to preview: DRY_RUN=1 node scripts/announce-writings.mjs
//
// The repository is public and so are these Actions logs: never print an address.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { list, get } from '@vercel/blob';
import nodemailer from 'nodemailer';

const FILE = 'src/writings.json';
const { BLOB_READ_WRITE_TOKEN, SMTP_USER, SMTP_PASS, DRY_RUN } = process.env;
// A manual run has no github.event.before, so the workflow passes an empty string.
const BEFORE_SHA = process.env.BEFORE_SHA || 'HEAD~1';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SITE_URL = process.env.SITE_URL || 'https://arjunkmathur.com';
const MAIL_FROM = process.env.MAIL_FROM || (SMTP_USER ? `Arjun Mathur <${SMTP_USER}>` : '');

const current = JSON.parse(readFileSync(FILE, 'utf8'));

// If the file has no history at BEFORE_SHA — it was just created, or BEFORE_SHA is the
// null sha a branch's first push reports — this push is a baseline, not a publication.
// Announcing everything in it would mail every placeholder to every subscriber.
let previous;
try {
  previous = JSON.parse(execFileSync('git', ['show', `${BEFORE_SHA}:${FILE}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch {
  console.log(`No ${FILE} at ${BEFORE_SHA}; treating this push as a baseline. Nothing to announce.`);
  process.exit(0);
}

const seen = new Set(previous.map((w) => w.title));
// An essay can opt out with `announce: false` in its front matter (carried into the
// JSON by the generator); it is still new, it just does not get mailed.
const fresh = current.filter((w) => !seen.has(w.title) && w.announce !== false);

if (fresh.length === 0) {
  console.log('No new writings. Nothing to announce.');
  process.exit(0);
}

console.log(`${fresh.length} new writing(s): ${fresh.map((w) => JSON.stringify(w.title)).join(', ')}`);

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const linkTo = (w) => (w.url ? new URL(w.url, SITE_URL).toString() : SITE_URL);
const unsubscribeLink = (s) => `${SITE_URL}/api/unsubscribe?e=${s.id}&t=${s.token}`;
const host = SITE_URL.replace(/^https?:\/\//, '');

// Plain and narrow, in the site's voice.
const renderHtml = (w, unsub) => `<!doctype html>
<html><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 20px;background:#EDECE8;color:#1a1a1a;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:14px;line-height:1.7">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0 0 20px;color:#696969;font-size:12px">New writing from Arjun Mathur</p>
    <h1 style="margin:0 0 6px;font-family:Georgia,'Iowan Old Style',serif;font-weight:400;font-size:24px;letter-spacing:-0.2px">${escape(w.title)}</h1>
    <p style="margin:0 0 20px;color:#696969;font-size:13px">${escape(w.date)}</p>
    <p style="margin:0 0 24px">${escape(w.description)}</p>
    <p style="margin:0 0 40px"><a href="${escape(linkTo(w))}" style="color:#1a1a1a;text-decoration:underline;text-underline-offset:4px">Read it →</a></p>
    <p style="margin:0;color:#696969;font-size:12px">You're getting this because you subscribed at ${escape(host)}. <a href="${escape(unsub)}" style="color:#696969">Unsubscribe</a>.</p>
  </div>
</body></html>`;

const renderText = (w, unsub) =>
  `New writing from Arjun Mathur\n\n${w.title}\n${w.date}\n\n${w.description}\n\nRead it: ${linkTo(w)}\n\nYou're getting this because you subscribed at ${host}. Unsubscribe: ${unsub}\n`;

if (DRY_RUN) {
  const sample = { id: 'record-id', token: 'token' };
  for (const w of fresh) {
    console.log(`\n--- DRY RUN: would send "${w.title}" from ${MAIL_FROM || '(MAIL_FROM unset)'} via ${SMTP_HOST}:${SMTP_PORT} ---`);
    console.log(renderHtml(w, unsubscribeLink(sample)));
  }
}

const missing = ['BLOB_READ_WRITE_TOKEN', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
if (missing.length) {
  const level = DRY_RUN ? 'warn' : 'error';
  console[level](`${DRY_RUN ? 'Would not' : 'Cannot'} announce: missing ${missing.join(', ')}. Add them as repository secrets.`);
  process.exit(DRY_RUN ? 0 : 1);
}

// One record per blob; read them a few at a time.
const loadSubscribers = async () => {
  const subscribers = [];
  let cursor;
  do {
    const batch = await list({ prefix: 'subscribers/', limit: 1000, cursor });
    for (let i = 0; i < batch.blobs.length; i += 10) {
      const chunk = batch.blobs.slice(i, i + 10);
      const records = await Promise.all(
        chunk.map(async (b) => {
          const found = await get(b.pathname, { access: 'private', useCache: false });
          if (!found || found.statusCode !== 200) return null;
          const record = JSON.parse(await new Response(found.stream).text());
          const id = b.pathname.slice('subscribers/'.length, -'.json'.length);
          return record.email && record.token ? { id, email: record.email, token: record.token } : null;
        }),
      );
      subscribers.push(...records.filter(Boolean));
    }
    cursor = batch.hasMore ? batch.cursor : undefined;
  } while (cursor);
  return subscribers;
};

const subscribers = await loadSubscribers();
console.log(`${subscribers.length} subscriber(s).`);
if (subscribers.length === 0) process.exit(0);

const total = subscribers.length * fresh.length;
if (SMTP_HOST === 'smtp.gmail.com' && total > 450) {
  console.warn(`${total} messages is close to Gmail's daily sending limit; some may be refused.`);
}

if (DRY_RUN) {
  console.log(`DRY RUN: would send ${total} message(s). Nothing sent.`);
  process.exit(0);
}

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT !== 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});
await transport.verify();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let sent = 0;
let failures = 0;
for (const w of fresh) {
  for (const s of subscribers) {
    const unsub = unsubscribeLink(s);
    try {
      await transport.sendMail({
        from: MAIL_FROM,
        to: s.email,
        subject: w.title,
        text: renderText(w, unsub),
        html: renderHtml(w, unsub),
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      sent += 1;
    } catch (err) {
      failures += 1;
      console.error(`Failed to send "${w.title}" to record ${s.id.slice(0, 8)}…: ${err.message}`);
    }
    await sleep(250);
  }
  console.log(`"${w.title}": ${sent} sent so far, ${failures} failed.`);
}

transport.close();
console.log(`Done. ${sent} sent, ${failures} failed.`);
process.exit(failures ? 1 : 0);
