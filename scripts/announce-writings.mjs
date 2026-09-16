// Run by .github/workflows/announce-writings.yml on every push to main that touches
// src/writings.json. Diffs the file against the pre-push commit; each writing that
// wasn't there before becomes one Resend broadcast to the subscriber audience.
//
// Env: RESEND_API_KEY, RESEND_AUDIENCE_ID, RESEND_FROM (e.g. "Arjun Mathur <hi@…>"),
//      BEFORE_SHA (the commit to diff against; defaults to HEAD~1),
//      SITE_URL, DRY_RUN=1 to print instead of send, RESEND_API to override the host.
//
// Run locally to preview: DRY_RUN=1 node scripts/announce-writings.mjs

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'src/writings.json';
const {
  RESEND_API_KEY,
  RESEND_AUDIENCE_ID,
  RESEND_FROM,
  BEFORE_SHA = 'HEAD~1',
  SITE_URL = 'https://arjun-mathur-website.vercel.app',
  RESEND_API = 'https://api.resend.com',
  DRY_RUN,
} = process.env;

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
const fresh = current.filter((w) => !seen.has(w.title));

if (fresh.length === 0) {
  console.log('No new writings. Nothing to announce.');
  process.exit(0);
}

console.log(`${fresh.length} new writing(s): ${fresh.map((w) => JSON.stringify(w.title)).join(', ')}`);

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Plain and narrow, in the site's voice. {{{RESEND_UNSUBSCRIBE_URL}}} is filled in by
// Resend per recipient at send time.
const render = (w) => {
  const href = w.url ? new URL(w.url, SITE_URL).toString() : SITE_URL;
  return `<!doctype html>
<html><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 20px;background:#EDECE8;color:#1a1a1a;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:14px;line-height:1.7">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0 0 20px;color:#696969;font-size:12px">New writing from Arjun Mathur</p>
    <h1 style="margin:0 0 6px;font-family:Georgia,'Iowan Old Style',serif;font-weight:400;font-size:24px;letter-spacing:-0.2px">${escape(w.title)}</h1>
    <p style="margin:0 0 20px;color:#696969;font-size:13px">${escape(w.date)}</p>
    <p style="margin:0 0 24px">${escape(w.description)}</p>
    <p style="margin:0 0 40px"><a href="${escape(href)}" style="color:#1a1a1a;text-decoration:underline;text-underline-offset:4px">Read it →</a></p>
    <p style="margin:0;color:#696969;font-size:12px">You're getting this because you subscribed at ${escape(SITE_URL.replace(/^https?:\/\//, ''))}. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#696969">Unsubscribe</a>.</p>
  </div>
</body></html>`;
};

if (DRY_RUN) {
  for (const w of fresh) {
    console.log(`\n--- DRY RUN: would send "${w.title}" to audience ${RESEND_AUDIENCE_ID ?? '(unset)'} from ${RESEND_FROM ?? '(unset)'} ---`);
    console.log(render(w));
  }
  process.exit(0);
}

const missing = ['RESEND_API_KEY', 'RESEND_AUDIENCE_ID', 'RESEND_FROM'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Cannot announce: missing ${missing.join(', ')}. Add them as repository secrets.`);
  process.exit(1);
}

const api = async (path, body) => {
  const r = await fetch(`${RESEND_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status} on ${path}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
};

let failures = 0;
for (const w of fresh) {
  try {
    const { id } = await api('/broadcasts', {
      audience_id: RESEND_AUDIENCE_ID,
      from: RESEND_FROM,
      subject: w.title,
      name: `New writing: ${w.title}`,
      html: render(w),
    });
    await api(`/broadcasts/${id}/send`, {});
    console.log(`Sent "${w.title}" (broadcast ${id}).`);
  } catch (err) {
    failures += 1;
    console.error(`Failed to send "${w.title}": ${err.message}`);
  }
}

process.exit(failures ? 1 : 0);
