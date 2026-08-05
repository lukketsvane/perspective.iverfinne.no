import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { tile } from './ui';
import type { PerspectiveMode } from '../types';

/**
 * Every way of projecting the world, as a wall of tiles.
 *
 * There are a dozen of them now, and a button that steps to the next one means
 * eleven taps to get back to where you were. They are not a sequence anyway -
 * a straight-line view and a world turned inside out are not neighbours - so
 * they are laid out and picked.
 *
 * Each glyph is the thing itself: a road running to a point, a road bowed, a
 * ball of ground, a spiral.
 */
export const PROJECTIONS: { mode: PerspectiveMode; icon: React.ReactNode; name: string }[] = [
  { mode: 'linear', icon: I.straight, name: 'Straight lines' },
  { mode: 'equidistant', icon: I.curved, name: 'Curvilinear' },
  { mode: '5-point', icon: I.cone, name: 'Five point' },
  { mode: 'stereographic', icon: I.stereographic, name: 'Fisheye' },
  { mode: 'cylindrical', icon: I.cylindrical, name: 'Panorama' },
  { mode: 'mercator', icon: I.mercator, name: 'Mercator' },
  { mode: 'hyperbolic', icon: I.hyperbolic, name: 'Hyperbolic' },
  { mode: 'mirror-ball', icon: I.mirrorBall, name: 'Mirror ball' },
  { mode: 'little-planet', icon: I.littlePlanet, name: 'Little planet' },
  { mode: 'inversion', icon: I.inversion, name: 'Inside out' },
  { mode: 'vortex', icon: I.vortex, name: 'Vortex' },
  { mode: '720-noneuclidean', icon: I.sevenTwenty, name: 'Seven twenty' },
];

export const ProjectionSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const current = useStore((s) => s.perspectiveMode);
  const setPerspectiveMode = useStore((s) => s.setPerspectiveMode);

  return (
    <Sheet onClose={onClose}>
      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
        {PROJECTIONS.map(({ mode, icon, name }) => (
          <button
            key={mode}
            onClick={() => {
              setPerspectiveMode(mode);
              onClose();
            }}
            aria-label={name}
            className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-95 ${tile(dark)} ${
              mode === current ? 'ring-2 ring-sky-500' : ''
            }`}
          >
            <Icon path={icon} className="w-7 h-7" />
          </button>
        ))}
      </div>
    </Sheet>
  );
};
