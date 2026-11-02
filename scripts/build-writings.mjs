// Turns writings/*.md into src/writings.json — the one file the home page list, the
// essay pages and the announce workflow all read. `npm run writings` runs it by hand;
// `npm run build` runs it first (prebuild), so a deploy can never ship the two out of
// sync. Files without front matter (README, STYLE, EDITOR-NOTES) are skipped.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const DIR = 'writings';
const OUT = 'src/writings.json';
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const fail = (msg) => {
  console.error(`build-writings: ${msg}`);
  process.exit(1);
};

// Front matter is `key: value` lines between two `---` fences. Quoted strings lose
// their quotes, `[a, b]` becomes an array, true/false become booleans.
function parse(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1);
    else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    fm[kv[1]] = v;
  }
  return { fm, body: m[2] };
}

function longDate(iso, file) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) fail(`${file}: date must be YYYY-MM-DD, got ${JSON.stringify(iso)}`);
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

const records = [];
const warnings = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()) {
  const parsed = parse(readFileSync(join(DIR, file), 'utf8'));
  if (!parsed) continue;
  const { fm } = parsed;
  for (const key of ['title', 'date', 'summary']) {
    if (!fm[key]) fail(`${file}: front matter is missing ${key}`);
  }

  // The body ends where the Sources block begins; everything before it is prose.
  // Sources stay in the markdown as the fact-checking record and are not published —
  // they are parsed only so they never leak into the body, and so a malformed line
  // still gets a warning.
  let body = parsed.body.trim();
  const sources = [];
  const split = /\n[ \t]*Sources?:[ \t]*\n([\s\S]*)$/i.exec(`\n${body}`);
  if (split) {
    for (const line of split[1].split('\n')) {
      // Greedy to the line's final ')' so a URL with its own parentheses survives.
      const link = /^\s*-\s*\[([^\]]+)\]\((.+)\)\s*$/.exec(line);
      if (link) sources.push({ text: link[1], url: link[2] });
      else if (line.trim()) warnings.push(`${file}: unparsed source line: ${line.trim()}`);
    }
    body = body.slice(0, split.index).trim();
  }
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // House style: no headers, lists or bold in the body. Warn rather than fail — the
  // author may be mid-draft — but say so, because the page renders them literally.
  for (const p of paragraphs) {
    if (/^#/.test(p)) warnings.push(`${file}: a paragraph begins with a header mark`);
    if (/\*\*/.test(p)) warnings.push(`${file}: bold is not rendered`);
    if (/^- /.test(p)) warnings.push(`${file}: a bullet in the body is not rendered`);
    if (/\]\(/.test(p)) warnings.push(`${file}: an inline link in the body is not rendered`);
  }

  const slug = basename(file, '.md');
  const pinned = fm.pinned === true;
  records.push({
    slug,
    title: fm.title,
    date: longDate(fm.date, file),
    description: fm.summary,
    tier: pinned ? 'featured' : fm.tier === 'boxed' ? 'boxed' : undefined,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    url: `/#/writings/${slug}`,
    announce: fm.announce !== false,
    pinned,
    body: paragraphs,
    _iso: String(fm.date),
  });
}

if (!records.length) fail(`no essays found in ${DIR}/`);
const pinnedCount = records.filter((r) => r.pinned).length;
if (pinnedCount > 1) fail(`${pinnedCount} essays are pinned; the home page carries one at a time`);
const seen = new Set();
for (const r of records) {
  if (seen.has(r.title)) fail(`two essays share the title ${JSON.stringify(r.title)}; the announce workflow keys on titles`);
  seen.add(r.title);
}

// Pinned first, then newest first, then by title so the order is stable from one run
// to the next regardless of the filesystem.
records.sort(
  (a, b) =>
    Number(b.pinned) - Number(a.pinned) ||
    b._iso.localeCompare(a._iso) ||
    a.title.localeCompare(b.title)
);
for (const r of records) delete r._iso;

writeFileSync(OUT, `${JSON.stringify(records, null, 2)}\n`);
for (const w of warnings) console.warn(`build-writings: warning: ${w}`);
console.log(
  `build-writings: ${records.length} essays → ${OUT}` +
    ` (${pinnedCount} pinned, ${records.filter((r) => !r.announce).length} with announce: false)`
);
