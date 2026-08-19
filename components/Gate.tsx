import React from 'react';
import { useStore } from '../store';
import { gateFit } from '../lib/projection';

/**
 * The frame a lens composes into.
 *
 * A camera does not show you what is outside the gate, and that is not a
 * limitation - it is the whole of what framing IS. The edge of the picture is
 * the most important line in it: every decision about where a thing sits, what
 * is cut and what is let in, is a decision against that edge. A screen has an
 * edge of its own and it is the wrong one, and it changes shape when the phone
 * turns.
 *
 * So while a lens is on, the picture is the gate and the rest of the glass is
 * put out of the way. Two things had to be got right about how:
 *
 * NOT BLACK BARS. A drawing tool is not a video player. What is outside the
 * frame is still the scene, and being able to see it - dimly - is what tells
 * you what you are about to lose by moving in, which is the decision the gate
 * exists to make. So it is a wash of the PAGE's own tone at three quarters,
 * which reads as matting rather than as absence, and the scene goes on moving
 * underneath it.
 *
 * AND THE EDGE IS A HAIRLINE, not a border. A thick frame is chrome; a single
 * pixel of the ink the construction is ruled in is a crop mark, which is what
 * this is. It sits on the same side of the fence as the horizon and the
 * vanishing points - part of the drawing's own apparatus rather than part of
 * the app around it.
 *
 * It draws nothing at all when the two rectangles are the same, which happens
 * on any screen whose shape matches the gate: a mask with no width is a
 * hairline across the middle of nowhere.
 */
export const Gate: React.FC<{ ink: string }> = ({ ink }) => {
  const on = useStore((state) => state.camera.on);
  const shape = useStore((state) => state.camera.gate);
  const backdrop = useStore((state) => state.backdrop);
  const backgroundGray = useStore((state) => state.backgroundGray);

  const [frame, setFrame] = React.useState(() =>
    typeof window === 'undefined'
      ? { width: 390, height: 844 }
      : { width: window.innerWidth, height: window.innerHeight }
  );

  React.useEffect(() => {
    const measure = () => setFrame({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  if (!on) return null;

  const fitted = gateFit(shape, frame.width, frame.height);
  const across = (frame.width - fitted.width) / 2;
  const down = (frame.height - fitted.height) / 2;
  // Under a pixel of matting either way is a screen the gate already fits.
  if (across < 1 && down < 1) return null;

  // The page's own tone, so the matting is the mount the drawing is on rather
  // than a colour the app chose.
  const tone = backdrop === 'paper' ? backgroundGray : backdrop;
  const mat = `rgba(${tone}, ${tone}, ${tone}, 0.82)`;

  const bar = 'absolute pointer-events-none';
  return (
    <div className="fixed inset-0 z-30 pointer-events-none" aria-hidden>
      {down >= 1 && (
        <>
          <div className={bar} style={{ left: 0, right: 0, top: 0, height: down, background: mat }} />
          <div className={bar} style={{ left: 0, right: 0, bottom: 0, height: down, background: mat }} />
        </>
      )}
      {across >= 1 && (
        <>
          <div className={bar} style={{ top: down, bottom: down, left: 0, width: across, background: mat }} />
          <div className={bar} style={{ top: down, bottom: down, right: 0, width: across, background: mat }} />
        </>
      )}
      <div
        className={bar}
        style={{
          left: across,
          top: down,
          width: fitted.width,
          height: fitted.height,
          boxShadow: `inset 0 0 0 1px ${ink}`,
          opacity: 0.55,
        }}
      />
    </div>
  );
};
