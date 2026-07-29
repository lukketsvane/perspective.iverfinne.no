import { useEffect, useState } from 'react';

/**
 * Whether to lay the app out for a thumb.
 *
 * Width alone gets this wrong in both directions: a phone turned sideways is
 * 844 px across and was being handed the mouse-sized rail, and an iPad in
 * portrait sits exactly on the breakpoint. What actually decides the layout is
 * the input - a coarse pointer means fingers, whatever the viewport is doing -
 * with narrow screens still counting as touch so a small window behaves.
 */
const query = '(pointer: coarse)';

const evaluate = () => {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.(query).matches ?? false;
  return coarse || window.innerWidth < 768;
};

export const useTouchLayout = (): boolean => {
  const [touch, setTouch] = useState(evaluate);

  useEffect(() => {
    const update = () => setTouch(evaluate());
    const media = window.matchMedia?.(query);
    media?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      media?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return touch;
};
