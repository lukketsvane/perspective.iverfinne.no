import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from '../store';

/**
 * A 2D fisheye / curvilinear construction grid overlay.
 *
 * Kim Jung Gi's method: the page is ruled as a sphere projected flat. Concentric
 * circles mark how far from the centre of gaze each direction is, radial lines
 * mark bearings, and great-circle arcs mark the curves that straight edges
 * follow. This overlay draws that grid and lets the user sketch on top of it,
 * practising how straight lines curve in a fisheye field.
 *
 * Two sub-modes:
 * - "full sphere": a single vanishing point at centre, concentric rings every
 *   15° out to 180° — the infinite fisheye construction from the first video.
 * - "multi-point": multiple VP circles placed on the page, each with its own
 *   set of radiating arcs — the technique from the second video.
 */

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface VPCircle {
  x: number;
  y: number;
  /** Radius in pixels of the 90° ring (half the sphere). */
  radius: number;
}

type GridMode = 'fullSphere' | 'multiPoint';

export const FisheyeGrid: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [gridMode, setGridMode] = useState<GridMode>('fullSphere');
  const [vpCircles, setVpCircles] = useState<VPCircle[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [placingVP, setPlacingVP] = useState(false);
  const currentStroke = useRef<Stroke | null>(null);

  const lineColor = isDark ? 'rgba(255,106,94,0.5)' : 'rgba(224,52,42,0.4)';
  const strongLine = isDark ? 'rgba(255,106,94,0.8)' : 'rgba(224,52,42,0.7)';
  const drawColor = isDark ? '#ffffff' : '#111111';

  // Draw the grid
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (gridMode === 'fullSphere') {
      // Single centre VP with concentric circles every 15°
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.45;
      const degreesPerRing = 15;
      const totalRings = 12; // 180° / 15°

      // Concentric circles (parallels of the sphere)
      for (let i = 1; i <= totalRings; i++) {
        const r = (i / totalRings) * maxRadius;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = i === 6 ? strongLine : lineColor; // 90° ring is strong
        ctx.lineWidth = i === 6 ? 2 : 1;
        ctx.stroke();
      }

      // Radial lines (meridians) every 15°
      const meridians = 24; // every 15°
      for (let i = 0; i < meridians; i++) {
        const angle = (i / meridians) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
        ctx.strokeStyle = i % 6 === 0 ? strongLine : lineColor; // 90° axes strong
        ctx.lineWidth = i % 6 === 0 ? 1.5 : 0.7;
        ctx.stroke();
      }

      // Horizon line
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.strokeStyle = isDark ? 'rgba(90,200,255,0.7)' : 'rgba(31,111,235,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = strongLine;
      ctx.fill();

      // Labels
      ctx.font = '11px monospace';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
      ctx.textAlign = 'center';
      for (let i = 1; i <= totalRings; i++) {
        const r = (i / totalRings) * maxRadius;
        ctx.fillText(`${i * degreesPerRing}°`, cx + r + 12, cy - 4);
      }
    } else {
      // Multi-point mode: draw each VP circle with radiating curved lines
      for (const vp of vpCircles) {
        const { x: cx, y: cy, radius } = vp;

        // Concentric rings for this VP
        for (let i = 1; i <= 6; i++) {
          const r = (i / 6) * radius;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = i === 3 ? strongLine : lineColor;
          ctx.lineWidth = i === 3 ? 1.5 : 0.8;
          ctx.stroke();
        }

        // Radial lines from this VP
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        // VP dot
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = strongLine;
        ctx.fill();
      }

      // Draw great-circle arcs connecting VPs (the curves that straight lines follow)
      if (vpCircles.length >= 2) {
        ctx.strokeStyle = isDark ? 'rgba(90,200,255,0.4)' : 'rgba(31,111,235,0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i < vpCircles.length; i++) {
          for (let j = i + 1; j < vpCircles.length; j++) {
            const a = vpCircles[i];
            const b = vpCircles[j];
            // Draw curved connecting lines between VPs as arcs
            // The curve bows away from the centre of the page
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const pageCx = w / 2;
            const pageCy = h / 2;
            // Control point pushes away from page centre
            const dx = mx - pageCx;
            const dy = my - pageCy;
            const dist = Math.hypot(dx, dy) || 1;
            const bulge = Math.hypot(b.x - a.x, b.y - a.y) * 0.2;
            const cpx = mx + (dx / dist) * bulge;
            const cpy = my + (dy / dist) * bulge;

            for (let k = -3; k <= 3; k++) {
              const offset = k * 30;
              const perpX = -(b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y) * offset;
              const perpY = (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y) * offset;
              ctx.beginPath();
              ctx.moveTo(a.x + perpX, a.y + perpY);
              ctx.quadraticCurveTo(cpx + perpX, cpy + perpY, b.x + perpX, b.y + perpY);
              ctx.stroke();
            }
          }
        }
      }

      // Instruction text if no VPs placed yet
      if (vpCircles.length === 0) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('Tap "Add VP" then tap the canvas to place vanishing points', w / 2, h / 2);
      }
    }
  }, [gridMode, vpCircles, isDark, lineColor, strongLine]);

  // Draw user strokes
  const drawStrokes = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const allStrokes = [...strokes];
    if (currentStroke.current) allStrokes.push(currentStroke.current);

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }, [strokes]);

  // Resize canvases
  useEffect(() => {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      for (const canvas of [canvasRef.current, drawCanvasRef.current]) {
        if (!canvas) continue;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        canvas.getContext('2d')?.scale(dpr, dpr);
      }
      drawGrid();
      drawStrokes();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawGrid, drawStrokes]);

  useEffect(() => { drawGrid(); }, [drawGrid]);
  useEffect(() => { drawStrokes(); }, [drawStrokes]);

  // Pointer handlers for drawing or placing VPs
  const getPos = (e: React.PointerEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (placingVP) {
      const pos = getPos(e);
      const radius = Math.min(window.innerWidth, window.innerHeight) * 0.15;
      setVpCircles((prev) => [...prev, { x: pos.x, y: pos.y, radius }]);
      setPlacingVP(false);
      return;
    }
    setIsDrawing(true);
    const pos = getPos(e);
    currentStroke.current = { points: [pos], color: drawColor, width: 2 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke.current) return;
    const pos = getPos(e);
    currentStroke.current.points.push(pos);
    drawStrokes();
  };

  const onPointerUp = () => {
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke.current!]);
    }
    currentStroke.current = null;
    setIsDrawing(false);
  };

  const chrome = isDark
    ? 'bg-black/80 text-white border-white/20'
    : 'bg-white/90 text-gray-900 border-gray-300';
  const btn = `px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-semibold transition-all active:scale-95 ${chrome}`;
  const btnActive = `px-3 py-1.5 rounded-lg border backdrop-blur-md text-xs font-semibold !bg-sky-500 !text-white !border-sky-400`;

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: isDark ? '#111' : '#f5f5f0' }}>
      {/* Grid canvas (background) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Drawing canvas (foreground, receives input) */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: placingVP ? 'crosshair' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[101] flex items-center gap-2">
        <button
          onClick={() => setGridMode('fullSphere')}
          className={gridMode === 'fullSphere' ? btnActive : btn}
        >
          Full Sphere
        </button>
        <button
          onClick={() => setGridMode('multiPoint')}
          className={gridMode === 'multiPoint' ? btnActive : btn}
        >
          Multi-VP
        </button>

        <div className="w-px h-6 bg-current opacity-20" />

        {gridMode === 'multiPoint' && (
          <button
            onClick={() => setPlacingVP(!placingVP)}
            className={placingVP ? btnActive : btn}
          >
            {placingVP ? 'Tap to place…' : 'Add VP'}
          </button>
        )}

        <button onClick={() => setStrokes([])} className={btn}>
          Clear Drawing
        </button>

        {gridMode === 'multiPoint' && (
          <button onClick={() => setVpCircles([])} className={btn}>
            Clear VPs
          </button>
        )}

        <div className="w-px h-6 bg-current opacity-20" />

        <button onClick={onClose} className={btn}>
          ✕ Close
        </button>
      </div>

      {/* Hint text at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[101] text-center">
        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/30'}`}>
          {gridMode === 'fullSphere'
            ? 'Draw on the fisheye grid — straight edges curve towards the outer rings. Centre = looking direction.'
            : 'Place vanishing points, then practise drawing curves that converge to them.'}
        </p>
      </div>
    </div>
  );
};
