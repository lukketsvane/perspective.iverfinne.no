import React from 'react';
import { useStore, EYE_LEVEL_PRESETS, SPAWN_PRESETS, FIGURE_HEIGHT } from '../store';
import { SpawnKind } from '../types';
import { openModelInAR, supportsQuickLook } from '../lib/ar';

const SPAWN_ORDER: SpawnKind[] = ['cube', 'slab', 'pillar', 'beam', 'block'];

/**
 * The practice controls.
 *
 * Everything in here is a deliberate departure from the defaults: the tool
 * opens as 1 m cubes seen in straight-line perspective from a standing eye
 * level, and stays that way until something here is touched.
 */
export const PracticePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
  const models = useStore((s) => s.models);
  const removeModel = useStore((s) => s.removeModel);
  const selectedModelId = useStore((s) => s.selectedModelId);
  const selectModel = useStore((s) => s.selectModel);
  const quickLook = supportsQuickLook();

  const isDark = theme === 'dark';
  const panel = isDark ? 'bg-[#1a1a1a]/95 border-gray-700' : 'bg-white/95 border-gray-200';
  const label = isDark ? 'text-gray-500' : 'text-gray-400';
  const value = isDark ? 'text-white' : 'text-gray-900';
  const divider = isDark ? 'border-gray-800' : 'border-gray-100';

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
      active
        ? isDark
          ? 'bg-white text-black'
          : 'bg-gray-900 text-white'
        : isDark
        ? 'bg-white/5 text-gray-400 hover:bg-white/10'
        : 'bg-black/5 text-gray-500 hover:bg-black/10'
    }`;

  const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className={`px-4 py-3 border-b ${divider}`}>
      <div className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-2 ${label}`}>{title}</div>
      {children}
    </div>
  );

  return (
    <div
      className={`h-full rounded-xl shadow-2xl border backdrop-blur-md overflow-hidden flex flex-col ${panel}`}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
        <span className={`text-xs font-bold uppercase tracking-widest ${value}`}>Practice</span>
        <button
          onClick={onClose}
          className={`p-1 rounded-md transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ---------------------------------------------------------------- */}
        <Row title={`Eye level — ${cameraHeight.toFixed(2)} m from ground`}>
          <div className="flex gap-1 mb-2">
            {EYE_LEVEL_PRESETS.map((preset) => (
              <button
                key={preset.height}
                onClick={() => setCameraHeight(preset.height)}
                title={preset.note}
                className={`${chip(Math.abs(cameraHeight - preset.height) < 0.001)} flex-1`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0.5}
            max={6}
            step={0.05}
            value={cameraHeight}
            onChange={(e) => setCameraHeight(parseFloat(e.target.value))}
            className="w-full accent-current"
          />
          <button
            onClick={toggleEyeLevelLock}
            className={`mt-2 w-full ${chip(lockEyeLevel)} !text-[9px]`}
          >
            {lockEyeLevel ? 'Level gaze — 2 point' : 'Free orbit — 3 point'}
          </button>
          <p className={`mt-2 text-[9px] leading-tight ${label}`}>
            Locked, the camera keeps a horizontal line of sight at this height, so verticals stay
            vertical and the horizon sits on your eye level.
          </p>
        </Row>

        {/* ---------------------------------------------------------------- */}
        <Row title="Projection">
          <div className="flex gap-1">
            <button
              onClick={() => setPerspectiveMode('linear')}
              className={`${chip(perspectiveMode === 'linear')} flex-1`}
            >
              Straight
            </button>
            <button
              onClick={() => setPerspectiveMode('curvilinear')}
              className={`${chip(perspectiveMode === 'curvilinear')} flex-1`}
            >
              Curvilinear
            </button>
          </div>

          {perspectiveMode === 'curvilinear' && (
            <div className="mt-2">
              <div className={`flex justify-between text-[9px] uppercase tracking-wider ${label}`}>
                <span>Curvature</span>
                <span className={value}>{distortion.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={distortion}
                onChange={(e) => setLens(fov, parseFloat(e.target.value))}
                className="w-full accent-current"
              />
            </div>
          )}

          <div className="mt-2">
            <div className={`flex justify-between text-[9px] uppercase tracking-wider ${label}`}>
              <span>Field of view</span>
              <span className={value}>{Math.round(fov)}°</span>
            </div>
            <input
              type="range"
              min={25}
              max={120}
              step={1}
              value={fov}
              onChange={(e) => setLens(parseFloat(e.target.value))}
              className="w-full accent-current"
            />
            <p className={`mt-1 text-[9px] leading-tight ${label}`}>
              60° is the cone of vision — past roughly 90° the edges stretch, which is where
              curvilinear starts to pay off.
            </p>
          </div>
        </Row>

        {/* ---------------------------------------------------------------- */}
        <Row title="Primitive">
          <div className="flex flex-wrap gap-1">
            {SPAWN_ORDER.map((kind) => (
              <button key={kind} onClick={() => setSpawnKind(kind)} className={chip(spawnKind === kind)}>
                {SPAWN_PRESETS[kind].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <button onClick={() => setSnapStep(snapStep > 0 ? 0 : 0.25)} className={`${chip(snapStep > 0)} flex-1`}>
              {snapStep > 0 ? `Snap ${snapStep} m` : 'Free size'}
            </button>
          </div>
          <p className={`mt-2 text-[9px] leading-tight ${label}`}>
            Double-tap the ground to place one. Cubes are 1 × 1 × 1 m and land grid-aligned, so they
            share the scene's vanishing points. Drag a face to push or pull it, and turn a selected
            box with R (shift+R the other way) to give it its own vanishing points.
          </p>
        </Row>

        {/* ---------------------------------------------------------------- */}
        <Row title="Reference">
          <div className="flex gap-1">
            <button onClick={toggleGuides} className={`${chip(showGuides)} flex-1`}>
              Horizon
            </button>
            <button onClick={toggleFigure} className={`${chip(showFigure)} flex-1`}>
              {FIGURE_HEIGHT.toFixed(2)} m
            </button>
          </div>
          <div className="flex gap-1 mt-1">
            <button onClick={toggleCone} className={`${chip(showCone)} flex-1`} title="The 60° cone of vision">
              60° cone
            </button>
            <button onClick={() => setCameraFeed(!cameraFeed)} className={`${chip(cameraFeed)} flex-1`}>
              Camera {cameraFeed ? 'on' : 'off'}
            </button>
          </div>
          <p className={`mt-2 text-[9px] leading-tight ${label}`}>
            Horizon line and 1 m ground grid, and a {FIGURE_HEIGHT.toFixed(2)} m figure to size the
            cubes against. The camera feed puts the grid over the floor you are standing on.
          </p>
        </Row>

        {/* ---------------------------------------------------------------- */}
        {models.length > 0 && (
          <Row title="Models">
            <div className="space-y-1">
              {models.map((model) => (
                <div
                  key={model.id}
                  onClick={() => model.previewSupported && selectModel(model.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                    selectedModelId === model.id
                      ? isDark ? 'bg-white/10' : 'bg-black/10'
                      : isDark ? 'bg-white/5' : 'bg-black/5'
                  } ${model.previewSupported ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-bold truncate ${value}`}>{model.name}</div>
                    <div className={`text-[9px] tabular-nums ${label}`}>
                      {model.previewSupported
                        ? `${model.size.map((v) => v.toFixed(2)).join(' × ')} m`
                        : 'AR only — binary USDZ'}
                    </div>
                  </div>
                  {quickLook && model.format === 'usdz' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openModelInAR(model); }}
                      className={chip(false)}
                      title="Open this file in AR Quick Look"
                    >
                      AR
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeModel(model.id); }}
                    className={`shrink-0 p-1 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    aria-label={`Remove ${model.name}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <p className={`mt-2 text-[9px] leading-tight ${label}`}>
              Models keep their real size. Tap one to select it, then drag to slide it along the
              floor.
            </p>
          </Row>
        )}
      </div>

      <div className={`px-4 py-3 border-t ${divider}`}>
        <button
          onClick={() => {
            if (window.confirm('Reset to the default cube study?')) resetScene();
          }}
          className={`w-full ${chip(false)} !py-1.5`}
        >
          Reset to cubes
        </button>
      </div>
    </div>
  );
};
