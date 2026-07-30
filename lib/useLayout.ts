import { useEffect, useState } from 'react';

/**
 * Which of three shapes the interface should take.
 *
 * A tablet is not a big phone and not a touchless desktop, and treating it as
 * either produces the two failure modes this app has had: five icons flung to
 * the far corners of a 1200 px bar, or a rail of 20 px targets meant for a
 * mouse. What separates them is the pointer *and* the size - fingers on a large
 * screen want big targets arranged compactly, with the canvas left alone.
 */
export type Layout = 'phone' | 'tablet' | 'desktop';

const COARSE = '(pointer: coarse)';

/** Shortest edge at or above which a touch screen counts as a tablet. */
const TABLET_MIN_EDGE = 600;

const evaluate = (): Layout => {
  if (typeof window === 'undefined') return 'desktop';

  const coarse = window.matchMedia?.(COARSE).matches ?? false;
  const narrow = window.innerWidth < 768;
  if (!coarse && !narrow) return 'desktop';

  // A phone in landscape is wide but short; the short edge is what gives it
  // away, and it wants the thumb bar either way.
  const shortEdge = Math.min(window.innerWidth, window.innerHeight);
  return shortEdge >= TABLET_MIN_EDGE ? 'tablet' : 'phone';
};

export const useLayout = (): Layout => {
  const [layout, setLayout] = useState<Layout>(evaluate);

  useEffect(() => {
    const update = () => setLayout(evaluate());
    const media = window.matchMedia?.(COARSE);
    media?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      media?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return layout;
};

/** True for anything driven by fingers - phone or tablet. */
export const useTouchLayout = (): boolean => useLayout() !== 'desktop';
