import React, { useRef, useEffect } from 'react';

// ─── Grid ──────────────────────────────────────────────────────
const CELL_W = 12;
const CELL_H = 16;
const CHAR_SIZE = 10;
const GRID_CHAR = '+';
const GRID_ALPHA = 0.08;          // always visible grid
const CHARS = '@#%=+-.:;*'.split('');

// Blue-tinted palette — 3 brightness tiers
const C_GRID: [number, number, number] = [120, 160, 220];    // tier 1: faint but visible
const C_STRUCT: [number, number, number] = [140, 180, 255];  // tier 2: medium readable
const C_SIGNAL: [number, number, number] = [180, 220, 255];  // tier 3: bright active
const C_EVENT: [number, number, number] = [150, 190, 240];

// Flow
const FLOW_RES = 50;
const FLOW_DRIFT = 0.00003;

// Mouse — barely perceptible
const MOUSE_RADIUS = 200;
const MOUSE_FLOW_STRENGTH = 0.15;
const MOUSE_BRIGHT_BOOST = 0.015;

// Field evolution
const EVOLVE_INT = 480;    // ~8s between morphs
const EVOLVE_FADE = 240;   // 4s crossfade

// Autonomous events — rare system emissions
const EVENT_INTERVAL_MIN = 360;  // ~6s
const EVENT_INTERVAL_MAX = 600;  // ~10s
const EVENT_HINTS = ['∇ψ', 'Ξ(t)', 'σ', '∂/∂t', 'λ', 'μ', '∇f', 'Δ', 'Σ', 'ρ'];

// ─── Types ─────────────────────────────────────────────────────
interface StreamBand {
  y: number;
  startCol: number;
  segments: number[];  // char index, -1 = gap
  opacity: number;
  targetOpacity: number;
}

interface Signal {
  pts: { x: number; y: number }[];
  head: number;
  speed: number;
  len: number;
  bright: number;
}

interface Event {
  x: number;
  y: number;
  text: string;
  age: number;
  life: number;
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

// ─── Component ─────────────────────────────────────────────────
const DevinBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const cursorBlink = useRef(0);
  const evolveTimer = useRef(0);
  const evoSeed = useRef(200);
  const eventsRef = useRef<Event[]>([]);
  const nextEventRef = useRef(300);

  const stateRef = useRef<{
    cols: number; rows: number;
    bands: StreamBand[];
    signals: Signal[];
    flowAngles: Float32Array;
    flowCols: number; flowRows: number;
    w: number; h: number;
  } | null>(null);

  // ── Generate a stream band ───────────────────────────────────
  // Horizontal rows of structured characters: +@@@#==--..
  // Density biased toward center-right of screen (intentional asymmetry)
  function makeBand(
    cols: number, rows: number, _w: number, _h: number,
    rng: () => number, biasCenter: boolean
  ): StreamBand {
    let y: number;
    if (biasCenter) {
      // Bias toward middle 60% of screen vertically
      y = Math.floor(rows * 0.2 + rng() * rows * 0.6);
    } else {
      y = Math.floor(rng() * rows);
    }

    const bandLen = 12 + Math.floor(rng() * (cols * 0.55));

    // Start position: bias right side slightly
    let startCol: number;
    if (rng() < 0.4) {
      // Right-biased
      startCol = Math.floor(cols * 0.4 + rng() * cols * 0.5);
    } else {
      startCol = Math.floor(rng() * (cols - 10));
    }

    const segments: number[] = [];
    const pattern = Math.floor(rng() * 6);
    const density = 0.25 + rng() * 0.55;

    for (let c = 0; c < bandLen; c++) {
      if (rng() > density) { segments.push(-1); continue; }

      const pos = c / bandLen;
      let ci: number;

      switch (pattern) {
        case 0: // Dense center: ..--==@@@##==--..
          if (pos > 0.3 && pos < 0.7) ci = Math.floor(rng() * 3);
          else if (pos > 0.15 && pos < 0.85) ci = 3 + Math.floor(rng() * 3);
          else ci = 6 + Math.floor(rng() * 3);
          break;
        case 1: // Repeating blocks
          { const b = Math.floor(c / 4) % 3;
            ci = b === 0 ? Math.floor(rng() * 3) : b === 1 ? 3 + Math.floor(rng() * 3) : 6 + Math.floor(rng() * 3);
          } break;
        case 2: // Left-heavy fade
          { const wt = 1 - pos;
            ci = wt > 0.6 ? Math.floor(rng() * 3) : wt > 0.3 ? 3 + Math.floor(rng() * 4) : 6 + Math.floor(rng() * 3);
          } break;
        case 3: // Uniform medium
          ci = 2 + Math.floor(rng() * 5);
          break;
        case 4: // Right-heavy
          ci = pos > 0.5 ? Math.floor(rng() * 3) : pos > 0.2 ? 3 + Math.floor(rng() * 3) : 7 + Math.floor(rng() * 2);
          break;
        default: // Sparse with dense micro-clusters
          if (rng() < 0.15) {
            ci = Math.floor(rng() * 3);
            for (let k = 0; k < 1 + Math.floor(rng() * 4) && c + k < bandLen; k++) {
              segments.push(ci); c++;
            }
            continue;
          }
          ci = 4 + Math.floor(rng() * 5);
          break;
      }
      segments.push(ci);
    }

    return {
      y, startCol, segments,
      opacity: 0, targetOpacity: 0.15 + rng() * 0.25,
    };
  }

  // ── Build initial field ──────────────────────────────────────
  function buildBands(cols: number, rows: number, w: number, h: number, rng: () => number): StreamBand[] {
    const bands: StreamBand[] = [];

    // Scattered individual bands (30-40)
    const n = 30 + Math.floor(rng() * 12);
    for (let i = 0; i < n; i++) {
      const b = makeBand(cols, rows, w, h, rng, i < n * 0.6);
      b.opacity = b.targetOpacity;
      bands.push(b);
    }

    // Structured zones: groups of adjacent rows forming coherent blocks
    const numZones = 5 + Math.floor(rng() * 4);
    for (let z = 0; z < numZones; z++) {
      // Bias zones toward center and right
      const baseRow = Math.floor(
        rng() < 0.5
          ? rows * 0.15 + rng() * rows * 0.7  // center bias
          : rng() * rows
      );
      const zoneH = 3 + Math.floor(rng() * 10);
      const zoneStartCol = Math.floor(
        rng() < 0.55
          ? cols * 0.35 + rng() * cols * 0.55  // right bias
          : rng() * cols * 0.4
      );
      const zoneW = Math.floor(cols * (0.15 + rng() * 0.45));

      for (let r = 0; r < zoneH; r++) {
        const row = baseRow + r;
        if (row >= rows) break;

        const bLen = zoneW + Math.floor((rng() - 0.5) * 15);
        const segs: number[] = [];
        const d = 0.35 + rng() * 0.5;

        for (let c = 0; c < bLen; c++) {
          if (rng() > d) { segs.push(-1); continue; }
          const ex = Math.abs(c / bLen - 0.5) * 2;
          const ey = Math.abs(r / zoneH - 0.5) * 2;
          const edge = Math.max(ex, ey);
          if (edge < 0.35) segs.push(Math.floor(rng() * 3));
          else if (edge < 0.65) segs.push(2 + Math.floor(rng() * 4));
          else segs.push(5 + Math.floor(rng() * 4));
        }

        bands.push({
          y: row,
          startCol: zoneStartCol + Math.floor((rng() - 0.5) * 5),
          segments: segs,
          opacity: 0.15 + rng() * 0.25,
          targetOpacity: 0.15 + rng() * 0.25,
        });
      }
    }
    return bands;
  }

  // ── Build signal flow lanes ──────────────────────────────────
  function buildSignals(w: number, h: number, rng: () => number): Signal[] {
    const sigs: Signal[] = [];
    const n = 16 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const pts: { x: number; y: number }[] = [];
      const segs = 50 + Math.floor(rng() * 60);
      let px = rng() * w, py = rng() * h;
      // Strong horizontal bias — signals flow mostly left-to-right
      let ang = rng() < 0.7
        ? (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.3
        : rng() * Math.PI * 2;
      const curv = 0.008 + rng() * 0.025;
      for (let s = 0; s < segs; s++) {
        pts.push({ x: px, y: py });
        ang += (rng() - 0.5) * curv * 2;
        // Keep on screen
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

    const flowCols = Math.ceil(w / FLOW_RES) + 2;
    const flowRows = Math.ceil(h / FLOW_RES) + 2;
    const flowAngles = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngles.length; i++) flowAngles[i] = rng() * Math.PI * 2;

    stateRef.current = {
      cols, rows,
      bands: buildBands(cols, rows, w, h, rng),
      signals: buildSignals(w, h, rng),
      flowAngles, flowCols, flowRows, w, h,
    };
  }

  // ── Flow angle (very subtle mouse bend) ──────────────────────
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
    const { w, h, cols, rows, bands, signals } = s;
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
        bands.push(makeBand(cols, rows, w, h, erng, Math.random() < 0.6));
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

    // ── Autonomous events (rare) ───────────────────────────────
    nextEventRef.current--;
    if (nextEventRef.current <= 0) {
      nextEventRef.current = EVENT_INTERVAL_MIN + Math.floor(Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN));
      // Pick a random position biased toward existing structure
      let ex: number, ey: number;
      if (bands.length > 0 && Math.random() < 0.7) {
        const b = bands[Math.floor(Math.random() * bands.length)];
        ex = (b.startCol + b.segments.length / 2) * CELL_W;
        ey = b.y * CELL_H;
      } else {
        ex = w * (0.2 + Math.random() * 0.6);
        ey = h * (0.2 + Math.random() * 0.6);
      }
      eventsRef.current.push({
        x: ex, y: ey,
        text: EVENT_HINTS[Math.floor(Math.random() * EVENT_HINTS.length)],
        age: 0, life: 180, // ~3s
      });
    }

    // Update events
    const events = eventsRef.current;
    for (let i = events.length - 1; i >= 0; i--) {
      events[i].age++;
      if (events[i].age >= events[i].life) events.splice(i, 1);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Background: radial gradient for depth
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(0.6, '#0B1220');
    grad.addColorStop(1, '#070C16');
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

    // ── Signal glow (sparse) ───────────────────────────────────
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

        // Very subtle flow displacement — snapped to integers for crisp rendering
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

        // Mouse: very subtle local brightness boost only
        const mdx = cmx - px, mdy = cmy - py;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        const mBoost = mDist < MOUSE_RADIUS
          ? (1 - mDist / MOUSE_RADIUS) * MOUSE_BRIGHT_BOOST
          : 0;

        if (structChar >= 0 && structAlpha > 0.003) {
          // Tier 2: structure — always legible
          const ch = CHARS[structChar];
          const alpha = 0.08 + structAlpha * 0.6 + glow * 0.5 + mBoost;
          const r = C_STRUCT[0] + glow * (C_SIGNAL[0] - C_STRUCT[0]);
          const g = C_STRUCT[1] + glow * (C_SIGNAL[1] - C_STRUCT[1]);
          const b = C_STRUCT[2] + glow * (C_SIGNAL[2] - C_STRUCT[2]);
          ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(0.85, alpha)})`;
          ctx.fillText(ch, dx, dy);
        } else if (glow > 0.01) {
          // Tier 3: active signal — brightest
          const alpha = GRID_ALPHA + glow * 0.55;
          ctx.fillStyle = `rgba(${C_SIGNAL[0]},${C_SIGNAL[1]},${C_SIGNAL[2]},${Math.min(0.9, alpha)})`;
          ctx.fillText(GRID_CHAR, dx, dy);
        } else {
          // Tier 1: base grid — faint but always visible
          const ga = GRID_ALPHA + mBoost;
          ctx.fillStyle = `rgba(${C_GRID[0]},${C_GRID[1]},${C_GRID[2]},${ga})`;
          ctx.fillText(GRID_CHAR, dx, dy);
        }
      }
    }

    // ── Autonomous events (faint system emissions) ─────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ev of events) {
      const progress = ev.age / ev.life;
      // Smooth bell curve: fade in 20%, hold 50%, fade out 30%
      let alpha: number;
      if (progress < 0.2) alpha = progress / 0.2;
      else if (progress > 0.7) alpha = (1 - progress) / 0.3;
      else alpha = 1;
      alpha *= 0.18; // very faint
      const fs = 9;
      ctx.font = `${fs}px "SF Mono","Fira Code","Cascadia Code",monospace`;
      ctx.fillStyle = `rgba(${C_EVENT[0]},${C_EVENT[1]},${C_EVENT[2]},${alpha})`;
      ctx.fillText(ev.text, ev.x, ev.y);
    }

    // ── Center text ────────────────────────────────────────────
    const ts = Math.min(w * 0.038, 46);
    ctx.font = `300 ${ts}px "SF Mono","Fira Code","Cascadia Code",monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(203,213,225,0.88)';
    ctx.fillText('Arjun Mathur:', w / 2, h / 2);

    // Blinking cursor
    if ((cursorBlink.current % 60) < 35) {
      const met = ctx.measureText('Arjun Mathur:');
      ctx.fillStyle = 'rgba(203,213,225,0.55)';
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
