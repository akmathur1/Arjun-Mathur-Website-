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
  poster?: { src: string; alt: string };
};

const FUSThumbnail: React.FC = () => (
  <img
    src="/projects/fus/pipeline.png"
    alt="Physics-informed basis and ML parameterization pipeline"
    style={{
      display: 'block',
      width: 180,
      height: 'auto',
      border: `1px solid ${COLORS.text}`,
      background: COLORS.bg,
    }}
  />
);

const OvarianMTLThumbnail: React.FC = () => {
  const inputs: [number, number][] = [[20, 30], [20, 55], [20, 80]];
  const shared: [number, number][] = [[78, 22], [78, 44], [78, 66], [78, 88]];
  const headA: [number, number][] = [[128, 28], [168, 28]];
  const headB: [number, number][] = [[128, 82], [168, 82]];
  return (
    <svg
      viewBox="0 0 200 115"
      width={180}
      height={104}
      style={{ display: 'block', border: `1px solid ${COLORS.text}`, background: COLORS.bg }}
      aria-label="Multitask neural network: shared trunk with two task heads"
    >
      <g stroke={COLORS.text} strokeWidth={0.4} opacity={0.32}>
        {inputs.flatMap(([ix, iy], i) =>
          shared.map(([sx, sy], j) => (
            <line key={`is-${i}-${j}`} x1={ix} y1={iy} x2={sx} y2={sy} />
          ))
        )}
        {shared.flatMap(([sx, sy], i) => [
          <line key={`sa-${i}`} x1={sx} y1={sy} x2={headA[0][0]} y2={headA[0][1]} />,
          <line key={`sb-${i}`} x1={sx} y1={sy} x2={headB[0][0]} y2={headB[0][1]} />,
        ])}
        <line x1={headA[0][0]} y1={headA[0][1]} x2={headA[1][0]} y2={headA[1][1]} opacity={0.6} />
        <line x1={headB[0][0]} y1={headB[0][1]} x2={headB[1][0]} y2={headB[1][1]} opacity={0.6} />
      </g>
      <g fill={COLORS.text}>
        {inputs.map(([x, y], i) => <circle key={`i-${i}`} cx={x} cy={y} r={2.6} />)}
        {shared.map(([x, y], i) => <circle key={`s-${i}`} cx={x} cy={y} r={2.6} />)}
        {headA.map(([x, y], i) => <circle key={`a-${i}`} cx={x} cy={y} r={2.6} />)}
        {headB.map(([x, y], i) => <circle key={`b-${i}`} cx={x} cy={y} r={2.6} />)}
      </g>
      <text x={172} y={20} fontFamily={MONO} fontSize={5.5} fill={COLORS.muted}>
        P(R)
      </text>
      <text x={172} y={97} fontFamily={MONO} fontSize={5.5} fill={COLORS.muted}>
        P(Prog)
      </text>
      <text
        x={100}
        y={112}
        fontFamily={MONO}
        fontSize={5.5}
        fill={COLORS.muted}
        textAnchor="middle"
        letterSpacing={1}
      >
        SHARED TRUNK · TASK HEADS
      </text>
    </svg>
  );
};

const ENTRIES: Entry[] = [
  {
    slug: 'fus-idp-hamiltonians',
    title: 'Coarse-Grained Hamiltonians for FUS-Derived IDPs',
    date: 'August 2025 — present',
    description:
      'Sequence-resolved coarse-grained Hamiltonians for FUS-derived intrinsically disordered protein variants. MPIPI parameterization, Langevin dynamics, and density–temperature phase diagrams probing sequence-dependent condensate organization. With Dr. Trevor GrandPré.',
    featured: true,
    thumbnail: <FUSThumbnail />,
  },
  {
    slug: 'ovarian-mtl',
    title: 'OvarianMTL Algorithm ML Infrastructure (Mayo Clinic)',
    date: 'May 2025 — August 2025',
    description:
      "Built 3 separate models achieving an average AUC of 85% for predicting drug response in high-grade serous ovarian cancer. With Dr. Aadel Chaudhari's group at Mayo Clinic.",
    featured: true,
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
            cursor: onOpen ? 'pointer' : 'default',
            padding: onOpen ? '4px 6px' : 0,
            marginLeft: onOpen ? -6 : 0,
            marginRight: onOpen ? -6 : 0,
            background: hover && onOpen ? 'rgba(26,26,26,0.04)' : 'transparent',
            transition: 'background 120ms ease',
          }}
        >
          {boxContent}
        </div>
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
                fontSize: 16,
                lineHeight: 1.7,
                maxWidth: 760,
                marginTop: 40,
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
      fontSize: 15.5,
      lineHeight: 1.75,
      maxWidth: 760,
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
  <figure style={{ marginTop: 40, maxWidth: 820 }}>
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
        fontSize: 13,
        lineHeight: 1.6,
        color: COLORS.muted,
        marginTop: 10,
        maxWidth: 760,
      }}
    >
      {caption}
    </figcaption>
  </figure>
);

const FUSProjectBody: React.FC = () => (
  <div style={{ marginTop: 40 }}>
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
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 760,
        marginTop: 56,
        color: COLORS.muted,
      }}
    >
      Figures, simulation studies, and full technical write-up currently in
      development with Dr. Trevor GrandPré.
    </p>
  </div>
);

const OvarianMTLProjectBody: React.FC = () => (
  <div style={{ marginTop: 40 }}>
    <p
      style={{
        fontFamily: MONO,
        fontSize: 14,
        lineHeight: 1.6,
        color: COLORS.muted,
        marginTop: 0,
        marginBottom: 24,
        letterSpacing: 0.3,
      }}
    >
      Multitask Neural Networks for Ovarian Cancer Drug Response Prediction · Mayo
      Clinic · Dr. Aadel Chaudhari's group
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
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 760,
        marginTop: 56,
        color: COLORS.muted,
      }}
    >
      Three models built. Average AUC: 0.85 across drug response prediction
      tasks. Best-performing agent AUC: 0.969.
    </p>
  </div>
);

export default App;
