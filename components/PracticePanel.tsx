import React, { useState } from 'react';
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

  const panel = isDark ? 'bg-[#1a1a1a]/95 border-gray-700' : 'bg-white/95 border-gray-200';
  // The list sits over the controls it replaces, so it has to be opaque - at
  // 95% the sliders underneath read straight through the drill names.
  const sheet = isDark ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200';
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';
  const value = isDark ? 'text-white' : 'text-gray-900';
  const divider = isDark ? 'border-gray-800' : 'border-gray-100';

  const size = touch ? 'w-10 h-10' : 'w-8 h-8';
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
      className={`flex items-center justify-center ${size} rounded-lg transition-colors ${
        on
          ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
          : isDark ? 'bg-white/5 text-gray-400' : 'bg-black/5 text-gray-500'
      } ${className}`}
    >
      <Icon path={path} className={touch ? 'w-5 h-5' : 'w-[18px] h-[18px]'} />
    </button>
  );

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
              } ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              —
            </button>
            {STUDIES.map((study) => (
              <button
                key={study.id}
                onClick={() => { loadStudy(study.id); setStudiesOpen(false); }}
                className={`w-full text-left px-3 ${touch ? 'py-3' : 'py-2'} text-[11px] font-bold ${
                  activeStudyId === study.id ? value : muted
                } ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                {study.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ------------------------------------------------ eye level, in metres */}
        <div className={`${rowPad} border-b ${divider} space-y-2`}>
          <div className="flex items-center gap-1">
            {EYE_LEVEL_PRESETS.map((preset) => (
              <button
                key={preset.height}
                onClick={() => setCameraHeight(preset.height)}
                title={preset.note}
                className={`flex-1 ${touch ? 'py-2.5' : 'py-1.5'} rounded-lg text-[11px] font-black tabular-nums transition-colors ${
                  Math.abs(cameraHeight - preset.height) < 0.001
                    ? isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
                    : isDark ? 'bg-white/5 text-gray-400' : 'bg-black/5 text-gray-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <Toggle
              on={lockEyeLevel}
              onClick={toggleEyeLevelLock}
              path={lockEyeLevel ? I.levelLocked : I.levelFree}
              label="Level gaze"
              className="shrink-0 ml-1"
            />
          </div>
          <Dial
            icon={I.horizon}
            label="Eye level"
            reading={`${cameraHeight.toFixed(2)}m`}
            min={0.5}
            max={6}
            step={0.05}
            value={cameraHeight}
            onChange={setCameraHeight}
          />
        </div>

        {/* ------------------------------------------------------- the projection */}
        <div className={`${rowPad} border-b ${divider} space-y-2`}>
          <div className="flex items-center gap-1">
            <Toggle
              on={perspectiveMode === 'linear'}
              onClick={() => setPerspectiveMode('linear')}
              path={I.straight}
              label="Straight lines"
            />
            <Toggle
              on={perspectiveMode === 'curvilinear'}
              onClick={() => setPerspectiveMode('curvilinear')}
              path={I.curved}
              label="Curvilinear"
            />
          </div>
          <Dial
            icon={I.cone}
            label="Field of view"
            reading={`${Math.round(fov)}°`}
            min={25}
            max={360}
            step={1}
            value={fov}
            onChange={(v) => setLens(v)}
          />
          {perspectiveMode === 'curvilinear' && (
            <Dial
              icon={I.curved}
              label="Curvature"
              reading={distortion.toFixed(2)}
              min={0}
              max={3}
              step={0.01}
              value={distortion}
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
          <Toggle on={showFigure} onClick={toggleFigure} path={I.figure} label="Scale figure" className="flex-1" />
          <Toggle on={showCone} onClick={toggleCone} path={I.cone} label="Cone of vision" className="flex-1" />
          <Toggle on={cameraFeed} onClick={() => setCameraFeed(!cameraFeed)} path={I.camera} label="Camera feed" className="flex-1" />
          <Toggle on={matteModels} onClick={toggleMatte} path={I.matte} label="Matte white models" className="flex-1" />
        </div>

        {/* ---------------------------------------------------------------- the sun */}
        <div className={`${rowPad} border-b ${divider} space-y-2`}>
          <Dial
            icon={I.bearing}
            label="Sun bearing"
            reading={`${Math.round(sun.azimuth)}°`}
            min={0}
            max={360}
            step={1}
            value={sun.azimuth}
            onChange={(v) => setSun({ azimuth: v })}
          />
          <Dial
            icon={I.elevation}
            label="Sun height"
            reading={`${Math.round(sun.elevation)}°`}
            min={4}
            max={88}
            step={1}
            value={sun.elevation}
            onChange={(v) => setSun({ elevation: v })}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Dial
                icon={I.sun}
                label="Sun strength"
                reading={sun.intensity.toFixed(1)}
                min={0.2}
                max={8}
                step={0.1}
                value={sun.intensity}
                onChange={(v) => setSun({ intensity: v })}
              />
            </div>
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

    </div>
  );
};
