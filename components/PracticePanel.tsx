import React, { useMemo } from 'react';
import { useStore, EYE_LEVEL_PRESETS, SPAWN_PRESETS } from '../store';
import { SpawnKind } from '../types';
import type { Layout } from '../lib/useLayout';
import { Icon, I } from './icons';
import { Toggle, Scrub, Cell, type Skin } from './controls';

const SPAWN_ORDER: SpawnKind[] = ['cube', 'slab', 'pillar', 'beam', 'block'];
const PERSPECTIVE_ORDER = ['linear', 'equidistant', 'stereographic', 'cylindrical', 'hyperbolic'] as const;
const SPAWN_ICON: Record<SpawnKind, React.ReactNode> = {
  cube: I.cube,
  slab: I.slab,
  pillar: I.pillar,
  beam: I.beam,
  block: I.block,
};
const PERSPECTIVE_ICON: Record<typeof PERSPECTIVE_ORDER[number], React.ReactNode> = {
  linear: I.straight,
  equidistant: I.curved,
  stereographic: I.stereographic,
  cylindrical: I.cylindrical,
  hyperbolic: I.hyperbolic,
};
const PERSPECTIVE_LABEL: Record<typeof PERSPECTIVE_ORDER[number], string> = {
  linear: 'Straight lines',
  equidistant: 'Equidistant',
  stereographic: 'Stereographic',
  cylindrical: 'Cylindrical',
  hyperbolic: 'Hyperbolic',
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
  const perspectiveMode = useStore((s) => s.perspectiveMode);
  const cameraHeight = useStore((s) => s.cameraHeight);
  const lockEyeLevel = useStore((s) => s.lockEyeLevel);
  const showGuides = useStore((s) => s.showGuides);
  const spawnKind = useStore((s) => s.spawnKind);
  const setLens = useStore((s) => s.setLens);
  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);
  const setCameraHeight = useStore((s) => s.setCameraHeight);
  const toggleEyeLevelLock = useStore((s) => s.toggleEyeLevelLock);
  const toggleGuides = useStore((s) => s.toggleGuides);
  const showCone = useStore((s) => s.showCone);
  const toggleCone = useStore((s) => s.toggleCone);
  const snapStep = useStore((s) => s.snapStep);
  const setSnapStep = useStore((s) => s.setSnapStep);
  const setSpawnKind = useStore((s) => s.setSpawnKind);
  const resetScene = useStore((s) => s.resetScene);
  const sun = useStore((s) => s.sun);
  const setSun = useStore((s) => s.setSun);
  const matteModels = useStore((s) => s.matteModels);
  const toggleMatte = useStore((s) => s.toggleMatte);

  const isDark = theme === 'dark';
  const touch = layout !== 'desktop';

  const panel = isDark ? 'bg-black/85 border-white/12' : 'bg-white/95 border-gray-200';
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';
  const value = isDark ? 'text-white' : 'text-gray-900';
  const divider = isDark ? 'border-white/10' : 'border-gray-100';

  const rowPad = touch ? 'px-3 py-3' : 'px-3 py-2.5';
  const skin: Skin = useMemo(() => ({ dark: isDark, touch }), [isDark, touch]);

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
        className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border transition-colors ${
          on
            ? 'bg-sky-500 text-white border-sky-400'
            : isDark ? 'bg-black/40 text-gray-400 border-white/15' : 'bg-black/5 text-gray-500 border-black/10'
        }`}
      >
        <Icon path={path} className="w-5 h-5" />
      </button>
    );

    const nextSpawn = () =>
      setSpawnKind(SPAWN_ORDER[(SPAWN_ORDER.indexOf(spawnKind) + 1) % SPAWN_ORDER.length]);
    const nextPerspective = () =>
      setPerspectiveMode(PERSPECTIVE_ORDER[(PERSPECTIVE_ORDER.indexOf(perspectiveMode) + 1) % PERSPECTIVE_ORDER.length]);

    return (
      <div className="relative flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="grid grid-cols-3 gap-1.5">
          <Cell
            skin={skin}
            icon={I.horizon}
            label="Eye level"
            reading={cameraHeight.toFixed(2)}
            value={cameraHeight}
            min={0.4}
            max={12}
            step={0.01}
            cycle={EYE_LEVEL_PRESETS.map((preset) => preset.height)}
            onChange={setCameraHeight}
          />
          {cellToggle(lockEyeLevel, toggleEyeLevelLock, lockEyeLevel ? I.levelLocked : I.levelFree, 'Level gaze')}

          {cellToggle(
            perspectiveMode !== 'linear',
            nextPerspective,
            PERSPECTIVE_ICON[perspectiveMode],
            PERSPECTIVE_LABEL[perspectiveMode]
          )}
          <Cell
            skin={skin}
            icon={I.cone}
            label="Field of view"
            reading={`${Math.round(fov)}°`}
            value={fov}
            min={25}
            max={360}
            step={1}
            cycle={[35, 60, 90, 160, 240, 330]}
            onChange={(v) => setLens(v)}
          />
          {cellToggle(showCone, toggleCone, I.cone, 'Cone of vision')}

          {cellToggle(true, nextSpawn, SPAWN_ICON[spawnKind], SPAWN_PRESETS[spawnKind].label)}
          {cellToggle(snapStep > 0, () => setSnapStep(snapStep > 0 ? 0 : 0.25), I.snap, 'Snap to the grid')}
          {cellToggle(showGuides, toggleGuides, I.horizon, 'Horizon and grid')}

          {cellToggle(matteModels, toggleMatte, I.matte, 'Matte white models')}

          <Cell
            skin={skin}
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
            skin={skin}
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
            skin={skin}
            icon={I.sun}
            label="Sun strength"
            reading={sun.intensity.toFixed(1)}
            value={sun.intensity}
            min={0.2}
            max={8}
            step={0.1}
            onChange={(v) => setSun({ intensity: v })}
          />
          <Cell
            skin={skin}
            icon={I.light}
            label="Sun colour temperature"
            reading={`${(sun.temperature / 1000).toFixed(1)}k`}
            value={sun.temperature}
            min={1800}
            max={12000}
            step={100}
            onChange={(v) => setSun({ temperature: v })}
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
      <div className={`flex items-center justify-end gap-3 ${rowPad} border-b ${divider}`}>
        <button onClick={resetScene} className={muted} aria-label="Reset to cubes" title="Reset to cubes">
          <Icon path={I.reset} className="w-4 h-4" />
        </button>
        <button onClick={onClose} className={muted} aria-label="Close">
          <Icon path={I.close} className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ------------------------------------------------ eye level, in metres */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1.5`}>
          <Scrub
            skin={skin}
            icon={I.horizon}
            label="Eye level"
            reading={`${cameraHeight.toFixed(2)} m`}
            value={cameraHeight}
            min={0.4}
            max={12}
            step={0.01}
            cycle={EYE_LEVEL_PRESETS.map((preset) => preset.height)}
            onChange={setCameraHeight}
          />
          <Toggle
            skin={skin}
            on={lockEyeLevel}
            onClick={toggleEyeLevelLock}
            path={lockEyeLevel ? I.levelLocked : I.levelFree}
            label="Level gaze"
            className="shrink-0"
          />
        </div>

        {/* --------------------------------------------- what a tap drops, and snap */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1`}>
          {SPAWN_ORDER.map((kind) => (
            <Toggle
            skin={skin}
              key={kind}
              on={spawnKind === kind}
              onClick={() => setSpawnKind(kind)}
              path={SPAWN_ICON[kind]}
              label={SPAWN_PRESETS[kind].label}
              className="flex-1"
            />
          ))}
          <Toggle
            skin={skin}
            on={snapStep > 0}
            onClick={() => setSnapStep(snapStep > 0 ? 0 : 0.25)}
            path={I.snap}
            label="Snap to the grid"
            className="flex-1 ml-1"
          />
        </div>

        {/* ------------------------------------------------ what is drawn over it */}
        <div className={`${rowPad} border-b ${divider} flex items-center gap-1`}>
          <Toggle skin={skin} on={showGuides} onClick={toggleGuides} path={I.horizon} label="Horizon and grid" className="flex-1" />
          <Toggle skin={skin} on={showCone} onClick={toggleCone} path={I.cone} label="Cone of vision" className="flex-1" />
          <Toggle skin={skin} on={matteModels} onClick={toggleMatte} path={I.matte} label="Matte white models" className="flex-1" />
        </div>

        {/* ---------------------------------------------------------------- the sun */}
        <div className={`${rowPad} flex items-center gap-1.5`}>
          <Scrub
            skin={skin}
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
            skin={skin}
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
            skin={skin}
            icon={I.sun}
            label="Sun strength"
            reading={sun.intensity.toFixed(1)}
            value={sun.intensity}
            min={0.2}
            max={8}
            step={0.1}
            onChange={(v) => setSun({ intensity: v })}
          />
          <Scrub
            skin={skin}
            icon={I.light}
            label="Sun colour temperature"
            reading={`${Math.round(sun.temperature)} K`}
            value={sun.temperature}
            min={1800}
            max={12000}
            step={100}
            cycle={[2700, 4000, 5600, 6500, 9000]}
            onChange={(v) => setSun({ temperature: v })}
          />
          <Toggle
            skin={skin}
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
