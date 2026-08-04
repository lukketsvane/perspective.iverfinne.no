import React, { useEffect, useState } from 'react';

/**
 * The 60 degree cone of vision.
 *
 * Inside this circle a rectilinear projection matches what an eye actually
 * sees; outside it, squares stretch and spheres go oval - the classic
 * perspective-drawing error is placing the subject beyond it. Drawn from the
 * projection itself: at a focal length f (in pixels) an angle t lands at
 * f * tan(t), so the 60 degree cone is a circle of radius f * tan(30 degrees)
 * around the centre of the frame.
 *
 * Only meaningful for straight-line perspective; the curvilinear projection
 * bends the same angles somewhere else, so the caller hides it there.
 */
export const ConeOfVision: React.FC<{ fov: number; color: string }> = ({ fov, color }) => {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // three's fov is vertical, so the focal length comes off the frame height.
  const focal = size.height / 2 / Math.tan((fov * Math.PI) / 360);
  const radius = focal * Math.tan(Math.PI / 6);

  // Below 60 degrees the whole frame is already inside the cone.
  if (radius > Math.hypot(size.width, size.height) / 2) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      width={size.width}
      height={size.height}
    >
      <circle
        cx={size.width / 2}
        cy={size.height / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="6 6"
        opacity={0.5}
      />
    </svg>
  );
};
