// Vercel serverless function behind the unsubscribe link in every announcement:
// /api/unsubscribe?e=<record id>&t=<token>. GET shows a one-line page; POST is the
// RFC 8058 one-click request a mail client sends when a reader uses its own
// unsubscribe button. Either way the record leaves the Blob store.
//
// Plain CommonJS, for the same reason as api/subscribe.js.

const { timingSafeEqual } = require('node:crypto');
const { get, del } = require('@vercel/blob');

const ID = /^[a-f0-9]{64}$/;
const TOKEN = /^[a-f0-9]{32}$/;

const page = (text) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arjun Mathur</title></head>
<body style="margin:0;padding:48px 20px;background:#EDECE8;color:#1a1a1a;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:14px;line-height:1.7">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0 0 24px">${text}</p>
    <p style="margin:0"><a href="https://arjunkmathur.com" style="color:#1a1a1a;text-decoration:underline;text-underline-offset:4px">arjunkmathur.com</a></p>
  </div>
</body></html>`;

const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send('Method not allowed.');
  }

  const query = req.query || {};
  const id = typeof query.e === 'string' ? query.e : '';
  const token = typeof query.t === 'string' ? query.t : '';
  const asPage = req.method === 'GET';
  const reply = (status, text) => {
    res.setHeader('Content-Type', asPage ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
    return res.status(status).send(asPage ? page(text) : `${text}\n`);
  };

  if (!ID.test(id) || !TOKEN.test(token)) {
    return reply(400, "That unsubscribe link isn't valid.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('unsubscribe: BLOB_READ_WRITE_TOKEN not set');
    return reply(500, 'Subscriptions are not set up yet.');
  }

  const pathname = `subscribers/${id}.json`;
  try {
    const found = await get(pathname, { access: 'private', useCache: false });
    if (!found || found.statusCode !== 200) {
      return reply(200, "You're already off the list.");
    }
    const record = JSON.parse(await new Response(found.stream).text());
    if (typeof record.token !== 'string' || !same(record.token, token)) {
      return reply(400, "That unsubscribe link isn't valid.");
    }
    await del(pathname);
    return reply(200, "You're unsubscribed. No more emails from arjunkmathur.com.");
  } catch (err) {
    console.error(`unsubscribe: ${err && err.message}`);
    return reply(502, "Couldn't unsubscribe just now. Try the link again in a moment.");
  }
};
