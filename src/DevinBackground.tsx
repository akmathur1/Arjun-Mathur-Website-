import React, { useRef, useEffect, useCallback } from 'react';

// ─── Constants ─────────────────────────────────────────────────
const GRID_SPACING = 18;          // px between each character cell
const CHAR_SIZE = 11;             // font size for canvas rendering
const GRID_CHAR = '+';            // background grid character
const GRID_OPACITY = 0.06;        // very faint grid

// ASCII structure characters ordered by visual "weight"
const STRUCTURE_CHARS = ['@', '#', '%', '=', '+', '-', '.'];

// Monochrome blue palette
const BG_COLOR = '#020617';
const STRUCTURE_BASE_COLOR = [70, 90, 140];   // muted blue-gray RGB
const SIGNAL_COLOR = [130, 170, 230];          // brighter accent RGB

// Flow field
const FLOW_RESOLUTION = 40;       // size of each flow cell in px
const FLOW_DRIFT_SPEED = 0.00008; // how fast the field evolves
const SIGNAL_SPEED = 0.35;        // px per frame for signal heads

// Mouse influence
const MOUSE_RADIUS = 200;
const MOUSE_STRENGTH = 0.3;

// ─── Types ─────────────────────────────────────────────────────
interface GridCell {
  x: number;
  y: number;
  col: number;
  row: number;
}

interface StructureCluster {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  densityMap: number[][];   // local density grid
  mapCols: number;
  mapRows: number;
  charWeights: number[];    // per-cell character index
  symmetry: 'bilateral' | 'radial' | 'block';
}

interface SignalPath {
  points: { x: number; y: number }[];
  head: number;             // parametric position along path [0,1]
  speed: number;
  length: number;           // how many trailing cells glow
  brightness: number;
}

// ─── Deterministic seeded random ───────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Component ─────────────────────────────────────────────────
const DevinBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const timeRef = useRef<number>(0);
  const stateRef = useRef<{
    grid: GridCell[];
    cols: number;
    rows: number;
    clusters: StructureCluster[];
    signals: SignalPath[];
    flowAngleOffset: Float32Array;
    flowCols: number;
    flowRows: number;
    structureMap: Float32Array;    // per-cell: 0 = grid only, >0 = structure intensity
    charIndexMap: Uint8Array;      // per-cell: which char to use
  } | null>(null);

  // ── Build ASCII structure clusters ───────────────────────────
  const buildClusters = useCallback((
    cols: number, rows: number, w: number, h: number, rng: () => number
  ): StructureCluster[] => {
    const clusters: StructureCluster[] = [];

    // Define cluster zones — these create the "system diagram" feel.
    // We place 6-10 clusters with varying sizes, some overlapping.
    const numClusters = 6 + Math.floor(rng() * 5);

    for (let i = 0; i < numClusters; i++) {
      // Position clusters with bias toward certain screen regions
      // to create the asymmetric-but-structured layout
      let cx: number, cy: number;
      const zone = i % 5;
      switch (zone) {
        case 0: // upper-left quadrant
          cx = w * (0.1 + rng() * 0.25);
          cy = h * (0.08 + rng() * 0.25);
          break;
        case 1: // right side
          cx = w * (0.65 + rng() * 0.25);
          cy = h * (0.15 + rng() * 0.35);
          break;
        case 2: // lower-center
          cx = w * (0.3 + rng() * 0.4);
          cy = h * (0.65 + rng() * 0.25);
          break;
        case 3: // upper-right
          cx = w * (0.55 + rng() * 0.3);
          cy = h * (0.05 + rng() * 0.2);
          break;
        default: // scattered
          cx = w * (0.1 + rng() * 0.8);
          cy = h * (0.1 + rng() * 0.8);
      }

      const radiusX = 40 + rng() * 120;
      const radiusY = 30 + rng() * 90;
      const rotation = rng() * Math.PI * 0.3 - 0.15;

      // Build a local density map for this cluster
      const mapCols = Math.ceil((radiusX * 2) / GRID_SPACING) + 2;
      const mapRows = Math.ceil((radiusY * 2) / GRID_SPACING) + 2;
      const densityMap: number[][] = [];
      const charWeights: number[] = [];
      const symmetry: 'bilateral' | 'radial' | 'block' =
        rng() < 0.4 ? 'bilateral' : rng() < 0.7 ? 'radial' : 'block';

      for (let r = 0; r < mapRows; r++) {
        densityMap[r] = [];
        for (let c = 0; c < mapCols; c++) {
          // Normalized position within cluster [-1, 1]
          const nx = (c / mapCols) * 2 - 1;
          const ny = (r / mapRows) * 2 - 1;
          const dist = Math.sqrt(nx * nx + ny * ny);

          let density = 0;

          if (symmetry === 'bilateral') {
            // Mirror left-right with structured rows
            const absx = Math.abs(nx);
            density = Math.max(0, 1 - dist * 0.9) *
              (0.3 + 0.7 * (Math.cos(ny * Math.PI * 3) * 0.5 + 0.5)) *
              (absx < 0.6 ? 1 : Math.max(0, 1 - (absx - 0.6) * 3));
          } else if (symmetry === 'radial') {
            // Concentric ring pattern
            const ring = Math.sin(dist * Math.PI * 4);
            density = Math.max(0, 1 - dist * 0.85) * (ring * 0.4 + 0.6);
          } else {
            // Block/grid pattern within the cluster
            const gridX = Math.abs(Math.sin(nx * Math.PI * 4));
            const gridY = Math.abs(Math.sin(ny * Math.PI * 3));
            density = Math.max(0, 1 - dist * 0.95) *
              (gridX * gridY * 0.6 + 0.4);
          }

          // Apply elliptical falloff
          const ex = nx * nx;
          const ey = ny * ny;
          const ellipse = ex + ey;
          if (ellipse > 1) density = 0;
          else density *= 1 - ellipse * 0.5;

          densityMap[r][c] = Math.max(0, Math.min(1, density));
          charWeights.push(Math.floor(rng() * STRUCTURE_CHARS.length));
        }
      }

      clusters.push({
        cx, cy, radiusX, radiusY, rotation,
        densityMap, mapCols, mapRows, charWeights, symmetry,
      });
    }
    return clusters;
  }, []);

  // ── Build signal paths (curved, continuous) ──────────────────
  const buildSignals = useCallback((
    w: number, h: number, clusters: StructureCluster[], rng: () => number
  ): SignalPath[] => {
    const signals: SignalPath[] = [];
    const numSignals = 8 + Math.floor(rng() * 6);

    for (let i = 0; i < numSignals; i++) {
      // Each signal is a cubic Bezier-like path
      const points: { x: number; y: number }[] = [];
      const numSegments = 30 + Math.floor(rng() * 30);

      // Start near a cluster if possible
      let sx: number, sy: number;
      if (clusters.length > 0 && rng() < 0.7) {
        const cl = clusters[Math.floor(rng() * clusters.length)];
        sx = cl.cx + (rng() - 0.5) * cl.radiusX * 1.5;
        sy = cl.cy + (rng() - 0.5) * cl.radiusY * 1.5;
      } else {
        sx = rng() * w;
        sy = rng() * h;
      }

      // Generate smooth curved path using control points
      let px = sx, py = sy;
      let angle = rng() * Math.PI * 2;
      const curvature = 0.02 + rng() * 0.04; // how much it bends

      for (let s = 0; s < numSegments; s++) {
        points.push({ x: px, y: py });
        angle += (rng() - 0.5) * curvature * 2;
        // Gentle bias to keep paths on screen
        if (px < w * 0.1) angle += 0.02;
        if (px > w * 0.9) angle -= 0.02;
        if (py < h * 0.1) angle += 0.01;
        if (py > h * 0.9) angle -= 0.01;
        const step = GRID_SPACING * (0.8 + rng() * 0.6);
        px += Math.cos(angle) * step;
        py += Math.sin(angle) * step;
      }

      signals.push({
        points,
        head: rng(),
        speed: 0.001 + rng() * 0.002,
        length: 6 + Math.floor(rng() * 10),
        brightness: 0.4 + rng() * 0.4,
      });
    }
    return signals;
  }, []);

  // ── Compute structure map (bake cluster influence per grid cell) ──
  const bakeStructureMap = useCallback((
    grid: GridCell[], clusters: StructureCluster[]
  ): { intensities: Float32Array; charIndices: Uint8Array } => {
    const intensities = new Float32Array(grid.length);
    const charIndices = new Uint8Array(grid.length);

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      let maxIntensity = 0;
      let bestCharIdx = 6; // default to '.'

      for (const cluster of clusters) {
        // Transform cell position into cluster-local coordinates
        const dx = cell.x - cluster.cx;
        const dy = cell.y - cluster.cy;
        const cos = Math.cos(-cluster.rotation);
        const sin = Math.sin(-cluster.rotation);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        // Check if within cluster bounds
        if (Math.abs(lx) > cluster.radiusX * 1.1 || Math.abs(ly) > cluster.radiusY * 1.1) continue;

        // Map to density grid coordinates
        const mc = ((lx / cluster.radiusX + 1) / 2) * cluster.mapCols;
        const mr = ((ly / cluster.radiusY + 1) / 2) * cluster.mapRows;
        const ci = Math.floor(mc);
        const ri = Math.floor(mr);

        if (ci < 0 || ci >= cluster.mapCols || ri < 0 || ri >= cluster.mapRows) continue;

        const density = cluster.densityMap[ri][ci];
        if (density > maxIntensity) {
          maxIntensity = density;
          bestCharIdx = cluster.charWeights[ri * cluster.mapCols + ci];
        }
      }

      intensities[i] = maxIntensity;
      charIndices[i] = bestCharIdx;
    }

    return { intensities, charIndices };
  }, []);

  // ── Initialize ───────────────────────────────────────────────
  const initialize = useCallback(() => {
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

    // Build grid
    const cols = Math.ceil(w / GRID_SPACING) + 2;
    const rows = Math.ceil(h / GRID_SPACING) + 2;
    const grid: GridCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid.push({
          x: c * GRID_SPACING,
          y: r * GRID_SPACING,
          col: c,
          row: r,
        });
      }
    }

    // Build flow field angle offsets
    const flowCols = Math.ceil(w / FLOW_RESOLUTION) + 2;
    const flowRows = Math.ceil(h / FLOW_RESOLUTION) + 2;
    const flowAngleOffset = new Float32Array(flowCols * flowRows);
    for (let i = 0; i < flowAngleOffset.length; i++) {
      flowAngleOffset[i] = rng() * Math.PI * 2;
    }

    const clusters = buildClusters(cols, rows, w, h, rng);
    const { intensities, charIndices } = bakeStructureMap(grid, clusters);
    const signals = buildSignals(w, h, clusters, rng);

    stateRef.current = {
      grid,
      cols,
      rows,
      clusters,
      signals,
      flowAngleOffset,
      flowCols,
      flowRows,
      structureMap: intensities,
      charIndexMap: charIndices,
    };
  }, [buildClusters, buildSignals, bakeStructureMap]);

  // ── Get flow angle at a world position ───────────────────────
  const getFlowAngle = useCallback((
    x: number, y: number, time: number,
    flowAngleOffset: Float32Array, flowCols: number, flowRows: number
  ): number => {
    const fc = x / FLOW_RESOLUTION;
    const fr = y / FLOW_RESOLUTION;
    const ci = Math.min(Math.max(Math.floor(fc), 0), flowCols - 1);
    const ri = Math.min(Math.max(Math.floor(fr), 0), flowRows - 1);
    const idx = ri * flowCols + ci;
    const baseAngle = flowAngleOffset[idx] + time * FLOW_DRIFT_SPEED;

    // Mouse perturbation
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const mdx = x - mx;
    const mdy = y - my;
    const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
    let mouseInfluence = 0;
    if (mDist < MOUSE_RADIUS) {
      const t = 1 - mDist / MOUSE_RADIUS;
      mouseInfluence = Math.atan2(mdy, mdx) * t * MOUSE_STRENGTH;
    }

    return baseAngle + mouseInfluence;
  }, []);

  // ── Render loop ──────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    timeRef.current += 1;
    const time = timeRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${CHAR_SIZE}px "SF Mono", "Fira Code", "Cascadia Code", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const { grid, cols, clusters, signals, flowAngleOffset, flowCols, flowRows, structureMap, charIndexMap } = state;

    // ── Precompute signal glow map ─────────────────────────────
    // For each signal, find which grid cells are near the signal head
    const signalGlowMap = new Float32Array(grid.length);

    for (const signal of signals) {
      // Advance signal head
      signal.head += signal.speed;
      if (signal.head > 1) signal.head -= 1;

      const pts = signal.points;
      const totalPts = pts.length;
      const headIdx = signal.head * (totalPts - 1);

      // Illuminate cells near the signal head + trailing cells
      for (let t = 0; t < signal.length; t++) {
        const idx = headIdx - t;
        if (idx < 0 || idx >= totalPts - 1) continue;
        const pi = Math.floor(idx);
        const frac = idx - pi;
        const px = pts[pi].x + (pts[pi + 1].x - pts[pi].x) * frac;
        const py = pts[pi].y + (pts[pi + 1].y - pts[pi].y) * frac;

        // Find nearby grid cell
        const gc = Math.round(px / GRID_SPACING);
        const gr = Math.round(py / GRID_SPACING);

        // Light up a small area around this point
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const c = gc + dc;
            const r = gr + dr;
            if (c < 0 || c >= cols || r < 0 || r >= state.rows) continue;
            const cellIdx = r * cols + c;
            const fade = 1 - t / signal.length;
            const dist = Math.sqrt(dc * dc + dr * dr);
            const glow = fade * signal.brightness * Math.max(0, 1 - dist * 0.5);
            signalGlowMap[cellIdx] = Math.min(1, signalGlowMap[cellIdx] + glow);
          }
        }
      }
    }

    // ── Render each grid cell ──────────────────────────────────
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];

      // Flow-based subtle displacement
      const angle = getFlowAngle(
        cell.x, cell.y, time,
        flowAngleOffset, flowCols, flowRows
      );
      const driftAmount = 0.4; // very subtle
      const ox = Math.cos(angle) * driftAmount * Math.sin(time * 0.003 + cell.col * 0.1);
      const oy = Math.sin(angle) * driftAmount * Math.cos(time * 0.002 + cell.row * 0.08);

      const drawX = cell.x + ox;
      const drawY = cell.y + oy;

      const structureIntensity = structureMap[i];
      const signalGlow = signalGlowMap[i];

      if (structureIntensity > 0.05) {
        // Render structure character
        const charIdx = charIndexMap[i];
        const char = STRUCTURE_CHARS[charIdx];
        const alpha = structureIntensity * 0.25 + signalGlow * 0.5;
        const r = STRUCTURE_BASE_COLOR[0] + signalGlow * (SIGNAL_COLOR[0] - STRUCTURE_BASE_COLOR[0]);
        const g = STRUCTURE_BASE_COLOR[1] + signalGlow * (SIGNAL_COLOR[1] - STRUCTURE_BASE_COLOR[1]);
        const b = STRUCTURE_BASE_COLOR[2] + signalGlow * (SIGNAL_COLOR[2] - STRUCTURE_BASE_COLOR[2]);
        ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.min(1, alpha)})`;
        ctx.fillText(char, drawX, drawY);
      } else if (signalGlow > 0.01) {
        // Signal passing through empty grid area
        const alpha = GRID_OPACITY + signalGlow * 0.4;
        ctx.fillStyle = `rgba(${SIGNAL_COLOR[0]}, ${SIGNAL_COLOR[1]}, ${SIGNAL_COLOR[2]}, ${Math.min(1, alpha)})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      } else {
        // Background grid "+"
        ctx.fillStyle = `rgba(100, 130, 180, ${GRID_OPACITY})`;
        ctx.fillText(GRID_CHAR, drawX, drawY);
      }
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(render);
  }, [getFlowAngle]);

  // ── Lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    initialize();
    animRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      initialize();
    };
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [initialize, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
};

export default DevinBackground;
