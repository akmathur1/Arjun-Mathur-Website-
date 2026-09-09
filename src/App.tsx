import React, { useEffect, useState } from 'react';

const COLORS = {
  bg: '#EDECE8',
  text: '#1a1a1a',
  muted: '#696969', // 4.64:1 on bg; #7a7a7a was 3.63:1 and failed WCAG AA
  line: '#1a1a1a',
};

const GITHUB_USER = 'akmathur1';

// Contribution squares in the site's ink, not GitHub green, so the panel reads as
// part of the page. Index maps directly to the API's 0-4 level.
const LEVEL_INK = [
  'rgba(26,26,26,0.07)',
  'rgba(26,26,26,0.26)',
  'rgba(26,26,26,0.46)',
  'rgba(26,26,26,0.68)',
  'rgba(26,26,26,0.92)',
];

// Hand-maintained on purpose: neither Fidelity nor Monarch exposes an API a static
// site can read, and no credential can live in a public JS bundle. Percentages only —
// no balances, no dollar amounts. A row with percent: null is SKIPPED rather than
// rendered as a guess, so benchmarks stay hidden until real figures are filled in.
const INVESTMENTS: {
  period: string;
  rows: { label: string; percent: number | null }[];
} = {
  period: 'Last 3 months',
  rows: [
    { label: 'Portfolio', percent: 7.59 },
    { label: 'S&P 500', percent: 3.88 },
    { label: 'US Stocks', percent: 3.83 },
    { label: 'US Bonds', percent: -1.49 },
  ],
};

const CAL_DAYS = 182; // 26 weeks, sized to leave room for the investments panel
const CAL_CELL = 7;
const CAL_GAP = 2;
const CAL_WEEKS = Math.ceil(CAL_DAYS / 7) + 1;
const CAL_WIDTH = CAL_WEEKS * (CAL_CELL + CAL_GAP) - CAL_GAP;

const TIER_STYLE: Record<'featured' | 'boxed', React.CSSProperties> = {
  featured: {
    border: `2px solid ${COLORS.text}`,
    boxShadow: `6px 6px 0 ${COLORS.text}`,
    padding: '14px 18px',
  },
  boxed: {
    border: '1px solid rgba(26,26,26,0.18)',
    padding: '14px 18px',
  },
};

const SERIF = '"Newsreader", "Tiempos Headline", "Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

type View =
  | { name: 'home' }
  | { name: 'project'; slug: string }
  | { name: 'investments' }
  | { name: 'books' };

// Work and Contact have no page behind them yet, so they stay plain anchors; an entry
// with a view routes instead of jumping to a fragment.
const NAV: { label: string; view?: View }[] = [
  { label: 'Home', view: { name: 'home' } },
  { label: 'Work' },
  { label: 'Investments', view: { name: 'investments' } },
  { label: 'Books', view: { name: 'books' } },
  { label: 'Contact' },
];

type Book = {
  title: string;
  author: string;
  note?: string;
};

// Placeholder shelf, same convention as WRITINGS — swap in real titles.
const BOOKS: Book[] = [
  {
    title: 'First Book Title',
    author: 'Author Name',
    note: 'A line on why it stuck — placeholder until the real note goes in.',
  },
  {
    title: 'Second Book Title',
    author: 'Author Name',
    note: 'Another placeholder. Notes are optional; a bare title and author reads fine.',
  },
  {
    title: 'Third Book Title',
    author: 'Author Name',
  },
  {
    title: 'Fourth Book Title',
    author: 'Author Name',
    note: 'Final placeholder, showing the spacing across a longer shelf.',
  },
];

type Entry = {
  slug?: string;
  title: React.ReactNode;
  date: string;
  description: string;
  // Physical Intelligence gives entries three weights: the newest gets a heavy rule
  // and a hard offset shadow, older highlights get a hairline box, the rest run bare.
  tier?: 'featured' | 'boxed';
  thumbnail?: React.ReactNode;
  poster?: { src: string; alt: string };
};

const FUSThumbnail: React.FC = () => (
  <img
    src="/projects/fus/pipeline.png"
    alt="Physics-informed basis and ML parameterization pipeline"
    style={{
      display: 'block',
      width: 150,
      maxWidth: '100%',
      height: 'auto',
      border: `1px solid ${COLORS.text}`,
      background: COLORS.bg,
    }}
  />
);

const OvarianMTLThumbnail: React.FC = () => (
  <img
    src="/projects/ovarian-mtl/pipeline.png"
    alt="OvarianMTLNet pipeline: DESeq2 preprocessing, FetterGrad training, multitask architecture with response and progression heads"
    style={{
      display: 'block',
      width: 150,
      maxWidth: '100%',
      height: 'auto',
      border: `1px solid ${COLORS.text}`,
      background: COLORS.bg,
    }}
  />
);

const ENTRIES: Entry[] = [
  {
    slug: 'fus-idp-hamiltonians',
    title: 'Coarse-Grained Hamiltonians for FUS-Derived IDPs',
    date: 'August 2025 — present',
    description:
      'Sequence-resolved coarse-grained Hamiltonians for FUS-derived intrinsically disordered protein variants. MPIPI parameterization, Langevin dynamics, and density–temperature phase diagrams probing sequence-dependent condensate organization. With Dr. Trevor GrandPré.',
    tier: 'featured',
    thumbnail: <FUSThumbnail />,
  },
  {
    slug: 'ovarian-mtl',
    title: 'OvarianMTL Algorithm ML Infrastructure (Mayo Clinic)',
    date: 'May 2025 — August 2025',
    description:
      "Developed a multi-task machine learning framework for predicting individualized chemotherapy response and progression risk in recurrent high-grade serous ovarian cancer using RNA-seq profiles from 89 patient-derived xenograft (PDX) models. Constructed a transcriptomics pipeline combining DESeq2 differential expression analysis (~20,000 genes → ~1,500 predictive biomarkers), FetterGrad feature selection, nested cross-validation, and ensemble learning with XGBoost and penalized logistic regression. Designed OvarianMTLNet, a dual-head neural architecture jointly estimating therapeutic response and progression probabilities across Topotecan, Gemcitabine, Doxorubicin, Carboplatin, and Paclitaxel cohorts. Achieved ROC-AUCs up to 0.969 on held-out datasets and leveraged SHAP attribution analysis to identify biologically interpretable gene programs associated with chemotherapy sensitivity and resistance. Research conducted under Dr. Aadel Chaudhuri within Mayo Clinic Radiation Oncology.",
    tier: 'boxed',
    thumbnail: <OvarianMTLThumbnail />,
  },
  {
    title: 'Third Entry Title',
    date: 'February 18, 2026',
    description: 'Description text that can wrap onto two lines if needed, like the reference layout.',
  },
  {
    title: 'Fourth Entry Title',
    date: 'January 9, 2026',
    description: 'Another placeholder description — swap this for the real summary later.',
  },
  {
    title: 'Fifth Entry Title',
    date: 'November 21, 2025',
    description: 'Final placeholder entry to show the timeline rhythm and spacing.',
  },
];

const App: React.FC = () => {
  const [view, setView] = useState<View>({ name: 'home' });

  if (view.name === 'project') {
    return <ProjectPage slug={view.slug} onNavigate={setView} />;
  }
  if (view.name === 'investments') {
    return <InvestmentsPage onNavigate={setView} />;
  }
  if (view.name === 'books') {
    return <BooksPage onNavigate={setView} />;
  }
  return <Home onNavigate={setView} />;
};

const PageShell: React.FC<{
  onNavigate: (v: View) => void;
  maxWidth?: number;
  children: React.ReactNode;
}> = ({ onNavigate, maxWidth = 720, children }) => (
  <div
    style={{
      minHeight: '100vh',
      background: COLORS.bg,
      color: COLORS.text,
      padding: 'clamp(28px, 5vw, 56px) clamp(20px, 4vw, 56px) 120px',
    }}
  >
    <div style={{ maxWidth }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'flex-start',
          flexWrap: 'wrap',
          gap: 'clamp(16px, 4vw, 56px)',
        }}
      >
        <h1
          onClick={() => onNavigate({ name: 'home' })}
          style={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: 34,
            letterSpacing: -0.2,
            color: COLORS.text,
            cursor: 'pointer',
          }}
        >
          Arjun Mathur
        </h1>
        <nav
          style={{
            display: 'flex',
            gap: 18,
            fontFamily: MONO,
            fontSize: 14,
          }}
        >
          {NAV.map(({ label, view }) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              onClick={(e) => {
                if (view) {
                  e.preventDefault();
                  onNavigate(view);
                }
              }}
              style={{
                color: COLORS.text,
                textDecoration: 'underline',
                textUnderlineOffset: 6,
                textDecorationThickness: 1,
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      {children}
    </div>
  </div>
);

type ContribDay = { date: string; count: number; level: number };

// GitHub's contribution graph is not exposed by the public REST API, so this reads
// a CORS-enabled mirror of the same data. Failure is non-fatal: the panel hides.
const ContributionCalendar: React.FC = () => {
  const [days, setDays] = useState<ContribDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { contributions: ContribDay[] }) => {
        if (alive) setDays(data.contributions.slice(-CAL_DAYS));
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;

  // Pad the leading column so each row is a fixed weekday, the way GitHub aligns it.
  let weeks: (ContribDay | null)[][] = [];
  if (days && days.length) {
    const cells: (ContribDay | null)[] = [];
    const lead = new Date(`${days[0].date}T00:00:00`).getDay();
    for (let i = 0; i < lead; i += 1) cells.push(null);
    days.forEach((d) => cells.push(d));
    while (cells.length % 7 !== 0) cells.push(null);
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  } else {
    // Reserve the same footprint while loading so nothing shifts underneath.
    weeks = Array.from({ length: CAL_WEEKS }, () => Array(7).fill(null));
  }

  const total = days ? days.reduce((n, d) => n + d.count, 0) : 0;

  // Pinned to the grid's own width so the caption wraps inside the panel rather than
  // setting the panel's width from its own max-content.
  return (
    <aside style={{ width: CAL_WIDTH, maxWidth: '100%' }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: COLORS.text }}>
        Activity
      </div>

      <p
        style={{
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.65,
          color: COLORS.muted,
          marginTop: 8,
        }}
      >
        {days ? `${total.toLocaleString()} contributions in the last ${CAL_DAYS} days` : '\u00a0'}
        {days ? ' on ' : ''}
        {days && (
          <a
            href={`https://github.com/${GITHUB_USER}`}
            target="_blank"
            rel="noreferrer"
            style={{
              color: COLORS.text,
              textDecoration: 'underline',
              textUnderlineOffset: 4,
              textDecorationThickness: 1,
            }}
          >
            @{GITHUB_USER}
          </a>
        )}
        {days ? '.' : ''}
      </p>

      <div style={{ display: 'flex', gap: CAL_GAP, marginTop: 14, overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: CAL_GAP }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.count} on ${day.date}` : undefined}
                style={{
                  width: CAL_CELL,
                  height: CAL_CELL,
                  background: day ? LEVEL_INK[day.level] : 'transparent',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          fontFamily: MONO,
          fontSize: 11,
          color: COLORS.muted,
        }}
      >
        <span>Less</span>
        {LEVEL_INK.map((ink) => (
          <div key={ink} style={{ width: CAL_CELL, height: CAL_CELL, background: ink }} />
        ))}
        <span>More</span>
      </div>
    </aside>
  );
};

// Placeholder writings — same shape as ENTRIES so both columns share TimelineRow.
// Tier mix mirrors Physical Intelligence: newest carries the shadow, the rest vary.
const WRITINGS: Entry[] = [
  {
    title: 'First Writing Title',
    date: 'March 4, 2026',
    description:
      'Placeholder description — swap for the real essay summary. Two lines here matches the rhythm of the reference layout.',
    tier: 'featured',
  },
  {
    title: 'Second Writing Title',
    date: 'January 22, 2026',
    description: 'Another placeholder. Short entries run bare, with no box around them.',
  },
  {
    title: 'Third Writing Title',
    date: 'December 9, 2025',
    description: 'Placeholder text for a third piece, kept to roughly two lines.',
  },
  {
    title: 'Fourth Writing Title',
    date: 'October 30, 2025',
    description:
      'A boxed placeholder, showing the hairline treatment used for older highlights.',
    tier: 'boxed',
  },
];

const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;

// A losing benchmark still has bar length, so a solid bar would read as a gain.
// Negative rows get a hollow bar; the sign stays on the number either way.
const BenchmarkRow: React.FC<{
  label: string;
  percent: number;
  peak: number;
  size?: number;
}> = ({ label, percent, peak, size = 12 }) => (
  <div>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: MONO,
        fontSize: size,
        color: COLORS.muted,
      }}
    >
      <span style={{ minWidth: 0 }}>{label}</span>
      <span style={{ flexShrink: 0 }}>{pct(percent)}</span>
    </div>
    <div style={{ height: 3, marginTop: 5, background: 'rgba(26,26,26,0.10)' }}>
      <div
        style={{
          height: 3,
          width: `${(Math.abs(percent) / peak) * 100}%`,
          background: percent >= 0 ? COLORS.text : 'transparent',
          border: percent >= 0 ? 'none' : `1px solid ${COLORS.muted}`,
          boxSizing: 'border-box',
        }}
      />
    </div>
  </div>
);

const InvestmentsPanel: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const rows = INVESTMENTS.rows.filter(
    (r): r is { label: string; percent: number } => r.percent !== null
  );
  if (!rows.length) return null;

  const [head, ...benchmarks] = rows;
  const peak = Math.max(...rows.map((r) => Math.abs(r.percent)));

  return (
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <a
        href="#investments"
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.text,
          textDecoration: 'underline',
          textUnderlineOffset: 5,
          textDecorationThickness: 1,
        }}
      >
        Investments
      </a>

      <p
        style={{
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.65,
          color: COLORS.muted,
          marginTop: 8,
        }}
      >
        {INVESTMENTS.period}.
      </p>

      <div
        style={{
          fontFamily: SERIF,
          fontSize: 34,
          letterSpacing: -0.5,
          color: COLORS.text,
          marginTop: 14,
        }}
      >
        {pct(head.percent)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
        {head.label}
      </div>

      {benchmarks.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {benchmarks.map((r) => (
            <BenchmarkRow key={r.label} label={r.label} percent={r.percent} peak={peak} />
          ))}
        </div>
      )}
    </div>
  );
};

const InvestmentsPage: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => {
  const rows = INVESTMENTS.rows.filter(
    (r): r is { label: string; percent: number } => r.percent !== null
  );
  const peak = rows.length ? Math.max(...rows.map((r) => Math.abs(r.percent))) : 1;

  return (
    <PageShell onNavigate={onNavigate}>
      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          onNavigate({ name: 'home' });
        }}
        style={{
          display: 'inline-block',
          marginTop: 48,
          fontFamily: MONO,
          fontSize: 14,
          color: COLORS.muted,
          textDecoration: 'none',
        }}
      >
        ← back
      </a>

      <article style={{ marginTop: 28 }}>
        <h2
          style={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: 26,
            letterSpacing: -0.2,
            color: COLORS.text,
          }}
        >
          Investments
        </h2>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 14,
            lineHeight: 1.75,
            maxWidth: 640,
            marginTop: 20,
            color: COLORS.text,
          }}
        >
          Portfolio performance against benchmarks over the trailing three months.
          Percentages only — no balances or positions.
        </p>

        <div
          style={{
            marginTop: 32,
            maxWidth: 460,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {rows.map((r) => (
            <BenchmarkRow
              key={r.label}
              label={r.label}
              percent={r.percent}
              peak={peak}
              size={14}
            />
          ))}
        </div>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 13,
            lineHeight: 1.6,
            maxWidth: 640,
            marginTop: 48,
            color: COLORS.muted,
          }}
        >
          Holdings, allocation, and a longer performance history to come.
        </p>
      </article>
    </PageShell>
  );
};

const BookRow: React.FC<{ book: Book }> = ({ book }) => (
  <div>
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.text,
          minWidth: 0,
        }}
      >
        {book.title}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 14,
          color: COLORS.muted,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {book.author}
      </span>
    </div>

    {book.note && (
      <div
        style={{
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.65,
          color: COLORS.muted,
          marginTop: 6,
        }}
      >
        {book.note}
      </div>
    )}
  </div>
);

const BooksPage: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => (
  <PageShell onNavigate={onNavigate}>
    <a
      href="#home"
      onClick={(e) => {
        e.preventDefault();
        onNavigate({ name: 'home' });
      }}
      style={{
        display: 'inline-block',
        marginTop: 48,
        fontFamily: MONO,
        fontSize: 14,
        color: COLORS.muted,
        textDecoration: 'none',
      }}
    >
      ← back
    </a>

    <article style={{ marginTop: 28 }}>
      <h2
        style={{
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: 26,
          letterSpacing: -0.2,
          color: COLORS.text,
        }}
      >
        Books
      </h2>

      <p
        style={{
          fontFamily: MONO,
          fontSize: 14,
          lineHeight: 1.75,
          maxWidth: 640,
          marginTop: 20,
          color: COLORS.text,
        }}
      >
        What I'm reading, and the books that shaped how I think about computation,
        systems, and markets.
      </p>

      <div
        style={{
          marginTop: 32,
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {BOOKS.map((book) => (
          <BookRow key={book.title} book={book} />
        ))}
      </div>
    </article>
  </PageShell>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    style={{
      fontFamily: SERIF,
      fontWeight: 400,
      fontSize: 22,
      letterSpacing: -0.2,
      color: COLORS.text,
    }}
  >
    {children}
  </h2>
);

const Timeline: React.FC<{ entries: Entry[]; onOpen?: (entry: Entry) => void }> = ({
  entries,
  onOpen,
}) => (
  <section style={{ position: 'relative', marginTop: 24 }}>
    <div
      style={{
        position: 'absolute',
        left: 4,
        top: 12,
        bottom: 12,
        width: 1,
        background: COLORS.line,
      }}
    />

    {entries.map((entry, i) => (
      <TimelineRow
        key={i}
        entry={entry}
        last={i === entries.length - 1}
        onOpen={entry.slug && onOpen ? () => onOpen(entry) : undefined}
      />
    ))}
  </section>
);

const Home: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => (
  <PageShell onNavigate={onNavigate} maxWidth={1296}>
    <div
      style={{
        display: 'flex',
        gap: 56,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginTop: 32,
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: 14,
          lineHeight: 1.75,
          color: COLORS.text,
          flex: '1 1 520px',
          maxWidth: 700,
          minWidth: 0,
        }}
      >
        I'm Arjun Mathur, founder of Molterra. I spend most of my time thinking about
        computation, large systems, and the strange ways technology shapes the physical
        world around us. My work sits closest to industrial software and scientific
        infrastructure, especially in places where important work still depends on
        fragmented tools and human intuition. I'm interested in building systems that
        quietly accelerate progress behind the scenes. Outside of that, I write
        occasionally about technology, research, markets, and ideas that feel a little
        ahead of their time.
      </p>

      {/* Same flex basis as the Writings column below, so the panel's edges line up
          with that column instead of floating on their own. */}
      <div
        style={{
          flex: '1 1 420px',
          maxWidth: 540,
          minWidth: 0,
          display: 'flex',
          // Column gap is halved because the divider sits between the two panels and
          // takes a gap on each side; row gap is the spacing used once they stack.
          gap: '28px 14px',
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}
      >
        <ContributionCalendar />
        <div className="panel-divider" />
        <InvestmentsPanel onOpen={() => onNavigate({ name: 'investments' })} />
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        gap: 56,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginTop: 56,
      }}
    >
      <div style={{ flex: '1 1 520px', maxWidth: 700, minWidth: 0 }}>
        <SectionHeading>Research</SectionHeading>
        <Timeline
          entries={ENTRIES}
          onOpen={(entry) => onNavigate({ name: 'project', slug: entry.slug as string })}
        />
      </div>

      <div style={{ flex: '1 1 420px', maxWidth: 540, minWidth: 0 }}>
        <SectionHeading>Writings</SectionHeading>
        <Timeline entries={WRITINGS} />
      </div>
    </div>
  </PageShell>
);

const TimelineRow: React.FC<{ entry: Entry; last: boolean; onOpen?: () => void }> = ({
  entry,
  last,
  onOpen,
}) => {
  const bulletSize = 9;
  const contentLeft = 44;
  const [hover, setHover] = useState(false);

  const titleAndDate = (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        // Without wrap the nowrap date has no way out of a narrow column and renders
        // straight through the tier border; let it drop to its own line instead.
        flexWrap: 'wrap',
        gap: 24,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.text,
          minWidth: 0,
        }}
      >
        {entry.title}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 14,
          color: COLORS.muted,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {entry.date}
      </span>
    </div>
  );

  const description = (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.65,
        color: COLORS.muted,
        marginTop: 6,
      }}
    >
      {entry.description}
    </div>
  );

  const textCol = (
    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
      {titleAndDate}
      {description}
    </div>
  );

  const boxContent = entry.thumbnail ? (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flexShrink: 0, maxWidth: '100%' }}>{entry.thumbnail}</div>
      {textCol}
    </div>
  ) : (
    <>
      {titleAndDate}
      {description}
    </>
  );

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: contentLeft,
        marginBottom: last ? 0 : 32,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 4 - bulletSize / 2 + 0.5,
          top: 6,
          width: bulletSize,
          height: bulletSize,
          borderRadius: '50%',
          background: COLORS.text,
        }}
      />
      <div
        onClick={onOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onKeyDown={(e) => {
          if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpen();
          }
        }}
        style={{
          ...(entry.tier
            ? TIER_STYLE[entry.tier]
            : {
                padding: onOpen ? '4px 6px' : 0,
                marginLeft: onOpen ? -6 : 0,
                marginRight: onOpen ? -6 : 0,
              }),
          cursor: onOpen ? 'pointer' : 'default',
          background: hover && onOpen ? 'rgba(26,26,26,0.04)' : 'transparent',
          transition: 'background 120ms ease',
        }}
      >
        {boxContent}
      </div>
    </div>
  );
};

const ProjectPage: React.FC<{ slug: string; onNavigate: (v: View) => void }> = ({
  slug,
  onNavigate,
}) => {
  const entry = ENTRIES.find((e) => e.slug === slug);

  return (
    <PageShell onNavigate={onNavigate}>
      <a
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          onNavigate({ name: 'home' });
        }}
        style={{
          display: 'inline-block',
          marginTop: 48,
          fontFamily: MONO,
          fontSize: 14,
          color: COLORS.muted,
          textDecoration: 'none',
        }}
      >
        ← back
      </a>

      {!entry ? (
        <p style={{ fontFamily: MONO, marginTop: 32, color: COLORS.muted }}>
          Project not found.
        </p>
      ) : (
        <article style={{ marginTop: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 400,
                fontSize: 26,
                letterSpacing: -0.2,
                color: COLORS.text,
                maxWidth: 540,
              }}
            >
              {entry.title}
            </h2>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: COLORS.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {entry.date}
            </span>
          </div>

          {entry.poster && (
            <figure style={{ marginTop: 40 }}>
              <img
                src={entry.poster.src}
                alt={entry.poster.alt}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  border: `1px solid ${COLORS.text}`,
                  background: '#fff',
                }}
              />
            </figure>
          )}

          {slug === 'fus-idp-hamiltonians' ? (
            <FUSProjectBody />
          ) : slug === 'ovarian-mtl' ? (
            <OvarianMTLProjectBody />
          ) : (
            <p
              style={{
                fontFamily: MONO,
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 640,
                marginTop: 32,
                color: COLORS.text,
              }}
            >
              {entry.description}
            </p>
          )}
        </article>
      )}
    </PageShell>
  );
};

const BodyParagraph: React.FC<{ children: React.ReactNode; top?: number }> = ({
  children,
  top = 24,
}) => (
  <p
    style={{
      fontFamily: MONO,
      fontSize: 14,
      lineHeight: 1.75,
      maxWidth: 640,
      marginTop: top,
      color: COLORS.text,
    }}
  >
    {children}
  </p>
);

const InlineFigure: React.FC<{ src: string; alt: string; caption: React.ReactNode }> = ({
  src,
  alt,
  caption,
}) => (
  <figure style={{ marginTop: 36, maxWidth: 640 }}>
    <img
      src={src}
      alt={alt}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        border: `1px solid ${COLORS.text}`,
        background: '#fff',
      }}
    />
    <figcaption
      style={{
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: 1.6,
        color: COLORS.muted,
        marginTop: 10,
        maxWidth: 640,
      }}
    >
      {caption}
    </figcaption>
  </figure>
);

const FUSProjectBody: React.FC = () => (
  <div style={{ marginTop: 32 }}>
    <BodyParagraph top={0}>
      Sequence-resolved coarse-grained Hamiltonians for FUS-derived intrinsically
      disordered protein variants. This work explores how emergent condensate behavior
      can be reconstructed from reduced interaction representations while preserving
      the dominant thermodynamic structure governing intrinsically disordered systems.
    </BodyParagraph>

    <BodyParagraph>
      Our current framework combines MPIPI interaction parameterization, stochastic
      Langevin dynamics, and coarse-grained phase simulations to study how local
      sequence-level perturbations propagate into mesoscale condensate organization.
      Rather than treating phase separation as a purely phenomenological process, the
      objective is to recover the latent energetic structure that governs density
      stabilization, condensate topology, and sequence-dependent phase transitions.
    </BodyParagraph>

    <BodyParagraph>
      A major computational focus is dimensional reduction of high-dimensional
      interaction tensors into physically interpretable Hamiltonian representations.
      We are particularly interested in whether a constrained subset of interaction
      modes can preserve the dominant statistical mechanics of the full molecular
      system while dramatically reducing computational complexity. Early results
      suggest that many emergent condensate properties may lie on compact energetic
      manifolds that can be reconstructed from lower-dimensional coarse-grained
      operators.
    </BodyParagraph>

    <BodyParagraph>
      The computational infrastructure is built primarily in Julia to support
      scalable numerical simulation, differentiable scientific computing, and
      high-performance tensor operations. Current systems integrate
      DifferentialEquations.jl, CUDA.jl, StaticArrays.jl, LinearAlgebra,
      KernelDensity.jl, Flux.jl, and custom simulation tooling designed for
      large-scale stochastic biomolecular dynamics. Julia has been especially
      valuable for combining high-level scientific abstraction with low-level
      numerical performance, allowing rapid iteration on Hamiltonian formulations,
      parameter sweeps, and GPU-accelerated phase simulations without sacrificing
      computational efficiency.
    </BodyParagraph>

    <BodyParagraph>
      A significant inspiration for this direction comes from recent work in
      physics-constrained neural Hamiltonians and coarse-grained electronic
      structure modeling. In particular, the Orbital Electronic Coarse Graining
      framework introduced by Maier and Jackson proposes a physically constrained
      Hamiltonian learning approach where reduced overlap operators are used to
      reconstruct emergent electronic structure from compressed molecular
      representations. Their work is compelling because it moves beyond purely
      black-box regression and instead attempts to preserve physically meaningful
      operator structure during dimensional reduction.
    </BodyParagraph>

    <BodyParagraph>
      At the same time, we view many current coarse-graining approaches as still
      fundamentally limited by static projection assumptions and constrained
      representations of emergent dynamics. Existing methods often preserve local
      observables while losing higher-order collective structure, particularly
      under nonequilibrium evolution or strongly fluctuating condensate regimes.
      In systems like intrinsically disordered proteins, where transient
      interaction networks and sequence-specific fluctuations dominate
      organization, preserving only low-order averaged structure may fail to
      capture the true dynamical landscape governing condensate evolution.
    </BodyParagraph>

    <BodyParagraph>
      Our work attempts to move further toward adaptive Hamiltonian systems that
      evolve directly with sequence-conditioned interaction geometry. Rather than
      projecting dynamics into a fixed reduced basis, we are exploring whether
      latent energetic manifolds themselves can become learnable dynamical objects
      capable of continuously restructuring under changing thermodynamic
      conditions.
    </BodyParagraph>

    <BodyParagraph>
      We are also heavily interested in weak-form Hamiltonian learning and
      coarse-grained surrogate modeling frameworks inspired by recent work on
      WSINDy-based Hamiltonian reduction. That work demonstrates that weak-form
      equation learning can recover reduced Hamiltonian structure directly from
      noisy dynamical trajectories while preserving physically meaningful
      invariants. The broader implication is extremely important for biomolecular
      systems: large-scale thermodynamic organization may be recoverable from
      sparse observed dynamics without requiring full reconstruction of
      microscopic degrees of freedom.
    </BodyParagraph>

    <InlineFigure
      src="/projects/fus/wsindy-trajectories.png"
      alt="WSINDy multi-model Hamiltonian inference: trajectories recovered at increasing forcing scales"
      caption={
        <>
          <strong>Fig. 1.</strong> Multi-model Hamiltonian recovery via weak-form
          sparse identification. Trajectories Ẑ (cyan, yellow, red) learned by
          WSINDy from noisy data Z (black) of a nearly-periodic two-oscillator
          system, evaluated across σ<sub>φf</sub> ∈ {'{'}1, 4, 16{'}'}. As the
          forcing scale grows, the inferred Hamiltonian transitions from the
          limiting roto-rate H<sub>0</sub>, through the full system H<sub>ε</sub>,
          to the leading-order reduced Hamiltonian H<sub>0</sub><sup>μ</sup> —
          recovering the adiabatic invariant directly from trajectory statistics.
          The lower panels show true-positive rates and parameter-error norms
          remaining high across model classes, evidencing robustness of the weak
          form under multi-scale separation and additive noise. The analogue we
          care about: in IDP condensates, fast intra-residue motions screen slow
          collective reorganization in much the same way σ<sub>φf</sub>
          parameterizes here.
        </>
      }
    />

    <InlineFigure
      src="/projects/fus/wsindy-two-oscillator.png"
      alt="Two-oscillator Hamiltonian system: equations of motion and averaged reduced Hamiltonian"
      caption={
        <>
          <strong>Fig. 2.</strong> Canonical fast–slow Hamiltonian testbed (Eq. 28).
          Fast variables (Q, P) on 𝒪(1) timescales couple to slow variables
          (q, p) on 𝒪(ε) timescales through V(Q, q) = Qq sin(2Q + 2q). The
          limiting adiabatic invariant μ<sub>0</sub> = ½(Q² + P²) labels orbits of
          the roto-rate R<sub>0</sub>, and averaging H<sub>ε</sub> around the
          time-t flow yields a reduced Hamiltonian H<sub>0</sub><sup>μ</sup>(q, p)
          expressible analytically in terms of Bessel functions of the first kind.
          The structural lesson carries directly to biomolecular condensates: a
          clean separation between bonded backbone oscillation and slow density
          reorganization should admit a similarly tractable averaged Hamiltonian,
          and the sin(2Q + 2q)-style coupling is a useful caricature of
          aromatic-sticker periodicity along the disordered chain.
        </>
      }
    />

    <InlineFigure
      src="/projects/fus/wsindy-henon-heiles.png"
      alt="Hénon–Heiles embedded pendulum: 3-DOF Hamiltonian with elliptic-integral angular frequency"
      caption={
        <>
          <strong>Fig. 3.</strong> Hénon–Heiles embedded pendulum (Example 2). A
          3-DOF Hamiltonian of the form H<sub>ε</sub>(z) = ½P² + α²(1 − cos Q) +
          ε H<sub>1</sub>(z), separating a pendulum subsystem from two
          slow-coupled oscillators. The limiting angular frequency
          ω<sub>0</sub>(z) admits a closed form via the complete elliptic
          integral of the first kind, and the leading-order adiabatic invariant
          μ<sub>0</sub> reduces by averaging against the time-θ flow map
          Φ<sub>θ</sub>. This higher-dimensional case demonstrates that weak-form
          Hamiltonian reduction holds when fast–slow separation is mediated by
          strongly nonlinear potentials — the regime most relevant to IDP systems
          where cation-π, π-π, and aromatic-sticker interactions dominate
          condensate energetics and produce comparable elliptic-type closed-form
          structure under the right coordinate choice.
        </>
      }
    />

    <BodyParagraph top={40}>
      Long-term, the goal is to develop scalable computational architectures
      capable of bridging molecular-scale interaction statistics with emergent
      condensate physics across biologically relevant systems. Future directions
      include differentiable Hamiltonian learning, adaptive coarse-grained basis
      evolution, latent phase landscape reconstruction, inverse interaction
      estimation, and physically constrained generative simulation systems capable
      of learning reduced thermodynamic structure directly from trajectory
      evolution.
    </BodyParagraph>

    <p
      style={{
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.6,
        maxWidth: 640,
        marginTop: 48,
        color: COLORS.muted,
      }}
    >
      Figures, simulation studies, and full technical write-up currently in
      development with Dr. Trevor GrandPré.
    </p>
  </div>
);

const OvarianMTLProjectBody: React.FC = () => (
  <div style={{ marginTop: 32 }}>
    <p
      style={{
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.6,
        color: COLORS.muted,
        marginTop: 0,
        marginBottom: 24,
        letterSpacing: 0.3,
      }}
    >
      Multitask Neural Networks for Ovarian Cancer Drug Response Prediction · Mayo
      Clinic · Dr. Aadel Chaudhuri's group
    </p>

    <BodyParagraph top={0}>
      Constructed a transcriptomics-driven multi-task classification pipeline for
      recurrent HGSOC therapeutic response modeling using RNA-seq profiles from 89
      paired PDX tumor models. The objective was to convert high-dimensional
      expression data into calibrated, biologically interpretable predictions of
      drug response and progression risk under the severe sample-size constraints
      that define rare-disease oncology.
    </BodyParagraph>

    <BodyParagraph>
      Implemented DESeq2 normalization and differential expression testing to
      reduce dimensionality from ~20k transcripts to ~1.5k predictive genes,
      followed by FetterGrad feature selection and nested K-fold cross-validation
      to prevent leakage between hyperparameter tuning and outer evaluation. This
      pruning step was critical: the transcriptomic signal-to-noise ratio in
      paired PDX cohorts is dominated by low-variance housekeeping transcripts
      and donor-batch effects, both of which corrupt downstream gradient signal
      if left in the feature space.
    </BodyParagraph>

    <BodyParagraph>
      Designed a shared-representation neural architecture with task-specific
      output heads estimating P(Response) and P(Progression), trained via Adam
      optimization under severe class imbalance and limited sample constraints.
      The shared trunk exploits the strong positive correlation between
      response and progression labels — the two tasks regularize each other,
      and the multitask formulation acts as an inductive prior far more
      effective than independent single-task models on this data scale.
    </BodyParagraph>

    <BodyParagraph>
      Benchmarked against gradient-boosted decision trees and penalized logistic
      regression classifiers, achieving state-of-the-art discrimination (AUC up
      to 0.969) across multiple second-line chemotherapeutic agents. The shared
      representation outperformed both baselines on the agents with the smallest
      effective sample size, consistent with the expectation that
      cross-task gradient sharing dominates when single-task data is sparse.
    </BodyParagraph>

    <BodyParagraph>
      Applied SHAP-based attribution analysis to recover biologically meaningful
      gene programs driving treatment efficacy and progression risk, enabling
      interpretable precision-oncology predictions from high-dimensional
      transcriptomic data. The attribution maps localized predictive signal to
      pathways with prior literature support for HGSOC chemoresistance, providing
      a path from black-box prediction to mechanistic hypothesis generation for
      downstream wet-lab validation.
    </BodyParagraph>

    <p
      style={{
        fontFamily: MONO,
        fontSize: 13,
        lineHeight: 1.6,
        maxWidth: 640,
        marginTop: 48,
        color: COLORS.muted,
      }}
    >
      Three models built. Average AUC: 0.85 across drug response prediction
      tasks. Best-performing agent AUC: 0.969.
    </p>
  </div>
);

export default App;
