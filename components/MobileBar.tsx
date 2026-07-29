import React, { useState } from 'react';
import { useStore } from '../store';

interface MobileBarProps {
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
 * The phone's controls.
 *
 * A column of nine 20 px icons is a mouse pattern; a thumb wants a handful of
 * big targets along the bottom edge, and no words on any of them.
 */
export const MobileBar: React.FC<MobileBarProps> = ({
  onMeshes, onUndo, canUndo, onWalk, onAdd, onSetup, onCapture, onShare, onPrompt, onHistory, setupOpen,
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

  const item = 'flex items-center justify-center w-14 h-14 rounded-2xl transition-transform active:scale-95';
  const label = 'text-[8px] font-bold uppercase tracking-wider opacity-60';

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
      label: 'History', run: onHistory,
      icon: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
    },
    {
      label: isDark ? 'Light' : 'Dark', run: toggleTheme,
      icon: isDark
        ? (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>)
        : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
    },
  ];

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMoreOpen(false)}>
          <div
            className={`absolute left-3 right-3 bottom-28 rounded-3xl border backdrop-blur-xl shadow-2xl p-2 grid grid-cols-3 gap-1 ${shell}`}
            onClick={(e) => e.stopPropagation()}
          >
            {more.map((entry) => (
              <button
                key={entry.label}
                onClick={() => { setMoreOpen(false); entry.run(); }}
                disabled={entry.disabled}
                className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-transform active:scale-95 disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  {entry.icon}
                </svg>
                <span className={label}>{entry.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-[56] safe-bottom px-3 pb-3 pointer-events-none">
        <div className={`flex items-center justify-between px-2 py-1.5 rounded-3xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}>
          <button onClick={onAdd} className={item} aria-label="Add cube">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>

          <button onClick={onWalk} className={item} aria-label="Walk">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="4.5" r="1.8" />
              <path d="M12 7v6M12 13l-2.5 5M12 13l2.5 5M8.5 9.5h7" />
            </svg>
          </button>

          {/* Figures and imported meshes */}
          <button
            onClick={onMeshes}
            className={`flex items-center justify-center w-16 h-16 -mt-5 rounded-full shadow-xl transition-transform active:scale-95 ${
              isDark || cameraFeed ? 'bg-white text-black' : 'bg-gray-900 text-white'
            }`}
            aria-label="Meshes"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="4.5" r="2" />
              <path d="M12 7v6M12 13l-3 6M12 13l3 6M8 9.5h8" />
            </svg>
          </button>

          <button onClick={onSetup} className={`${item} ${setupOpen ? 'opacity-100' : ''}`} aria-label="Setup">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4" y1="17" x2="20" y2="20" />
              <line x1="4" y1="7" x2="20" y2="4" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          </button>

          <button onClick={() => setMoreOpen(!moreOpen)} className={item} aria-label="More">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="5" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="19" cy="12" r="1.6" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};
