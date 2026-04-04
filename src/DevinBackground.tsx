import React, { useRef, useEffect } from 'react';

// ─── Grid ──────────────────────────────────────────────────────
const CELL_W = 12;                // horizontal character spacing (tight)
const CELL_H = 16;                // vertical line spacing
const CHAR_SIZE = 10;             // font size
const GRID_CHAR = '+';
const GRID_ALPHA = 0.045;         // very faint base grid
const BG = '#0a0f1a';
const STRUCT_CHARS = '@#%=+-.:;*'.split('');
// Colors (muted blue-gray palette)
const C_GRID: [number, number, number] = [80, 100, 150];
const C_STRUCT: [number, number, number] = [75, 95, 145];
const C_SIGNAL: [number, number, number] = [115, 155, 215];
const C_FRAG: [number, number, number] = [130, 170, 230];
const C_HOVER: [number, number, number] = [95, 125, 180];

// Flow
const FLOW_RES = 50;
const FLOW_DRIFT = 0.00005;

// Mouse
const MOUSE_RADIUS = 300;
const MOUSE_STRENGTH = 0.4;
const MOUSE_PULL = 1.5;
const HOVER_RADIUS = 180;
const HOVER_FRAG_CD = 40;
const HOVER_FRAG_P = 0.35;

// Fragments
const FRAG_LIFE = 260;
const FRAG_FADEIN = 25;
const FRAG_FADEOUT = 55;
const FRAG_DRIFT = 0.12;
const MAX_FRAGS = 24;
const CONN_DIST = 200;
const CONN_ALPHA = 0.07;

// Evolution
const EVOLVE_INT = 550;
const EVOLVE_FADE = 180;

// ─── Expression pools ─────────────────────────────────────────
const EXPR_STD = [
  'λ(x) → ∇²ψ', 'Σᵢ wᵢxᵢ', 'd/dt σ(Wx+b)', 'argmin_θ L(θ)',
  'Ξ(t) ≈ drift', '∂f/∂x = 0', 'P(A|B) ∝ L(B|A)', 'H(X) = -Σ p log p',
  '∇·F = ρ/ε₀', 'det(A-λI) = 0', 'E[X] = ∫x dF(x)', 'KL(p‖q)',
  'softmax(zᵢ)', 'α → β → γ', 'μ ± 2σ', 'O(n log n)',
  'ReLU(Wx)', '∂L/∂w', 'tanh(z)', 'x̂ = Ax + Bu',
  'ŷ = f(θ,x)', 'tr(AᵀA)', 'rank(J)', 'dim ker(T)',
  'sup{f(x)}', 'lim n→∞', '‖∇f‖₂', 'conv(K,x)',
  'FFT(x[n])', 'Var(X̄)', '∇_θ J(θ)', 'ε ~ N(0,I)',
];
const EXPR_COMPLEX = [
  '∫₀^∞ e^{-x²} dx = √π/2', '∇²ψ + (2m/ℏ²)(E-V)ψ = 0',
  'L(θ) = -Σᵢ [yᵢlog(ŷᵢ) + (1-yᵢ)log(1-ŷᵢ)]',
  'θₜ₊₁ = θₜ - η∇L(θₜ) + μ(θₜ - θₜ₋₁)',
  'ELBO = E_q[log p(x|z)] - KL(q(z|x)‖p(z))',
  'ρ(t+1) = Σ_s P(s\'|s,π(s)) · ρ(t)',
];
const EXPR_HOVER = [
  '∇²ψ', 'Ξ(t)', 'σ(z)', '∂/∂t', 'λ_max', 'tr(A)',
  '‖x‖', 'det(J)', 'ρ(s)', 'π*(a|s)', 'log Z', '∇f', 'Δw',
];
const SEQUENCES = [
  ['∂L/∂w', '→ Δw = -η∇L', '→ θ* converged'],
  ['encode(x) → z', 'z ~ q(z|x)', 'decode(z) → x̂'],
  ['loss = Σ(ŷ-y)²', '∇loss = 2Σ(ŷ-y)', 'w -= η·∇loss'],
  ['A = UΣVᵀ', 'rank(A) = r'],
  ['forward(x)', 'loss(ŷ,y)', 'backward()'],
  ['sample z', 'decode(z) → x̂', 'L_recon + L_KL'],
];

// ─── Types ─────────────────────────────────────────────────────
interface StreamBand {
  // A horizontal band of ASCII characters, like a line of terminal output
  y: number;           // row index (in grid coords)
  startCol: number;    // leftmost column
  segments: number[];  // per-column: char index into STRUCT_CHARS, -1 = gap
  opacity: number;
  targetOpacity: number;
  born: number;
}

interface Signal {
  pts: { x: number; y: number }[];
  head: number; speed: number;
  len: number; bright: number;
}

interface Frag {
  x: number; y: number; vx: number; vy: number;
  text: string; age: number; life: number; scale: number;
  seqId: number; isHover: boolean;
}

// ─── RNG ───────────────────────────────────────────────────────
function mkRng(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Noise for hover reveal ────────────────────────────────────
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const rng = mkRng(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const g = (ix: number, iy: number) => {
      const gi = perm[perm[ix] + iy] & 7;
      return grad[gi][0] * (xf - (ix > X ? 1 : 0)) + grad[gi][1] * (yf - (iy > Y ? 1 : 0));
    };
    const n00 = g(X, Y), n10 = g(X + 1, Y), n01 = g(X, Y + 1), n11 = g(X + 1, Y + 1);
    return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
  };
}

// ─── Component ─────────────────────────────────────────────────
const DevinBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const prevMouseRef = useRef({ x: -9999, y: -9999 });
  const mouseSpeedRef = useRef(0);
  const timeRef = useRef(0);
  const fragsRef = useRef<Frag[]>([]);
  const seqCtr = useRef(0);
  const cursorBlink = useRef(0);
  const hoverCD = useRef(0);
  const evolveTimer = useRef(0);
  const evoSeed = useRef(200);

  const stateRef = useRef<{
    cols: number; rows: number;
    bands: StreamBand[];
    signals: Signal[];
    flowAngles: Float32Array;
    flowCols: number; flowRows: number;
    w: number; h: number;
    noise: (x: number, y: number) => number;
  } | null>(null);

  // ── Generate a horizontal stream band ────────────────────────
  // These mimic the Cognition reference: horizontal rows of structured characters
  // like "+@@@#/+==--..." flowing left to right
  function makeBand(
    cols: number, rows: number, rng: () => number, frame: number
  ): StreamBand {
    const y = Math.floor(rng() * rows);
    // Band spans a portion of the row
    const bandLen = 15 + Math.floor(rng() * (cols * 0.6));
    const startCol = Math.floor(rng() * (cols - 10));
    const segments: number[] = [];

    // Generate structured character pattern (not random)
    // Use repeating motifs with variation
    const patternType = Math.floor(rng() * 5);
    let density = 0.3 + rng() * 0.5; // overall density

    for (let c = 0; c < bandLen; c++) {
      // Probability of a gap
      if (rng() > density) {
        segments.push(-1);
        continue;
      }

      let charIdx: number;
      const pos = c / bandLen; // 0..1 position along band

      switch (patternType) {
        case 0:
          // Dense center, light edges: @@@##==--..
          if (pos > 0.3 && pos < 0.7) {
            charIdx = Math.floor(rng() * 3); // @#%
          } else if (pos > 0.15 && pos < 0.85) {
            charIdx = 3 + Math.floor(rng() * 3); // =+-
          } else {
            charIdx = 6 + Math.floor(rng() * 3); // .:;
          }
          break;
        case 1:
          // Repeating blocks: @@@ === ... @@@ === ...
          {
            const block = Math.floor(c / 4) % 3;
            if (block === 0) charIdx = Math.floor(rng() * 3);
            else if (block === 1) charIdx = 3 + Math.floor(rng() * 3);
            else charIdx = 6 + Math.floor(rng() * 3);
          }
          break;
        case 2:
          // Left-heavy: dense on left, fading right
          {
            const weight = 1 - pos;
            if (weight > 0.6) charIdx = Math.floor(rng() * 3);
            else if (weight > 0.3) charIdx = 3 + Math.floor(rng() * 4);
            else charIdx = 6 + Math.floor(rng() * 3);
          }
          break;
        case 3:
          // Uniform medium density
          charIdx = 2 + Math.floor(rng() * 5); // %=+-*
          break;
        default:
          // Sparse with occasional dense clusters
          if (rng() < 0.2) {
            charIdx = Math.floor(rng() * 3); // @#%
            // Repeat for a small cluster
            for (let k = 0; k < 2 + Math.floor(rng() * 4) && c + k < bandLen; k++) {
              segments.push(charIdx);
              c++;
            }
            continue;
          }
          charIdx = 4 + Math.floor(rng() * 5);
          break;
      }

      segments.push(charIdx);
    }

    return {
      y, startCol, segments,
      opacity: 0, targetOpacity: 0.15 + rng() * 0.25,
      born: frame,
    };
  }

  // ── Build initial bands ──────────────────────────────────────
  function buildBands(cols: number, rows: number, rng: () => number): StreamBand[] {
    const bands: StreamBand[] = [];
    // Create many bands — the reference shows heavy coverage
    const n = 25 + Math.floor(rng() * 15);
    for (let i = 0; i < n; i++) {
      const b = makeBand(cols, rows, rng, 0);
      b.opacity = b.targetOpacity; // start visible
      bands.push(b);
    }
    // Also create some "cluster zones" — groups of adjacent rows
    const numZones = 4 + Math.floor(rng() * 3);
    for (let z = 0; z < numZones; z++) {
      const baseRow = Math.floor(rng() * rows);
      const zoneHeight = 3 + Math.floor(rng() * 8);
      const zoneStartCol = Math.floor(rng() * (cols * 0.3));
      const zoneWidth = Math.floor(cols * (0.2 + rng() * 0.5));

      for (let r = 0; r < zoneHeight; r++) {
        const row = baseRow + r;
        if (row >= rows) break;

        const bandLen = zoneWidth + Math.floor((rng() - 0.5) * 20);
        const segments: number[] = [];
        const density = 0.4 + rng() * 0.45;

        for (let c = 0; c < bandLen; c++) {
          if (rng() > density) { segments.push(-1); continue; }
          // Characters get lighter toward edges
          const dx = Math.abs(c / bandLen - 0.5) * 2; // 0=center, 1=edge
          const dy = Math.abs(r / zoneHeight - 0.5) * 2;
          const edgeDist = Math.max(dx, dy);

          if (edgeDist < 0.4) {
            segments.push(Math.floor(rng() * 3)); // @#%
          } else if (edgeDist < 0.7) {
            segments.push(2 + Math.floor(rng() * 4)); // %=+-
          } else {
            segments.push(5 + Math.floor(rng() * 4)); // -.:;
          }
        }

        bands.push({
          y: row, startCol: zoneStartCol + Math.floor((rng() - 0.5) * 6),
          segments,
          opacity: 0.12 + rng() * 0.22,
          targetOpacity: 0.12 + rng() * 0.22,
          born: 0,
        });
      }
    }
    return bands;
  }

  // ── Build signals ────────────────────────────────────────────
  function buildSignals(w: number, h: number, rng: () => number): Signal[] {
    const sigs: Signal[] = [];
    const n = 14 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const pts: { x: number; y: number }[] = [];
      const segs = 50 + Math.floor(rng() * 50);
      let px = rng() * w, py = rng() * h;
      let ang = rng() * Math.PI * 2;
      // Bias toward horizontal movement
      if (rng() < 0.6) ang = (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.4;
      const curv = 0.01 + rng() * 0.03;
      for (let s = 0; s < segs; s++) {
        pts.push({ x: px, y: py });
        ang += (rng() - 0.5) * curv * 2;
        if (px < w * 0.05) ang += 0.03;
        if (px > w * 0.95) ang -= 0.03;
        if (py < h * 0.05) ang += 0.02;
        if (py > h * 0.95) ang -= 0.02;
        const step = CELL_W * (0.8 + rng() * 0.8);
        px += Math.cos(ang) * step;
        py += Math.sin(ang) * step;
      }
      sigs.push({
        pts, head: rng(),
        speed: 0.0006 + rng() * 0.0018,
        len: 5 + Math.floor(rng() * 14),
        bright: 0.3 + rng() * 0.5,
      });
    }
    return sigs;
  }

  // ── Spawn fragment ───────────────────────────────────────────
  function spawn(x: number, y: number, text: string, sid: number, hover: boolean) {
    const f = fragsRef.current;
    if (f.length >= MAX_FRAGS) f.shift();
    const a = Math.random() * Math.PI * 2;
    f.push({
      x, y,
      vx: Math.cos(a) * FRAG_DRIFT * (hover ? 0.4 : 1),
      vy: Math.sin(a) * FRAG_DRIFT * (hover ? 0.4 : 1),
      text, age: 0,
      life: hover ? 130 : FRAG_LIFE + Math.floor(Math.random() * 50),
      scale: 0, seqId: sid, isHover: hover,
    });
  }

  function handleClick(e: MouseEvent) {
    const x = e.clientX, y = e.clientY;
    const count = 2 + Math.floor(Math.random() * 4);
    if (Math.random() < 0.35) {
      const seq = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
      const sid = seqCtr.current++;
      seq.forEach((t, i) => {
        setTimeout(() => {
          spawn(x + (i - (seq.length - 1) / 2) * 55,
            y + (Math.random() - 0.5) * 35, t, sid, false);
        }, i * 350);
      });
    } else {
      const sid = seqCtr.current++;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
          const r = 25 + Math.random() * 50;
          const pool = Math.random() < 0.15 ? EXPR_COMPLEX : EXPR_STD;
          spawn(x + Math.cos(a) * r, y + Math.sin(a) * r,
            pool[Math.floor(Math.random() * pool.length)], sid, false);
        }, i * 120);
      }
    }
  }

  // ── Initialize ───────────────────────────────────────────────
  function initialize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const rng = mkRng(42);
    const cols = Math.ceil(w / CELL_W) + 2;
    const rows = Math.ceil(h / CELL_H) + 2;

    const flowCols = Math.ceil(w / FLOW_RES) + 2;
    const flowRows = Math.ceil(h / FLOW_RES) + 2;
    const flowAngles = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngles.length; i++) flowAngles[i] = rng() * Math.PI * 2;

    const bands = buildBands(cols, rows, rng);
    const signals = buildSignals(w, h, rng);
    const noise = makeNoise(42);

    stateRef.current = {
      cols, rows, bands, signals,
      flowAngles, flowCols, flowRows, w, h, noise,
    };
  }

  // ── Flow angle ───────────────────────────────────────────────
  function flowAng(x: number, y: number, t: number, s: NonNullable<typeof stateRef.current>): number {
    const fc = Math.min(Math.max(Math.floor(x / FLOW_RES), 0), s.flowCols - 1);
    const fr = Math.min(Math.max(Math.floor(y / FLOW_RES), 0), s.flowRows - 1);
    let base = s.flowAngles[fr * s.flowCols + fc] + t * FLOW_DRIFT;
    const mx = mouseRef.current.x, my = mouseRef.current.y;
    const dx = x - mx, dy = y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS) {
      base += Math.atan2(dy, dx) * (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
    }
    return base;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || !s) { animRef.current = requestAnimationFrame(render); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { w, h, cols, rows, bands, signals, noise } = s;
    timeRef.current++;
    const time = timeRef.current;
    cursorBlink.current++;

    const cmx = mouseRef.current.x, cmy = mouseRef.current.y;
    const mvx = cmx - prevMouseRef.current.x;
    const mvy = cmy - prevMouseRef.current.y;
    prevMouseRef.current = { x: cmx, y: cmy };
    mouseSpeedRef.current = mouseSpeedRef.current * 0.85 + Math.sqrt(mvx * mvx + mvy * mvy) * 0.15;
    const mspd = mouseSpeedRef.current;

    // ── Evolve bands ───────────────────────────────────────────
    evolveTimer.current++;
    if (evolveTimer.current >= EVOLVE_INT) {
      evolveTimer.current = 0;
      // Fade out 2-4 random bands
      const fadeN = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < fadeN && bands.length > 10; i++) {
        bands[Math.floor(Math.random() * bands.length)].targetOpacity = 0;
      }
      // Spawn new bands
      const spawnN = 2 + Math.floor(Math.random() * 3);
      const erng = mkRng(evoSeed.current++);
      for (let i = 0; i < spawnN; i++) {
        bands.push(makeBand(cols, rows, erng, time));
      }
    }

    // Update band opacities, cull dead
    for (let i = bands.length - 1; i >= 0; i--) {
      const b = bands[i];
      const rate = 1 / EVOLVE_FADE;
      if (b.opacity < b.targetOpacity) b.opacity = Math.min(b.targetOpacity, b.opacity + rate);
      else if (b.opacity > b.targetOpacity) b.opacity = Math.max(b.targetOpacity, b.opacity - rate);
      if (b.targetOpacity === 0 && b.opacity < 0.002) bands.splice(i, 1);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${CHAR_SIZE}px "SF Mono","Fira Code","Cascadia Code","Consolas",monospace`;
    ctx.textBaseline = 'middle';

    // ── Build structure map from bands ─────────────────────────
    // Rather than a Float32Array for every cell (expensive for tight grid),
    // we build a sparse lookup: Map<"row,col" -> {charIdx, alpha}>
    // But that's slow too. Instead, iterate bands per-row.

    // Pre-index bands by row for fast lookup
    const bandsByRow: Map<number, StreamBand[]> = new Map();
    for (const b of bands) {
      const existing = bandsByRow.get(b.y);
      if (existing) existing.push(b);
      else bandsByRow.set(b.y, [b]);
    }

    // ── Signal glow: precompute per-cell glow ──────────────────
    // Use a sparse map for signal glow since grid is very dense
    const glowCells: Map<number, number> = new Map(); // key = row*cols+col

    for (const sig of signals) {
      const hpi = Math.min(Math.floor(sig.head * (sig.pts.length - 1)), sig.pts.length - 1);
      const hp = sig.pts[hpi];
      const sd = Math.sqrt((hp.x - cmx) ** 2 + (hp.y - cmy) ** 2);
      const sm = sd < MOUSE_RADIUS
        ? 1 + (1 - sd / MOUSE_RADIUS) * 2.5 * Math.min(mspd / 8, 1)
        : 1;
      sig.head += sig.speed * sm;
      if (sig.head > 1) sig.head -= 1;

      const headIdx = sig.head * (sig.pts.length - 1);
      for (let t = 0; t < sig.len; t++) {
        const idx = headIdx - t;
        if (idx < 0 || idx >= sig.pts.length - 1) continue;
        const pi = Math.floor(idx);
        const fr = idx - pi;
        const px = sig.pts[pi].x + (sig.pts[pi + 1].x - sig.pts[pi].x) * fr;
        const py = sig.pts[pi].y + (sig.pts[pi + 1].y - sig.pts[pi].y) * fr;
        const gc = Math.round(px / CELL_W);
        const gr = Math.round(py / CELL_H);
        const fade = 1 - t / sig.len;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const c = gc + dc, r = gr + dr;
            if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
            const key = r * cols + c;
            const dist = Math.sqrt(dc * dc + dr * dr);
            const glow = fade * sig.bright * Math.max(0, 1 - dist * 0.5);
            glowCells.set(key, Math.min(1, (glowCells.get(key) || 0) + glow));
          }
        }
      }
    }

    // ── Hover state ────────────────────────────────────────────
    const mouseOn = cmx > 0 && cmy > 0 && cmx < w && cmy < h;
    if (mouseOn) {
      hoverCD.current--;
      if (hoverCD.current <= 0) {
        hoverCD.current = HOVER_FRAG_CD;
        if (Math.random() < HOVER_FRAG_P && mspd > 1.5) {
          spawn(
            cmx + (Math.random() - 0.5) * HOVER_RADIUS,
            cmy + (Math.random() - 0.5) * HOVER_RADIUS,
            EXPR_HOVER[Math.floor(Math.random() * EXPR_HOVER.length)],
            -1, true,
          );
        }
      }
    }

    // ── Render all cells ───────────────────────────────────────
    ctx.textAlign = 'left'; // monospace left-aligned for proper spacing

    for (let row = 0; row < rows; row++) {
      const py = row * CELL_H;
      const rowBands = bandsByRow.get(row);

      for (let col = 0; col < cols; col++) {
        const px = col * CELL_W;

        // Flow displacement
        const ang = flowAng(px, py, time, s);
        let ox = Math.cos(ang) * 0.3 * Math.sin(time * 0.003 + col * 0.08);
        let oy = Math.sin(ang) * 0.3 * Math.cos(time * 0.002 + row * 0.06);

        // Mouse pull
        const mdx = cmx - px, mdy = cmy - py;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < MOUSE_RADIUS && mDist > 0) {
          const pt = (1 - mDist / MOUSE_RADIUS);
          ox += (mdx / mDist) * pt * pt * MOUSE_PULL;
          oy += (mdy / mDist) * pt * pt * MOUSE_PULL;
        }

        const dx = px + ox;
        const dy = py + oy;

        // Check if this cell has structure from a band
        let structChar = -1;
        let structAlpha = 0;
        if (rowBands) {
          for (const b of rowBands) {
            const localCol = col - b.startCol;
            if (localCol >= 0 && localCol < b.segments.length) {
              const ci = b.segments[localCol];
              if (ci >= 0) {
                structChar = ci;
                structAlpha = Math.max(structAlpha, b.opacity);
              }
            }
          }
        }

        // Signal glow
        const cellKey = row * cols + col;
        const glow = glowCells.get(cellKey) || 0;

        // Hover reveal
        let hoverBoost = 0;
        if (mouseOn && mDist < HOVER_RADIUS) {
          const ht = 1 - mDist / HOVER_RADIUS;
          hoverBoost = ht * ht * 0.4;
          // Reveal hidden noise structure
          if (structChar < 0) {
            const nv = noise(col * 0.12, row * 0.12 + time * 0.0001);
            if (nv > 0.1 && hoverBoost > 0.05) {
              structChar = Math.floor(Math.abs(nv * 8)) % STRUCT_CHARS.length;
              structAlpha = hoverBoost * nv * 1.5;
            }
          }
        }

        if (structChar >= 0 && structAlpha > 0.005) {
          const ch = STRUCT_CHARS[structChar];
          const alpha = structAlpha + glow * 0.5 + hoverBoost * 0.1;
          const isReveal = hoverBoost > 0.05 && structAlpha < 0.1;
          const base = isReveal ? C_HOVER : C_STRUCT;
          const r = base[0] + glow * (C_SIGNAL[0] - base[0]);
          const g = base[1] + glow * (C_SIGNAL[1] - base[1]);
          const b = base[2] + glow * (C_SIGNAL[2] - base[2]);
          ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(0.85, alpha)})`;
          ctx.fillText(ch, dx, dy);
        } else if (glow > 0.01) {
          ctx.fillStyle = `rgba(${C_SIGNAL[0]},${C_SIGNAL[1]},${C_SIGNAL[2]},${Math.min(1, GRID_ALPHA + glow * 0.4)})`;
          ctx.fillText(GRID_CHAR, dx, dy);
        } else {
          const ga = GRID_ALPHA + (hoverBoost > 0 ? hoverBoost * 0.035 : 0);
          ctx.fillStyle = `rgba(${C_GRID[0]},${C_GRID[1]},${C_GRID[2]},${ga})`;
          ctx.fillText(GRID_CHAR, dx, dy);
        }
      }
    }

    // ── Fragments ──────────────────────────────────────────────
    const frags = fragsRef.current;
    for (let i = frags.length - 1; i >= 0; i--) {
      const f = frags[i];
      f.age++;
      f.x += f.vx; f.y += f.vy;
      const fa = flowAng(f.x, f.y, time, s);
      f.vx += Math.cos(fa) * 0.002; f.vy += Math.sin(fa) * 0.002;
      f.vx *= 0.997; f.vy *= 0.997;
      if (f.age < FRAG_FADEIN) f.scale = f.age / FRAG_FADEIN;
      else if (f.age > f.life - FRAG_FADEOUT) f.scale = Math.max(0, (f.life - f.age) / FRAG_FADEOUT);
      else f.scale = 1;
      if (f.age >= f.life) frags.splice(i, 1);
    }

    // Connections
    ctx.lineWidth = 0.5;
    for (let i = 0; i < frags.length; i++) {
      if (frags[i].isHover) continue;
      for (let j = i + 1; j < frags.length; j++) {
        if (frags[j].isHover) continue;
        const a = frags[i], b = frags[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sameSeq = a.seqId >= 0 && a.seqId === b.seqId;
        const maxD = sameSeq ? CONN_DIST * 2.2 : CONN_DIST;
        if (dist < maxD) {
          const alpha = (1 - dist / maxD) * Math.min(a.scale, b.scale) *
            (sameSeq ? CONN_ALPHA * 3.5 : CONN_ALPHA);
          ctx.strokeStyle = `rgba(${C_FRAG[0]},${C_FRAG[1]},${C_FRAG[2]},${alpha})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    // Fragment text
    ctx.textAlign = 'center';
    for (const f of frags) {
      if (f.scale <= 0) continue;
      const alpha = f.scale * (f.isHover ? 0.32 : 0.55);
      const fs = (f.isHover ? 10 : 13) * (0.85 + f.scale * 0.15);
      ctx.font = `${fs}px "SF Mono","Fira Code","Cascadia Code",monospace`;
      ctx.textBaseline = 'middle';
      const rgb = f.isHover ? C_HOVER : C_FRAG;
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fillText(f.text, f.x, f.y);
    }

    // ── Center text ────────────────────────────────────────────
    const ts = Math.min(w * 0.038, 46);
    ctx.font = `300 ${ts}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(203,213,225,0.88)';
    ctx.fillText('Arjun Mathur:', w / 2, h / 2);
    if ((cursorBlink.current % 60) < 35) {
      const met = ctx.measureText('Arjun Mathur:');
      ctx.fillStyle = 'rgba(203,213,225,0.6)';
      ctx.fillRect(w / 2 + met.width / 2 + 5, h / 2 - ts * 0.34, 2, ts * 0.68);
    }

    ctx.restore();
    animRef.current = requestAnimationFrame(render);
  }

  useEffect(() => {
    initialize();
    animRef.current = requestAnimationFrame(render);
    const onR = () => initialize();
    const onM = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onC = (e: MouseEvent) => handleClick(e);
    window.addEventListener('resize', onR);
    window.addEventListener('mousemove', onM);
    window.addEventListener('click', onC);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onR);
      window.removeEventListener('mousemove', onM);
      window.removeEventListener('click', onC);
    };
  }, []); // eslint-disable-line

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
    />
  );
};

export default DevinBackground;
