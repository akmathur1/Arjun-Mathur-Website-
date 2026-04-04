import React, { useRef, useEffect } from 'react';

// ─── Grid & Rendering ─────────────────────────────────────────
const GRID_SPACING = 18;
const CHAR_SIZE = 11;
const GRID_CHAR = '+';
const GRID_OPACITY = 0.055;
const STRUCTURE_CHARS = ['@', '#', '%', '=', '+', '-', '.'];
const BG_COLOR = '#020617';
const STRUCT_RGB: [number, number, number] = [65, 85, 135];
const SIGNAL_RGB: [number, number, number] = [120, 165, 225];
const FRAG_RGB: [number, number, number] = [135, 175, 235];
const HOVER_REVEAL_RGB: [number, number, number] = [90, 120, 175];

// ─── Flow Field ────────────────────────────────────────────────
const FLOW_RES = 40;
const FLOW_DRIFT = 0.00006;

// ─── Mouse / Hover ─────────────────────────────────────────────
const MOUSE_RADIUS = 280;
const MOUSE_STRENGTH = 0.5;
const MOUSE_PULL = 2.0;
const HOVER_REVEAL_RADIUS = 160;  // area of "enhanced resolution"
const HOVER_FRAG_COOLDOWN = 35;   // frames between ambient hover-fragments
const HOVER_FRAG_CHANCE = 0.4;    // probability per cooldown tick

// ─── Fragments ─────────────────────────────────────────────────
const FRAG_LIFETIME = 260;
const FRAG_FADEIN = 25;
const FRAG_FADEOUT = 55;
const FRAG_DRIFT = 0.12;
const MAX_FRAGS = 24;
const CONN_DIST = 200;
const CONN_OPACITY = 0.07;

// ─── Field evolution ───────────────────────────────────────────
const EVOLVE_INTERVAL = 600;      // frames (~10s) between cluster morphs
const EVOLVE_TRANSITION = 180;    // frames to crossfade old→new cluster

// ─── Expressions ──────────────────────────────────────────────
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
  '∫₀^∞ e^{-x²} dx = √π/2',
  '∇²ψ + (2m/ℏ²)(E-V)ψ = 0',
  'dS/dt = -βSI/N, dI/dt = βSI/N - γI',
  'L(θ) = -Σᵢ [yᵢlog(ŷᵢ) + (1-yᵢ)log(1-ŷᵢ)]',
  'θₜ₊₁ = θₜ - η∇L(θₜ) + μ(θₜ - θₜ₋₁)',
  'ELBO = E_q[log p(x|z)] - KL(q(z|x)‖p(z))',
  'ρ(t+1) = Σ_s P(s\'|s,π(s)) · ρ(t)',
  'F = ma = -∇V(r) + η(t)',
];
const EXPR_HOVER = [
  '∇²ψ', 'Ξ(t)', 'σ(z)', '∂/∂t', 'λ_max',
  'tr(A)', '‖x‖', 'det(J)', 'ρ(s)', 'π*(a|s)',
  'log Z', 'μ(x)', 'H(p)', '∇f', 'Δw',
];
const SEQUENCES = [
  ['∂L/∂w', '→ Δw = -η∇L', '→ θ* converged'],
  ['X ~ N(μ,σ²)', 'Z = (X-μ)/σ', 'P(Z > 1.96) = 0.025'],
  ['encode(x) → z', 'z ~ q(z|x)', 'decode(z) → x̂'],
  ['loss = Σ(ŷ-y)²', '∇loss = 2Σ(ŷ-y)', 'w -= η·∇loss'],
  ['A = UΣVᵀ', 'rank(A) = r'],
  ['dx/dt = f(x)', 'x(t) = ∫f(x)dt'],
  ['sample z', 'decode(z) → x̂', 'L_recon + L_KL'],
  ['forward(x)', 'loss(ŷ,y)', 'backward()'],
];

// ─── Types ─────────────────────────────────────────────────────
interface GridCell { x: number; y: number; col: number; row: number }

interface Cluster {
  cx: number; cy: number;
  rx: number; ry: number;
  rot: number;
  density: number[][];
  mapW: number; mapH: number;
  chars: number[];
  sym: 'bilateral' | 'radial' | 'block';
  opacity: number;       // for fade transitions
  targetOpacity: number;
  born: number;          // frame when created
}

interface Signal {
  pts: { x: number; y: number }[];
  head: number; speed: number;
  len: number; bright: number;
}

interface Frag {
  x: number; y: number;
  vx: number; vy: number;
  text: string;
  age: number; life: number;
  scale: number;
  seqId: number;
  isHover: boolean; // hover fragments are dimmer + shorter
}

// ─── Seeded RNG ────────────────────────────────────────────────
function mkRng(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Simplex-ish 2D noise (fast, no deps) ─────────────────────
function makeNoise2D(seed: number) {
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
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const g = (ix: number, iy: number) => {
      const gi = perm[perm[ix] + iy] & 7;
      return grad[gi][0] * (xf - (ix - X > 0 ? 1 : 0)) + grad[gi][1] * (yf - (iy - Y > 0 ? 1 : 0));
    };

    const n00 = g(X, Y);
    const n10 = g(X + 1, Y);
    const n01 = g(X, Y + 1);
    const n11 = g(X + 1, Y + 1);

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
  const seqCtrRef = useRef(0);
  const cursorBlinkRef = useRef(0);
  const hoverCooldownRef = useRef(0);
  const evolveTimerRef = useRef(0);
  const rngCounterRef = useRef(100); // for evolving cluster seeds

  const stateRef = useRef<{
    grid: GridCell[];
    cols: number; rows: number;
    clusters: Cluster[];
    signals: Signal[];
    flowAngles: Float32Array;
    flowCols: number; flowRows: number;
    w: number; h: number;
    noise2d: (x: number, y: number) => number;
  } | null>(null);

  // ── Build one cluster ────────────────────────────────────────
  function makeCluster(
    w: number, h: number, rng: () => number, frame: number
  ): Cluster {
    const cx = w * (0.05 + rng() * 0.9);
    const cy = h * (0.05 + rng() * 0.9);
    const rx = 45 + rng() * 140;
    const ry = 30 + rng() * 110;
    const rot = rng() * 0.35 - 0.175;
    const mapW = Math.ceil((rx * 2) / GRID_SPACING) + 2;
    const mapH = Math.ceil((ry * 2) / GRID_SPACING) + 2;
    const density: number[][] = [];
    const chars: number[] = [];
    const sym: Cluster['sym'] =
      rng() < 0.35 ? 'bilateral' : rng() < 0.65 ? 'radial' : 'block';

    for (let r = 0; r < mapH; r++) {
      density[r] = [];
      for (let c = 0; c < mapW; c++) {
        const nx = (c / mapW) * 2 - 1;
        const ny = (r / mapH) * 2 - 1;
        const dist = Math.sqrt(nx * nx + ny * ny);
        let d = 0;

        if (sym === 'bilateral') {
          const ax = Math.abs(nx);
          d = Math.max(0, 1 - dist * 0.9) *
            (0.3 + 0.7 * (Math.cos(ny * Math.PI * 3) * 0.5 + 0.5)) *
            (ax < 0.6 ? 1 : Math.max(0, 1 - (ax - 0.6) * 3));
        } else if (sym === 'radial') {
          d = Math.max(0, 1 - dist * 0.85) * (Math.sin(dist * Math.PI * 4) * 0.4 + 0.6);
        } else {
          const gx = Math.abs(Math.sin(nx * Math.PI * 4));
          const gy = Math.abs(Math.sin(ny * Math.PI * 3));
          d = Math.max(0, 1 - dist * 0.95) * (gx * gy * 0.6 + 0.4);
        }

        const ell = nx * nx + ny * ny;
        if (ell > 1) d = 0; else d *= 1 - ell * 0.5;

        density[r][c] = Math.max(0, Math.min(1, d));
        chars.push(Math.floor(rng() * STRUCTURE_CHARS.length));
      }
    }

    return {
      cx, cy, rx, ry, rot, density, mapW, mapH, chars, sym,
      opacity: 0, targetOpacity: 1, born: frame,
    };
  }

  // ── Build initial clusters ───────────────────────────────────
  function buildClusters(w: number, h: number, rng: () => number, frame: number): Cluster[] {
    const out: Cluster[] = [];
    const n = 8 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const cl = makeCluster(w, h, rng, frame);
      cl.opacity = 1; // start visible
      out.push(cl);
    }
    return out;
  }

  // ── Build signals ────────────────────────────────────────────
  function buildSignals(w: number, h: number, clusters: Cluster[], rng: () => number): Signal[] {
    const sigs: Signal[] = [];
    const n = 12 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const pts: { x: number; y: number }[] = [];
      const segs = 40 + Math.floor(rng() * 40);
      let sx: number, sy: number;
      if (clusters.length > 0 && rng() < 0.65) {
        const cl = clusters[Math.floor(rng() * clusters.length)];
        sx = cl.cx + (rng() - 0.5) * cl.rx * 1.5;
        sy = cl.cy + (rng() - 0.5) * cl.ry * 1.5;
      } else {
        sx = rng() * w; sy = rng() * h;
      }
      let px = sx, py = sy, ang = rng() * Math.PI * 2;
      const curv = 0.015 + rng() * 0.04;
      for (let s = 0; s < segs; s++) {
        pts.push({ x: px, y: py });
        ang += (rng() - 0.5) * curv * 2;
        if (px < w * 0.08) ang += 0.025;
        if (px > w * 0.92) ang -= 0.025;
        if (py < h * 0.08) ang += 0.015;
        if (py > h * 0.92) ang -= 0.015;
        const step = GRID_SPACING * (0.7 + rng() * 0.7);
        px += Math.cos(ang) * step;
        py += Math.sin(ang) * step;
      }
      sigs.push({
        pts, head: rng(),
        speed: 0.0008 + rng() * 0.002,
        len: 6 + Math.floor(rng() * 12),
        bright: 0.35 + rng() * 0.45,
      });
    }
    return sigs;
  }

  // ── Sample cluster density at world pos ──────────────────────
  function sampleCluster(cl: Cluster, wx: number, wy: number): { d: number; ci: number } {
    const dx = wx - cl.cx;
    const dy = wy - cl.cy;
    const cos = Math.cos(-cl.rot);
    const sin = Math.sin(-cl.rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) > cl.rx * 1.1 || Math.abs(ly) > cl.ry * 1.1)
      return { d: 0, ci: 6 };
    const mc = Math.floor(((lx / cl.rx + 1) / 2) * cl.mapW);
    const mr = Math.floor(((ly / cl.ry + 1) / 2) * cl.mapH);
    if (mc < 0 || mc >= cl.mapW || mr < 0 || mr >= cl.mapH)
      return { d: 0, ci: 6 };
    return { d: cl.density[mr][mc] * cl.opacity, ci: cl.chars[mr * cl.mapW + mc] };
  }

  // ── Spawn fragment ───────────────────────────────────────────
  function spawn(x: number, y: number, text: string, seqId: number, isHover: boolean) {
    const f = fragsRef.current;
    if (f.length >= MAX_FRAGS) f.shift();
    const ang = Math.random() * Math.PI * 2;
    f.push({
      x, y,
      vx: Math.cos(ang) * FRAG_DRIFT * (isHover ? 0.5 : 1),
      vy: Math.sin(ang) * FRAG_DRIFT * (isHover ? 0.5 : 1),
      text, age: 0,
      life: isHover ? 140 : FRAG_LIFETIME + Math.floor(Math.random() * 50),
      scale: 0, seqId, isHover,
    });
  }

  // ── Handle click ─────────────────────────────────────────────
  function handleClick(e: MouseEvent) {
    const x = e.clientX, y = e.clientY;
    // Always spawn a cluster of 2-5 fragments on click
    const count = 2 + Math.floor(Math.random() * 4);
    const isSeq = Math.random() < 0.35;

    if (isSeq) {
      const seq = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
      const sid = seqCtrRef.current++;
      seq.forEach((t, i) => {
        setTimeout(() => {
          const ox = (i - (seq.length - 1) / 2) * 55;
          const oy = (Math.random() - 0.5) * 35;
          spawn(x + ox, y + oy, t, sid, false);
        }, i * 350);
      });
    } else {
      const sid = seqCtrRef.current++;
      for (let i = 0; i < count; i++) {
        const delay = i * 120;
        setTimeout(() => {
          const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
          const r = 30 + Math.random() * 50;
          const pool = Math.random() < 0.15 ? EXPR_COMPLEX : EXPR_STD;
          spawn(
            x + Math.cos(ang) * r,
            y + Math.sin(ang) * r,
            pool[Math.floor(Math.random() * pool.length)],
            sid, false,
          );
        }, delay);
      }
    }
  }

  // ── Initialize ───────────────────────────────────────────────
  function initialize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const rng = mkRng(42);
    const cols = Math.ceil(w / GRID_SPACING) + 2;
    const rows = Math.ceil(h / GRID_SPACING) + 2;
    const grid: GridCell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        grid.push({ x: c * GRID_SPACING, y: r * GRID_SPACING, col: c, row: r });

    const flowCols = Math.ceil(w / FLOW_RES) + 2;
    const flowRows = Math.ceil(h / FLOW_RES) + 2;
    const flowAngles = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngles.length; i++) flowAngles[i] = rng() * Math.PI * 2;

    const clusters = buildClusters(w, h, rng, 0);
    const signals = buildSignals(w, h, clusters, rng);
    const noise2d = makeNoise2D(42);

    stateRef.current = {
      grid, cols, rows, clusters, signals,
      flowAngles, flowCols, flowRows, w, h, noise2d,
    };
  }

  // ── Flow angle ───────────────────────────────────────────────
  function flowAngle(x: number, y: number, time: number, s: NonNullable<typeof stateRef.current>): number {
    const fc = Math.min(Math.max(Math.floor(x / FLOW_RES), 0), s.flowCols - 1);
    const fr = Math.min(Math.max(Math.floor(y / FLOW_RES), 0), s.flowRows - 1);
    const base = s.flowAngles[fr * s.flowCols + fc] + time * FLOW_DRIFT;
    const mx = mouseRef.current.x, my = mouseRef.current.y;
    const dx = x - mx, dy = y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS) {
      const t = 1 - dist / MOUSE_RADIUS;
      return base + Math.atan2(dy, dx) * t * MOUSE_STRENGTH;
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
    const { w, h, grid, cols, clusters, signals, noise2d } = s;
    timeRef.current++;
    const time = timeRef.current;
    cursorBlinkRef.current++;

    // Mouse velocity
    const cmx = mouseRef.current.x, cmy = mouseRef.current.y;
    const mvx = cmx - prevMouseRef.current.x;
    const mvy = cmy - prevMouseRef.current.y;
    prevMouseRef.current = { x: cmx, y: cmy };
    const mspd = Math.sqrt(mvx * mvx + mvy * mvy);
    // Smooth mouse speed
    mouseSpeedRef.current = mouseSpeedRef.current * 0.85 + mspd * 0.15;
    const smoothSpeed = mouseSpeedRef.current;

    // ── Field evolution: morph clusters ─────────────────────────
    evolveTimerRef.current++;
    if (evolveTimerRef.current >= EVOLVE_INTERVAL) {
      evolveTimerRef.current = 0;
      // Pick 1-2 clusters to fade out, spawn 1-2 new ones
      const fadeCount = 1 + (Math.random() < 0.4 ? 1 : 0);
      for (let i = 0; i < fadeCount && clusters.length > 3; i++) {
        const idx = Math.floor(Math.random() * clusters.length);
        clusters[idx].targetOpacity = 0;
      }
      const spawnCount = 1 + (Math.random() < 0.4 ? 1 : 0);
      const evoRng = mkRng(rngCounterRef.current++);
      for (let i = 0; i < spawnCount; i++) {
        clusters.push(makeCluster(w, h, evoRng, time));
      }
    }

    // Update cluster opacities, cull dead ones
    for (let i = clusters.length - 1; i >= 0; i--) {
      const cl = clusters[i];
      const rate = 1 / EVOLVE_TRANSITION;
      if (cl.opacity < cl.targetOpacity) cl.opacity = Math.min(cl.targetOpacity, cl.opacity + rate);
      else if (cl.opacity > cl.targetOpacity) cl.opacity = Math.max(cl.targetOpacity, cl.opacity - rate);
      if (cl.targetOpacity === 0 && cl.opacity <= 0.001) {
        clusters.splice(i, 1);
      }
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${CHAR_SIZE}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ── Signal glow map ────────────────────────────────────────
    const glowMap = new Float32Array(grid.length);
    for (const sig of signals) {
      const hpi = Math.floor(sig.head * (sig.pts.length - 1));
      const hp = sig.pts[Math.min(hpi, sig.pts.length - 1)];
      const sd = Math.sqrt((hp.x - cmx) ** 2 + (hp.y - cmy) ** 2);
      const sm = sd < MOUSE_RADIUS
        ? 1 + (1 - sd / MOUSE_RADIUS) * 2.5 * Math.min(smoothSpeed / 8, 1)
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
        const gc = Math.round(px / GRID_SPACING);
        const gr = Math.round(py / GRID_SPACING);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const c = gc + dc, r = gr + dr;
            if (c < 0 || c >= cols || r < 0 || r >= s.rows) continue;
            const ci = r * cols + c;
            const fade = 1 - t / sig.len;
            const dist = Math.sqrt(dc * dc + dr * dr);
            glowMap[ci] = Math.min(1, glowMap[ci] + fade * sig.bright * Math.max(0, 1 - dist * 0.5));
          }
        }
      }
    }

    // ── Hover probe: reveal hidden structure ───────────────────
    // Compute a "reveal" intensity for cells near cursor
    const mouseOnScreen = cmx > 0 && cmy > 0 && cmx < w && cmy < h;

    // Hover fragment spawning
    if (mouseOnScreen) {
      hoverCooldownRef.current--;
      if (hoverCooldownRef.current <= 0) {
        hoverCooldownRef.current = HOVER_FRAG_COOLDOWN;
        if (Math.random() < HOVER_FRAG_CHANCE && smoothSpeed > 1.5) {
          const hx = cmx + (Math.random() - 0.5) * HOVER_REVEAL_RADIUS;
          const hy = cmy + (Math.random() - 0.5) * HOVER_REVEAL_RADIUS;
          spawn(hx, hy, EXPR_HOVER[Math.floor(Math.random() * EXPR_HOVER.length)], -1, true);
        }
      }
    }

    // ── Render grid cells ──────────────────────────────────────
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];

      // Sample all clusters
      let maxD = 0, bestC = 6;
      for (const cl of clusters) {
        const { d, ci } = sampleCluster(cl, cell.x, cell.y);
        if (d > maxD) { maxD = d; bestC = ci; }
      }

      // Flow displacement
      const ang = flowAngle(cell.x, cell.y, time, s);
      let ox = Math.cos(ang) * 0.4 * Math.sin(time * 0.003 + cell.col * 0.1);
      let oy = Math.sin(ang) * 0.4 * Math.cos(time * 0.002 + cell.row * 0.08);

      // Mouse pull
      const mdx = cmx - cell.x;
      const mdy = cmy - cell.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist < MOUSE_RADIUS && mDist > 0) {
        const pt = (1 - mDist / MOUSE_RADIUS);
        const ps = pt * pt * MOUSE_PULL;
        ox += (mdx / mDist) * ps;
        oy += (mdy / mDist) * ps;
      }

      // Hover reveal: boost hidden structure near cursor
      let hoverBoost = 0;
      if (mouseOnScreen && mDist < HOVER_REVEAL_RADIUS) {
        const ht = 1 - mDist / HOVER_REVEAL_RADIUS;
        hoverBoost = ht * ht * 0.35;
        // Generate "hidden" structure from noise
        if (maxD < 0.05) {
          const nv = noise2d(cell.x * 0.015, cell.y * 0.015 + time * 0.0001);
          const hiddenD = Math.max(0, nv * 0.7 + 0.1) * hoverBoost * 3;
          if (hiddenD > 0.03) {
            maxD = hiddenD;
            bestC = Math.floor(Math.abs(nv * 5)) % STRUCTURE_CHARS.length;
          }
        }
      }

      const drawX = cell.x + ox;
      const drawY = cell.y + oy;
      const glow = glowMap[i];

      if (maxD > 0.03) {
        const ch = STRUCTURE_CHARS[bestC];
        const alpha = maxD * 0.28 + glow * 0.5 + hoverBoost * 0.15;
        const isRevealed = hoverBoost > 0.05 && maxD < 0.15;
        const baseRGB = isRevealed ? HOVER_REVEAL_RGB : STRUCT_RGB;
        const r = baseRGB[0] + glow * (SIGNAL_RGB[0] - baseRGB[0]);
        const g = baseRGB[1] + glow * (SIGNAL_RGB[1] - baseRGB[1]);
        const b = baseRGB[2] + glow * (SIGNAL_RGB[2] - baseRGB[2]);
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(0.9, alpha)})`;
        ctx.fillText(ch, drawX, drawY);
      } else if (glow > 0.01) {
        ctx.fillStyle = `rgba(${SIGNAL_RGB[0]},${SIGNAL_RGB[1]},${SIGNAL_RGB[2]},${Math.min(1, GRID_OPACITY + glow * 0.4)})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      } else {
        // Base grid — slight brightness boost near cursor
        const gridAlpha = GRID_OPACITY + (hoverBoost > 0 ? hoverBoost * 0.04 : 0);
        ctx.fillStyle = `rgba(100,130,180,${gridAlpha})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      }
    }

    // ── Fragments ──────────────────────────────────────────────
    const frags = fragsRef.current;
    for (let i = frags.length - 1; i >= 0; i--) {
      const f = frags[i];
      f.age++;
      f.x += f.vx; f.y += f.vy;
      const fa = flowAngle(f.x, f.y, time, s);
      f.vx += Math.cos(fa) * 0.002;
      f.vy += Math.sin(fa) * 0.002;
      f.vx *= 0.997; f.vy *= 0.997;
      if (f.age < FRAG_FADEIN) f.scale = f.age / FRAG_FADEIN;
      else if (f.age > f.life - FRAG_FADEOUT) f.scale = Math.max(0, (f.life - f.age) / FRAG_FADEOUT);
      else f.scale = 1;
      if (f.age >= f.life) frags.splice(i, 1);
    }

    // Connections
    ctx.lineWidth = 0.5;
    for (let i = 0; i < frags.length; i++) {
      if (frags[i].isHover) continue; // no connections for hover fragments
      for (let j = i + 1; j < frags.length; j++) {
        if (frags[j].isHover) continue;
        const a = frags[i], b = frags[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sameSeq = a.seqId >= 0 && a.seqId === b.seqId;
        const maxDist = sameSeq ? CONN_DIST * 2.2 : CONN_DIST;
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * Math.min(a.scale, b.scale) *
            (sameSeq ? CONN_OPACITY * 3.5 : CONN_OPACITY);
          ctx.strokeStyle = `rgba(${FRAG_RGB[0]},${FRAG_RGB[1]},${FRAG_RGB[2]},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Fragment text
    for (const f of frags) {
      if (f.scale <= 0) continue;
      const alphaBase = f.isHover ? 0.35 : 0.55;
      const alpha = f.scale * alphaBase;
      const fontSize = (f.isHover ? 10 : 13) * (0.85 + f.scale * 0.15);
      ctx.font = `${fontSize}px "SF Mono","Fira Code","Cascadia Code",monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const rgb = f.isHover ? HOVER_REVEAL_RGB : FRAG_RGB;
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fillText(f.text, f.x, f.y);
    }

    // ── Center text ────────────────────────────────────────────
    const titleSize = Math.min(w * 0.038, 46);
    ctx.font = `300 ${titleSize}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const title = 'Arjun Mathur:';
    ctx.fillStyle = 'rgba(203,213,225,0.88)';
    ctx.fillText(title, w / 2, h / 2);

    // Blinking cursor
    if ((cursorBlinkRef.current % 60) < 35) {
      const met = ctx.measureText(title);
      const cx = w / 2 + met.width / 2 + 5;
      const ch = titleSize * 0.68;
      ctx.fillStyle = 'rgba(203,213,225,0.65)';
      ctx.fillRect(cx, h / 2 - ch / 2, 2, ch);
    }

    ctx.restore();
    animRef.current = requestAnimationFrame(render);
  }

  // ── Lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    initialize();
    animRef.current = requestAnimationFrame(render);
    const onResize = () => initialize();
    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: MouseEvent) => handleClick(e);
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
    />
  );
};

export default DevinBackground;
