import React from 'react';

const COLORS = {
  bg: '#EDECE8',
  text: '#1a1a1a',
  muted: '#7a7a7a',
  line: '#1a1a1a',
};

const SERIF = '"Tiempos Headline", "Source Serif Pro", "PT Serif", "Iowan Old Style", Georgia, serif';
const MONO = '"SF Mono", "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace';

type Entry = {
  title: React.ReactNode;
  date: string;
  description: string;
  featured?: boolean;
};

const ENTRIES: Entry[] = [
  {
    title: 'Project Title Goes Here',
    date: 'May 14, 2026',
    description: 'A short one to two line description of the featured item — replace with real content.',
    featured: true,
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
  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.text,
        padding: '72px 80px 120px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 48,
          }}
        >
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 400,
              fontSize: 36,
              letterSpacing: -0.2,
              color: COLORS.text,
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

        {/* Intro */}
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
          Short bio placeholder. Replace this paragraph with a few sentences describing
          who you are, what you work on, and what visitors should expect to find here.
          Keep it to three or four lines so it stays balanced with the header above.
        </p>

        {/* Timeline */}
        <section style={{ position: 'relative', marginTop: 80, paddingLeft: 0 }}>
          {/* Vertical line */}
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
            <TimelineRow key={i} entry={entry} last={i === ENTRIES.length - 1} />
          ))}
        </section>
      </div>
    </div>
  );
};

const TimelineRow: React.FC<{ entry: Entry; last: boolean }> = ({ entry, last }) => {
  const bulletSize = 9;
  const contentLeft = 44;

  const inner = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: COLORS.text }}>
          {entry.title}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 16, color: COLORS.muted, whiteSpace: 'nowrap' }}>
          {entry.date}
        </span>
      </div>
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
          style={{
            border: `1px solid ${COLORS.text}`,
            padding: '18px 22px',
          }}
        >
          {inner}
        </div>
      ) : (
        inner
      )}
    </div>
  );
};

export default App;
