import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { isIOS } from '../lib/ar';

const DISMISSED_KEY = 'kjg-perspective-install-tip';

/**
 * A one-time nudge to install, on iOS only.
 *
 * Safari never fires an install prompt, so the Home Screen route has to be
 * described rather than offered. It is worth describing: installed, the page
 * runs full screen without the browser chrome eating the bottom of the view,
 * which is where the controls live.
 *
 * Shown once, on iOS Safari, when the page is not already standalone, and only
 * after a moment - nobody wants housekeeping in the first second.
 */
export const InstallTip: React.FC = () => {
  const theme = useStore((s) => s.theme);
  const cameraFeed = useStore((s) => s.cameraFeed);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      dismissed = true; // no storage, no nagging
    }

    if (!isIOS() || standalone || dismissed) return;
    const timer = window.setTimeout(() => setVisible(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* nothing to remember it with */
    }
  };

  if (!visible) return null;

  const isDark = theme === 'dark' || cameraFeed;
  const shell = isDark
    ? 'bg-black/80 border-white/15 text-white'
    : 'bg-white/90 border-gray-200 text-gray-900';

  return (
    <div className="fixed inset-x-0 bottom-24 z-[58] px-4 flex justify-center pointer-events-none md:hidden">
      <div className={`flex items-center gap-3 max-w-sm px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-lg pointer-events-auto ${shell}`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V4" />
          <polyline points="8 8 12 4 16 8" />
          <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
        </svg>
        <p className="text-[11px] leading-snug flex-1">
          Share → <strong>Add to Home Screen</strong> to run it full screen, with AR one tap from
          the icon.
        </p>
        <button onClick={dismiss} className="shrink-0 opacity-60" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
