// Vercel serverless function: POST { email } stores the address in the project's
// private Vercel Blob store (writings-subscribers), one small JSON record per address
// at subscribers/<sha256(email)>.json. scripts/announce-writings.mjs reads the same
// records when a new essay is pushed, and api/unsubscribe.js deletes one.
//
// Needs BLOB_READ_WRITE_TOKEN, which Vercel sets on the project for the connected store.
//
// Plain CommonJS on purpose. The TypeScript version of this file was compiled by
// Vercel into a module that kept `export default`, and with no "type": "module" in
// package.json the Node 24 runtime read it as CommonJS and threw a SyntaxError on
// every request. A .js file with module.exports has nothing to compile.

const { createHash, randomBytes } = require('node:crypto');
const { head, put, BlobNotFoundError } = require('@vercel/blob');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const recordPath = (email) =>
  `subscribers/${createHash('sha256').update(email).digest('hex')}.json`;

const isNotFound = (err) =>
  err instanceof BlobNotFoundError || (err && err.name === 'BlobNotFoundError');

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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('subscribe: BLOB_READ_WRITE_TOKEN not set');
    return res.status(500).json({ ok: false, error: 'Subscriptions are not set up yet.' });
  }

  const pathname = recordPath(email);
  try {
    // Already on the list: answer yes again rather than tell a visitor the address is known.
    try {
      await head(pathname);
      return res.status(200).json({ ok: true });
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }

    const record = {
      email,
      token: randomBytes(16).toString('hex'),
      subscribedAt: new Date().toISOString(),
    };
    await put(pathname, JSON.stringify(record), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Two first submits of one address racing: the second put trips over the first's record.
    if (err && /already exists/i.test(err.message || '')) {
      return res.status(200).json({ ok: true });
    }
    console.error(`subscribe: ${err && err.message}`);
    return res.status(502).json({ ok: false, error: 'Could not subscribe. Try again in a moment.' });
  }
};
