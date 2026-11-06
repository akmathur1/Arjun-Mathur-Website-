// Vercel serverless function: POST { email } adds the address to the Resend audience
// that scripts/announce-writings.mjs broadcasts to. Needs RESEND_API_KEY and
// RESEND_AUDIENCE_ID in the Vercel project's environment variables.
//
// Plain CommonJS on purpose. The TypeScript version of this file was compiled by
// Vercel into a module that kept `export default`, and with no "type": "module" in
// package.json the Node 24 runtime read it as CommonJS and threw a SyntaxError on
// every request. A .js file with module.exports has nothing to compile.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API = process.env.RESEND_API || 'https://api.resend.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const raw = req.body && typeof req.body === 'object' ? req.body.email : undefined;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });
  }

  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) {
    console.error('subscribe: RESEND_API_KEY / RESEND_AUDIENCE_ID not set');
    return res.status(500).json({ ok: false, error: 'Subscriptions are not set up yet.' });
  }

  const r = await fetch(`${RESEND_API}/audiences/${audience}/contacts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (r.ok) return res.status(200).json({ ok: true });

  // Re-subscribing an address already in the audience is not an error to the visitor.
  const detail = await r.text().catch(() => '');
  if (r.status === 409 || /already exists/i.test(detail)) {
    return res.status(200).json({ ok: true });
  }

  console.error(`subscribe: resend ${r.status} ${detail.slice(0, 300)}`);
  return res.status(502).json({ ok: false, error: 'Could not subscribe. Try again in a moment.' });
};
