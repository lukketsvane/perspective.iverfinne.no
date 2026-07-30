import React, { useRef, useState } from 'react';
import { useStore, EYE_LEVEL_PRESETS, SPAWN_PRESETS } from '../store';
import { SpawnKind } from '../types';
import { STUDIES } from '../lib/studies';
import type { Layout } from '../lib/useLayout';
import { Icon, I } from './icons';

const SPAWN_ORDER: SpawnKind[] = ['cube', 'slab', 'pillar', 'beam', 'block'];
const SPAWN_ICON: Record<SpawnKind, React.ReactNode> = {
  cube: I.cube,
  slab: I.slab,
  pillar: I.pillar,
  beam: I.beam,
  block: I.block,
};

/**
 * The practice controls.
 *
 * Everything in here is a deliberate departure from the defaults: the tool
 * opens as 1 m cubes seen in straight-line perspective from a standing eye
 * level, and stays that way until something here is touched.
 *
 * It is drawn almost entirely in icons and numbers. Words were taking up more
 * of the panel than the controls were - eight named drills, five named
 * primitives, six named toggles - and a word under a button is read once and
 * then never again. What is left in text is the name of the loaded drill,
 * folded away in a dropdown, and measurements: metres, degrees. Those are the
 * subject, not the chrome.
 */
export const PracticePanel: React.FC<{ layout: Layout; onClose: () => void }> = ({ layout, onClose }) => {
  const theme = useStore((s) => s.theme);
  const fov = useStore((s) => s.fov);
  const distortion = useStore((s) => s.distortion);
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const lockEyeLevel = useStore((s) => s.lockEyeLevel);
  const showFigure = useStore((s) => s.showFigure);
  const showGuides = useStore((s) => s.showGuides);
  const spawnKind = useStore((s) => s.spawnKind);
  const setLens = useStore((s) => s.setLens);
  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const toggleEyeLevelLock = useStore((s) => s.toggleEyeLevelLock);
  const toggleFigure = useStore((s) => s.toggleFigure);
  const toggleGuides = useStore((s) => s.toggleGuides);
  const showCone = useStore((s) => s.showCone);
  const toggleCone = useStore((s) => s.toggleCone);
  const snapStep = useStore((s) => s.snapStep);
  const setSnapStep = useStore((s) => s.setSnapStep);
  const setSpawnKind = useStore((s) => s.setSpawnKind);
  const resetScene = useStore((s) => s.resetScene);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const setCameraFeed = useStore((s) => s.setCameraFeed);
  const sun = useStore((s) => s.sun);
  const setSun = useStore((s) => s.setSun);
  const matteModels = useStore((s) => s.matteModels);
  const toggleMatte = useStore((s) => s.toggleMatte);
  const activeStudyId = useStore((s) => s.activeStudyId);
  const loadStudy = useStore((s) => s.loadStudy);

  const [studiesOpen, setStudiesOpen] = useState(false);

  const isDark = theme === 'dark';
  const touch = layout !== 'desktop';

  const panel = isDark ? 'bg-black/85 border-white/12' : 'bg-white/95 border-gray-200';
  // The list sits over the controls it replaces, so it has to be opaque - at
  // 95% the sliders underneath read straight through the drill names.
  const sheet = isDark ? 'bg-black border-white/15' : 'bg-white border-gray-200';
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';
  const value = isDark ? 'text-white' : 'text-gray-900';
  const divider = isDark ? 'border-white/10' : 'border-gray-100';

  const size = touch ? 'w-10 h-10' : 'w-8 h-8';
  /** Every cell in the phone grid is this square. */
  const cellSize = 'w-12 h-12 shrink-0';
  const rowPad = touch ? 'px-3 py-3' : 'px-3 py-2.5';
  const slider = touch ? 'w-full accent-current h-6' : 'w-full accent-current';

  /** A square icon control, filled in when it is on. */
  const Toggle: React.FC<{
    on: boolean;
    onClick: () => void;
    path: React.ReactNode;
    label: string;
    className?: string;
  }> = ({ on, onClick, path, label, className = '' }) => (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={`flex items-center justify-center ${size} rounded-lg border transition-colors ${
        on
          ? isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900'
          : isDark ? 'bg-black/40 text-gray-400 border-white/15' : 'bg-black/5 text-gray-500 border-transparent'
      } ${className}`}
    >
      <Icon path={path} className={touch ? 'w-5 h-5' : 'w-[18px] h-[18px]'} />
    </button>
  );

  /**
   * A number you drag.
   *
   * A row of preset buttons with a slider under it was two controls and a whole
   * row of chrome to say one thing. This is the thing itself: the reading is
   * the control. Drag it for any value, tap it to step round the presets - what
   * the buttons were for. A slider cannot land on 1.90 exactly; this cannot
   * miss it.
   */
  const Scrub: React.FC<{
    icon: React.ReactNode;
    label: string;
    reading: string;
    value: number;
    min: number;
    max: number;
    step: number;
    cycle?: number[];
    wrap?: boolean;
    onChange: (v: number) => void;
  }> = ({ icon, label, reading, value: current, min, max, step, cycle, wrap, onChange }) => {
    const drag = useRef<{ id: number; x: number; from: number; moved: boolean } | null>(null);

    const settle = (v: number) => {
      const snapped = Math.round(v / step) * step;
      if (wrap) return ((snapped % max) + max) % max;
      return Math.min(max, Math.max(min, snapped));
    };

    return (
      <button
        // Over a black panel a black fill is invisible, so the affordance is a
        // hairline instead: it has to read as something you can take hold of.
        className={`flex-1 min-w-0 flex items-center gap-1.5 ${touch ? 'h-10' : 'h-8'} px-2 rounded-lg touch-none cursor-ew-resize border ${
          isDark ? 'bg-black/40 border-white/15' : 'bg-black/5 border-black/10'
        }`}
        aria-label={label}
        title={label}
        onPointerDown={(e) => {
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
          drag.current = { id: e.pointerId, x: e.clientX, from: current, moved: false };
        }}
        onPointerMove={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          const travel = e.clientX - drag.current.x;
          if (Math.abs(travel) > 3) drag.current.moved = true;
          if (!drag.current.moved) return;
          // 180 px of travel covers the whole range, whatever the range is.
          onChange(settle(drag.current.from + (travel / 180) * (max - min)));
        }}
        onPointerUp={(e) => {
          const held = drag.current;
          drag.current = null;
          if (held?.id !== e.pointerId || held.moved || !cycle?.length) return;
          // A tap steps to the next preset up, and round to the bottom again.
          onChange(cycle.find((v) => v > current + 0.001) ?? cycle[0]);
        }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <span className={`shrink-0 ${muted}`}>
          <Icon path={icon} className="w-4 h-4" />
        </span>
        <span className={`flex-1 text-right text-[12px] font-black tabular-nums ${value}`}>{reading}</span>
      </button>
    );
  };

  /**
   * A square that reads a number and takes a drag.
   *
   * The grid version of Scrub: icon over value, sized like every other cell so
   * a column of them lines up. Drag in any direction - right and up raise it -
   * because in a grid there is no obvious axis.
   */
  const Cell: React.FC<{
    icon: React.ReactNode;
    label: string;
    reading: string;
    value: number;
    min: number;
    max: number;
    step: number;
    cycle?: number[];
    wrap?: boolean;
    onChange: (v: number) => void;
  }> = ({ icon, label, reading, value: current, min, max, step, cycle, wrap, onChange }) => {
    const drag = useRef<{ id: number; x: number; y: number; from: number; moved: boolean } | null>(null);

    const settle = (v: number) => {
      const snapped = Math.round(v / step) * step;
      if (wrap) return ((snapped % max) + max) % max;
      return Math.min(max, Math.max(min, snapped));
    };

    return (
      <button
        className={`${cellSize} flex flex-col items-center justify-center gap-0.5 rounded-xl border touch-none ${
          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-black/5 border-black/10 text-gray-900'
        }`}
        aria-label={label}
        title={label}
        onPointerDown={(e) => {
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: current, moved: false };
        }}
        onPointerMove={(e) => {
          if (drag.current?.id !== e.pointerId) return;
          const travel = (e.clientX - drag.current.x) + (drag.current.y - e.clientY);
          if (Math.abs(travel) > 4) drag.current.moved = true;
          if (!drag.current.moved) return;
          onChange(settle(drag.current.from + (travel / 200) * (max - min)));
        }}
        onPointerUp={(e) => {
          const held = drag.current;
          drag.current = null;
          if (held?.id !== e.pointerId || held.moved || !cycle?.length) return;
          onChange(cycle.find((v) => v > current + 0.001) ?? cycle[0]);
        }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <Icon path={icon} className="w-4 h-4 opacity-50" />
        <span className="text-[10px] font-black tabular-nums leading-none">{reading}</span>
      </button>
    );
  };

  /** A slider with its reading, and an icon saying what it is. */
  const Dial: React.FC<{
    icon: React.ReactNode;
    label: string;
    reading: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
  }> = ({ icon, label, reading, min, max, step, value: current, onChange }) => (
    <div className="flex items-center gap-2">
      <span className={`shrink-0 ${muted}`}>
        <Icon path={icon} className="w-4 h-4" />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={slider}
        aria-label={label}
      />
      <span className={`shrink-0 w-12 text-right text-[11px] font-black tabular-nums ${value}`}>{reading}</span>
    </div>
  );

  const activeStudy = STUDIES.find((s) => s.id === activeStudyId) ?? null;

  /**
   * The phone build: a block of squares in the bottom right corner.
   *
   * A sheet across the bottom half of a phone is the panel winning an argument
   * with the scene, and the scene is the whole point. Every control here is one
   * square you either tap or drag - the five primitives are one square you tap
   * through, the projection is one square that flips, the numbers are squares
   * you drag - so the entire panel is three columns wide and stays out of the
   * left two thirds of the glass.
   */
  if (layout === 'phone') {
    const cellToggle = (on: boolean, onClick: () => void, path: React.ReactNode, label: string) => (
      <button
        onClick={onClick}
        aria-label={label}
        aria-pressed={on}
        title={label}
        className={`${cellSize} flex items-center justify-center rounded-xl border transition-colors ${
          on
            ? isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900'
            : isDark ? 'bg-black/40 text-gray-400 border-white/15' : 'bg-black/5 text-gray-500 border-black/10'
        }`}
      >
        <Icon path={path} className="w-5 h-5" />
      </button>
    );

    const nextSpawn = () =>
      setSpawnKind(SPAWN_ORDER[(SPAWN_ORDER.indexOf(spawnKind) + 1) % SPAWN_ORDER.length]);

    return (
      <div className="relative flex flex-col items-end gap-1.5 pointer-events-auto">
        {studiesOpen && (
          <div className={`absolute bottom-full right-0 mb-2 w-52 rounded-xl border shadow-2xl overflow-hidden ${sheet}`}>
            <button
              onClick={() => { resetScene(); setStudiesOpen(false); }}
              className={`w-full text-left px-3 py-3 text-[11px] font-bold ${!activeStudyId ? value : muted}`}
            >
              —
            </button>
            {STUDIES.map((study) => (
              <button
                key={study.id}
                onClick={() => { loadStudy(study.id); setStudiesOpen(false); }}
                className={`w-full text-left px-3 py-3 text-[11px] font-bold ${
                  activeStudyId === study.id ? value : muted
                }`}
              >
                {study.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          {cellToggle(studiesOpen, () => setStudiesOpen(!studiesOpen), I.study, 'Study')}
          <Cell
            icon={I.horizon}
            label="Eye level"
            reading={cameraHeight.toFixed(2)}
            value={cameraHeight}
            min={0.4}
            max={12}
            step={0.05}
            cycle={EYE_LEVEL_PRESETS.map((preset) => preset.height)}
            onChange={setCameraHeight}
          />
          {cellToggle(lockEyeLevel, toggleEyeLevelLock, lockEyeLevel ? I.levelLocked : I.levelFree, 'Level gaze')}

          {cellToggle(
            perspectiveMode === 'curvilinear',
            () => setPerspectiveMode(perspectiveMode === 'linear' ? 'curvilinear' : 'linear'),
            perspectiveMode === 'linear' ? I.straight : I.curved,
            perspectiveMode === 'linear' ? 'Straight lines' : 'Curvilinear'
          )}
          <Cell
            icon={I.cone}
            label="Field of view"
            reading={`${Math.round(fov)}°`}
            value={fov}
            min={25}
            max={360}
            step={1}
            cycle={[35, 50, 60, 90, 120]}
            onChange={(v) => setLens(v)}
          />
          {cellToggle(showCone, toggleCone, I.cone, 'Cone of vision')}

          {cellToggle(true, nextSpawn, SPAWN_ICON[spawnKind], SPAWN_PRESETS[spawnKind].label)}
          {cellToggle(snapStep > 0, () => setSnapStep(snapStep > 0 ? 0 : 0.25), I.snap, 'Snap to the grid')}
          {cellToggle(showGuides, toggleGuides, I.horizon, 'Horizon and grid')}

          {cellToggle(showFigure, toggleFigure, I.person, 'Scale figure')}
          {cellToggle(cameraFeed, () => setCameraFeed(!cameraFeed), I.camera, 'Camera feed')}
          {cellToggle(matteModels, toggleMatte, I.matte, 'Matte white models')}

          <Cell
            icon={I.bearing}
            label="Sun bearing"
            reading={`${Math.round(sun.azimuth)}°`}
            value={sun.azimuth}
            min={0}
            max={360}
            step={1}
            wrap
            onChange={(v) => setSun({ azimuth: v })}
          />
          <Cell
            icon={I.elevation}
            label="Sun height"
            reading={`${Math.round(sun.elevation)}°`}
            value={sun.elevation}
            min={4}
            max={88}
            step={1}
            onChange={(v) => setSun({ elevation: v })}
          />
          <Cell
            icon={I.sun}
            label="Sun strength"
            reading={sun.intensity.toFixed(1)}
            value={sun.intensity}
            min={0.2}
            max={8}
            step={0.1}
            onChange={(v) => setSun({ intensity: v })}
          />

          {cellToggle(sun.shadows, () => setSun({ shadows: !sun.shadows }), I.shadow, 'Cast shadows')}
          {cellToggle(false, resetScene, I.reset, 'Reset to cubes')}
          {cellToggle(false, onClose, I.close, 'Close')}
        </div>
      </div>
    );
  }


  return (
    <div className={`w-full max-h-full pointer-events-auto rounded-xl shadow-2xl border backdrop-blur-md overflow-hidden flex flex-col ${panel}`}>
      {/* Which drill is loaded - the one name worth showing, and it folds away. */}
      <div className={`relative flex items-center gap-2 ${rowPad} border-b ${divider}`}>
        <button
          onClick={() => setStudiesOpen(!studiesOpen)}
          className={`flex-1 flex items-center gap-2 min-w-0 ${value}`}
          aria-label="Study"
          aria-expanded={studiesOpen}
        >
          <Icon path={I.study} className="w-[18px] h-[18px] shrink-0" />
          <span className="flex-1 text-left text-[11px] font-bold truncate">
            {activeStudy ? activeStudy.name : '—'}
          </span>
          <Icon
            path={I.chevron}
            className={`w-4 h-4 shrink-0 transition-transform ${studiesOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          // No confirmation: a reset is one undo away, and a modal asking
          // "are you sure" is the most text a button can cost.
          onClick={resetScene}
          className={`shrink-0 ${muted}`}
          aria-label="Reset to cubes"
          title="Reset to cubes"
        >
          <Icon path={I.reset} className="w-4 h-4" />
        </button>

        <button onClick={onClose} className={`shrink-0 ${muted}`} aria-label="Close">
          <Icon path={I.close} className="w-4 h-4" />
        </button>

        {studiesOpen && (
          <div
            className={`absolute left-2 right-2 top-full z-10 mt-1 rounded-xl border shadow-2xl overflow-hidden ${sheet}`}
          >
            <button
              onClick={() => { resetScene(); setStudiesOpen(false); }}
              className={`w-full text-left px-3 ${touch ? 'py-3' : 'py-2'} text-[11px] font-bold ${
                !activeStudyId ? value : muted
              } ${isDark ? 'hover:bg-black/60' : 'hover:bg-black/5'}`}
            >
              —
            </button>
            {STUDIES.map((study) => (
              <button
                key={study.id}
                onClick={() => { loadStudy(study.id); setStudiesOpen(false); }}
                className={`w-full text-left px-3 ${touch ? 'py-3' : 'py-2'} text-[11px] font-bold ${
                  activeStudyId === study.id ? value : muted
                } ${isDark ? 'hover:bg-black/60' : 'hover:bg-black/5'}`}
              >
                {study.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ------------------------------------------------ eye level, in metres */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1.5`}>
          <Scrub
            icon={I.horizon}
            label="Eye level"
            reading={`${cameraHeight.toFixed(2)} m`}
            value={cameraHeight}
            min={0.4}
            max={12}
            step={0.05}
            cycle={EYE_LEVEL_PRESETS.map((preset) => preset.height)}
            onChange={setCameraHeight}
          />
          <Toggle
            on={lockEyeLevel}
            onClick={toggleEyeLevelLock}
            path={lockEyeLevel ? I.levelLocked : I.levelFree}
            label="Level gaze"
            className="shrink-0"
          />
        </div>

        {/* ------------------------------------------------------- the projection */}
        <div className={`${rowPad} border-b ${divider} space-y-2`}>
          <div className="flex items-center gap-1.5">
            <Toggle
              on={perspectiveMode === 'linear'}
              onClick={() => setPerspectiveMode('linear')}
              path={I.straight}
              label="Straight lines"
              className="shrink-0"
            />
            <Toggle
              on={perspectiveMode === 'curvilinear'}
              onClick={() => setPerspectiveMode('curvilinear')}
              path={I.curved}
              label="Curvilinear"
              className="shrink-0"
            />
            <Scrub
              icon={I.cone}
              label="Field of view"
              reading={`${Math.round(fov)}°`}
              value={fov}
              min={25}
              max={360}
              step={1}
              cycle={[35, 50, 60, 90, 120]}
              onChange={(v) => setLens(v)}
            />
          </div>

          {perspectiveMode === 'curvilinear' && (
            <Scrub
              icon={I.curved}
              label="Curvature"
              reading={distortion.toFixed(2)}
              value={distortion}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => setLens(fov, v)}
            />
          )}
        </div>

        {/* --------------------------------------------- what a tap drops, and snap */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1`}>
          {SPAWN_ORDER.map((kind) => (
            <Toggle
              key={kind}
              on={spawnKind === kind}
              onClick={() => setSpawnKind(kind)}
              path={SPAWN_ICON[kind]}
              label={SPAWN_PRESETS[kind].label}
              className="flex-1"
            />
          ))}
          <Toggle
            on={snapStep > 0}
            onClick={() => setSnapStep(snapStep > 0 ? 0 : 0.25)}
            path={I.snap}
            label="Snap to the grid"
            className="flex-1 ml-1"
          />
        </div>

        {/* ------------------------------------------------ what is drawn over it */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1`}>
          <Toggle on={showGuides} onClick={toggleGuides} path={I.horizon} label="Horizon and grid" className="flex-1" />
          <Toggle on={showFigure} onClick={toggleFigure} path={I.person} label="Scale figure" className="flex-1" />
          <Toggle on={showCone} onClick={toggleCone} path={I.cone} label="Cone of vision" className="flex-1" />
          <Toggle on={cameraFeed} onClick={() => setCameraFeed(!cameraFeed)} path={I.camera} label="Camera feed" className="flex-1" />
          <Toggle on={matteModels} onClick={toggleMatte} path={I.matte} label="Matte white models" className="flex-1" />
        </div>

        {/* ---------------------------------------------------------------- the sun */}
        <div className={`${rowPad} flex items-center gap-1.5`}>
          <Scrub
            icon={I.bearing}
            label="Sun bearing"
            reading={`${Math.round(sun.azimuth)}°`}
            value={sun.azimuth}
            min={0}
            max={360}
            step={1}
            wrap
            onChange={(v) => setSun({ azimuth: v })}
          />
          <Scrub
            icon={I.elevation}
            label="Sun height"
            reading={`${Math.round(sun.elevation)}°`}
            value={sun.elevation}
            min={4}
            max={88}
            step={1}
            onChange={(v) => setSun({ elevation: v })}
          />
          <Scrub
            icon={I.sun}
            label="Sun strength"
            reading={sun.intensity.toFixed(1)}
            value={sun.intensity}
            min={0.2}
            max={8}
            step={0.1}
            onChange={(v) => setSun({ intensity: v })}
          />
          <Toggle
            on={sun.shadows}
            onClick={() => setSun({ shadows: !sun.shadows })}
            path={I.shadow}
            label="Cast shadows"
            className="shrink-0"
          />
        </div>
      </div>

    </div>
  );
};
