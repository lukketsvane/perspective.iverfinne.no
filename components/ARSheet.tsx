import React, { useState } from 'react';
import { useStore } from '../store';
import { AR_SCALES, ARScale, isIOS, sceneFootprint, supportsQuickLook, walkSceneInAR } from '../lib/ar';
import { shareScene } from '../lib/share';

/**
 * The AR launcher.
 *
 * On an iPhone this is the shortest path in the app: pick a scale, tap once,
 * and stand in the study. Off iOS it explains where AR lives and hands over the
 * link, because composing on a laptop and viewing on a phone is the normal way
 * this gets used.
 */
export const ARSheet: React.FC<{ onClose: () => void; onNotice: (message: string) => void }> = ({
  onClose,
  onNotice,
}) => {
  const theme = useStore((s) => s.theme);
  const boxes = useStore((s) => s.boxes);
  const models = useStore((s) => s.models);
  const setViewMode = useStore((s) => s.setViewMode);

  const [scale, setScale] = useState<ARScale>('room');
  const [busy, setBusy] = useState(false);

  const isDark = theme === 'dark';
  const quickLook = supportsQuickLook();
  const footprint = sceneFootprint(boxes, models);
  const tooBigForRoom = footprint > 8;

  const panel = isDark ? 'bg-[#141416] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const muted = isDark ? 'text-gray-500' : 'text-gray-400';

  const option = (active: boolean) =>
    `flex-1 text-left px-3 py-2.5 rounded-xl border transition-colors ${
      active
        ? isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900'
        : isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400'
    }`;

  const launch = async () => {
    setBusy(true);
    try {
      await walkSceneInAR(boxes, models, scale);
      onClose();
    } catch (error) {
      console.error(error);
      onNotice('Could not build the AR scene.');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const result = await shareScene(boxes);
    onNotice(
      result === 'copied'
        ? 'Link copied — open it on your iPhone and tap AR.'
        : result === 'shared'
        ? 'Link shared.'
        : 'Could not copy the link.'
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border shadow-2xl safe-bottom ${panel}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <div className="text-sm font-black uppercase tracking-widest">View in AR</div>
            <div className={`text-[10px] uppercase tracking-widest ${muted}`}>
              {boxes.length} boxes · {footprint.toFixed(1)} m across
            </div>
          </div>
          <button onClick={onClose} className={`p-2 -mr-2 ${muted}`} aria-label="Close">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {quickLook ? (
          <div className="px-5 pb-5">
            <div className="flex gap-2">
              {AR_SCALES.map((entry) => (
                <button key={entry.id} onClick={() => setScale(entry.id)} className={option(scale === entry.id)}>
                  <div className="text-xs font-bold uppercase tracking-widest">{entry.label}</div>
                  <div className="text-[10px] opacity-70 leading-tight mt-0.5">{entry.note}</div>
                </button>
              ))}
            </div>

            {tooBigForRoom && scale === 'room' && (
              <p className={`mt-3 text-[10px] leading-snug ${muted}`}>
                This study is {footprint.toFixed(1)} m across, so at 1:1 it will run through the walls.
                That is fine to walk into — or drop to tabletop to see all of it at once.
              </p>
            )}

            <button
              onClick={launch}
              disabled={busy}
              className={`mt-4 w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-transform active:scale-[0.98] disabled:opacity-50 ${
                isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
              }`}
            >
              {busy ? 'Building…' : 'Open in AR'}
            </button>

            <p className={`mt-3 text-[10px] leading-snug ${muted}`}>
              Point the phone at the floor and let it find the plane. The study is locked at true
              scale — a 1 m cube is one metre — so it cannot be pinched bigger or smaller.
            </p>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <p className="text-[11px] leading-snug">
              AR runs through Quick Look, which is {isIOS() ? 'not available in this browser' : 'an iPhone and iPad feature'}.
              {isIOS() ? ' Open the page in Safari.' : ' Send this study to your phone and tap AR there.'}
            </p>

            <button
              onClick={share}
              className={`mt-4 w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-transform active:scale-[0.98] ${
                isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'
              }`}
            >
              Send to phone
            </button>

            <button
              onClick={() => { onClose(); setViewMode('walk'); }}
              className={`mt-2 w-full py-3 rounded-2xl border text-xs font-bold uppercase tracking-widest ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              Walk it here instead
            </button>

            <p className={`mt-3 text-[10px] leading-snug ${muted}`}>
              The link carries the study itself, so whatever you have built here opens there.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
