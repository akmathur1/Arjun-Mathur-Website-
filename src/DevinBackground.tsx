import React, { useRef, useEffect } from 'react';

// ─── Grid & Rendering ─────────────────────────────────────────
const GRID_SPACING = 18;
const CHAR_SIZE = 11;
const GRID_CHAR = '+';
const GRID_OPACITY = 0.06;
const STRUCTURE_CHARS = ['@', '#', '%', '=', '+', '-', '.'];
const BG_COLOR = '#020617';
const STRUCTURE_RGB = [70, 90, 140];
const SIGNAL_RGB = [130, 170, 230];
const FRAGMENT_RGB = [140, 180, 240];

// ─── Flow Field ────────────────────────────────────────────────
const FLOW_RES = 40;
const FLOW_DRIFT = 0.00008;

// ─── Mouse ─────────────────────────────────────────────────────
const MOUSE_RADIUS = 250;
const MOUSE_STRENGTH = 0.45;
const MOUSE_PULL = 1.8;       // structure pull toward cursor

// ─── Fragments ─────────────────────────────────────────────────
const FRAGMENT_LIFETIME = 280; // frames (~4.7s at 60fps)
const FRAGMENT_FADEIN = 30;
const FRAGMENT_FADEOUT = 60;
const FRAGMENT_DRIFT_SPEED = 0.15;
const MAX_FRAGMENTS = 20;
const CONNECTION_DIST = 220;
const CONNECTION_OPACITY = 0.08;

// ─── Expression pools ─────────────────────────────────────────
const EXPRESSIONS_STANDARD = [
  'λ(x) → ∇²ψ',
  'Σᵢ wᵢxᵢ',
  'd/dt σ(Wx+b)',
  'argmin_θ L(θ)',
  'Ξ(t) ≈ drift',
  '∂f/∂x = 0',
  'P(A|B) ∝ L(B|A)',
  'H(X) = -Σ p log p',
  '∇·F = ρ/ε₀',
  'det(A-λI) = 0',
  'E[X] = ∫x dF(x)',
  'KL(p‖q)',
  'softmax(zᵢ)',
  'α → β → γ',
  'μ ± 2σ',
  'O(n log n)',
  'ReLU(Wx)',
  '∂L/∂w',
  'tanh(z)',
  'x̂ = Ax + Bu',
  'ŷ = f(θ,x)',
  'tr(AᵀA)',
  'rank(J)',
  'dim ker(T)',
  'sup{f(x)}',
  'lim n→∞',
  '‖∇f‖₂',
  'conv(K,x)',
  'FFT(x[n])',
  'Var(X̄)',
];

const EXPRESSIONS_COMPLEX = [
  '∫₀^∞ e^{-x²} dx = √π/2',
  '∇²ψ + (2m/ℏ²)(E-V)ψ = 0',
  'dS/dt = -βSI/N, dI/dt = βSI/N - γI',
  'L(θ) = -Σᵢ [yᵢlog(ŷᵢ) + (1-yᵢ)log(1-ŷᵢ)]',
  'θₜ₊₁ = θₜ - η∇L(θₜ) + μ(θₜ - θₜ₋₁)',
  'F = ma = -∇V(r) + η(t)',
  'ρ(t+1) = Σ_s P(s\'|s,π(s)) · ρ(t)',
  'ELBO = E_q[log p(x|z)] - KL(q(z|x)‖p(z))',
];

// Sequences: groups of 2-3 related fragments spawned with delay
const SEQUENCES = [
  ['∂L/∂w', '→ Δw = -η∇L', '→ θ* converged'],
  ['X ~ N(μ,σ²)', 'Z = (X-μ)/σ', 'P(Z > 1.96) = 0.025'],
  ['encode(x) → z', 'z ~ q(z|x)', 'decode(z) → x̂'],
  ['loss = Σ(ŷ-y)²', '∇loss = 2Σ(ŷ-y)', 'w -= η·∇loss'],
  ['A = UΣVᵀ', 'rank(A) = r'],
  ['dx/dt = f(x)', 'x(t) = ∫f(x)dt'],
];

// ─── Types ─────────────────────────────────────────────────────
interface GridCell { x: number; y: number; col: number; row: number }

interface StructureCluster {
  cx: number; cy: number;
  radiusX: number; radiusY: number;
  rotation: number;
  densityMap: number[][];
  mapCols: number; mapRows: number;
  charWeights: number[];
  symmetry: 'bilateral' | 'radial' | 'block';
}

interface SignalPath {
  points: { x: number; y: number }[];
  head: number; speed: number;
  length: number; brightness: number;
}

interface Fragment {
  x: number; y: number;
  vx: number; vy: number;
  text: string;
  age: number;
  lifetime: number;
  scale: number;
  sequenceId: number; // -1 = standalone, else groups related fragments
}

// ─── Seeded RNG ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Component ─────────────────────────────────────────────────
const DevinBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const mouseVelRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const fragmentsRef = useRef<Fragment[]>([]);
  const sequenceCounterRef = useRef(0);
  const cursorBlinkRef = useRef(0);

  const stateRef = useRef<{
    grid: GridCell[];
    cols: number; rows: number;
    clusters: StructureCluster[];
    signals: SignalPath[];
    flowAngles: Float32Array;
    flowCols: number; flowRows: number;
    structureMap: Float32Array;
    charIndexMap: Uint8Array;
    w: number; h: number;
  } | null>(null);

  // ── Build clusters ───────────────────────────────────────────
  function buildClusters(w: number, h: number, rng: () => number): StructureCluster[] {
    const clusters: StructureCluster[] = [];
    const numClusters = 7 + Math.floor(rng() * 5);

    for (let i = 0; i < numClusters; i++) {
      let cx: number, cy: number;
      const zone = i % 5;
      switch (zone) {
        case 0: cx = w * (0.08 + rng() * 0.22); cy = h * (0.06 + rng() * 0.25); break;
        case 1: cx = w * (0.65 + rng() * 0.28); cy = h * (0.12 + rng() * 0.35); break;
        case 2: cx = w * (0.25 + rng() * 0.45); cy = h * (0.65 + rng() * 0.28); break;
        case 3: cx = w * (0.55 + rng() * 0.32); cy = h * (0.04 + rng() * 0.18); break;
        default: cx = w * (0.08 + rng() * 0.84); cy = h * (0.08 + rng() * 0.84);
      }

      const radiusX = 50 + rng() * 130;
      const radiusY = 35 + rng() * 100;
      const rotation = rng() * 0.3 - 0.15;
      const mapCols = Math.ceil((radiusX * 2) / GRID_SPACING) + 2;
      const mapRows = Math.ceil((radiusY * 2) / GRID_SPACING) + 2;
      const densityMap: number[][] = [];
      const charWeights: number[] = [];
      const symmetry: StructureCluster['symmetry'] =
        rng() < 0.4 ? 'bilateral' : rng() < 0.7 ? 'radial' : 'block';

      for (let r = 0; r < mapRows; r++) {
        densityMap[r] = [];
        for (let c = 0; c < mapCols; c++) {
          const nx = (c / mapCols) * 2 - 1;
          const ny = (r / mapRows) * 2 - 1;
          const dist = Math.sqrt(nx * nx + ny * ny);
          let density = 0;

          if (symmetry === 'bilateral') {
            const absx = Math.abs(nx);
            density = Math.max(0, 1 - dist * 0.9) *
              (0.3 + 0.7 * (Math.cos(ny * Math.PI * 3) * 0.5 + 0.5)) *
              (absx < 0.6 ? 1 : Math.max(0, 1 - (absx - 0.6) * 3));
          } else if (symmetry === 'radial') {
            const ring = Math.sin(dist * Math.PI * 4);
            density = Math.max(0, 1 - dist * 0.85) * (ring * 0.4 + 0.6);
          } else {
            const gx = Math.abs(Math.sin(nx * Math.PI * 4));
            const gy = Math.abs(Math.sin(ny * Math.PI * 3));
            density = Math.max(0, 1 - dist * 0.95) * (gx * gy * 0.6 + 0.4);
          }

          const ellipse = nx * nx + ny * ny;
          if (ellipse > 1) density = 0;
          else density *= 1 - ellipse * 0.5;

          densityMap[r][c] = Math.max(0, Math.min(1, density));
          charWeights.push(Math.floor(rng() * STRUCTURE_CHARS.length));
        }
      }

      clusters.push({ cx, cy, radiusX, radiusY, rotation, densityMap, mapCols, mapRows, charWeights, symmetry });
    }
    return clusters;
  }

  // ── Build signal paths ───────────────────────────────────────
  function buildSignals(w: number, h: number, clusters: StructureCluster[], rng: () => number): SignalPath[] {
    const signals: SignalPath[] = [];
    const n = 10 + Math.floor(rng() * 6);

    for (let i = 0; i < n; i++) {
      const points: { x: number; y: number }[] = [];
      const numSegs = 35 + Math.floor(rng() * 35);
      let sx: number, sy: number;

      if (clusters.length > 0 && rng() < 0.7) {
        const cl = clusters[Math.floor(rng() * clusters.length)];
        sx = cl.cx + (rng() - 0.5) * cl.radiusX * 1.5;
        sy = cl.cy + (rng() - 0.5) * cl.radiusY * 1.5;
      } else {
        sx = rng() * w;
        sy = rng() * h;
      }

      let px = sx, py = sy;
      let angle = rng() * Math.PI * 2;
      const curvature = 0.02 + rng() * 0.04;

      for (let s = 0; s < numSegs; s++) {
        points.push({ x: px, y: py });
        angle += (rng() - 0.5) * curvature * 2;
        if (px < w * 0.1) angle += 0.02;
        if (px > w * 0.9) angle -= 0.02;
        if (py < h * 0.1) angle += 0.01;
        if (py > h * 0.9) angle -= 0.01;
        const step = GRID_SPACING * (0.8 + rng() * 0.6);
        px += Math.cos(angle) * step;
        py += Math.sin(angle) * step;
      }

      signals.push({
        points, head: rng(),
        speed: 0.001 + rng() * 0.002,
        length: 6 + Math.floor(rng() * 10),
        brightness: 0.4 + rng() * 0.4,
      });
    }
    return signals;
  }

  // ── Bake structure map ───────────────────────────────────────
  function bakeStructureMap(grid: GridCell[], clusters: StructureCluster[]) {
    const intensities = new Float32Array(grid.length);
    const charIndices = new Uint8Array(grid.length);

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      let maxI = 0, bestC = 6;

      for (const cl of clusters) {
        const dx = cell.x - cl.cx;
        const dy = cell.y - cl.cy;
        const cos = Math.cos(-cl.rotation);
        const sin = Math.sin(-cl.rotation);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) > cl.radiusX * 1.1 || Math.abs(ly) > cl.radiusY * 1.1) continue;

        const mc = ((lx / cl.radiusX + 1) / 2) * cl.mapCols;
        const mr = ((ly / cl.radiusY + 1) / 2) * cl.mapRows;
        const ci = Math.floor(mc);
        const ri = Math.floor(mr);
        if (ci < 0 || ci >= cl.mapCols || ri < 0 || ri >= cl.mapRows) continue;

        const d = cl.densityMap[ri][ci];
        if (d > maxI) { maxI = d; bestC = cl.charWeights[ri * cl.mapCols + ci]; }
      }

      intensities[i] = maxI;
      charIndices[i] = bestC;
    }
    return { intensities, charIndices };
  }

  // ── Spawn fragment ───────────────────────────────────────────
  function spawnFragment(x: number, y: number, text: string, seqId: number) {
    const frags = fragmentsRef.current;
    if (frags.length >= MAX_FRAGMENTS) {
      // Remove oldest
      frags.shift();
    }
    const angle = Math.random() * Math.PI * 2;
    frags.push({
      x, y,
      vx: Math.cos(angle) * FRAGMENT_DRIFT_SPEED,
      vy: Math.sin(angle) * FRAGMENT_DRIFT_SPEED,
      text,
      age: 0,
      lifetime: FRAGMENT_LIFETIME + Math.floor(Math.random() * 60),
      scale: 0,
      sequenceId: seqId,
    });
  }

  // ── Handle click: spawn computation fragments ────────────────
  function handleClick(e: MouseEvent) {
    const x = e.clientX;
    const y = e.clientY;

    // 25% chance: spawn a sequence
    if (Math.random() < 0.25) {
      const seq = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
      const seqId = sequenceCounterRef.current++;
      seq.forEach((text, i) => {
        setTimeout(() => {
          const ox = (i - (seq.length - 1) / 2) * 60;
          const oy = (Math.random() - 0.5) * 40;
          spawnFragment(x + ox, y + oy, text, seqId);
        }, i * 400); // 400ms delay between sequence members
      });
    }
    // 15% chance: high-complexity fragment
    else if (Math.random() < 0.2) {
      const text = EXPRESSIONS_COMPLEX[Math.floor(Math.random() * EXPRESSIONS_COMPLEX.length)];
      spawnFragment(x, y, text, -1);
    }
    // Standard fragment
    else {
      const text = EXPRESSIONS_STANDARD[Math.floor(Math.random() * EXPRESSIONS_STANDARD.length)];
      spawnFragment(x, y, text, -1);
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

    const rng = mulberry32(42);

    const cols = Math.ceil(w / GRID_SPACING) + 2;
    const rows = Math.ceil(h / GRID_SPACING) + 2;
    const grid: GridCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid.push({ x: c * GRID_SPACING, y: r * GRID_SPACING, col: c, row: r });
      }
    }

    const flowCols = Math.ceil(w / FLOW_RES) + 2;
    const flowRows = Math.ceil(h / FLOW_RES) + 2;
    const flowAngles = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngles.length; i++) {
      flowAngles[i] = rng() * Math.PI * 2;
    }

    const clusters = buildClusters(w, h, rng);
    const { intensities, charIndices } = bakeStructureMap(grid, clusters);
    const signals = buildSignals(w, h, clusters, rng);

    stateRef.current = {
      grid, cols, rows, clusters, signals,
      flowAngles, flowCols, flowRows,
      structureMap: intensities,
      charIndexMap: charIndices,
      w, h,
    };
  }

  // ── Flow angle with mouse influence ──────────────────────────
  function getFlowAngle(x: number, y: number, time: number, s: NonNullable<typeof stateRef.current>): number {
    const fc = Math.min(Math.max(Math.floor(x / FLOW_RES), 0), s.flowCols - 1);
    const fr = Math.min(Math.max(Math.floor(y / FLOW_RES), 0), s.flowRows - 1);
    const base = s.flowAngles[fr * s.flowCols + fc] + time * FLOW_DRIFT;

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const dx = x - mx;
    const dy = y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS) {
      const t = 1 - dist / MOUSE_RADIUS;
      return base + Math.atan2(dy, dx) * t * MOUSE_STRENGTH;
    }
    return base;
  }

  // ── Main render loop ─────────────────────────────────────────
  function render() {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || !s) { animRef.current = requestAnimationFrame(render); return; }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = s.w;
    const h = s.h;
    timeRef.current += 1;
    const time = timeRef.current;
    cursorBlinkRef.current += 1;

    // Track mouse velocity
    const cmx = mouseRef.current.x;
    const cmy = mouseRef.current.y;
    mouseVelRef.current = {
      x: cmx - prevMouseRef.current.x,
      y: cmy - prevMouseRef.current.y,
    };
    prevMouseRef.current = { x: cmx, y: cmy };
    const mouseSpeed = Math.sqrt(mouseVelRef.current.x ** 2 + mouseVelRef.current.y ** 2);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // ── Grid font ──────────────────────────────────────────────
    ctx.font = `${CHAR_SIZE}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const { grid, cols, signals, structureMap, charIndexMap } = s;

    // ── Signal glow map ────────────────────────────────────────
    const glowMap = new Float32Array(grid.length);
    for (const sig of signals) {
      // Speed boost near cursor
      const headPt = sig.points[Math.floor(sig.head * (sig.points.length - 1))] || sig.points[0];
      const dxs = headPt.x - cmx;
      const dys = headPt.y - cmy;
      const dists = Math.sqrt(dxs * dxs + dys * dys);
      const speedMult = dists < MOUSE_RADIUS ? 1 + (1 - dists / MOUSE_RADIUS) * 2 * Math.min(mouseSpeed / 10, 1) : 1;

      sig.head += sig.speed * speedMult;
      if (sig.head > 1) sig.head -= 1;

      const pts = sig.points;
      const total = pts.length;
      const headIdx = sig.head * (total - 1);

      for (let t = 0; t < sig.length; t++) {
        const idx = headIdx - t;
        if (idx < 0 || idx >= total - 1) continue;
        const pi = Math.floor(idx);
        const frac = idx - pi;
        const px = pts[pi].x + (pts[pi + 1].x - pts[pi].x) * frac;
        const py = pts[pi].y + (pts[pi + 1].y - pts[pi].y) * frac;

        const gc = Math.round(px / GRID_SPACING);
        const gr = Math.round(py / GRID_SPACING);

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const c = gc + dc;
            const r = gr + dr;
            if (c < 0 || c >= cols || r < 0 || r >= s.rows) continue;
            const ci = r * cols + c;
            const fade = 1 - t / sig.length;
            const dist = Math.sqrt(dc * dc + dr * dr);
            glowMap[ci] = Math.min(1, glowMap[ci] + fade * sig.brightness * Math.max(0, 1 - dist * 0.5));
          }
        }
      }
    }

    // ── Render grid cells ──────────────────────────────────────
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];

      // Flow displacement
      const angle = getFlowAngle(cell.x, cell.y, time, s);
      let ox = Math.cos(angle) * 0.4 * Math.sin(time * 0.003 + cell.col * 0.1);
      let oy = Math.sin(angle) * 0.4 * Math.cos(time * 0.002 + cell.row * 0.08);

      // Mouse pull: structures shift toward cursor
      const mdx = cmx - cell.x;
      const mdy = cmy - cell.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist < MOUSE_RADIUS && mDist > 0) {
        const pullT = (1 - mDist / MOUSE_RADIUS);
        const pullStrength = pullT * pullT * MOUSE_PULL;
        ox += (mdx / mDist) * pullStrength;
        oy += (mdy / mDist) * pullStrength;
      }

      const drawX = cell.x + ox;
      const drawY = cell.y + oy;
      const sI = structureMap[i];
      const glow = glowMap[i];

      if (sI > 0.05) {
        const ch = STRUCTURE_CHARS[charIndexMap[i]];
        const alpha = sI * 0.25 + glow * 0.5;
        const r = STRUCTURE_RGB[0] + glow * (SIGNAL_RGB[0] - STRUCTURE_RGB[0]);
        const g = STRUCTURE_RGB[1] + glow * (SIGNAL_RGB[1] - STRUCTURE_RGB[1]);
        const b = STRUCTURE_RGB[2] + glow * (SIGNAL_RGB[2] - STRUCTURE_RGB[2]);
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, alpha)})`;
        ctx.fillText(ch, drawX, drawY);
      } else if (glow > 0.01) {
        ctx.fillStyle = `rgba(${SIGNAL_RGB[0]},${SIGNAL_RGB[1]},${SIGNAL_RGB[2]},${Math.min(1, GRID_OPACITY + glow * 0.4)})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      } else {
        ctx.fillStyle = `rgba(100,130,180,${GRID_OPACITY})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      }
    }

    // ── Computation Fragments ──────────────────────────────────
    const frags = fragmentsRef.current;

    // Update & cull
    for (let i = frags.length - 1; i >= 0; i--) {
      const f = frags[i];
      f.age++;
      f.x += f.vx;
      f.y += f.vy;
      // Gentle flow influence on drift
      const fa = getFlowAngle(f.x, f.y, time, s);
      f.vx += Math.cos(fa) * 0.002;
      f.vy += Math.sin(fa) * 0.002;
      // Damping
      f.vx *= 0.998;
      f.vy *= 0.998;
      // Scale animation
      if (f.age < FRAGMENT_FADEIN) {
        f.scale = f.age / FRAGMENT_FADEIN;
      } else if (f.age > f.lifetime - FRAGMENT_FADEOUT) {
        f.scale = (f.lifetime - f.age) / FRAGMENT_FADEOUT;
      } else {
        f.scale = 1;
      }
      if (f.age >= f.lifetime) {
        frags.splice(i, 1);
      }
    }

    // Draw connections between fragments (faint lines)
    ctx.lineWidth = 0.5;
    for (let i = 0; i < frags.length; i++) {
      for (let j = i + 1; j < frags.length; j++) {
        const a = frags[i];
        const b = frags[j];
        // Connect if same sequence OR close enough
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sameSeq = a.sequenceId >= 0 && a.sequenceId === b.sequenceId;
        const maxDist = sameSeq ? CONNECTION_DIST * 2 : CONNECTION_DIST;

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * Math.min(a.scale, b.scale) *
            (sameSeq ? CONNECTION_OPACITY * 3 : CONNECTION_OPACITY);
          ctx.strokeStyle = `rgba(${FRAGMENT_RGB[0]},${FRAGMENT_RGB[1]},${FRAGMENT_RGB[2]},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw fragment text
    for (const f of frags) {
      if (f.scale <= 0) continue;
      const alpha = f.scale * 0.6;
      const fontSize = 13 * (0.8 + f.scale * 0.2);
      ctx.font = `${fontSize}px "SF Mono","Fira Code","Cascadia Code",monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(${FRAGMENT_RGB[0]},${FRAGMENT_RGB[1]},${FRAGMENT_RGB[2]},${alpha})`;
      ctx.fillText(f.text, f.x, f.y);
    }

    // ── Center text: "Arjun Mathur:" ───────────────────────────
    const titleSize = Math.min(w * 0.04, 48);
    ctx.font = `300 ${titleSize}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleText = 'Arjun Mathur:';
    ctx.fillStyle = 'rgba(203,213,225,0.9)';
    ctx.fillText(titleText, w / 2, h / 2);

    // Blinking cursor
    const cursorOn = (cursorBlinkRef.current % 60) < 35;
    if (cursorOn) {
      const metrics = ctx.measureText(titleText);
      const cursorX = w / 2 + metrics.width / 2 + 4;
      const cursorH = titleSize * 0.7;
      ctx.fillStyle = 'rgba(203,213,225,0.7)';
      ctx.fillRect(cursorX, h / 2 - cursorH / 2, 2, cursorH);
    }

    ctx.restore();
    animRef.current = requestAnimationFrame(render);
  }

  // ── Lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    initialize();
    animRef.current = requestAnimationFrame(render);

    const onResize = () => initialize();
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: MouseEvent) => handleClick(e);

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
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
