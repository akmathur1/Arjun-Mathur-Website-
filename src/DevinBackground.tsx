import React, { useRef, useEffect } from 'react';

// ─── Grid ──────────────────────────────────────────────────────
const CELL_W = 12;
const CELL_H = 16;
const CHAR_SIZE = 10;
const GRID_CHAR = '+';
const GRID_ALPHA = 0.06;
const CHARS = '@#%=+-.:;*'.split('');

// Blue-tinted palette — 3 brightness tiers (dark-on-light)
const C_GRID: [number, number, number] = [70, 95, 140];
const C_STRUCT: [number, number, number] = [30, 55, 110];
const C_SIGNAL: [number, number, number] = [15, 65, 160];
const C_EVENT: [number, number, number] = [50, 75, 130];

// Flow
const FLOW_RES = 50;
const FLOW_DRIFT = 0.00003;

// Mouse
const MOUSE_RADIUS = 200;
const MOUSE_FLOW_STRENGTH = 0.15;
const MOUSE_BRIGHT_BOOST = 0.012;

// Evolution
const EVOLVE_INT = 480;
const EVOLVE_FADE = 240;

// Events
const EVENT_INTERVAL_MIN = 360;
const EVENT_INTERVAL_MAX = 600;
const EVENT_HINTS = ['∇ψ', 'Ξ(t)', 'σ', '∂/∂t', 'λ', 'μ', '∇f', 'Δ', 'Σ', 'ρ'];

// ─── Composition: focal regions ────────────────────────────────
// These define the "center of gravity" of the system
// Normalized coords (0-1), applied relative to screen dimensions
const FOCAL_REGIONS = [
  { x: 0.70, y: 0.35, rx: 0.25, ry: 0.35, weight: 1.0 },   // primary: right-center
  { x: 0.20, y: 0.25, rx: 0.15, ry: 0.20, weight: 0.5 },   // secondary: upper-left
  { x: 0.45, y: 0.75, rx: 0.20, ry: 0.15, weight: 0.4 },   // tertiary: lower-center
  { x: 0.85, y: 0.70, rx: 0.12, ry: 0.18, weight: 0.35 },  // small: lower-right
];

// ─── Types ─────────────────────────────────────────────────────
interface StreamBand {
  y: number;
  startCol: number;
  segments: number[];
  opacity: number;
  targetOpacity: number;
}

interface Signal {
  pts: { x: number; y: number }[];
  head: number; speed: number;
  len: number; bright: number;
}

interface SysEvent {
  x: number; y: number;
  text: string;
  age: number; life: number;
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

// ─── Composition field: how much structure belongs at (nx, ny) ─
// Returns 0..1 — 0 = empty space, 1 = focal center
function compositionWeight(nx: number, ny: number): number {
  let w = 0;
  for (const f of FOCAL_REGIONS) {
    const dx = (nx - f.x) / f.rx;
    const dy = (ny - f.y) / f.ry;
    const d = dx * dx + dy * dy;
    if (d < 1) {
      // Smooth falloff (cubic hermite)
      const t = 1 - d;
      w = Math.max(w, t * t * (3 - 2 * t) * f.weight);
    }
  }
  return w;
}

// ─── Component ─────────────────────────────────────────────────
const DevinBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const cursorBlink = useRef(0);
  const evolveTimer = useRef(0);
  const evoSeed = useRef(200);
  const eventsRef = useRef<SysEvent[]>([]);
  const nextEventRef = useRef(300);

  const stateRef = useRef<{
    cols: number; rows: number;
    bands: StreamBand[];
    signals: Signal[];
    flowAngles: Float32Array;
    flowCols: number; flowRows: number;
    w: number; h: number;
    // Precomputed per-cell composition weight (0..1)
    compMap: Float32Array;
  } | null>(null);

  // ── Generate a stream band ───────────────────────────────────
  function makeBand(
    cols: number, rows: number, rng: () => number,
    compMap: Float32Array,
  ): StreamBand {
    // Pick a row that has reasonable composition weight
    // Try a few times to land in a good spot
    let bestRow = 0, bestWeight = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      const tryRow = Math.floor(rng() * rows);
      const midCol = Math.floor(cols / 2);
      const w = compMap[tryRow * cols + midCol];
      if (w > bestWeight) { bestWeight = w; bestRow = tryRow; }
    }
    const y = bestRow;

    // Scan this row for regions with composition weight
    // Start the band where weight begins
    let startCol = 0;
    let endCol = cols - 1;

    // Find first column with weight > threshold
    const threshold = 0.05;
    for (let c = 0; c < cols; c++) {
      if (compMap[y * cols + c] > threshold) {
        startCol = Math.max(0, c - Math.floor(rng() * 8));
        break;
      }
    }
    for (let c = cols - 1; c >= 0; c--) {
      if (compMap[y * cols + c] > threshold) {
        endCol = Math.min(cols - 1, c + Math.floor(rng() * 8));
        break;
      }
    }

    // If no weight found in this row, make a short random band
    if (bestWeight < threshold) {
      startCol = Math.floor(rng() * cols * 0.8);
      endCol = startCol + 5 + Math.floor(rng() * 15);
    }

    const bandLen = endCol - startCol + 1;
    const segments: number[] = [];
    const pattern = Math.floor(rng() * 6);

    for (let c = 0; c < bandLen; c++) {
      const col = startCol + c;
      const cw = col < cols ? compMap[y * cols + col] : 0;

      // Density scales with composition weight
      // High weight = dense characters, low weight = sparse/gaps
      const density = cw * 0.8 + 0.05;
      if (rng() > density) { segments.push(-1); continue; }

      // Character weight: heavier chars (@#%) near focal centers
      let ci: number;
      const pos = c / bandLen;

      if (cw > 0.6) {
        // Dense focal zone: heavy chars
        ci = Math.floor(rng() * 3); // @#%
      } else if (cw > 0.3) {
        // Medium zone: mixed
        switch (pattern % 3) {
          case 0:
            if (pos > 0.3 && pos < 0.7) ci = Math.floor(rng() * 3);
            else ci = 3 + Math.floor(rng() * 3);
            break;
          case 1:
            { const b = Math.floor(c / 4) % 3;
              ci = b === 0 ? Math.floor(rng() * 3) : b === 1 ? 3 + Math.floor(rng() * 3) : 6 + Math.floor(rng() * 3);
            } break;
          default:
            ci = 2 + Math.floor(rng() * 5);
        }
      } else if (cw > 0.1) {
        // Light zone: light chars
        ci = 4 + Math.floor(rng() * 5); // +-.:;*
      } else {
        // Very sparse: dots and dashes only
        ci = 6 + Math.floor(rng() * 3); // .:;
      }

      segments.push(ci);
    }

    // Opacity also scales with composition weight
    const baseAlpha = 0.08 + bestWeight * 0.35;
    return {
      y, startCol, segments,
      opacity: 0, targetOpacity: baseAlpha + rng() * 0.1,
    };
  }

  // ── Build initial field ──────────────────────────────────────
  function buildBands(
    cols: number, rows: number, rng: () => number,
    compMap: Float32Array,
  ): StreamBand[] {
    const bands: StreamBand[] = [];

    // More bands in total — composition weight controls where they appear
    const n = 45 + Math.floor(rng() * 15);
    for (let i = 0; i < n; i++) {
      const b = makeBand(cols, rows, rng, compMap);
      b.opacity = b.targetOpacity;
      bands.push(b);
    }

    // Dense zone clusters: tight groups of rows in focal areas
    for (const focal of FOCAL_REGIONS) {
      if (focal.weight < 0.3) continue;
      const centerRow = Math.floor(focal.y * rows);
      const centerCol = Math.floor(focal.x * cols);
      const zoneH = Math.floor(focal.ry * rows * 1.5);
      const zoneW = Math.floor(focal.rx * cols * 2);

      for (let r = -zoneH; r <= zoneH; r++) {
        const row = centerRow + r;
        if (row < 0 || row >= rows) continue;
        if (rng() > 0.55) continue; // not every row

        const rowStart = Math.max(0, centerCol - zoneW + Math.floor((rng() - 0.3) * 10));
        const rowEnd = Math.min(cols - 1, centerCol + zoneW + Math.floor((rng() - 0.7) * 10));
        const bLen = rowEnd - rowStart + 1;
        if (bLen <= 0) continue;

        const segs: number[] = [];
        for (let c = 0; c < bLen; c++) {
          const col = rowStart + c;
          const cw = compMap[row * cols + col];
          if (rng() > cw * 0.85 + 0.05) { segs.push(-1); continue; }

          const ex = Math.abs((col - centerCol) / zoneW);
          const ey = Math.abs((row - centerRow) / zoneH);
          const edge = Math.max(ex, ey);

          if (edge < 0.3) segs.push(Math.floor(rng() * 3));
          else if (edge < 0.6) segs.push(2 + Math.floor(rng() * 4));
          else segs.push(5 + Math.floor(rng() * 4));
        }

        bands.push({
          y: row, startCol: rowStart, segments: segs,
          opacity: 0.12 + focal.weight * 0.25 + rng() * 0.08,
          targetOpacity: 0.12 + focal.weight * 0.25 + rng() * 0.08,
        });
      }
    }

    return bands;
  }

  // ── Build signals biased toward focal regions ────────────────
  function buildSignals(w: number, h: number, rng: () => number): Signal[] {
    const sigs: Signal[] = [];
    const n = 16 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const pts: { x: number; y: number }[] = [];
      const segs = 50 + Math.floor(rng() * 60);

      // Start signals near focal regions
      let px: number, py: number;
      if (rng() < 0.7) {
        const f = FOCAL_REGIONS[Math.floor(rng() * FOCAL_REGIONS.length)];
        px = (f.x + (rng() - 0.5) * f.rx * 2) * w;
        py = (f.y + (rng() - 0.5) * f.ry * 2) * h;
      } else {
        px = rng() * w; py = rng() * h;
      }

      let ang = rng() < 0.7
        ? (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.3
        : rng() * Math.PI * 2;
      const curv = 0.008 + rng() * 0.025;
      for (let s = 0; s < segs; s++) {
        pts.push({ x: px, y: py });
        ang += (rng() - 0.5) * curv * 2;
        if (px < w * 0.03) ang += 0.04;
        if (px > w * 0.97) ang -= 0.04;
        if (py < h * 0.03) ang += 0.03;
        if (py > h * 0.97) ang -= 0.03;
        px += Math.cos(ang) * CELL_W * (0.8 + rng() * 0.7);
        py += Math.sin(ang) * CELL_W * (0.8 + rng() * 0.7);
      }
      sigs.push({
        pts, head: rng(),
        speed: 0.0005 + rng() * 0.0015,
        len: 5 + Math.floor(rng() * 15),
        bright: 0.25 + rng() * 0.4,
      });
    }
    return sigs;
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

    // Precompute composition weight for every cell
    const compMap = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        compMap[r * cols + c] = compositionWeight(c / cols, r / rows);
      }
    }

    const flowCols = Math.ceil(w / FLOW_RES) + 2;
    const flowRows = Math.ceil(h / FLOW_RES) + 2;
    const flowAngles = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngles.length; i++) flowAngles[i] = rng() * Math.PI * 2;

    stateRef.current = {
      cols, rows,
      bands: buildBands(cols, rows, rng, compMap),
      signals: buildSignals(w, h, rng),
      flowAngles, flowCols, flowRows, w, h,
      compMap,
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
    if (dist < MOUSE_RADIUS && dist > 0) {
      base += Math.atan2(dy, dx) * (1 - dist / MOUSE_RADIUS) * MOUSE_FLOW_STRENGTH;
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
    const { w, h, cols, rows, bands, signals, compMap } = s;
    timeRef.current++;
    const time = timeRef.current;
    cursorBlink.current++;
    const cmx = mouseRef.current.x, cmy = mouseRef.current.y;

    // ── Field evolution ────────────────────────────────────────
    evolveTimer.current++;
    if (evolveTimer.current >= EVOLVE_INT) {
      evolveTimer.current = 0;
      const fadeN = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < fadeN && bands.length > 15; i++) {
        bands[Math.floor(Math.random() * bands.length)].targetOpacity = 0;
      }
      const erng = mkRng(evoSeed.current++);
      const spawnN = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < spawnN; i++) {
        bands.push(makeBand(cols, rows, erng, compMap));
      }
    }

    for (let i = bands.length - 1; i >= 0; i--) {
      const b = bands[i];
      const rate = 1 / EVOLVE_FADE;
      if (b.opacity < b.targetOpacity) b.opacity = Math.min(b.targetOpacity, b.opacity + rate);
      else if (b.opacity > b.targetOpacity) b.opacity = Math.max(b.targetOpacity, b.opacity - rate);
      if (b.targetOpacity === 0 && b.opacity < 0.002) bands.splice(i, 1);
    }

    // ── Autonomous events ──────────────────────────────────────
    nextEventRef.current--;
    if (nextEventRef.current <= 0) {
      nextEventRef.current = EVENT_INTERVAL_MIN + Math.floor(Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN));
      let ex: number, ey: number;
      if (bands.length > 0 && Math.random() < 0.7) {
        const b = bands[Math.floor(Math.random() * bands.length)];
        ex = (b.startCol + b.segments.length / 2) * CELL_W;
        ey = b.y * CELL_H;
      } else {
        const f = FOCAL_REGIONS[0];
        ex = f.x * w + (Math.random() - 0.5) * f.rx * w;
        ey = f.y * h + (Math.random() - 0.5) * f.ry * h;
      }
      eventsRef.current.push({
        x: ex, y: ey,
        text: EVENT_HINTS[Math.floor(Math.random() * EVENT_HINTS.length)],
        age: 0, life: 180,
      });
    }
    const events = eventsRef.current;
    for (let i = events.length - 1; i >= 0; i--) {
      events[i].age++;
      if (events[i].age >= events[i].life) events.splice(i, 1);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Background gradient
    const grad = ctx.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    grad.addColorStop(0, '#F4F2EE');
    grad.addColorStop(0.5, '#EDECE8');
    grad.addColorStop(1, '#E2E0DA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${CHAR_SIZE}px "SF Mono","Fira Code","Cascadia Code","Consolas",monospace`;
    ctx.textBaseline = 'top';

    // Pre-index bands by row
    const bandsByRow: Map<number, StreamBand[]> = new Map();
    for (const b of bands) {
      if (b.opacity < 0.003) continue;
      const arr = bandsByRow.get(b.y);
      if (arr) arr.push(b); else bandsByRow.set(b.y, [b]);
    }

    // ── Signal glow ────────────────────────────────────────────
    const glowCells: Map<number, number> = new Map();
    for (const sig of signals) {
      sig.head += sig.speed;
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
            const gv = fade * sig.bright * Math.max(0, 1 - dist * 0.5);
            glowCells.set(key, Math.min(1, (glowCells.get(key) || 0) + gv));
          }
        }
      }
    }

    // ── Render cells ───────────────────────────────────────────
    ctx.textAlign = 'left';

    for (let row = 0; row < rows; row++) {
      const py = row * CELL_H;
      const rowBands = bandsByRow.get(row);

      for (let col = 0; col < cols; col++) {
        const px = col * CELL_W;
        const cw = compMap[row * cols + col]; // composition weight

        // Flow displacement
        const ang = flowAng(px, py, time, s);
        const ox = Math.cos(ang) * 0.2 * Math.sin(time * 0.002 + col * 0.06);
        const oy = Math.sin(ang) * 0.2 * Math.cos(time * 0.0015 + row * 0.04);
        const dx = (px + ox) | 0;
        const dy = (py + oy) | 0;

        // Structure from bands
        let structChar = -1;
        let structAlpha = 0;
        if (rowBands) {
          for (const b of rowBands) {
            const lc = col - b.startCol;
            if (lc >= 0 && lc < b.segments.length) {
              const ci = b.segments[lc];
              if (ci >= 0) {
                structChar = ci;
                structAlpha = Math.max(structAlpha, b.opacity);
              }
            }
          }
        }

        const cellKey = row * cols + col;
        const glow = glowCells.get(cellKey) || 0;

        const mdx = cmx - px, mdy = cmy - py;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        const mBoost = mDist < MOUSE_RADIUS
          ? (1 - mDist / MOUSE_RADIUS) * MOUSE_BRIGHT_BOOST
          : 0;

        if (structChar >= 0 && structAlpha > 0.003) {
          // Structure: always legible, brightness scales with composition
          const ch = CHARS[structChar];
          const alpha = 0.06 + structAlpha * 0.55 + glow * 0.5 + cw * 0.15 + mBoost;
          const r = C_STRUCT[0] + glow * (C_SIGNAL[0] - C_STRUCT[0]);
          const g = C_STRUCT[1] + glow * (C_SIGNAL[1] - C_STRUCT[1]);
          const b = C_STRUCT[2] + glow * (C_SIGNAL[2] - C_STRUCT[2]);
          ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(0.85, alpha)})`;
          ctx.fillText(ch, dx, dy);
        } else if (glow > 0.01) {
          // Signal glow
          const alpha = GRID_ALPHA + glow * 0.55;
          ctx.fillStyle = `rgba(${C_SIGNAL[0]},${C_SIGNAL[1]},${C_SIGNAL[2]},${Math.min(0.9, alpha)})`;
          ctx.fillText(GRID_CHAR, dx, dy);
        } else {
          // Grid: fades near structure (negative space contrast)
          // Near focal centers: grid dims so structure pops
          // In empty space: grid is clearly visible
          const gridFade = Math.max(0.2, 1 - cw * 0.7);
          const ga = GRID_ALPHA * gridFade + mBoost;

          // Threshold: suppress grid in regions with very low composition weight
          // Creates intentional empty space
          if (ga > 0.008) {
            ctx.fillStyle = `rgba(${C_GRID[0]},${C_GRID[1]},${C_GRID[2]},${ga})`;
            ctx.fillText(GRID_CHAR, dx, dy);
          }
        }
      }
    }

    // ── Events ─────────────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ev of events) {
      const p = ev.age / ev.life;
      let alpha: number;
      if (p < 0.2) alpha = p / 0.2;
      else if (p > 0.7) alpha = (1 - p) / 0.3;
      else alpha = 1;
      alpha *= 0.18;
      ctx.font = `9px "SF Mono","Fira Code","Cascadia Code",monospace`;
      ctx.fillStyle = `rgba(${C_EVENT[0]},${C_EVENT[1]},${C_EVENT[2]},${alpha})`;
      ctx.fillText(ev.text, ev.x, ev.y);
    }

    // ── Center text ────────────────────────────────────────────
    const ts = Math.min(w * 0.038, 46);
    ctx.font = `300 ${ts}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30,40,65,0.88)';
    ctx.fillText('Arjun Mathur:', w / 2, h / 2);

    if ((cursorBlink.current % 60) < 35) {
      const met = ctx.measureText('Arjun Mathur:');
      ctx.fillStyle = 'rgba(30,40,65,0.55)';
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
    window.addEventListener('resize', onR);
    window.addEventListener('mousemove', onM);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onR);
      window.removeEventListener('mousemove', onM);
    };
  }, []); // eslint-disable-line

  return (
    <canvas ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
};

export default DevinBackground;
