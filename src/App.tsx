import React, { useEffect, useState } from 'react';
import writingsData from './writings.json';

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

// Positions only: tickers and names, deliberately no sizes, weights, values, or
// account details. Grouped by sector for scanning rather than by account.
type Holding = { ticker: string; name: string };
const HOLDINGS: { group: string; items: Holding[] }[] = [
  {
    group: 'Technology & semiconductors',
    items: [
      { ticker: 'AAPL', name: 'Apple' },
      { ticker: 'AMZN', name: 'Amazon' },
      { ticker: 'ANET', name: 'Arista Networks' },
      { ticker: 'ASML', name: 'ASML' },
      { ticker: 'COHR', name: 'Coherent' },
      { ticker: 'CRWV', name: 'CoreWeave' },
      { ticker: 'GLW', name: 'Corning' },
      { ticker: 'GOOGL', name: 'Alphabet' },
      { ticker: 'INTC', name: 'Intel' },
      { ticker: 'META', name: 'Meta Platforms' },
      { ticker: 'NOW', name: 'ServiceNow' },
      { ticker: 'NVDA', name: 'Nvidia' },
      { ticker: 'ORCL', name: 'Oracle' },
      { ticker: 'SNDK', name: 'Sandisk' },
      { ticker: 'VPG', name: 'Vishay Precision Group' },
      { ticker: 'VRT', name: 'Vertiv' },
    ],
  },
  {
    group: 'Financials & exchanges',
    items: [
      { ticker: 'GS', name: 'Goldman Sachs' },
      { ticker: 'ICE', name: 'Intercontinental Exchange' },
      { ticker: 'MA', name: 'Mastercard' },
      { ticker: 'SPGI', name: 'S&P Global' },
      { ticker: 'V', name: 'Visa' },
    ],
  },
  {
    group: 'Consumer, industrial & healthcare',
    items: [
      { ticker: 'ALC', name: 'Alcon' },
      { ticker: 'DAL', name: 'Delta Air Lines' },
      { ticker: 'KO', name: 'Coca-Cola' },
      { ticker: 'UBER', name: 'Uber' },
      { ticker: 'WMT', name: 'Walmart' },
    ],
  },
  {
    group: 'Holding companies & real assets',
    items: [
      { ticker: 'BN', name: 'Brookfield Corporation' },
      { ticker: 'HHH', name: 'Howard Hughes Holdings' },
      { ticker: 'PSHZF', name: 'Pershing Square Holdings' },
      { ticker: 'PSUS', name: 'Pershing Square USA' },
    ],
  },
  {
    group: 'Funds & ETFs',
    items: [
      { ticker: 'DRAM', name: 'Roundhill Memory ETF' },
      { ticker: 'FXAIX', name: 'Fidelity 500 Index Fund' },
      { ticker: 'GLD', name: 'SPDR Gold Trust' },
      { ticker: 'JPY', name: 'Lazard Japanese Equity ETF' },
      { ticker: 'QQQ', name: 'Invesco QQQ' },
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF' },
      { ticker: 'TOV', name: 'EA Series Trust ETF' },
    ],
  },
  {
    group: 'Digital assets',
    items: [{ ticker: 'BTC', name: 'Bitcoin' }],
  },
];

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
  | { name: 'books' }
  | { name: 'work' };

// Contact has no page behind it yet, so it stays a plain anchor; an entry with a
// view routes instead of jumping to a fragment.
const NAV: { label: string; view?: View }[] = [
  { label: 'Home', view: { name: 'home' } },
  { label: 'Work', view: { name: 'work' } },
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

// ---------------------------------------------------------------------------
// Work

// One row per role, in the order LinkedIn lists them: ongoing roles first, then
// the rest by end date. Dates are YYYY-MM; end: null means the role is ongoing.
// A role with no start is listed but kept off the chart until its dates are in.
// Logos live in public/work and are drawn in grayscale until hovered, so a
// column of brand colours doesn't fight the page.
type Role = {
  slug: string;
  org: string;
  short?: string; // chart gutter label when the full name is long
  role: string;
  kind?: string;
  start?: string;
  end?: string | null;
  location?: string;
  summary?: string;
  details?: string[];
  logo: { src: string; scale?: number };
  url?: string;
  project?: string; // slug of the related ENTRIES item
  featured?: boolean;
};

const WORK: Role[] = [
  {
    slug: 'molterra',
    org: 'Molterra',
    role: 'Founder',
    kind: 'Self-employed',
    start: '2025-07',
    end: null,
    location: 'New York',
    summary:
      'Real-time hyperspecific domain information. Backed by Cory Levy and Joshua Browder.',
    logo: { src: '/work/molterra.png', scale: 0.9 },
    url: 'https://molterra.com',
    project: 'molterra-security',
    featured: true,
  },
  {
    slug: 'washu',
    org: 'Washington University in St. Louis',
    short: 'WashU',
    role: 'Researcher',
    start: '2025-08',
    end: null,
    summary:
      'With Dr. Trevor GrandPré: sequence-resolved coarse-grained Hamiltonians for FUS-derived intrinsically disordered protein variants — MPIPI parameterization, Langevin dynamics, and density–temperature phase diagrams — to get at sequence-dependent interfacial energetics and mesoscale condensate organization through statistical thermodynamics and polymer field theory.',
    logo: { src: '/work/washu.svg' },
    project: 'fus-idp-hamiltonians',
  },
  {
    slug: 'mayo-clinic',
    org: 'Mayo Clinic',
    role: 'Research',
    kind: 'Full-time',
    start: '2025-04',
    end: null,
    location: 'Rochester, Minnesota',
    summary:
      "Dr. Aadel Chaudhuri's group: multitask learning algorithms and architecture-agnostic methods for modeling heterogeneous treatment responses in cancer.",
    details: [
      'Three models averaging 85% AUC for predicting drug response in high-grade serous ovarian cancer.',
      'OvarianMTLNet, a custom multitask neural network that outperformed logistic regression, random forests, XGBoost, standard neural networks, and SVMs.',
      'F1 above 85% across the stable, progression, and response categories for every drug.',
    ],
    logo: { src: '/work/mayo-clinic.svg' },
    project: 'ovarian-mtl',
  },
  {
    slug: 'jump-trading',
    org: 'Jump Trading Group',
    short: 'Jump Trading',
    role: 'Quantitative Research Intern',
    kind: 'Internship',
    start: '2025-06',
    end: '2025-08',
    location: 'Chicago',
    logo: { src: '/work/jump-trading.svg' },
  },
  {
    slug: 'altman-solon',
    org: 'Altman Solon',
    role: 'Winter Analyst',
    kind: 'Internship',
    start: '2025-01',
    end: '2025-03',
    location: 'Boston',
    summary:
      'Strategy consulting for technology, media, and telecom: corporate strategy and commercial due diligence. Took the semester off to do it.',
    logo: { src: '/work/altman-solon.svg' },
  },
  {
    slug: 'google-deepmind',
    org: 'Google DeepMind',
    short: 'DeepMind',
    role: 'Research',
    kind: 'Part-time',
    start: '2024-05',
    end: '2025-03',
    location: 'Cambridge, Massachusetts',
    summary: 'MedPipe3D software package. Contributor to Julia 1.9.',
    logo: { src: '/work/google-deepmind.svg' },
  },
  {
    slug: 'washu-medicine',
    org: 'Washington University School of Medicine',
    short: 'WashU Medicine',
    role: 'Research',
    kind: 'Full-time',
    start: '2022-05',
    end: '2024-12',
    location: 'St. Louis',
    summary: "Dr. Eric Landsness's group: algorithms for neural recovery and stroke detection.",
    logo: { src: '/work/washu-medicine.svg' },
  },
  {
    slug: 'hms-mgh',
    org: 'Harvard Medical School & Massachusetts General Hospital',
    short: 'Harvard / MGH',
    role: 'Research',
    kind: 'Part-time',
    start: '2024-06',
    end: '2024-07',
    location: 'Cambridge, Massachusetts',
    summary:
      "Nicole Zürcher's group: neuroimaging and graphing for neurodevelopmental and psychiatric disorders.",
    logo: { src: '/work/hms-mgh.svg' },
  },
  {
    // Role and dates still to be filled in; listed so the organization is not
    // missing, and off the chart until they are.
    slug: 'sehgal-foundation',
    org: 'S M Sehgal Foundation',
    short: 'Sehgal Foundation',
    role: '',
    logo: { src: '/work/sehgal-foundation.svg' },
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

const OssiaThumbnail: React.FC = () => (
  <img
    src="/projects/ossia/thumbnail.svg"
    alt="Three identical dark horizontal bars stacked one above another, a span repeating. An arrow along the left edge joins the top bar and the bottom one, closing the stack into a cycle. The first cell of the top bar is outlined with a heavy stroke, cutting the span at its first token, and from that cell a curve descends to a different bar off to the right, an alternative continuation. The letters FTPO sit in small monospace below."
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

const GRNThumbnail: React.FC = () => (
  <img
    src="/projects/grn-indistinguishability/fig2-overview.jpg"
    alt="Workflow: the eud-1, nhr-40, sult-1 regulatory network with unknown structure; a family of ODE models fit to expression data; fits assessed across model structures; a model set of shared regulatory features identified"
    style={{
      display: 'block',
      width: 150,
      maxWidth: '100%',
      height: 'auto',
      border: `1px solid ${COLORS.text}`,
      background: '#fff',
    }}
  />
);

const MolterraSecurityThumbnail: React.FC = () => (
  <img
    src="/projects/molterra-security/thumbnail.svg"
    alt="Five bar pairs, one per attack family, each showing the share of attacks blocked with hardening, above the number 991"
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

const KikuThumbnail: React.FC = () => (
  <img
    src="/projects/kiku/thumbnail.svg"
    alt="A log-Mel spectrogram grid becoming a strip of tokens: SOT, EN, 0.0, The"
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

const WatchArbitrageThumbnail: React.FC = () => (
  <img
    src="/projects/watch-arbitrage/thumbnail.svg"
    alt="A histogram of executable bids and, far to its right, a tall line marking the asking price"
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
    slug: 'molterra-security',
    title: 'Molterra Security: 991 Authorized Attacks Against Our Own Code',
    date: 'September 2026 — present',
    description:
      "Molterra listens to meetings, reads the records a team connects, and writes from them — which puts what people said, the OAuth tokens to their other tools, and the identities that prove who is asking in our care. So I built the security program as executable evidence rather than a description: a Rust crate that links the product's own fence code and runs 991 authorized attacks against it on every change — prompt injection across 18 goals × 34 evasions, Unicode steganography down to the tag block, AES-256-GCM vault tampering, offline credential recovery — each with two recorded verdicts, a 112-finding register, a penetration-test package, and a cryptography review measured against NIST and CNSA 2.0. Shipped code stops 232; the hardening stops 988; the three it cannot are open by design, with the reason written down.",
    tier: 'boxed',
    thumbnail: <MolterraSecurityThumbnail />,
  },
  {
    slug: 'watch-arbitrage',
    title: 'Reference-Level Arbitrage in Specialist Watch Markets',
    date: 'Ongoing',
    description:
      'A model for pricing individual watches well enough to decide whether to buy one for resale. Knowing a watch is a Vacheron or a Lange says almost nothing about what a specific buyer will bid: the reference, movement generation, dial, case condition and service history decide which comparable sales are usable at all. Builds a per-buyer bid distribution with partial pooling across related references, prices the value of one more inspection or quote before committing capital, models the exit as a survival problem rather than a price, and allocates across watch-to-buyer routes under funding and buyer-capacity constraints. I have used arbitrage to acquire a Vacheron Historiques and a Rolex Daytona; the European sourcing algorithm is specified here and not yet executed.',
    tier: 'boxed',
    thumbnail: <WatchArbitrageThumbnail />,
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
    slug: 'ossia',
    title: 'Ossia — Preference Training at the Loop\'s First Token',
    date: '2026',
    description:
      'Preference data and training for one failure of reasoning models: the repetition loop. For each prompt, completions are sampled and scanned for where a repeated span begins; the token that opens the loop is marked rejected, coherent alternatives at that position are marked chosen, and the resulting rows train a LoRA adapter with Final Token Preference Optimization (FTPO), which is then merged. The single-token preference idea comes from Antislop, carried over to runaway repetition during reasoning.',
    tier: 'boxed',
    thumbnail: <OssiaThumbnail />,
  },
  {
    slug: 'grn-indistinguishability',
    title: 'Practical Indistinguishability in Gene Regulatory Network Inference',
    date: 'August 2025',
    description:
      'A case study in how far regulatory network structure can be inferred from typical experimental data. We fit 13,824 distinct ODE models — each a different regulatory network over eud-1, sult-1, and nhr-40 — to RNA-seq from three experiments on the nematode Pristionchus pacificus, whose mouth-form dimorphism is a developmental decision. Synthetic tests establish the limits of inference in the experimental data regime; model sets of shared regulatory features are recovered per experiment, and a single network in their intersection explains all three. With FitzGerald, Reich, Agaba, Werner, and Mangan.',
    tier: 'boxed',
    thumbnail: <GRNThumbnail />,
  },
  {
    slug: 'kiku',
    title: 'Kiku — Multiclass Speech Recognition in Rust',
    date: 'August 2026 — present',
    description:
      "Molterra's speech recognition module, written in Rust as a standalone MIT crate: an encoder-decoder Transformer over an 80-channel log Mel frontend, multiclass by construction — one decoder softmax emits the language token, the task token, no-speech, 20 ms timestamp classes and the text itself. I wrote the frontend, model, tokenizer decoding and decoding loop; the reliability work is in the loop, where a VAD gate needs both P(nospeech) > 0.6 and avg logprob < -1, a timestamp grammar keeps pairs monotonic and pins the first to the window's opening second, and a temperature ladder retries on the 2.4 compression ratio that signals a repetition loop. Every segment carries the evidence it was judged on, which is what lets transcription continue into memory. It never infers who is speaking.",
    tier: 'boxed',
    thumbnail: <KikuThumbnail />,
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

  // Views are state, not URLs, so nothing resets the scroll on its own: without this
  // a link followed from deep in one page opens the next one already scrolled past
  // its title. The Work page's own scroll-to-entry keeps working — it doesn't change
  // the view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (view.name === 'project') {
    return <ProjectPage slug={view.slug} onNavigate={setView} />;
  }
  if (view.name === 'investments') {
    return <InvestmentsPage onNavigate={setView} />;
  }
  if (view.name === 'books') {
    return <BooksPage onNavigate={setView} />;
  }
  if (view.name === 'work') {
    return <WorkPage onNavigate={setView} />;
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

// Writings live in src/writings.json so the announce-writings workflow can diff the
// same file the site renders: add an entry there, push, and subscribers get mailed.
// Same shape as ENTRIES so both columns share TimelineRow; tier mix mirrors Physical
// Intelligence — newest carries the shadow, the rest vary.
type WritingRecord = {
  title: string;
  date: string;
  description: string;
  tier?: string;
  url?: string;
};

const writingRecords: WritingRecord[] = writingsData;

const WRITINGS: Entry[] = writingRecords.map(({ title, date, description, tier }) => ({
  title,
  date,
  description,
  tier: tier === 'featured' || tier === 'boxed' ? tier : undefined,
}));

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
  const [head, ...benchmarks] = rows;
  const peak = rows.length ? Math.max(...rows.map((r) => Math.abs(r.percent))) : 1;
  const count = HOLDINGS.reduce((n, g) => n + g.items.length, 0);

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
          Performance against benchmarks over the trailing three months, and current
          positions. Percentages and tickers only — no balances, sizes, or values.
        </p>

        {/* --- performance --- */}
        {head && (
          <div style={{ marginTop: 40 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 44,
                letterSpacing: -0.8,
                lineHeight: 1,
                color: COLORS.text,
              }}
            >
              {pct(head.percent)}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
              {head.label} · {INVESTMENTS.period.toLowerCase()}
            </div>

            <div
              style={{
                marginTop: 24,
                maxWidth: 420,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {benchmarks.map((r) => (
                <BenchmarkRow
                  key={r.label}
                  label={r.label}
                  percent={r.percent}
                  peak={peak}
                  size={13}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- holdings --- */}
        <div style={{ marginTop: 64, borderTop: `1px solid ${COLORS.text}`, paddingTop: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h3
              style={{
                fontFamily: SERIF,
                fontWeight: 400,
                fontSize: 22,
                letterSpacing: -0.2,
                color: COLORS.text,
              }}
            >
              Holdings
            </h3>
            <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.muted }}>
              {count} positions
            </span>
          </div>

          {HOLDINGS.map((g) => (
            <section key={g.group} style={{ marginTop: 32 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: COLORS.muted,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(26,26,26,0.18)',
                }}
              >
                {g.group}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  columnGap: 32,
                  rowGap: 9,
                  marginTop: 14,
                }}
              >
                {g.items.map((h) => (
                  <div
                    key={h.ticker}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'baseline',
                      fontFamily: MONO,
                      fontSize: 13,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: COLORS.text,
                        flex: '0 0 56px',
                      }}
                    >
                      {h.ticker}
                    </span>
                    <span
                      style={{
                        color: COLORS.muted,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p
          style={{
            fontFamily: MONO,
            fontSize: 13,
            lineHeight: 1.6,
            maxWidth: 640,
            marginTop: 56,
            color: COLORS.muted,
          }}
        >
          Allocation and a longer performance history to come.
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Months since year zero, so ranges can be subtracted and mapped onto the chart.
const monthIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

// LinkedIn counts both end months, so Jun — Aug is 3 mos, not 2.
const spanLabel = (months: number) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? 'yr' : 'yrs'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'mo' : 'mos'}`);
  return parts.join(' ');
};

const roleDates = (r: Role) =>
  r.start ? `${monthLabel(r.start)} — ${r.end ? monthLabel(r.end) : 'present'}` : '';

const roleMonths = (r: Role, now: number) =>
  r.start ? (r.end ? monthIndex(r.end) : Math.floor(now)) - monthIndex(r.start) + 1 : 0;

// Internships and part-time roles are hatched; founder and full-time roles are solid.
const isHatched = (r: Role) => r.kind === 'Internship' || r.kind === 'Part-time';

const HATCH: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(135deg, ${COLORS.text} 0 1.5px, transparent 1.5px 5px)`,
  boxShadow: `inset 0 0 0 1px ${COLORS.text}`,
};
const SOLID: React.CSSProperties = { background: COLORS.text };

// Logos sit in a white tile with a hairline, like the research thumbnails, and stay
// in grayscale until their row is hovered so the page keeps its single ink.
const OrgLogo: React.FC<{ role: Role; size: number; active: boolean }> = ({
  role,
  size,
  active,
}) => (
  <div
    aria-hidden
    style={{
      flexShrink: 0,
      width: size,
      height: size,
      padding: size >= 40 ? 6 : 3,
      border: `1px solid ${COLORS.text}`,
      background: '#fff',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1,
    }}
  >
    <img
      src={role.logo.src}
      alt=""
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        transform: role.logo.scale ? `scale(${role.logo.scale})` : undefined,
        filter: active ? 'none' : 'grayscale(1)',
        transition: 'filter 200ms ease',
      }}
    />
  </div>
);

const CHART_ROW = 34;
const CHART_BAR = 10;

type ChartProps = {
  roles: Role[];
  now: number; // fractional month index of today
  active: string | null;
  onActive: (slug: string | null) => void;
  onPick: (slug: string) => void;
};

// Each dated role as a bar against year gridlines, from January of the earliest
// year through December of this one. Ongoing roles run to a dashed "now" line and
// fade past it. Hovering a row names its dates; clicking scrolls to its entry.
const WorkChart: React.FC<ChartProps> = ({ roles, now, active, onActive, onPick }) => {
  // The gap needed to keep a year label clear of "now" is a pixel distance, not a
  // number of months: the same three months are 54px of track at desktop and 10px on
  // a phone. So measure the track and convert.
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null);
  const [trackW, setTrackW] = useState(0);
  useEffect(() => {
    if (!trackEl) return;
    const ro = new ResizeObserver(([entry]) => setTrackW(entry.contentRect.width));
    ro.observe(trackEl);
    return () => ro.disconnect();
  }, [trackEl]);

  const dated = roles.filter((r): r is Role & { start: string } => Boolean(r.start));
  if (!dated.length) return null;

  const firstYear = Math.floor(Math.min(...dated.map((r) => monthIndex(r.start))) / 12);
  const t0 = firstYear * 12;
  // Always keep at least a quarter of runway past today, so the fade and the "now"
  // label have somewhere to sit in December.
  const t1 = Math.max((Math.floor(now / 12) + 1) * 12, Math.ceil(now) + 3);
  const x = (m: number) => ((m - t0) / (t1 - t0)) * 100;
  const years: number[] = [];
  for (let y = firstYear; y * 12 < t1; y += 1) years.push(y);
  const nowX = x(now);
  // "now" is right-anchored near the end of the track, where it grows towards the
  // year label rather than away from it, so it needs the wider berth.
  const clearPx = nowX > 92 ? 64 : 36;
  const clearMonths = trackW ? (clearPx / trackW) * (t1 - t0) : 3;

  const label: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    paddingLeft: 6,
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  };

  return (
    <div className="work-chart" style={{ marginTop: 40 }}>
      <div aria-hidden className="work-row" style={{ height: 24 }}>
        <div />
        <div ref={setTrackEl} style={{ position: 'relative', height: '100%' }}>
          {/* A year label within a quarter of today, on either side, would print under
              "now"; its gridline still marks the year, and "now" implies the date. */}
          {years
            .filter((y) => Math.abs(now - y * 12) >= clearMonths)
            .map((y) => (
              <span key={y} style={{ ...label, left: `${x(y * 12)}%`, color: COLORS.muted }}>
                {y}
              </span>
            ))}
          <span
            style={{
              ...label,
              color: COLORS.text,
              ...(nowX > 92
                ? { right: `${100 - nowX}%`, paddingLeft: 0, paddingRight: 6 }
                : { left: `${nowX}%` }),
            }}
          >
            now
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          aria-hidden
          className="work-row"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <div />
          <div style={{ position: 'relative', height: '100%' }}>
            {years.map((y) => (
              <div
                key={y}
                style={{
                  position: 'absolute',
                  left: `${x(y * 12)}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(26,26,26,0.14)',
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: `${nowX}%`,
                top: 0,
                bottom: 0,
                borderLeft: `1px dashed ${COLORS.text}`,
              }}
            />
          </div>
        </div>

        {dated.map((r, i) => {
          const start = x(monthIndex(r.start));
          // A bar runs to the start of the month after it ends, except that a role
          // ending this month stops at the now line rather than crossing it.
          const end = r.end ? Math.min(x(monthIndex(r.end) + 1), nowX) : nowX;
          const fill = isHatched(r) ? HATCH : SOLID;
          const isActive = active === r.slug;
          // The dates label goes on whichever side of the bar has more room, and is
          // clamped so it can never reach past the track. The face is monospace with
          // no letter-spacing, so its width is exactly one ch per character plus the
          // horizontal padding — no measuring needed.
          const labelLeft = start > 100 - end;
          const labelText = `${roleDates(r)} · ${spanLabel(roleMonths(r, now))}`;
          const inside = `calc(100% - ${labelText.length}ch - 12px)`;
          return (
            <div
              key={r.slug}
              className="work-row"
              role="button"
              tabIndex={0}
              aria-label={`${r.org}, ${r.role}${r.kind ? ` (${r.kind})` : ''}, ${monthLabel(
                r.start
              )} to ${r.end ? monthLabel(r.end) : 'present'}`}
              onMouseEnter={() => onActive(r.slug)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(r.slug)}
              onBlur={() => onActive(null)}
              onClick={() => onPick(r.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(r.slug);
                }
              }}
              style={{ height: CHART_ROW, cursor: 'pointer' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingRight: 14,
                  minWidth: 0,
                }}
              >
                <OrgLogo role={r} size={22} active={isActive} />
                <span
                  className="work-name"
                  style={{
                    fontFamily: MONO,
                    // Size lives in the stylesheet so the narrow breakpoint can shrink
                    // it; an inline value here would outrank the media query.
                    color: isActive ? COLORS.text : COLORS.muted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'color 120ms ease',
                  }}
                >
                  {r.short || r.org}
                </span>
              </div>

              <div
                className="work-track"
                style={{ position: 'relative', height: '100%', animationDelay: `${120 + i * 70}ms` }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${start}%`,
                    width: `${end - start}%`,
                    minWidth: 6,
                    top: (CHART_ROW - CHART_BAR) / 2,
                    height: CHART_BAR,
                    ...fill,
                  }}
                />
                {!r.end && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${nowX}%`,
                      // A fixed tail: anchoring it to the track's end would make its
                      // length a function of how much of the year is left.
                      width: 36,
                      maxWidth: `${100 - nowX}%`,
                      top: (CHART_ROW - CHART_BAR) / 2,
                      height: CHART_BAR,
                      ...fill,
                      WebkitMaskImage: 'linear-gradient(to right, #000, transparent)',
                      maskImage: 'linear-gradient(to right, #000, transparent)',
                    }}
                  />
                )}
                {isActive && (
                  <span
                    className="work-label"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      ...(labelLeft
                        ? { right: `min(calc(${100 - start}% + 8px), ${inside})` }
                        : { left: `min(calc(${end}% + 8px), ${inside})` }),
                      padding: '2px 6px',
                      fontFamily: MONO,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      color: COLORS.text,
                      background: COLORS.bg,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    {labelText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginTop: 16,
          fontFamily: MONO,
          fontSize: 11,
          color: COLORS.muted,
        }}
      >
        <span style={{ width: 16, height: 8, flexShrink: 0, ...HATCH }} />
        part-time or internship
      </div>
    </div>
  );
};

const TILE = 44;

const WorkRow: React.FC<{
  role: Role;
  now: number;
  last: boolean;
  active: boolean;
  onActive: (slug: string | null) => void;
  onNavigate: (v: View) => void;
}> = ({ role: r, now, last, active, onActive, onNavigate }) => {
  const months = roleMonths(r, now);
  const meta = [r.kind, r.location, months ? spanLabel(months) : ''].filter(Boolean);
  const linkStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: 12,
    color: COLORS.text,
    textDecoration: 'underline',
    textUnderlineOffset: 4,
    textDecorationThickness: 1,
  };

  return (
    <div
      id={`work-${r.slug}`}
      className="work-entry"
      tabIndex={-1}
      onMouseEnter={() => onActive(r.slug)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(r.slug)}
      onBlur={() => onActive(null)}
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        marginBottom: last ? 0 : 36,
        scrollMarginTop: 24,
      }}
    >
      <OrgLogo role={r} size={TILE} active={active} />

      <div
        style={{
          flex: '1 1 240px',
          minWidth: 0,
          ...(r.featured ? TIER_STYLE.featured : { paddingTop: 3 }),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0 24px',
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
            {r.org}
          </span>
          {r.start && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: COLORS.muted,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {roleDates(r)}
            </span>
          )}
        </div>

        {(r.role || meta.length > 0) && (
          <div style={{ fontFamily: MONO, fontSize: 13, lineHeight: 1.65, marginTop: 4 }}>
            {r.role && <span style={{ color: COLORS.text }}>{r.role}</span>}
            {meta.length > 0 && (
              <span style={{ color: COLORS.muted }}>
                {r.role ? ' · ' : ''}
                {meta.join(' · ')}
              </span>
            )}
          </div>
        )}

        {!r.role && !r.start && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 13,
              lineHeight: 1.65,
              color: COLORS.muted,
              marginTop: 4,
            }}
          >
            Details to come.
          </div>
        )}

        {r.summary && (
          <p
            style={{
              fontFamily: MONO,
              fontSize: 13,
              lineHeight: 1.65,
              color: COLORS.muted,
              marginTop: 8,
            }}
          >
            {r.summary}
          </p>
        )}

        {r.details && (
          <ul
            role="list"
            style={{
              listStyle: 'none',
              marginTop: 8,
              fontFamily: MONO,
              fontSize: 13,
              lineHeight: 1.65,
              color: COLORS.muted,
            }}
          >
            {r.details.map((d) => (
              <li key={d} style={{ display: 'flex', gap: 10 }}>
                <span aria-hidden style={{ flexShrink: 0 }}>
                  –
                </span>
                <span style={{ minWidth: 0 }}>{d}</span>
              </li>
            ))}
          </ul>
        )}

        {(r.url || r.project) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', marginTop: 10 }}>
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${r.url.replace(/^https?:\/\//, '')} (opens in a new tab)`}
                style={linkStyle}
              >
                {r.url.replace(/^https?:\/\//, '')} ↗
              </a>
            )}
            {r.project && (
              <a
                href={`#${r.project}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate({ name: 'project', slug: r.project as string });
                }}
                style={linkStyle}
              >
                Related research →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WorkPage: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => {
  const [active, setActive] = useState<string | null>(null);
  const today = new Date();
  const now = today.getFullYear() * 12 + today.getMonth() + (today.getDate() - 1) / 31;

  // Send focus along with the scroll: without it a keyboard user activates a row,
  // the page moves, and the next Tab jumps straight back up to the chart.
  const pick = (slug: string) => {
    const el = document.getElementById(`work-${slug}`);
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };

  return (
    <PageShell onNavigate={onNavigate} maxWidth={880}>
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
          Work
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
          Where I've worked, newest first. Several of these ran at the same time, so
          the chart lays each role against the calendar; the list underneath has what I
          did at each.
        </p>

        <WorkChart
          roles={WORK}
          now={now}
          active={active}
          onActive={setActive}
          onPick={pick}
        />

        <div style={{ position: 'relative', marginTop: 56 }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: TILE / 2,
              top: TILE / 2,
              bottom: TILE / 2,
              width: 1,
              background: COLORS.line,
            }}
          />
          {WORK.map((r, i) => (
            <WorkRow
              key={r.slug}
              role={r}
              now={now}
              last={i === WORK.length - 1}
              active={active === r.slug}
              onActive={setActive}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </article>
    </PageShell>
  );
};

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

type SubscribeStatus = 'idle' | 'sending' | 'done' | 'error';

// Posts to /api/subscribe, which adds the address to the Resend audience. The CRA dev
// server has no /api route and answers unknown paths with index.html — a 200 — so
// success is judged on the JSON body, not the status code.
const SubscribeToWritings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubscribeStatus>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body: { ok?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok || body.ok !== true) {
        throw new Error(body.error || 'Could not subscribe. Try again in a moment.');
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not subscribe. Try again in a moment.');
    }
  };

  if (status === 'done') {
    return (
      <p style={{ fontFamily: MONO, fontSize: 13, lineHeight: 1.65, color: COLORS.muted, marginTop: 14 }}>
        You're on the list. New writings will land in your inbox.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: MONO,
          fontSize: 13,
          color: COLORS.text,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 5,
          textDecorationThickness: 1,
        }}
      >
        Subscribe to email updates of new writings
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14, width: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === 'sending'}
          aria-label="Email address"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: MONO,
            fontSize: 13,
            color: COLORS.text,
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${COLORS.text}`,
            borderRadius: 0,
            padding: '6px 0',
          }}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 13,
            color: COLORS.text,
            background: 'transparent',
            border: `1px solid ${COLORS.text}`,
            borderRadius: 0,
            padding: '6px 14px',
            cursor: status === 'sending' ? 'default' : 'pointer',
            opacity: status === 'sending' ? 0.5 : 1,
          }}
        >
          {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: COLORS.muted, marginTop: 8 }}>
        {status === 'error' ? error : 'One email per new writing. Unsubscribe any time.'}
      </p>
    </form>
  );
};

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
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0 24px',
          }}
        >
          <SectionHeading>Writings</SectionHeading>
          <SubscribeToWritings />
        </div>
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

          {slug === 'molterra-security' ? (
            <MolterraSecurityProjectBody />
          ) : slug === 'fus-idp-hamiltonians' ? (
            <FUSProjectBody />
          ) : slug === 'watch-arbitrage' ? (
            <WatchArbitrageProjectBody />
          ) : slug === 'ovarian-mtl' ? (
            <OvarianMTLProjectBody />
          ) : slug === 'ossia' ? (
            <OssiaProjectBody />
          ) : slug === 'grn-indistinguishability' ? (
            <GRNProjectBody />
          ) : slug === 'kiku' ? (
            <KikuProjectBody />
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

// Display equations. The page they serve is mathematical enough that the equations
// need to sit apart from the prose, but not so many that a typesetting dependency
// earns its place — mono with sub/sup carries them.
const DisplayMath: React.FC<{ children: React.ReactNode; note?: React.ReactNode }> = ({
  children,
  note,
}) => (
  <div style={{ maxWidth: 640, marginTop: 26 }}>
    <div
      style={{
        fontFamily: MONO,
        fontSize: 14,
        lineHeight: 1.9,
        color: COLORS.text,
        padding: '14px 18px',
        borderLeft: `2px solid ${COLORS.text}`,
        background: 'rgba(26,26,26,0.05)',
        overflowX: 'auto',
      }}
    >
      {children}
    </div>
    {note && (
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.6,
          color: COLORS.muted,
          marginTop: 8,
        }}
      >
        {note}
      </div>
    )}
  </div>
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

const OssiaProjectBody: React.FC = () => (
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
      Cutting repetition loops at the token where they start
    </p>

    <BodyParagraph top={0}>
      Ossia builds preference data aimed at one defect of reasoning models, the
      repetition loop, and trains against it. The tool is narrow, and so is the
      failure it targets. A run starts by sampling completions from the model for
      every prompt. Each completion is scanned for inner repetition, which locates
      where a repeated span begins. There, the first token that sets the loop
      going is marked rejected, and coherent alternative next tokens at the same
      position are marked chosen. What remains is to train a LoRA adapter on those
      rows with Final Token Preference Optimization (FTPO). Antislop supplied the
      underlying idea, single-token preference training; Ossia points it at
      runaway repetition during reasoning.
    </BodyParagraph>

    <BodyParagraph>
      Three forces, when they coincide, tend to yield doom loops. One is a matter
      of training history: after heavy synthetic reasoning training, the workhorse
      tokens of reasoning — Wait, So, But, Alternatively — carry an outsized pull,
      and any one of them can take over the next-token distribution without
      advancing the argument at all. Another is a matter of context: a short
      sequence, having occurred once, is now part of the prefix, and that prefix
      raises the odds of the same sequence occurring again, so over successive
      repetitions the probability of each of its tokens rises toward one. The last
      is a matter of decoding: with temperature at or near zero, every step takes
      the highest-probability continuation, so a loop that its own context has
      been reinforcing has nothing left to break it.
    </BodyParagraph>

    <BodyParagraph>
      Full gold answers are not what Ossia trains on. The entire signal is a
      single local preference, stated at the token where the loop begins: at that
      position, any plausible alternative that was available is preferred over the
      token that sets the repetition off, and nothing beyond that position is
      trained on. The position itself comes out of the scan. The scan finds the
      repeated segment; its opening edge is then adjusted in token space until the
      slot marked rejected sits on the first readable token of that segment.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ossia/ftpo.svg"
      alt="Diagram of a token sequence in boxes, reading, between ellipses, So Wait Wait Wait Wait. A bracket labeled repeated span covers the run of Waits. The first Wait of the run is drawn with a heavy outline and labeled rejected. Two arrows lead from that outlined cell down to two filled dark cells reading Therefore and The, alternatives at the same position as the rejected token, labeled chosen, sampled from filtered alternatives."
      caption={
        <>
          <strong>Fig. 1.</strong> The unit of training is one FTPO row. Its context prefix stops
          immediately before the rejected token. The rejected token is single, the
          one that opens the loop. The chosen tokens number one or more, drawn
          from the filtered alternatives at that position. Metadata records which
          prompt the row came from and what loop was detected. Across rows, some
          rejected and some chosen tokens end up overrepresented; training
          regularizes them, and that is what turns the lesson from a reflex
          against one word into a broad preference against looping.
        </>
      }
    />

    <BodyParagraph top={40}>
      In the default configuration, prompts come from a ShareGPT mixture that was
      put together for this pipeline and contains prompts only. Gold answers,
      rationales, hidden tests, verifier targets, answer labels: none of these are
      in it, and their absence is by design. The row count a run ends up with is a
      product of its prompt count, its number of temperature passes, and the
      checkpoint's existing appetite for looping. Fifteen thousand prompts, give
      or take, is the least a run should start from; the aim is fifteen to twenty
      thousand preference rows.
    </BodyParagraph>

    <BodyParagraph>
      Most of the outcome is set by two numbers. The first is the cap on training
      examples. It belongs well below the number of rows generated — somewhere
      under about seventy percent of them — since rejected-token regularization
      works by shaving overrepresented tokens out of the set, and it can only do
      that with room to spare. With no room to spare, what reaches the trainer can
      be badly lopsided, and the results suffer for it. The second is the learning
      rate, and the trainer can miss in either direction. Undertraining is
      possible; so is overtraining, and an overtrained model loops more often, not
      less. The working safeguard is to stop early, watching one number: across
      the samples, how often the chosen token outscores the rejected one. Looping
      usually falls off sharply while that number is still well under a half.
    </BodyParagraph>

    <BodyParagraph>
      The remaining settings exist mainly so that curing the loop does not install
      a different defect in its place. Rejected-token regularization culls
      samples, and the effect of the cull is a flatter frequency distribution. The
      tokens that open loops are, by the method's own construction, the ones that
      occur most; push them down too hard and the model has simply been broken in
      a different way. On the chosen side, chosen-token regularization performs
      the mirror-image cull, to keep a favored alternative from turning into a
      loop of its own. There is no stop-word filter, on purpose. Ordinary words
      can and do open loops, so a filter would throw away real cases; frequency is
      a job for regularization, not exclusion. The LoRA rank is set higher than is
      usual, which makes the task more learnable at a smaller cost in degradation.
      Where earlier Antislop ablations favored a restricted set of layers, this
      trainer seems to do better with all of them trained.
    </BodyParagraph>

    <BodyParagraph>
      vLLM does the generating, with a single-GPU engine started for each visible
      device; a single GPU also does the training, as LoRA, and the adapter is
      merged afterward. All of this runs on CUDA by default. ROCm is a different
      matter. The CUDA-only lockfile does not serve it, so a separate environment
      is built from vLLM's own prebuilt ROCm wheels, and two overrides must be in
      place. Attention has to go through the Triton attention backend, as the ROCm
      default attention kernel memory-faults on this model family. The optimizer
      has to be plain Torch AdamW rather than the paged 32-bit optimizer, whose
      dependency on bitsandbytes would otherwise be pulled in. The multi-GPU
      generation path does two more things on its own: it pins devices through the
      ROCm-specific visibility variable, and it hands every worker JIT cache
      directories of its own, since caches shared between workers race into memory
      access faults.
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
      The validation hardware was Instinct MI325 (gfx942).
    </p>
  </div>
);

const GRNProjectBody: React.FC = () => (
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
      Cody E. FitzGerald, Shelley Reich, Victor Agaba, Arjun Mathur, Michael S. Werner,
      Niall M. Mangan · arXiv 2508.21006 · PMC12407701
    </p>

    <BodyParagraph top={0}>
      Determining mechanistic models of gene regulation, especially the regulation
      underlying phenotypic variation, is a central goal of both mathematical biology
      and modern evolutionary biology. Even the highest-quality experimental data come
      with challenges: there are always sources of noise, a limit to how often the
      system can be measured in time, and no way to measure every state that
      participates in the full underlying complexity. On top of that there is usually
      uncertainty in the mechanism itself, which gives rise to multiple competing model
      structures. It may be known that a gene is regulated by a transcription factor but
      unclear whether it experiences activation or repression — and subtle changes of
      that kind reshape the cost-function landscape that parameter estimation has to
      navigate.
    </BodyParagraph>

    <BodyParagraph>
      This kind of structural uncertainty is rarely explored in depth, largely because
      distinguishing between model structures in a data-driven way is computationally
      expensive: each candidate structure has its own high-dimensional landscape, and
      landscapes for biological systems are known to feature long, flat canyons where
      parameters vary widely while behaviour stays qualitatively the same. To make the
      case that this deserves more attention, we ran a meta-analysis across six
      mathematical biology journals. A very large number of models are published each
      year, but comparison across model structures is far less common — a lower bound
      from searching for the Akaike Information Criterion suggests at least 23% of
      studies in PLOS Computational Biology involve some model selection, and far fewer
      in the more classical journals.
    </BodyParagraph>

    <InlineFigure
      src="/projects/grn-indistinguishability/fig1-models-per-year.jpg"
      alt="Journal articles per year in six mathematical biology journals, rising steadily, with the combined total shown in pink"
      caption={
        <>
          <strong>Fig. 1.</strong> A growing number of mathematical models of biological
          systems are published each year. Articles over time in the Bulletin of
          Mathematical Biology, Biophysical Journal, Journal of Biological Rhythms,
          Journal of Mathematical Biology, Journal of Theoretical Biology, and PLOS
          Computational Biology, as indexed on PubMed; combined total in pink.
        </>
      }
    />

    <BodyParagraph top={40}>
      The case study is a developmental decision in the nematode Pristionchus
      pacificus, which exhibits an evolutionary novelty: a mouth-form dimorphism.
      Adults are either eurystomatous, able to kill other nematodes for food, or
      stenostomatous, eating only bacteria. Two genes act as switches. eud-1 encodes a
      sulfatase and sult-1 a sulfotransferase — enzymes with opposite biochemical
      functions — and mutating either yields a fully penetrant phenotype regardless of
      environment, while overexpression yields the opposite one. The nuclear hormone
      receptor nhr-40, a transcription factor, sits downstream and gives opposite
      phenotypes depending on the allele. The regulatory connections between these
      three are not understood, which is the source of the structural uncertainty here.
    </BodyParagraph>

    <InlineFigure
      src="/projects/grn-indistinguishability/fig2-overview.jpg"
      alt="Four-panel workflow: the unknown eud-1, nhr-40, sult-1 network; ODE models fit to expression data from three experiments; fits assessed across structures; a model set identified"
      caption={
        <>
          <strong>Fig. 2.</strong> The approach. (A) The network underpinning the
          mouth-form decision is thought to involve eud-1, nhr-40, and sult-1, but its
          regulatory structure is unknown; gene expression from three experiments is
          used to identify key features. (B) A family of ODE models is fit to the data.
          (C) Fits are assessed across model structures. (D) The model set — the
          collection of models with shared regulatory features that best fit — is
          identified.
        </>
      }
    />

    <BodyParagraph top={40}>
      We took a maximalist approach and fit 13,824 ordinary differential equation
      models, each a distinct effective regulatory network over the three genes, to
      normalised RNA-seq for eud-1, sult-1, and nhr-40 sampled at six time points
      across development in three conditions: wild type, an eud-1 knock-out, and a
      sult-1 knock-out. Only mRNA was measured, so the protein states are hidden and the
      system is partially observed. Testing representative models with STRIKE-GOLDD
      showed they were not structurally identifiable, owing to a scaling symmetry: the
      same transformation of parameters and protein states leaves every equation
      invariant. Because the symmetry lives in the mRNA production term, it affects all
      13,824 models. We broke it by rescaling the protein states and half-max constants
      by the translation rate, which also removes one parameter dimension, and confirmed
      identifiability on a subset with StructuralIdentifiability.jl before estimation.
    </BodyParagraph>

    <BodyParagraph>
      Before touching experimental data we asked what inference is possible at all in
      this data regime. Taking one model that fits the real data well as ground truth,
      we generated synthetic data across a wide range of sampling rates and
      multiplicative noise levels — signal-dependent noise being the simplest defensible
      error model given that variance rose with the mean — and refit both the true
      structure and three deliberately misspecified ones. In the high-sampling,
      low-noise corner the models are cleanly distinguishable. In the regime matching
      the experiment, the true structure and a closely related one fit comparably, while
      structurally unrelated models fail badly, with uncertainty spanning the whole
      dynamic range for nhr-40. Parameters are not practically identifiable here, but
      some structures can fit and others cannot — which is exactly what practical
      indistinguishability is about: the ability to uniquely infer structure, rather
      than parameters, from the data at hand.
    </BodyParagraph>

    <InlineFigure
      src="/projects/grn-indistinguishability/fig3-synthetic.jpg"
      alt="Network diagrams for four model structures; heat maps of fit cost across sampling rate and noise level for each; forward simulations against synthetic data in the experimental regime"
      caption={
        <>
          <strong>Fig. 3.</strong> Synthetic tests of practical indistinguishability.
          (A) Model 11574, the ground truth, alongside 7308, which shares many of its
          features, and 353 and 1, which share none. (B) Cost of fitting each to
          synthetic data from 11574 across sampling rates and noise levels; lighter is a
          better fit, and the yellow square marks the approximate experimental regime.
          (C) Forward simulations at the parameters recovered in that regime. 11574 and
          7308 both fit reasonably; 353 and 1 do not.
        </>
      }
    />

    <BodyParagraph top={40}>
      Fitting all 13,824 structures to the wild-type experiment, roughly a thousand
      give a reasonable fit before the sorted cost curve plateaus and then climbs
      sharply. Cost and uncertainty correlate as expected: the worst models leave
      nhr-40 almost entirely unconstrained. To learn what separates the acceptable
      models, we trained a decision tree on 21 structural features of each network. Two
      classes emerge, both featuring positive regulation of eud-1 and nhr-40,
      regulation of eud-1 by NHR-40, and autoregulation of nhr-40, differing in whether
      NHR-40 also regulates sult-1 — 325 networks in all. The tree also names a broad
      set of structures that predictably fail, though it cannot classify models sitting
      near the rounded shoulder of the plateau, which share features with both sides.
    </BodyParagraph>

    <InlineFigure
      src="/projects/grn-indistinguishability/fig4-wildtype.jpg"
      alt="Sorted cost curve over 13,824 models with a plateau after about 1000; example good and poor fits; noise versus cost; decision tree over structural features; the resolved and unresolved features of the model set"
      caption={
        <>
          <strong>Fig. 4.</strong> Wild type. (A) All 13,824 models sorted by cost, with
          a plateau after about 1,000 (pink). (B) Forward simulations for a well-fit
          model (bottom) and a poor one (top). (C) Estimated noise against cost. (D) A
          decision tree over 21 structural features separates acceptable from
          unacceptable fits into two classes. (E) Resolved features of the second class
          in black, unresolved in dashed brown. (F) One example network from that class,
          dense with positive auto- and cross-regulation.
        </>
      }
    />

    <BodyParagraph top={40}>
      The knock-out experiments are far more constraining. With eud-1 removed, only a
      handful of the 144 remaining structures fit, separated from the rest by a large
      gap in cost; the two best share positive autoregulation of nhr-40 and positive
      regulation of sult-1 by NHR-40, differing only in whether SULT-1 feeds back on
      nhr-40. With sult-1 removed, about ten structures fit, favouring regulation of
      eud-1 by NHR-40, autoregulation of eud-1, and either autoregulation of nhr-40 or
      regulation of nhr-40 by EUD-1. Intersecting the three model sets yields a single
      unified network. It is dominated by positive regulation, features regulation of
      eud-1 by NHR-40 and autoregulation of nhr-40, and reduces cleanly to the
      knock-out cases — which also explains a previously puzzling observation, that
      sult-1 expression rises significantly when eud-1 is knocked out even though
      neither is a transcription factor.
    </BodyParagraph>

    <InlineFigure
      src="/projects/grn-indistinguishability/fig5-unified.jpg"
      alt="Sorted cost curves for the wild-type, eud-1 knock-out, and sult-1 knock-out experiments; shared features of the best fits; the unified network; its simulations against each experiment"
      caption={
        <>
          <strong>Fig. 5.</strong> Across experiments. (A) Sorted cost curves for wild
          type, eud-1 KO, and sult-1 KO, best fits shaded pink, the unified structure in
          orange. (B) Regulatory features common to the best-fitting models. (C) The
          unified network. (D) Its simulations at optimised parameters against each
          experiment; one replicate shown, one standard deviation as the band.
        </>
      }
    />

    <BodyParagraph top={40}>
      The result is a possible mechanism, not a verified one, and the paper is explicit
      about what remains open. The wild-type model set holds roughly a thousand
      networks and the sult-1 set around ten, so structural uncertainty is still large.
      NHR-40's prominence may partly reflect a modelling choice: its protein initial
      condition was estimated wherever it entered a production term, giving those
      models one extra parameter, though far more of the network was resolved than its
      mere presence. Many good fits placed that initial condition near ten million in
      scaled units, plausible only if the effective translation rate is small —
      pointing to post-transcriptional processes outside the model. Parameter
      estimation used a thousand multi-start seeds per model, spot-checked at ten
      thousand; the multiplicative error model was chosen on qualitative grounds, with
      weighted least squares giving similar results. The natural next experiments are
      an nhr-40 knock-out and optimal experiment design over the discovered model sets
      — denser sampling, protein measurements, or perturbations that act on the network
      indirectly. The comparative framework itself applies wherever structural
      uncertainty is the obstacle and the data make algorithmic model selection
      infeasible.
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
      Figures reproduced from the preprint under CC BY 4.0. arxiv.org/abs/2508.21006 ·
      pmc.ncbi.nlm.nih.gov/articles/PMC12407701
    </p>
  </div>
);

const MolterraSecurityProjectBody: React.FC = () => (
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
      Molterra security program · Rust · github.com/akmathur1/molterra-security ·
      republished from the product tree after every accepted change
    </p>

    <BodyParagraph top={0}>
      I founded Molterra. It listens to meetings, reads the records a team has connected,
      and writes work products from them — which means I hold three kinds of data that
      are not mine: what people said, the credentials that reach their other tools, and
      the identities that prove who is asking. If that data leaks, it leaks because of a
      decision I made. So I did not write a security page — a description of defenses is
      only a claim — I wrote an attacker, pointed it at my own product, and published the
      scoreboard. This is how I built it, what it found, and what I have not fixed yet.
    </BodyParagraph>

    <BodyParagraph>
      I started with the threat model, not the ciphers. Every row of data in my system
      has an owner and a deletion path — a tenant purge removes everything a workspace
      holds, a member's forget removes what that member contributed with verifiable
      tombstones — and I made it impossible to add a datum with no owner, because a CI
      audit refuses the migration. I withhold hostnames, network layout, key-storage
      locations, alerting thresholds and the exact phrase lists inside my detectors from
      the public record on purpose: publishing them helps an attacker more than a
      reviewer. Everything else I state as I practice it, including where my current
      release falls short.
    </BodyParagraph>

    <InlineFigure
      src="/projects/molterra-security/defense-layers.svg"
      alt="Seven stacked bands, in the record's order: in transit, at rest, tenant isolation, identity, integrity, model boundary, process — each with its key controls"
      caption={
        <>
          <strong>Fig. 1.</strong> Defense in depth, in the order I document it. The
          model boundary is the layer older security programs never had to build; the
          process layer is the one that keeps the other six from quietly rotting.
        </>
      }
    />

    <BodyParagraph top={40}>
      Start with the parts I wanted to be boring. I carry all traffic over TLS,
      terminated ahead of the application; I accept browser requests only from a fixed
      CORS allow-list, never a wildcard; I authenticate inbound webhooks with
      HMAC-SHA-256 over the raw body, compare in constant time, and reject before parsing
      if the signature does not verify. At rest I put credentials and memory content under
      AES-256-GCM — 96-bit nonces from the operating system's CSPRNG, fresh per
      encryption, 128-bit tags — so an attacker who gains write access to my database
      cannot alter what the application later reads without the tag failing. They can
      destroy it — and, as it turned out, at the shipped revision they could move it. More
      on that below. I do not keep memory content under one key for everyone: I derive a
      per-tenant key from a master with HKDF-SHA-256, using the tenant's UUID bytes as
      salt and a versioned info label, so tenant keys are cryptographically independent
      and rotation to a v2 label is a well-defined re-derivation rather than a guess. I
      keep the master key outside the database; when it is absent the process boots with
      memory encryption at rest off and logs a warning, rather than inventing a key. The
      separate key for the OAuth-token vault is the one I enforce by a panic, not by
      derivation — production must supply an explicit 64-hex key or the process refuses
      to boot, because deriving that key from the JWT secret would let one leak become
      every stored OAuth token. I have no attack row asserting that panic yet; it is a
      reviewed claim, not a tested one.
    </BodyParagraph>

    <BodyParagraph>
      I made tenant isolation the database's job, not the query's. Every workspace's
      memory lives under PostgreSQL row-level security; reads run inside a scoped
      connection that sets the tenant identity for the transaction, and the policy filters
      every row regardless of what my SQL says. If I forget a WHERE clause I get an empty
      result, not another customer's data. I run that policy against a real Postgres in
      CI with a dedicated suite, and my engineering rules forbid substituting an
      application-side filter for it. There is a trap here I named explicitly: backend
      tests that need Postgres return green having asserted nothing when the database URL
      is unset, so any tenant-isolation claim I make must name the CI job that actually
      supplied a database. A vacuous pass is not a pass.
    </BodyParagraph>

    <BodyParagraph>
      For identity I hash passwords with Argon2id — version 19, 19,456 KiB of memory, two
      passes, one lane, the library default — compared in constant time inside the
      verifier. My email login codes live ten minutes, allow five attempts, and are
      throttled per address at four sends per fifteen minutes. My second factor is TOTP
      per RFC 6238, six digits on a thirty-second step with one step of drift; I store the
      shared secret AES-GCM-encrypted, and I record a successfully used step with a
      monotonic guard so a captured code cannot be replayed inside its window. Sessions
      are sixty-minute HS256 JWT access tokens paired with thirty-day rotating opaque
      refresh tokens that I store only as SHA-256 digests, so a database read does not
      yield a usable session. I sign the pre-MFA challenge token under a different key
      from access tokens, so a challenge can never be presented as a session. My
      validation pins the algorithm and requires expiry, so alg-none and RS256-to-HS256
      confusion do not apply. And every write into a tenant's memory appends a leaf to a
      per-tenant hash chain — content hash, provenance hash, previous root, each 32 bytes,
      each checked by the database — while authentication and administrative events go
      to an audit log whose deletion I block with a trigger. An intruder with application
      access cannot erase their own footprints.
    </BodyParagraph>

    <BodyParagraph>
      None of that is novel, and that is the point: nothing in my repository implements a
      cryptographic primitive. It is composition only, and every cryptographic finding my
      program has produced is a composition or operational error — which is where real
      systems fail. The novel surface is the one older programs never faced, and it is the
      one I spent most of my effort on.
    </BodyParagraph>

    <InlineFigure
      src="/projects/molterra-security/model-boundary.svg"
      alt="Pipeline from untrusted record through sanitize, control-language detection, constrained source label, prompt and model, to grounding on output and display as fact"
      caption={
        <>
          <strong>Fig. 2.</strong> My model boundary. A record — a CRM note, a calendar
          body, an email — is untrusted input at a hard boundary, on the way in and on the
          way out. Document text is data, never instructions.
        </>
      }
    />

    <BodyParagraph top={40}>
      I put retrieved records in front of a language model. That creates a class of attack
      with no analogue in classical appsec: a record that contains instructions, planted
      by whoever could write to it, hoping my model will follow them and leak, alter or
      fabricate. I stand five controls at that boundary. I whitespace-collapse every
      excerpt and title and cut it to a fixed character budget so a record cannot flood
      the context. I check each line for control language — attempts to redefine the
      model's role, override prior instructions, request exfiltration, or impersonate a
      system or assistant turn — and drop a matching line, replace a matching title with
      nothing. I require the label that tells the model where a record came from to be a
      short machine identifier, or it collapses to a fixed neutral string. On the way out,
      before I show a generated sentence as a fact about a record, I verify it against the
      tokens of the approved records it claims to come from: my model cannot assert a
      name, a number or a date the records do not contain. And I never persist the pages
      my browser extension reads for ranking unless the user turns on an explicit,
      off-by-default setting. 923 of my 991 attacks — injection, steganography and
      composition — are attacks on this boundary. The other 68 are on the vault and the
      login-code store.
    </BodyParagraph>

    <InlineFigure
      src="/projects/molterra-security/corpus-scoreboard.svg"
      alt="Grouped horizontal bars for five attack families and a total row, each showing attacks, blocked by shipped code, and blocked with hardening"
      caption={
        <>
          <strong>Fig. 3.</strong> My corpus at the published revision. I run every attack
          twice — against the code my customers are running, and against the hardening I
          wrote in response to it — and record both verdicts. The hardened column is
          evidence, not enforcement, until I promote it.
        </>
      }
    />

    <BodyParagraph top={40}>
      I wrote the corpus as a Rust crate that links my product's own fence code by path
      and runs 991 authorized attacks against it in one command, on every change. Five
      families. Injection: 612 attacks, eighteen attacker goals I crossed with thirty-four
      evasions, against my shipped control-language detector called directly.
      Steganography: 258 payloads hidden in text — zero-width characters, bidirectional
      overrides, variation selectors, the Unicode tag block, combining marks, mathematical
      alphanumerics, mixed-script look-alikes — against my shipped sanitizers and the
      source-label path. Composition: 53 sentences that claim more than the records
      support or smuggle an instruction through my grounding check. Vault: 54 attacks on
      ciphertext — tampering, truncation, tag stripping, nonce manipulation, cross-row and
      cross-tenant transplant, nonce reuse — against a byte-faithful mirror of my
      AES-256-GCM token store. Credential: 14 attacks on my login-code hashing — offline
      recovery of codes from a stolen database row, preimage ambiguity, comparison timing.
      I give every attack a stable identifier, the attacker's intent, the payload rendered
      with every non-ASCII code point escaped as ⟨U+XXXX⟩ — because the point of half of
      them is that you cannot see them — the exact value the target function returned,
      and a severity.
    </BodyParagraph>

    <BodyParagraph>
      Read my shipped column and it says one thing. I built the shipped detector for the
      realistic threat — an instruction typed plainly into a record by someone who
      compromised a colleague's SaaS account — and it stops every plain-language attack
      in the corpus, in the excerpt path, the span path and the composition path. It stops
      none of the obfuscated variants, because it matches literally and does not normalize
      first. In my injection grid the pattern is stark: for every one of the eighteen
      goals, the plain control and the four wrapper controls — HTML comment, blockquote
      prefix, plausible surrounding prose, alternating case — are blocked eighteen of
      eighteen, and every homoglyph, font, encoding and splitting trick lands eighteen of
      eighteen. Cyrillic and Greek look-alikes. Fullwidth forms, enclosed alphanumerics,
      mathematical bold, monospace and script. Leetspeak. Letters separated by periods.
      ROT13. Base64. The instruction reversed. All of it sails through my detector
      unchanged. The three whitespace evasions — non-breaking, doubled, ideographic — each
      land on exactly eight of the eighteen goals and are blocked on the other ten, which
      is the fingerprint of a fragile word-boundary heuristic rather than a principled
      defense. I built the corpus to enumerate exactly these variants, which is why most
      of it lands.
    </BodyParagraph>

    <BodyParagraph>
      Steganography is where it got ugly for me. Sixteen single-character channels, each
      appended eight times to a benign excerpt — zero width space, non-joiner, joiner,
      word joiner, soft hyphen, byte-order mark, combining grapheme joiner, Arabic letter
      mark, Mongolian vowel separator, left-to-right mark, right-to-left override,
      invisible times, invisible separator, Hangul filler, variation selector-16, and a
      Unicode tag letter — and my shipped sanitizer leaves every one of them present. The
      tag block is the one that matters. U+E0000 through U+E007F mirrors ASCII, it is
      neither a control character nor whitespace, and it survived my sanitizer for exactly
      that reason: it is a complete invisible alphabet. Attack STG-0019 carries a 44-byte
      base64 credential blob out inside the sentence “Renewal is due Nov 14 and Ada owns
      the thread.” — the decoded bytes even form a JSON token record — and my shipped code
      passes it through verbatim. I rated it critical. Then I wrote 125 more attacks that
      hide an obfuscated instruction behind a line terminator my excerpt fence cannot see
      the end of — U+2028, U+2029, vertical tab, form feed, next line — twenty-five
      evasions each. My shipped sanitizer turns the separator into a space and keeps the
      smuggled second line. And my source-label surface, which must return the fixed
      constant “workspace record”, instead echoed attacker bytes — system, assistant,
      ignore-all-prior-rules — straight into the prompt label.
    </BodyParagraph>

    <BodyParagraph>
      My hardening is one move applied everywhere: normalize before you match. I run the
      fold in a fixed order — strip invisible code points, fold confusables to ASCII, map
      every Unicode whitespace to a plain space, lowercase, collapse runs. My invisible
      list is thirty explicit code points plus four ranges: the Combining Diacritical
      Marks block, both variation-selector blocks, and the entire tag block. My confusable
      fold is a hand-written 42-entry table — twenty-two Cyrillic, fifteen Greek, one
      Armenian, two Roman numerals, two Cherokee — plus arithmetic folds for fullwidth,
      enclosed and all thirteen mathematical alphanumeric blocks of fifty-two; I put no
      Unicode normalization crate in the dependency tree, because I wanted to know exactly
      what it folds. I then run the detector over several views of each line at once: the
      folded form, its de-leeted form, its reversal, its ROT13, and every base64 run of
      sixteen or more characters that decodes to valid text. Only if all of those miss and
      the line looks deliberately separated do I fall to a squeezed path with every
      non-alphanumeric removed. My de-leet rule has a war story: my first version ate
      “3rd” and “Q3”, and that regression is now a unit test — a word only de-leets if its
      alphanumeric core is at least four characters and entirely alphabetic afterward, so
      “4551574n7:” becomes “assistant:” while “3rd of 12 on the 1st” is left alone. I
      closed the source label the brutal way: reject any non-ASCII outright, then
      allowlist thirty-eight providers, and everything else — a zero-width space inside
      “slack”, a Cyrillic ѕ in front of it, “system” — collapses to the same trusted
      constant. Under my hardening, injection and steganography land zero of 870.
    </BodyParagraph>

    <InlineFigure
      src="/projects/molterra-security/vault-binding.svg"
      alt="Two panels: before, a ciphertext transplanted from account A's row to account B's decrypts as valid; after, with associated data binding tenant, account and column, the same transplant fails on tag mismatch"
      caption={
        <>
          <strong>Fig. 4.</strong> My vault finding. AES-256-GCM authenticates the
          ciphertext; only associated data authenticates where it belongs. The stored
          format does not change — associated data is authenticated, not stored — so the
          fix needs a re-encryption pass, not a column migration.
        </>
      }
    />

    <BodyParagraph top={40}>
      The cryptography I chose holds under every mutation my corpus can produce, and that
      is where my most instructive finding came from. Forty of my vault attacks flip a
      single bit across ciphertext bytes zero through thirty-nine; every one fails with an
      AEAD error, as does a zeroed tag, a truncated tag, a substituted nonce, decryption
      under a rotated key, and a 68-byte forged blob of exactly the right length. GCM's
      integrity check catches all of it, by the tag itself, not by any policy I wrote. And
      yet when I copied a valid ciphertext into another account's row it decrypted fine —
      returned the live token — because my shipped call passed no associated data. The
      cipher authenticated the message but not where it was stored. No key needed, no
      plaintext, only a database write. That is a violation of binding, not
      confidentiality, and my hardening binds tenant, account and column as associated
      data — each as a big-endian length prefix followed by the bytes, in that order — so a
      transplanted ciphertext fails on tag mismatch while the blob length is unchanged. One
      consequence I need my operators to know: a restore from backup that moves a row
      between accounts now fails to decrypt instead of silently working. Which is the
      point.
    </BodyParagraph>

    <BodyParagraph>
      One vault attack lands under both columns, and I left it that way on purpose.
      VLT-0054 stages two encryptions under one key and one nonce and recovers the second
      OAuth token in full, without the key, by XOR: the two ciphertexts, and the one
      known plaintext. A repeated nonce under GCM is not a degradation, it is a two-time
      pad, and the GHASH authentication key falls out with it. My random 96-bit nonce is
      correct — the collision probability is about q² over 2⁹⁷ for q messages — but
      negligible under a budget is the actual guarantee, and nothing I have written
      enforces the budget. NIST SP 800-38D caps a key at 2³² invocations under random
      nonces, and I never count, cap or alert on per-key message count. The primitive is
      modern, the library is correct, and the guarantee still depends on an operational
      counter I am not keeping. Associated data does nothing about it. My fix is a counted
      budget with rotation, or a deterministic nonce, or AES-GCM-SIV, which degrades to
      leaking only the equality of repeated plaintexts. I track it with a date, I filed it
      critical, and my corpus refuses to record it as closed.
    </BodyParagraph>

    <BodyParagraph>
      The credential family taught me the cleanest lesson in the whole record. I call the
      same function — hex of SHA-256 over the raw value — once right and once wrong. For
      refresh tokens with 244 bits of entropy it is fine. For a six-digit login code it is
      a commitment anyone can open: my server correctly stops online guessing at five
      attempts, but a stolen row is enough to walk the million-code space offline in
      milliseconds, and my five-attempt ceiling never engages because no guess is ever
      sent. I ran it for real and recovered a live code. I also found that my preimage
      encoding was ambiguous — email and code joined by a bare colon — so two different
      address-and-code pairs produce one string and one digest. My hardening is
      HMAC-SHA-256 under a key that lives outside the database, over a length-prefixed
      email and the code, compared in constant time. The argument against just using a
      slow hash is the one I would make to anyone: a slow hash makes the stolen row
      expensive; a key makes it insufficient. I filed the timing row in this family low
      and labelled it a surrogate — a byte-serial model of the compare's contract, not a
      wall-clock measurement of my shipped binary — because a unit test on a shared
      runner cannot honestly produce a timing number, and I forbid reading it as evidence
      of an exploitable channel.
    </BodyParagraph>

    <BodyParagraph>
      Composition is the fence I put between the model and the card a user sees, and it is
      the family with my hardest open problem. My shipped fence catches a fabricated
      number, a fabricated proper noun, a fabricated month and an adjacent month, a
      homoglyph-masked name; it rejects with named reasons — uncited claim, uncited date,
      unmatched quote, banned boilerplate, mood narration, model-control language. It also
      produced one accidental defense I flag as such: a period-separated injection is
      blocked by my shipped code only because it trips the sentence-count limit, not
      because it is recognized, while my hardening blocks it for the right reason. But two
      rows land under both columns and will keep landing. “the acme contract closes friday
      and the owner already signed” — no capitalized token, no number, nothing for
      token-level grounding to catch. And “The Lovelace Corp renewal is not due Nov 14”,
      about a fact that says it is: every word is grounded and the sentence is false.
      Token-level grounding cannot see a false proposition built from true tokens. Closing
      it needs proposition-level verification, which is design work I have not done, not a
      patch, and I keep both rows in the register so nobody reads fifty-one of fifty-three
      blocked as my fence verifying meaning. It cannot decide truth.
    </BodyParagraph>

    <InlineFigure
      src="/projects/molterra-security/adaptation-loop.svg"
      alt="Four boxes in a cycle: attack lands, hardening written, promoted to product, shipped verdict flips; a return arrow notes that a regression fails CI"
      caption={
        <>
          <strong>Fig. 5.</strong> My adaptation loop. An attack that lands is a finding,
          the attack is its witness, and the attack never leaves the corpus — so a
          regression fails my CI on the day it happens, not in the next audit.
        </>
      }
    />

    <BodyParagraph top={40}>
      I define a finding as an attack that lands on my shipped code. The corpus produces
      112 — six critical, forty-seven high, fifty-seven medium, two low — and the
      arithmetic closes: the witness counts across all 112 sum to exactly 759, my
      shipped-landed total, and the three attacks that land under hardening map one to one
      onto my three open findings. Status is a test result, not my judgement: a finding
      exists because a row lands on shipped code and closes when that row's hardened
      column blocks it. I cannot hand-edit the register. I put CVSS 3.1 vectors on seven
      of my nine remediation classes, stated as my estimates for a self-hosted deployment
      — so a reviewer can disagree with a number rather than with an adjective — and SLAs
      on my severity schedule, thirty days for critical, ninety for high and medium, next
      quarter for low, with one exception I state outright: the open
      proposition-grounding class is design work with no date.
    </BodyParagraph>

    <BodyParagraph>
      The split between the two verdicts is the mechanism that keeps my record honest,
      and it cuts against me. I count a fix as landed only when the shipped column flips
      to blocked in production code. Until then the hardened column is a proposal with its
      evidence attached, and at the published revision every one of my six fixes is still
      exactly that — proposed, sitting executable beside the attack that motivated it,
      with zero promoted. Promotion is its own reviewed change, with its own entries in my
      contracts register and a measured false-positive cost on ordinary records. When I
      ship a fix it must appear as a line moving from proposed to shipped, not as an
      adjective I quietly upgraded.
    </BodyParagraph>

    <BodyParagraph>
      A suite that recorded whatever my code did would prove nothing, so I made the corpus
      assert itself. I write verdicts before I run them; each attack states its expected
      outcome in both columns and the test recomputes them, with injection and
      steganography expectations coming from an explicit model of what the detector should
      do rather than from its output. Drift fails in both directions — an attack that
      starts landing is a regression, an attack that starts being blocked means my
      register overstates a hole — and I wrote the panic message as a policy statement: do
      not edit the row to match the output without deciding which one is wrong. I run
      every attack five times per mode and require it to agree with itself, including the
      vault family, which generates fresh nonces; two full passes must produce
      byte-identical evidence strings for every trace, which is why one of my rules of
      engagement forbids any fresh nonce or wall-clock value from appearing in evidence.
      I require the hardened column to dominate per row — nothing may be blocked shipped
      and land hardened — and enforce it three ways, including a generated superset over
      136 verb-object pairs. And I require my hardening to leave real records alone: a
      dedicated test feeds it prose a naive fence would flag — “The system prompt for our
      support bot needs a rewrite — Ada owns it.” “Please disregard my earlier estimate,
      the real figure is 12.” “assistant: I'll send the deck” — and demands the hardened
      verdict be identical to shipped. I measure the false-positive cost; I do not assert
      it. One cost I have named and not yet measured: the zero-width joiner is on my strip
      list and is load-bearing in Indic conjuncts and emoji sequences, acceptable for an
      excerpt, unproven for a title until my eval fixtures carry non-Latin content.
    </BodyParagraph>

    <BodyParagraph>
      I wrote the penetration-test package for the security team that has to evaluate my
      trust center's commitment. I made scope loopback by construction: my harness accepts
      a target only if it matches an anchored regular expression whose host is a closed
      alternation of 127.0.0.1, localhost and ::1, so user-info forms, look-alike
      hostnames and alternate IP spellings are refused with exit 2 before anything runs,
      and I rewrite localhost to the literal address so no tool is ever handed a name to
      resolve. Production, staging, customer tenants and third-party providers are out of
      scope by construction. My rules of engagement: synthetic identities and credentials
      only, no destructive or volumetric testing, evidence retained locally and never
      committed. I mapped coverage to OWASP WSTG, the OWASP LLM Top 10 and PTES, with a
      dedicated column for what I do not cover — three of eight areas are stamped not
      exercised: authentication and session, access control, and network and
      infrastructure — and even my exercised injection row concedes it does not cover live
      model behavior once an injection lands. I mapped the toolchain — Burp, ZAP, Nikto,
      SQLmap, Nmap, Gobuster, Hydra, Metasploit, WFuzz, WhatWeb — to what each tests, and
      I have not run any of them against a Molterra target from the repository, and I say
      so, because fabricated scanner output is worse than none. A tool I did not run I
      record as not run. My continuous program does not replace the annual external test;
      when one is performed, its findings join my register with the tester and date
      named.
    </BodyParagraph>

    <BodyParagraph>
      I make three statements carefully, because they are the ones a trust center is most
      tempted to inflate. My cipher and key size — AES-256 — are what NSA's CNSA 2.0 suite
      specifies for national-security systems, and I measure every primitive against
      NIST guidance. I am not FIPS 140-3 validated, I have not been evaluated for CNSA 2.0
      by anyone but myself, and I am not post-quantum. My review's CNSA row reads “does not
      meet — and we do not claim to”: SHA-256 where the suite calls for SHA-384, HS256
      sessions, no ML-KEM anywhere, and I list exactly what a stronger posture would
      require. I mapped each topic of a graduate cryptography curriculum to where it bears
      on my product, and I left the bottom half of that map deliberately empty —
      public-key encryption, signatures, zero knowledge, secret sharing, secure
      computation, fully homomorphic encryption, all marked not implemented — because a
      trust center that claimed zero-knowledge proofs because the words are impressive
      would be lying. Two more things I flagged from code reading alone, with no attack
      row yet: my MFA recovery codes are five random bytes under the same bare hash, which
      is a feasible 2⁴⁰ offline search; and my Argon2 parameters are the library default
      rather than a pinned constant, so a dependency bump could change work factors with
      nothing failing.
    </BodyParagraph>

    <BodyParagraph>
      I attack the vault and credential code through byte-faithful mirrors of my backend
      modules, pinned to the shipped wire format by a test, because my backend ships only
      as a binary crate — and a mirror is still a claim, so I opened one remediation class
      solely to give the backend a library target and delete them. Everything I publish is
      generated, and a test fails if the committed copy is stale. That is my whole
      posture: every number on the scoreboard is the record of a run, not a claim about
      one.
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
      cargo run --release --bin redteam · 991 attacks · 232 blocked shipped · 988 blocked
      hardened · 112 findings · 3 open by design. github.com/akmathur1/molterra-security
    </p>
  </div>
);

const KikuProjectBody: React.FC = () => (
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
      Kiku · Molterra's speech recognition module · Rust · MIT ·
      github.com/akmathur1/Kiku-
    </p>

    <BodyParagraph top={0}>
      Molterra listens to meetings, so everything it knows starts as audio. That makes
      the speech recognizer the narrowest point in the whole system: if a number is
      wrong there, every downstream claim inherits the error. I wrote Kiku — the
      frontend, the model code, the tokenizer decoding, and the decoding loop — in Rust,
      as a standalone MIT crate, so that the part of Molterra I care most about being
      correct is a part I can read end to end. It runs on candle for tensor operations
      and rustfft for the FFT; what sits on top of those is mine.
    </BodyParagraph>

    <BodyParagraph>
      The design idea is that Kiku is a multiclass network by construction. It is an
      encoder-decoder Transformer over an 80-channel log Mel frontend, and a single
      decoder softmax emits everything: the language token, the task token, the
      no-speech token, 20 ms timestamp classes, and the text itself, in a fixed grammar
      that runs start-of-transcript, language, task, timestamped text, end-of-transcript.
      One forward pass answers what language this is, whether anyone is speaking, when
      each phrase began and ended, and what was said. That is not a convenience. It is
      the reason transcription can continue into memory at all, which I come back to at
      the end.
    </BodyParagraph>

    <InlineFigure
      src="/projects/kiku/architecture.svg"
      alt="Log-Mel spectrogram through a Conv1D and GELU stem into Transformer encoder blocks, cross-attention into decoder blocks, next-token prediction over the multitask token format"
      caption={
        <>
          <strong>Fig. 1.</strong> The model. Audio enters bottom left, tokens bottom
          right, and one tied output projection produces language, task, timestamp and
          text tokens from the same softmax.
        </>
      }
    />

    <BodyParagraph top={40}>
      The frontend is the part I was most careful with, because a spectrogram bug is
      invisible — it does not crash, it just quietly costs accuracy. Audio is mixed to
      mono, resampled to 16 kHz, and cut to exactly 30 second windows: 480,000 samples,
      which become 3,000 frames. The short-time Fourier transform uses a 400-point FFT
      with a 160-sample hop, a Hann window, and reflect padding — a 25 ms analysis
      window every 10 ms. Those frames go through a Slaney-style mel filterbank, then
      log compression with a 1e-10 floor, a clamp to eight decades below the window
      maximum, and a final affine normalization. The one shortcut I would flag to a
      reviewer is the resampler: it is linear interpolation with no anti-aliasing filter
      ahead of the downsample, which is fine for the 48 kHz capture it sees in practice
      and would not be fine for arbitrary input.
    </BodyParagraph>

    <InlineFigure
      src="/projects/kiku/frontend.svg"
      alt="Seven-stage audio frontend: WAV input, mix down to mono, resample to 16 kHz, pad or trim to 30 second chunks, Hann STFT with FFT 400 and hop 160, 80 mel filterbank, log compress and normalize"
      caption={
        <>
          <strong>Fig. 2.</strong> The frontend, waveform to an 80 × 3000 log Mel
          spectrogram. The same code path serves the training notebooks and the Rust
          runtime, so there is no train-versus-serve skew to debug later.
        </>
      }
    />

    <BodyParagraph top={40}>
      The model itself is conventional and I kept it that way deliberately. The
      spectrogram passes through two Conv1D layers with GELU, kernel 3 and padding 1,
      the second with stride 2 to halve the time axis, then picks up positional encoding
      and runs through pre-activation Transformer blocks — layer norm before each
      sub-layer, a 4× MLP, epsilon 1e-5, and no bias on the key projection, since the
      subsequent softmax makes it redundant. The decoder attends to its own history
      causally and to the encoder output by cross-attention, and the output projection
      is tied to the token embedding rather than being a separate head. Decoding is
      KV-cached: self-attention keys and values are concatenated per step, while the
      cross-attention keys and values are computed once per window and reused for every
      token in it, which is where most of the saving is.
    </BodyParagraph>

    <BodyParagraph>
      Kiku does not train its own weights today. It loads openly published safetensors
      checkpoints as starting weights, reading the architecture out of the checkpoint's
      own config, so it transcribes for real now while the frontend, the model code and
      the decoding loop stay mine to evolve for meeting audio — low-volume speech,
      background chatter, and technical vocabulary. The notebooks in the repository are
      the other half of that: data preparation, the audio frontend, BPE tokenizer
      training, the architecture, the training loop, decoding, evaluation, and
      checkpoint export, end to end. They are the recipe for our own training runs. They
      are not a run I have performed, and the crate does not depend on them.
    </BodyParagraph>

    <BodyParagraph>
      Where I did spend real design effort is the decoding loop, because that is where
      an ASR system either earns trust or fabricates. Three heuristics matter. Voice
      activity detection drops a window only when the no-speech probability exceeds 0.6
      <em> and </em>the average log probability of the decoded text is below −1 — the
      no-speech probability alone is not sufficient, and treating it as sufficient is
      how you delete real speech. The timestamp grammar requires timestamps in pairs,
      forbids them from decreasing, and constrains the first timestamp of a window to
      its opening second, so the model cannot skip the first words by pointing past
      them. And a temperature ladder from 0.0 up to 1.0 retries a window whenever the
      zlib compression ratio of the output exceeds 2.4 — the repetition-loop signature —
      or the average log probability falls below −1, keeping the best-evidenced attempt
      rather than the last one.
    </BodyParagraph>

    <InlineFigure
      src="/projects/kiku/decoding.svg"
      alt="The decoding loop: token grammar, decode at temperature T with a ladder from 0.0 to 1.0, compression ratio and log probability checks that trigger retries, a VAD gate, and segments emitted with evidence"
      caption={
        <>
          <strong>Fig. 3.</strong> One 30 second window. The checks feed retries, the VAD
          gate decides whether the window is speech at all, and what survives is emitted
          carrying the evidence it was judged on.
        </>
      }
    />

    <BodyParagraph top={40}>
      Long-form audio advances by the last predicted timestamp rather than by a fixed
      stride, so a phrase never straddles a window boundary and gets transcribed twice
      or lost between the two. Every segment that comes out carries its start and end
      times, the identified language, the average log probability, and the no-speech
      probability. That evidence is the actual product. A consumer downstream is
      supposed to gate on it, and a low-confidence segment is display material — a human
      can read it — but nothing learns from it.
    </BodyParagraph>

    <BodyParagraph>
      There is one thing Kiku refuses to do, and it is the decision I am most sure
      about. It never infers who is speaking. Sequence-to-sequence models will happily
      guess speaker names from transcript context, fluently and wrongly, and that guess
      is discarded rather than surfaced. In Molterra, speaker identity comes from
      structural channel attribution and meeting-scoped diarization in the capture
      pipeline — evidence about who was on which channel, not a language model's
      inference from what was said. Kiku's output is transcription evidence: text,
      times, language, confidence. Nothing else.
    </BodyParagraph>

    <InlineFigure
      src="/projects/kiku/pipeline.svg"
      alt="Consent-gated meeting audio and the tenant lexicon feed Kiku, whose evidence-carrying segments split into a display transcript and, past the evidence gate, trusted reasoning input"
      caption={
        <>
          <strong>Fig. 4.</strong> Where Kiku sits. Above it, the hearing pipeline stays
          the trust layer; Kiku is one backend behind an evidence contract, not the
          arbiter of what is true.
        </>
      }
    />

    <BodyParagraph top={40}>
      To know whether any of this works I needed measurement rather than impressions, so
      the crate ships two evaluation harnesses. The LibriSpeech one transcribes a split,
      normalizes hypothesis and reference, and computes pooled corpus word error rate.
      The normalizer is a full English text normalizer and was more work than the metric:
      numbers, currencies, ordinals, decades, spelled forms like "double oh seven", a
      British-to-American spelling dictionary, contractions, title abbreviations, and
      Unicode symbol and diacritic removal, with its own test suite, because a WER that
      punishes "colour" against "color" measures the normalizer rather than the model.
      The FLEURS harness does the multilingual case with a language-agnostic normalizer,
      switching to character error rate for languages written without spaces — Chinese,
      Japanese, Thai, Lao, Burmese, Khmer. Translation into English runs but is written
      to a TSV unscored, because FLEURS ships no English reference to score it against.
    </BodyParagraph>

    <BodyParagraph>
      I want to be exact about what that means, because it is the easiest place to
      overclaim: the harnesses exist, and I have not published a number from them. There
      is no WER or CER figure anywhere in the repository. End-to-end verification so far
      is the tiny checkpoint on real synthesized speech and silence. The accuracy
      limitations are the ones any weakly supervised sequence-to-sequence model inherits
      — hallucination on non-speech and long silence, repetition loops, and performance
      that is uneven across languages, accents and acoustic conditions, worse in
      low-resource languages. Low error is not zero error, and the reliability heuristics
      above are there precisely because the model has these failure modes, not because it
      does not.
    </BodyParagraph>

    <BodyParagraph>
      Which brings me back to why the multiclass design matters. Simple transcription
      ends at a string. Because language identification, voice activity, timestamps and
      text are all classes of one output layer, every decoded segment is already a piece
      of evidence — words, when they were said, in what language, how sure the model is
      — produced by the same forward pass. That is the interface Molterra's memory layer
      consumes. Segments are registered as evidence; only those clearing the gate become
      trusted reasoning input; names, companies and terms in trusted segments are
      resolved against the tenant's closed lexicon, so memory constrains the transcript
      and the transcript never invents memory; and what survives is absorbed as durable
      facts, notes and tasks, each holding a pointer back to the audio span and the
      confidence that grounds it. It runs live over a rolling window while the room is
      still on the topic. When the audio is weak the chain stops at the gate and memory
      abstains — the design goal is that the system never remembers a guess.
    </BodyParagraph>

    <InlineFigure
      src="/projects/kiku/memory-path.svg"
      alt="Four stages from transcription to memory: register, gate, resolve, absorb, with the gate able to make memory abstain"
      caption={
        <>
          <strong>Fig. 5.</strong> Register, gate, resolve, absorb. The memory layer's
          implementation lives in Molterra rather than in this repository; what Kiku owns
          is the evidence that makes the gate decidable.
        </>
      }
    />

    <BodyParagraph top={40}>
      Kiku is not the backend Molterra runs in production right now — the capture
      pipeline currently uses a hosted one. Kiku is the seam for a local, open backend
      behind the same evidence contract, selected per session, with the higher hearing
      stages unchanged above it. Still ahead: beam search, previous-text conditioning to
      boost a tenant's key terms, word-level timestamps by cross-attention alignment,
      streaming, and our own training runs from the notebooks. Those land as follow-up
      slices. What exists today is the part I wanted to get right first — a recognizer
      whose output you can interrogate, that says how sure it is, and that declines to
      guess about the one thing it should never be asked.
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
      Rust · candle · MIT. 80-channel log Mel · 30 s windows · VAD at P(nospeech) &gt; 0.6
      and avg logprob &lt; −1 · temperature ladder 0.0 → 1.0 · LibriSpeech and FLEURS
      harnesses. github.com/akmathur1/Kiku-
    </p>
  </div>
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

const WatchArbitrageProjectBody: React.FC = () => (
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
      Reference-level arbitrage in specialist watch markets · a proposed model, with two
      executed acquisitions and no executed European strategy
    </p>

    <BodyParagraph top={0}>
      I am interested in watches that are difficult to price well. Knowing that something
      is a Vacheron or a Lange tells you surprisingly little about what a particular buyer
      will pay for it. The reference, the movement generation, the dial, the case
      condition and the service history decide which comparisons are useful — and a watch
      can look inexpensive against online listings while still being expensive against the
      bids actually available for it. That gap is the object of the research.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/thumbnail.svg"
      alt="A histogram of executable bids on the left and, far to its right, a single tall line marking the asking price, with the gap between them arrowed"
      caption={
        <>
          <strong>Fig. 1.</strong> The question the whole project asks: how much of an
          apparent discount survives contact with a buyer.
        </>
      }
    />

    <BodyParagraph top={40}>
      Vacheron's Historiques chronographs make the problem concrete. The 47101 and 47111
      belong to the Lemania-derived 1140/1141 family, and the later 47111 introduced a
      screwed caseback along with movement changes. The steel Cornes de vache 1955,
      reference 5000H/000A-B582, is a different observation again — a 38.5 mm case and a
      manually wound calibre 1142. A database that drops all three into one bucket because
      they are Vacheron chronographs has thrown away information the buyer can see before
      the pricing model has started.
    </BodyParagraph>

    <BodyParagraph>
      Lange makes the same point sharply. The original Datograph 403.035 is a 39 mm
      platinum watch with calibre L951.1 and no power-reserve indication; the Up/Down
      introduced in 2012 uses L951.6, a 60-hour reserve and a 41 mm case. Even within the
      original generation, early METER dial printing is a recorded distinction — and
      recording it is not the same as knowing what it is worth. Any associated premium
      still has to be estimated. The 1815 Chronograph needs its own generation labels for
      the same reason, since Lange changed the movement in 2010. With Journe, movement era
      belongs inside the identity of the watch: the manufacture dates the brass-to-gold
      transition to 2004, so the year alone is a poor substitute for inspecting the actual
      movement.
    </BodyParagraph>

    <BodyParagraph>
      These are research groups, not a prestige ranking and not a list of watches I claim
      to have traded. I would also avoid inferring liquidity from a brand name. Several
      credible bids on one reference are stronger evidence than a reputation for
      collectability.
    </BodyParagraph>

    <BodyParagraph>
      So the unit of observation is a physical watch at a particular time, and its identity
      is a vector of attributes rather than a label:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          r reference · g generation · m movement · d dial · c case condition · o
          originality · s service evidence · p provenance · a accessories
        </>
      }
    >
      z<sub>i</sub> = (r<sub>i</sub>, g<sub>i</sub>, m<sub>i</sub>, d<sub>i</sub>,
      c<sub>i</sub>, o<sub>i</sub>, s<sub>i</sub>, p<sub>i</sub>, a<sub>i</sub>)
    </DisplayMath>

    <BodyParagraph>
      Each attribute needs a value <em>and</em> an evidence status, which is the part most
      systems get wrong. An unverified original dial cannot be stored as an original dial.
      A service invoice can establish that work was performed without establishing that
      every component is period-correct. Unknown service history widens the range of
      outcomes even where it does not support a fixed dollar discount. And duplicate
      detection has to come before price estimation: five dealers advertising one consigned
      watch are not five independent observations, and an uncertain match stays uncertain.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/identity.svg"
      alt="A nine-row table of watch attributes, each carrying an evidence status of verified, claimed, or unknown"
      caption={
        <>
          <strong>Fig. 2.</strong> The same watch, stored honestly. What separates a usable
          record from a listing is the right-hand column.
        </>
      }
    />

    <BodyParagraph top={40}>
      What I want to estimate is not a price but a distribution of bids for the actual
      watch, conditional on the buyer and the moment — where the conditioning set contains
      only what was known at the time:
    </BodyParagraph>

    <DisplayMath>
      p( B<sub>i,d,t</sub> | z<sub>i</sub>, 𝒟<sub>t</sub> )
    </DisplayMath>

    <BodyParagraph>
      An advertised ask, an auction result and a dealer's purchase bid answer three
      different questions, so they belong in three separate tables. Auction records can
      establish reference details and provide transaction evidence, but their price basis,
      fees, timing and often unusually strong provenance have to be retained with them.
      They cannot simply be poured into a wholesale-bid training set. A starting
      specification for the bids themselves:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          α<sub>r</sub> the reference's baseline · β′z the individual example · u<sub>d</sub>{' '}
          the buyer · v<sub>d,r</sub> that buyer on that reference · m<sub>s,t</sub> the
          segment moving
        </>
      }
    >
      log B<sub>i,d,t</sub> = α<sub>r</sub> + β<sup>⊤</sup>z<sub>i</sub> + u<sub>d</sub> +
      v<sub>d,r</sub> + m<sub>s,t</sub> + ε<sub>i,d,t</sub>
    </DisplayMath>

    <BodyParagraph>
      For a thin reference I would partially pool its intercept with a defensible family,
      α<sub>r</sub> ~ 𝒩(μ<sub>f(r)</sub>, τ<sup>2</sup><sub>f(r)</sub>), and learn how
      strong that pooling should be. Too little gives unstable estimates from a handful of
      trades; too much erases exactly the reference distinctions that make the project
      worth doing. A Student-<em>t</em> residual is one candidate for limiting the
      influence of isolated extremes, with its tail parameter estimated rather than chosen
      to flatter the fit.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/bid-model.svg"
      alt="The bid equation decomposed into labelled terms: reference baseline, this example, buyer, buyer by reference, segment over time, and noise"
      caption={
        <>
          <strong>Fig. 3.</strong> Each term answers a different question. Separating them
          is what lets a thin reference borrow strength without being flattened into its
          neighbours.
        </>
      }
    />

    <BodyParagraph top={40}>
      Dealer effects are the easiest thing here to overinterpret. If one dealer only ever
      sees exceptional examples, a high estimated dealer effect may be missing condition
      information wearing a disguise. Telling buyer preference apart from selection needs
      overlapping watches, repeated quotes, or carefully matched examples. The output I
      want is a predictive range rather than a point — a low, median and high bid — always
      reported with the number of independent watches supporting it and how much of it came
      from comparable rather than identical references. Three old observations should not
      produce the same confidence as repeated recent bids on the exact configuration. This
      is a proposed specification: without a suitable bid dataset, its parameters are
      unknown.
    </BodyParagraph>

    <BodyParagraph>
      An unusual asking price is a reason to investigate, not to buy. The comparison that
      matters is the distribution of net proceeds after every cost of the route:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          A gross purchase · R refund, converted when received · f, F exit fees · C
          acquisition, inspection, delivery and import · H financing or a disclosed capital
          charge
        </>
      }
    >
      Π<sub>i,d</sub> = B<sub>i,d</sub>(1 − f<sub>d</sub>) − F<sub>d</sub> +
      x<sub>r</sub>R<sub>i</sub> − x<sub>p</sub>A<sub>i</sub> − C<sub>i</sub> −
      H<sub>i</sub>
    </DisplayMath>

    <BodyParagraph>
      Every uncertain component stays uncertain until evidence resolves it. A predicted bid
      is not a committed bid; an expected refund is not cash received. For a research trade
      I would require an expected profit above a threshold, a loss probability inside a
      tolerance, and a bounded conditional value at risk in the specified tail — and those
      three numbers are chosen capital constraints, not discoveries. The model does not get
      to tell me my risk tolerance. The joint distribution matters too: a weak resale market
      can cut bids and stretch the holding period at the same time, so estimating each cost
      independently and adding comfortable averages understates the exposure.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/decision.svg"
      alt="A decision flow from candidate watch to estimating net proceeds, branching into buy, request information, or pass, with an information request looping back"
      caption={
        <>
          <strong>Fig. 4.</strong> Three outcomes, not two. "Request information" is a real
          answer, and the middle branch is where most of the value is.
        </>
      }
    />

    <BodyParagraph top={40}>
      That middle branch deserves its own arithmetic. In this market the next useful action
      is often a movement photograph, an inspection, or a direct quote from a specialist,
      and the algorithm should be able to choose it. The value of an inquiry is the expected
      improvement in the decision it enables, net of what it costs:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          the zero inside each maximum is the option to pass · the inquiry cost includes
          money and the economic effect of delay · under risk constraints, each maximum
          ranges only over admissible choices
        </>
      }
    >
      VOI = 𝔼<sub>Y</sub>[ max(0, max<sub>d</sub> 𝔼[Π<sub>i,d</sub> | 𝒟, Y]) ] − max(0,
      max<sub>d</sub> 𝔼[Π<sub>i,d</sub> | 𝒟]) − c<sub>inquiry</sub>
    </DisplayMath>

    <BodyParagraph>
      This is what makes uncertainty actionable rather than decorative. If the spread turns
      on whether a dial is original, better evidence can change both the value and the set
      of buyers willing to bid at all. A model that converts that uncertainty straight into
      a confident point estimate is solving the wrong problem. Early on I would run this as
      a recorded decision framework rather than a fitted optimization — I would not put a
      number on an inquiry without a defensible distribution for its outcomes.
    </BodyParagraph>

    <BodyParagraph>
      Time to sale belongs beside the bid, because an exit that takes a year is a different
      trade from the same exit in a month. I would model the hazard of sale as a function of
      the watch's attributes, the offered price relative to a benchmark, and the channel —
      treating unsold watches as censored rather than failed, and listings withdrawn for
      unknown reasons as unresolved rather than as sales. Sale to a dealer, sale to a
      collector, withdrawal and relisting are different outcomes and, with enough data,
      competing ones. A finite-horizon estimate has to carry the unsold state explicitly:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          the liquidation assumption must be tied to a route that actually exists — it
          cannot be the same optimistic ask the watch already failed to achieve
        </>
      }
    >
      𝔼[Π<sub>i</sub>] = p<sub>h</sub> 𝔼[Π<sup>sold</sup> | T ≤ h] + (1 − p<sub>h</sub>)
      𝔼[Π<sup>liquidated</sup> | T &gt; h]
    </DisplayMath>

    <BodyParagraph>
      A small worked example shows why this is worth the trouble. Take a watch costing
      $40,000 before holding costs, and two exits: a committed dealer bid netting $42,000
      against $100 of holding cost, or waiting for a collector at $44,500 against $800 —
      with a 30% chance the sale fails and the watch liquidates at $38,500. Both routes
      return an expected $1,900. They are not the same trade. Waiting beats the dealer only
      if the collector-sale probability exceeds 0.70, and it pays for that upside with a
      possible loss and a longer capital commitment. A committed bid also has to be checked
      against the clock: a quote that expires before the watch can arrive does not close the
      trade unless the buyer agrees to hold it.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/exit.svg"
      alt="A decision tree comparing a committed dealer exit against waiting for a collector, with the two branches reaching the same expected profit"
      caption={
        <>
          <strong>Fig. 5.</strong> Equal expected profit, unequal risk. Illustrative
          figures, not quotes for any particular watch.
        </>
      }
    />

    <BodyParagraph top={40}>
      The European extension adds a second set of costs to the same reference-level problem,
      and I have not executed it. For an ordinary VAT-inclusive invoice the embedded tax is
      A·v/(1+v) — but ordinary VAT, a secondhand margin scheme, a private sale and a
      documented net export invoice cannot share one assumed refund percentage. The model
      has to use the actual invoice and the actual route. I would calculate the effective
      purchase cost while funding the gross cash requirement, because the refund may arrive
      long after payment, and I would report real borrowing expense separately from imputed
      opportunity cost. Import costs need a transaction-specific classification against a
      dated rule set; seller location does not establish country of origin. A trade whose
      material import cost is unresolved gets rejected rather than papered over with a
      generic percentage.
    </BodyParagraph>

    <BodyParagraph>
      For a first screen, though, the useful form is the one that inverts into an execution
      limit — the most I can pay, and the exchange rate at which the trade stops clearing
      its hurdle:
    </BodyParagraph>

    <DisplayMath
      note={
        <>
          E effective euro cost · x dollars per euro · F other dollar costs · M the required
          margin · where duty varies with purchase price, solve the full cost function
          instead
        </>
      }
    >
      E<sub>max</sub> = [ B(1 − f) − F − M ] / x   ·   x<sub>max</sub> = [ B(1 − f) − F − M
      ] / E
    </DisplayMath>

    <BodyParagraph>
      I would also keep payment rewards out of the initial screen entirely. The cash spread
      should survive without a generous valuation of points.
    </BodyParagraph>

    <BodyParagraph>
      With several candidates competing at once, the object being chosen is not a watch but
      a watch-to-buyer route. At most one buyer per watch, so the same piece is not bought
      twice because it looks attractive down two paths; at most a supported number of
      watches per buyer, because a dealer's willingness to take one example does not extend
      to ten. Funding has to hold on every relevant day rather than on average, and shared
      shipping or travel is charged once to the route rather than to each trade that uses
      it. Maximizing expected profit against a conditional-value-at-risk penalty over joint
      scenarios keeps the shared exposure visible: several bids can depend on one buyer,
      several purchases on one refund route, and a segment repricing can move a group of
      references together. Separate watch boxes do not imply independent risks.
    </BodyParagraph>

    <InlineFigure
      src="/projects/watch-arbitrage/allocation.svg"
      alt="A bipartite graph of four watches and three buyers with candidate and selected routes, under per-watch and per-buyer capacity constraints"
      caption={
        <>
          <strong>Fig. 6.</strong> Allocation over routes, under funding and buyer capacity.
        </>
      }
    />

    <BodyParagraph top={40}>
      None of this needs a sophisticated price model to start paying off. The first
      implementation is a ledger: one record per physical watch with its evidence; separate
      immutable records for asks, bids, inspections, auction results and settlements; dated
      cash flows with landed cost and funding requirements; buyer quotes with their
      conditions, capacity and expiry; and a frozen decision record — buy, request
      information, or pass — with the reason and the inputs as they stood. Then outcomes:
      actual settlement, actual costs, unsold inventory, and forecast error. The
      hierarchical bid model comes after that ledger is reliable, the time-to-sale model
      after the bid model, and the allocation model only once enough candidates compete for
      capital at the same time. The system has to retain rejected candidates too — otherwise
      it cannot tell a useful filter from a story told around a few good trades.
    </BodyParagraph>

    <BodyParagraph>
      The benchmark to beat is exact-reference matching against actual buyer bids with a
      complete cost ledger, and anything more complicated has to improve decisions on data
      it has not seen. Training and evaluation move forward in time; repeated listings of
      one physical watch stay together; a later auction result or revised condition report
      cannot improve the information supposedly available at purchase. I would track
      interval coverage, bid error, failed-exit losses, holding duration and the gap between
      forecast and realized cost — broken out by reference and by buyer, because a good
      aggregate can hide a model that reliably overvalues one configuration. Profit per
      dollar-day is a fair capital-duration measure, but it goes next to dollar profit, open
      inventory, sample size and the largest single loss. A quick isolated sale does not
      establish a repeatable annual return. And I would specifically test whether the
      model's most attractive-looking opportunities are its largest errors, since searching
      many references and taking the maximum predicted spread is an efficient way to select
      optimistic noise.
    </BodyParagraph>

    <BodyParagraph>
      What is actually executed: I have used arbitrage to acquire a Vacheron Constantin
      Historiques and a Rolex Daytona. Those two belong in the account because they connect
      the work to a real outcome, and the case studies should eventually reconstruct the
      purchase date, exact reference, amount paid, additional costs and the actual source of
      the advantage. Those details are not in this draft, and I am not asserting a purchase
      price, a realized return, a dealer relationship, or a trade in a Lange, a Patek or a
      Journe. Those references are the research universe, not my transaction history. The
      European algorithm remains unexecuted, and the mathematics above describes a proposed
      model with no fitted parameters and no validated backtest behind it. The goal is
      narrower and more useful than a return figure: to make the next decision explainable
      at the level of the reference, the buyer and the cash flows — what I think the watch
      can realize, why I think it, and what I stand to lose if I am wrong.
    </BodyParagraph>

    <p
      style={{
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: 1.7,
        maxWidth: 640,
        marginTop: 48,
        color: COLORS.muted,
      }}
    >
      Reference notes, which ground the technical distinctions above and establish no prices:
      Phillips on Vacheron 47101/47111 and on the Datograph 403.035; Vacheron Constantin on
      the Cornes de vache 5000H/000A-B582; A. Lange &amp; Söhne on the Datograph Up/Down and
      the 1815 Chronograph; Phillips on Patek 5070 and 5170; F.P. Journe's Journal 4 for the
      2004 brass-to-gold transition and the Octa Calendrier Patrimoine record; the European
      Commission on VAT refunds and VAT special schemes. Catalogue assertions about a
      particular example still have to be checked against that example's own documents and
      condition evidence.
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
      Clinic Radiation Oncology · Dr. Aadel Chaudhuri's group · May – August 2025
    </p>

    <BodyParagraph top={0}>
      High-grade serous ovarian carcinoma is the most common and the most lethal form of
      ovarian cancer, and its defining clinical problem is recurrence. Most patients
      respond to platinum-based first-line therapy and most of them relapse, at which
      point the oncologist is choosing a second-line agent — topotecan, gemcitabine,
      doxorubicin, carboplatin again, paclitaxel — with very little to go on about which
      one this particular tumor will answer to. I spent the summer in Dr. Aadel
      Chaudhuri's group at Mayo Clinic building the machine-learning infrastructure for
      a different way of making that choice: read the tumor's transcriptome, and predict,
      per agent, whether it will respond and whether the disease will progress.
    </BodyParagraph>

    <BodyParagraph>
      The data were RNA-seq profiles from 89 patient-derived xenograft models. A PDX is a
      patient's tumor grown in an immunodeficient mouse; unlike a cell line it keeps the
      tumor's heterogeneity and much of its architecture, and unlike a patient it can be
      dosed with five different drugs and observed. That is what makes the cohort
      unusual: for each model and each agent there are two binary labels — did it
      respond, did it progress — measured directly rather than inferred from a chart.
      It is also what makes the problem hard. Eighty-nine is a small number against
      twenty thousand genes, the labels are badly imbalanced, and rare-disease oncology
      never hands you more. Every design decision I made was about extracting a
      calibrated, interpretable signal from that regime without fooling myself.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/cohort.svg"
      alt="A matrix whose rows are 89 PDX models and whose columns are five agents; every cell holds a pair of squares, response and progression, filled for yes and hollow for no. Filled squares are rare and the two squares in a cell usually agree."
      caption={
        <>
          <strong>Fig. 1.</strong> The shape of the problem: 89 models × 5 agents × 2 binary
          labels, or 890 supervision signals, against roughly 20,000 features. Cell values
          are illustrative.
        </>
      }
    />

    <BodyParagraph top={40}>
      The first job was to get the feature space down to something a model could learn
      from at this sample size. Raw counts across roughly 20,000 transcripts are
      dominated by two kinds of noise that have nothing to do with drug response:
      low-variance housekeeping genes that are expressed at about the same level in
      every sample, and donor-batch effects that separate models by where and when they
      were sequenced rather than by biology. Left in the feature space, both corrupt the
      gradient — the network spends its capacity fitting them. I ran DESeq2 for
      normalization and differential-expression testing, which brought the space from
      about 20,000 transcripts to roughly 1,500 genes with statistical support as
      predictive biomarkers, and then applied FetterGrad feature selection on top of
      that to arrive at the model's input. This pruning was the single most important
      step in the pipeline; nothing downstream worked well without it.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/feature-funnel.svg"
      alt="Four bars narrowing left to right: about 20,000 raw transcripts, DESeq2 normalization and differential expression, about 1,500 predictive biomarkers, FetterGrad-selected model input"
      caption={
        <>
          <strong>Fig. 2.</strong> The feature funnel. DESeq2 takes ~20,000 transcripts to
          ~1,500 predictive genes; FetterGrad selection produces the model input. Both
          steps exist to keep housekeeping variance and batch effects out of the
          gradient.
        </>
      }
    />

    <BodyParagraph top={40}>
      With this little data the easiest way to produce an impressive number is to leak.
      If the same samples that tune a model's hyperparameters also score it, the score
      measures how well you tuned to those samples, not how well the model generalizes.
      So I used nested K-fold cross-validation throughout: an outer loop holds out a
      fold for evaluation and never shows it to anything else; inside each outer
      training split, an inner loop does all hyperparameter selection on its own
      validation folds. The held-out fold is untouched by tuning, and the outer scores
      are the only ones I report. It is more expensive — every configuration is fit
      many times — but on 89 samples it is the difference between a result and an
      artifact.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/nested-cv.svg"
      alt="Two rows of folds: an outer loop with one held-out fold for evaluation, and an inner loop within the outer training split for hyperparameter tuning"
      caption={
        <>
          <strong>Fig. 3.</strong> Nested cross-validation. Tuning happens only inside the
          outer training split; the held-out fold is never seen by selection, so no
          information leaks from evaluation into the model.
        </>
      }
    />

    <BodyParagraph top={40}>
      Then the architecture. The obvious approach is two separate classifiers — one for
      response, one for progression — but that throws away the most useful thing about
      the labels, which is that they are strongly and positively correlated: a tumor that
      responds tends not to progress, and vice versa. I designed OvarianMTLNet as a
      shared-representation network: selected gene expression goes into a common trunk of
      dense layers, and two task-specific heads read that one representation to estimate
      P(response) and P(progression). Both losses backpropagate into the trunk, trained
      with Adam. In effect each task supervises the other. The progression labels
      regularize what the trunk learns for response, and the response labels do the same
      for progression, so the representation is shaped by twice the supervision either
      task could provide alone.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/mtl-architecture.svg"
      alt="OvarianMTLNet: selected gene expression enters a shared trunk of dense layers, which fans out to a response head and a progression head"
      caption={
        <>
          <strong>Fig. 4.</strong> OvarianMTLNet. One shared trunk, two heads, both losses
          updating the same representation.
        </>
      }
    />

    <BodyParagraph top={40}>
      This is why multitask learning is the right inductive prior for exactly this data
      scale and not merely a fashionable one. A single-task network on a few dozen
      positive examples has to discover the relevant gene programs from those examples
      alone. The multitask network sees every label as evidence about the shared
      structure, which is where the biology actually lives — the transcriptional state
      that makes a tumor chemosensitive tends to be the same state that keeps it from
      progressing. When single-task data is sparse, cross-task gradient sharing
      dominates, and the advantage should be largest precisely on the agents with the
      fewest examples. That is what I set out to test.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/single-vs-multi.svg"
      alt="Left, two separate single-task networks each seeing only its own labels; right, one shared trunk receiving gradients from both the response and progression heads"
      caption={
        <>
          <strong>Fig. 5.</strong> Single-task versus multitask. Two supervision signals,
          one representation — an inductive prior that matters most when each task's
          data is sparse.
        </>
      }
    />

    <BodyParagraph top={40}>
      I benchmarked it against the two models a careful statistician would reach for
      first on tabular expression data: gradient-boosted decision trees in XGBoost, and
      penalized logistic regression. All three sat on the same feature funnel and the
      same nested cross-validation, so the comparison isolates the architecture. Across
      the second-line agents OvarianMTLNet reached an ROC-AUC of up to 0.969 on held-out
      folds, with an average of 0.85 across the response-prediction tasks, and the shared
      representation outperformed both baselines on the agents with the smallest
      effective sample size — the pattern the multitask argument predicts. I also
      ensembled the models, which is the cheapest robustness you can buy at this scale.
      The full pipeline — DESeq2, FetterGrad, nested folds, the three models — is in the
      diagram below, which is the one I actually worked from.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/pipeline.png"
      alt="OvarianMTLNet pipeline: DESeq2 preprocessing, FetterGrad training, multitask architecture with response and progression heads"
      caption={
        <>
          <strong>Fig. 6.</strong> The working pipeline diagram: preprocessing from RNA-seq
          through DESeq2 and FetterGrad, the training process for P(response) and
          P(progression), and the final OvarianMTLNet architecture alongside the
          XGBoost and logistic-regression baselines.
        </>
      }
    />

    <BodyParagraph top={40}>
      A prediction that an oncologist cannot interrogate is not much use to one, so the
      last part of the work was attribution. I used SHAP to decompose each prediction into
      per-gene contributions: for a given tumor and agent, which genes pushed the
      estimate toward response and which pushed it away, and by how much. Aggregated over
      the cohort, those contributions surface the gene programs the model relies on, and
      the ones that carried the most weight localized to pathways with prior literature
      support for chemoresistance in high-grade serous disease. That matters in two
      directions. It is a sanity check on the model — a network that predicted well from
      biologically meaningless genes would be fitting batch structure, not tumors — and it
      is a path from a black-box score to a mechanistic hypothesis that someone can take
      into the wet lab.
    </BodyParagraph>

    <InlineFigure
      src="/projects/ovarian-mtl/shap-attribution.svg"
      alt="A waterfall from base rate to predicted probability, with generic gene contributions pushing the estimate up or down"
      caption={
        <>
          <strong>Fig. 7.</strong> SHAP attribution for one prediction, illustrative. Each
          gene's contribution sums to the output; over the cohort, the recurring
          contributors are the gene programs the model has learned to trust.
        </>
      }
    />

    <BodyParagraph top={40}>
      What I took from the summer is less a number than a discipline. The ceiling on a
      problem like this is set by the data, and the work is in refusing every shortcut
      that would make the result look better than the data can support: leakage, an
      unpruned feature space, a model that cannot explain itself. Multitask learning
      earned its place here not because it is clever but because it is the honest way to
      use two correlated labels when you have eighty-nine of each. The same framework —
      funnel, nested folds, shared trunk, attribution — applies to any small-cohort
      precision-oncology problem where the labels come in correlated pairs.
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
      Three models built. Average ROC-AUC 0.85 across drug-response prediction tasks;
      best-performing agent 0.969. Research conducted under Dr. Aadel Chaudhuri, Mayo
      Clinic Radiation Oncology.
    </p>
  </div>
);

export default App;
