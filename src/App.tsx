import React, { useState } from 'react';

const COLORS = {
  bg: '#EDECE8',
  text: '#1a1a1a',
  muted: '#7a7a7a',
  line: '#1a1a1a',
};

const SERIF = '"Newsreader", "Tiempos Headline", "Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

type View = { name: 'home' } | { name: 'project'; slug: string };

type Entry = {
  slug?: string;
  title: React.ReactNode;
  date: string;
  description: string;
  featured?: boolean;
  thumbnail?: React.ReactNode;
};

const PhysicsThumbnail: React.FC = () => (
  <svg
    viewBox="0 0 160 100"
    width={140}
    height={88}
    style={{ display: 'block', border: `1px solid ${COLORS.text}`, background: COLORS.bg }}
    aria-label="Physics Work"
  >
    {/* Dense condensate phase, left */}
    <g fill={COLORS.text}>
      {[
        [28, 30], [38, 36], [22, 44], [34, 50], [44, 44], [30, 58],
        [42, 62], [24, 68], [36, 72], [50, 54], [52, 36], [18, 56],
        [46, 70], [40, 28], [28, 78],
      ].map(([cx, cy], i) => (
        <circle key={`d-${i}`} cx={cx} cy={cy} r={2.2} />
      ))}
    </g>
    {/* Dilute phase, right */}
    <g fill={COLORS.text} opacity={0.55}>
      {[
        [82, 26], [104, 38], [128, 30], [146, 52], [92, 60], [118, 70],
        [138, 78], [100, 84], [86, 44], [124, 54], [110, 24],
      ].map(([cx, cy], i) => (
        <circle key={`s-${i}`} cx={cx} cy={cy} r={1.6} />
      ))}
    </g>
    {/* Interface */}
    <line x1={66} y1={8} x2={66} y2={92} stroke={COLORS.text} strokeWidth={0.5} strokeDasharray="2 3" opacity={0.6} />
    {/* Label */}
    <text
      x={80}
      y={97}
      textAnchor="middle"
      fontFamily={MONO}
      fontSize={6}
      fill={COLORS.muted}
      letterSpacing={1}
    >
      PHYSICS · WORK
    </text>
  </svg>
);

const ENTRIES: Entry[] = [
  {
    slug: 'fus-idp-hamiltonians',
    title: 'Coarse-Grained Hamiltonians for FUS-Derived IDPs',
    date: 'August 2025 — present',
    description:
      'Sequence-resolved coarse-grained Hamiltonians for FUS-derived intrinsically disordered protein variants. MPIPI parameterization, Langevin dynamics, and density–temperature phase diagrams probing sequence-dependent condensate organization. With Dr. Trevor GrandPré.',
    featured: true,
    thumbnail: <PhysicsThumbnail />,
  },
  {
    title: 'Second Entry Title',
    date: 'April 2, 2026',
    description: 'Description for the second entry — concise summary of the work, paper, or update.',
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
  return <Home onNavigate={setView} />;
};

const PageShell: React.FC<{ onNavigate: (v: View) => void; children: React.ReactNode }> = ({
  onNavigate,
  children,
}) => (
  <div
    style={{
      minHeight: '100vh',
      background: COLORS.bg,
      color: COLORS.text,
      padding: '72px 80px 120px',
    }}
  >
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 48,
        }}
      >
        <h1
          onClick={() => onNavigate({ name: 'home' })}
          style={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: 36,
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
            gap: 32,
            fontFamily: MONO,
            fontSize: 16,
          }}
        >
          {['Home', 'Work', 'Contact'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              onClick={(e) => {
                if (label === 'Home') {
                  e.preventDefault();
                  onNavigate({ name: 'home' });
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

const Home: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => (
  <PageShell onNavigate={onNavigate}>
    <p
      style={{
        fontFamily: MONO,
        fontSize: 16,
        lineHeight: 1.7,
        maxWidth: 720,
        marginTop: 72,
        color: COLORS.text,
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

    <section style={{ position: 'relative', marginTop: 80, paddingLeft: 0 }}>
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

      {ENTRIES.map((entry, i) => (
        <TimelineRow
          key={i}
          entry={entry}
          last={i === ENTRIES.length - 1}
          onOpen={
            entry.slug
              ? () => onNavigate({ name: 'project', slug: entry.slug as string })
              : undefined
          }
        />
      ))}
    </section>
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
        gap: 24,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 16,
          color: COLORS.text,
        }}
      >
        {entry.title}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 16,
          color: COLORS.muted,
          whiteSpace: 'nowrap',
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
        fontSize: 15,
        lineHeight: 1.6,
        color: COLORS.muted,
        marginTop: 8,
      }}
    >
      {entry.description}
    </div>
  );

  const textCol = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {titleAndDate}
      {description}
    </div>
  );

  const boxContent = entry.thumbnail ? (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0 }}>{entry.thumbnail}</div>
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
        marginBottom: last ? 0 : 40,
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
      {entry.featured ? (
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
            border: `1px solid ${COLORS.text}`,
            padding: '18px 22px',
            cursor: onOpen ? 'pointer' : 'default',
            background: hover && onOpen ? 'rgba(26,26,26,0.04)' : 'transparent',
            transition: 'background 120ms ease',
          }}
        >
          {boxContent}
        </div>
      ) : (
        <>
          {titleAndDate}
          {description}
        </>
      )}
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
          marginTop: 64,
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
        <article style={{ marginTop: 32 }}>
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
                fontSize: 30,
                letterSpacing: -0.2,
                color: COLORS.text,
                maxWidth: 720,
              }}
            >
              {entry.title}
            </h2>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 15,
                color: COLORS.muted,
                whiteSpace: 'nowrap',
              }}
            >
              {entry.date}
            </span>
          </div>

          {entry.thumbnail && (
            <div style={{ marginTop: 32 }}>{entry.thumbnail}</div>
          )}

          <p
            style={{
              fontFamily: MONO,
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 760,
              marginTop: 32,
              color: COLORS.text,
            }}
          >
            {entry.description}
          </p>

          <p
            style={{
              fontFamily: MONO,
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 760,
              marginTop: 48,
              color: COLORS.muted,
            }}
          >
            More detail coming soon — figures, methods, and write-up in progress.
          </p>
        </article>
      )}
    </PageShell>
  );
};

export default App;
