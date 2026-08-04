import React from 'react';
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
  children: React.ReactNode;
}> = ({ onClose, children }) => {
  const dark = useStore((s) => s.theme) === 'dark';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-lg safe-bottom pointer-events-none p-2">
        <div
          className={`flex flex-col rounded-[2rem] border backdrop-blur-2xl shadow-2xl pointer-events-auto overflow-hidden ${chrome(dark)}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center p-3">
            <div className="w-12 h-1.5 rounded-full opacity-20 bg-current" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
