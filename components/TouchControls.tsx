import React, { useState } from 'react';
import { useStore } from '../store';

interface TouchControlsProps {
  variant: 'bar' | 'rail';
  onMeshes: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onWalk: () => void;
  onAdd: () => void;
  onSetup: () => void;
  onCapture: () => void;
  onShare: () => void;
  onPrompt: () => void;
  onHistory: () => void;
  setupOpen: boolean;
}

/**
 * The touch controls, in two arrangements.
 *
 * A phone gets a bar across the bottom, because that is where the thumbs are
 * and there is no room anywhere else. A tablet gets the same targets, the same
 * size, gathered into a rail down the right edge - spreading five icons across
 * 1200 px of bar puts them nowhere near each other or the hand holding the
 * thing, and eats the width the scene wants. The rail is the same tap targets
 * in a quarter of the footprint.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  variant, onMeshes, onUndo, canUndo, onWalk, onAdd, onSetup, onCapture, onShare, onPrompt, onHistory, setupOpen,
}) => {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const [moreOpen, setMoreOpen] = useState(false);

  const isDark = theme === 'dark';
  const onCameraBg = cameraFeed || isDark;
  const shell = onCameraBg
    ? 'bg-black/70 border-white/15 text-white'
    : 'bg-white/85 border-gray-200 text-gray-900';

  const rail = variant === 'rail';
  const item = 'flex items-center justify-center w-14 h-14 rounded-2xl transition-transform active:scale-95';
  const label = 'text-[9px] font-bold uppercase tracking-wider opacity-60';

  const icon = (paths: React.ReactNode, className = 'w-6 h-6') => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {paths}
    </svg>
  );

  const more: { label: string; run: () => void; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      label: 'Undo', run: onUndo, disabled: !canUndo,
      icon: (<><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.2-9.3L3 7" /></>),
    },
    {
      label: 'Save view', run: onCapture,
      icon: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
    },
    {
      label: 'Send link', run: onShare,
      icon: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /></>),
    },
    {
      label: 'Describe', run: onPrompt,
      icon: (<><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></>),
    },
    {
      label: 'Scenes', run: onHistory,
      icon: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
    },
    {
      label: isDark ? 'Light' : 'Dark', run: toggleTheme,
      icon: isDark
        ? (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>)
        : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
    },
  ];

  const primary = (
    <button
      onClick={onMeshes}
      className={`flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-transform active:scale-95 ${
        rail ? '' : '-mt-5'
      } ${onCameraBg ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
      aria-label="Meshes"
    >
      {icon(<><circle cx="12" cy="4.5" r="2" /><path d="M12 7v6M12 13l-3 6M12 13l3 6M8 9.5h8" /></>, 'w-7 h-7')}
    </button>
  );

  const buttons = (
    <>
      <button onClick={onAdd} className={item} aria-label="Add cube">
        {icon(<>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </>)}
      </button>

      <button onClick={onWalk} className={item} aria-label="Walk">
        {icon(<><circle cx="12" cy="4.5" r="1.8" /><path d="M12 7v6M12 13l-2.5 5M12 13l2.5 5M8.5 9.5h7" /></>)}
      </button>

      {primary}

      <button onClick={onSetup} className={`${item} ${setupOpen ? 'opacity-100' : ''}`} aria-label="Setup">
        {icon(<>
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="4" y1="17" x2="20" y2="20" />
          <line x1="4" y1="7" x2="20" y2="4" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </>)}
      </button>

      <button onClick={() => setMoreOpen(!moreOpen)} className={item} aria-label="More">
        {icon(<>
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </>)}
      </button>
    </>
  );

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMoreOpen(false)}>
          <div
            className={`absolute rounded-3xl border backdrop-blur-xl shadow-2xl p-2 grid gap-1 ${shell} ${
              rail
                ? 'right-24 top-1/2 -translate-y-1/2 grid-cols-2 w-64'
                : 'left-3 right-3 bottom-28 grid-cols-3'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {more.map((entry) => (
              <button
                key={entry.label}
                onClick={() => { setMoreOpen(false); entry.run(); }}
                disabled={entry.disabled}
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-transform active:scale-95 disabled:opacity-30"
              >
                {icon(entry.icon, 'w-5 h-5')}
                <span className={label}>{entry.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rail ? (
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
      )}
    </>
  );
};
