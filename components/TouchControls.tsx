import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';

interface TouchControlsProps {
  variant: 'bar' | 'rail';
  onMeshes: () => void;
  onWalk: () => void;
  onAdd: () => void;
  onSetup: () => void;
  setupOpen: boolean;
}

/**
 * The touch controls, in two arrangements.
 *
 * Five things, and no menu behind them. There used to be an overflow popover
 * holding undo, save-a-PNG, share-a-link, describe-a-scene and saved scenes -
 * five features that are not what you reach for while drawing, sitting behind
 * a tap that hid the scene to show them. They are gone; the button that opened
 * them is the light/dark switch now, which is the one thing in there you touch
 * while working.
 *
 * A phone gets a bar across the bottom, because that is where the thumbs are.
 * A tablet gets the same targets, the same size, gathered into a rail down the
 * right edge - spreading five icons across 1200 px of bar puts them nowhere
 * near the hand holding the thing, and eats the width the scene wants.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  variant, onMeshes, onWalk, onAdd, onSetup, setupOpen,
}) => {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const cameraFeed = useStore((s) => s.cameraFeed);

  const isDark = theme === 'dark';
  const onCameraBg = cameraFeed || isDark;
  const shell = onCameraBg
    ? 'bg-black/70 border-white/15 text-white'
    : 'bg-white/85 border-gray-200 text-gray-900';

  const rail = variant === 'rail';
  const item = 'flex items-center justify-center w-14 h-14 rounded-2xl transition-transform active:scale-95';

  const buttons = (
    <>
      <button onClick={onAdd} className={item} aria-label="Add cube">
        <Icon path={I.cube} className="w-6 h-6" />
      </button>

      <button onClick={onWalk} className={item} aria-label="Walk">
        <Icon path={I.figure} className="w-6 h-6" />
      </button>

      <button
        onClick={onMeshes}
        className={`flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-transform active:scale-95 ${
          rail ? '' : '-mt-5'
        } ${onCameraBg ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
        aria-label="Meshes"
      >
        <Icon path={I.figure} className="w-7 h-7" />
      </button>

      <button onClick={onSetup} className={item} aria-label="Setup" aria-pressed={setupOpen}>
        <Icon path={I.sliders} className="w-6 h-6" />
      </button>

      <button onClick={toggleTheme} className={item} aria-label={isDark ? 'Light' : 'Dark'}>
        <Icon path={isDark ? I.light : I.dark} className="w-6 h-6" />
      </button>
    </>
  );

  return rail ? (
    <div className="fixed inset-y-0 right-0 z-[56] safe-x flex items-center pr-3 pointer-events-none">
      <div className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-3xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}>
        {buttons}
      </div>
    </div>
  ) : (
    <div className="fixed inset-x-0 bottom-0 z-[56] safe-bottom px-3 pb-3 pointer-events-none">
      <div className={`flex items-center justify-between px-2 py-1.5 rounded-3xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}>
        {buttons}
      </div>
    </div>
  );
};
