import React, { useEffect } from 'react';
import { useStore } from '../store';
import { chrome } from './ui';

/**
 * A panel that comes up from the bottom edge.
 *
 * Both the mesh library and the scene library are this: a dimmed backdrop that
 * dismisses on tap, and a rounded sheet held clear of the home indicator. The
 * sheet swallows pointer events so the walk layer underneath - which owns every
 * gesture on the glass - does not read a scroll through it as a look-around.
 */
export const Sheet: React.FC<{
  onClose: () => void;
  /**
   * Only as wide as what is in it, and not clipping what leaves it.
   *
   * A library is a grid and wants the whole width. A row of knobs is a row of
   * knobs, and stretching the panel behind it to the edge of the screen does
   * not make it any easier to use - it just puts a large dark rectangle over
   * the thing the tool exists to show. Hugging also lets a knob's reading float
   * above the panel instead of being clipped by it, which is what the alternative
   * cost: forty pixels of empty headroom kept clear for a number that is only
   * there while a thumb is down.
   */
  hug?: boolean;
  children: React.ReactNode;
}> = ({ onClose, hug = false, children }) => {
  const dark = useStore((s) => s.theme) === 'dark';

  // On a desktop the way out of a panel is escape; there is no back gesture and
  // no visible close control to put a word on.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      // No wash over the scene: the panel is solid enough to separate itself,
      // and the point of the tool is the view behind it. This layer is here to
      // catch the tap that dismisses.
      className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto"
      onClick={onClose}
    >
      <div className={`${hug ? 'max-w-full' : 'w-full max-w-lg'} safe-bottom pointer-events-none p-2`}>
        <div
          className={`flex flex-col rounded-[2rem] border shadow-2xl pointer-events-auto ${
            hug ? '' : 'overflow-hidden'
          } ${chrome(dark)}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
        >
          <div className={`flex items-center justify-center ${hug ? 'pt-2 pb-1' : 'p-3'}`}>
            <div className="w-12 h-1.5 rounded-full opacity-20 bg-current" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
