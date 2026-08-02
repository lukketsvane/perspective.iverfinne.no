import React from 'react';

/**
 * The icon set.
 *
 * Every control in the panel is one of these. A label under a button is a
 * label you read once and then never again, and there is no room for eight of
 * them on a phone - the shape has to carry the meaning.
 */
export const Icon: React.FC<{ path: React.ReactNode; className?: string }> = ({
  path,
  className = 'w-[18px] h-[18px]',
}) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

export const I = {
  close: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  chevron: (<polyline points="6 9 12 15 18 9" />),

  /** A drill: pages with a ruled line. */
  study: (<><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></>),

  /** Level gaze: a horizon with a padlock. */
  levelLocked: (<><line x1="2" y1="14" x2="22" y2="14" /><rect x="9" y="5" width="6" height="5" rx="1" /><path d="M10.5 5V3.8a1.5 1.5 0 0 1 3 0V5" /></>),
  levelFree: (<><line x1="2" y1="14" x2="22" y2="14" /><rect x="9" y="5" width="6" height="5" rx="1" /><path d="M10.5 5V3.8a1.5 1.5 0 0 1 2.8-.7" /></>),

  /**
   * A road running to a vanishing point on the horizon, ruled straight; and the
   * same road with its edges bowed, which is the whole of the difference
   * between the two projections.
   */
  straight: (<><line x1="2" y1="10" x2="22" y2="10" strokeOpacity="0.45" /><path d="M2 21L12 10M22 21L12 10" /><circle cx="12" cy="10" r="1.3" fill="currentColor" stroke="none" /></>),
  curved: (<><path d="M2 12c4-1.6 16-1.6 20 0" strokeOpacity="0.45" /><path d="M2 21C5 15 8 12 12 10.7M22 21c-3-6-6-9-10-10.3" /><circle cx="12" cy="10.5" r="1.3" fill="currentColor" stroke="none" /></>),

  /** The five primitives, drawn at their own proportions. */
  cube: (<><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" /></>),
  slab: (<><path d="M12 8l8 3.2-8 3.2-8-3.2z" /><path d="M4 11.2v2.4l8 3.2 8-3.2v-2.4" /></>),
  pillar: (<><path d="M12 2l4 2v16l-4 2-4-2V4z" /><path d="M8 4l4 2 4-2M12 6v18" /></>),
  beam: (<><path d="M2 12l6-3 14 2.4-6 3z" /><path d="M2 12v2.6l14 2.4v-2.6" /></>),
  block: (<><path d="M12 4l7 3v8l-7 3-7-3V7z" /><path d="M5 7l7 3 7-3M12 10v8" /></>),

  /** Snap to the grid. */
  snap: (<><path d="M4 9h16M4 15h16M9 4v16M15 4v16" /><circle cx="9" cy="15" r="1.6" fill="currentColor" stroke="none" /></>),

  /**
   * A body, not a stick. The library button and the scale-figure toggle both
   * used the same four-line stick man the scene itself draws, which read as a
   * diagram of a diagram.
   */
  person: (<><circle cx="12" cy="6.4" r="3.4" fill="currentColor" stroke="none" /><path d="M4.8 21c0-3.9 3.2-7.1 7.2-7.1s7.2 3.2 7.2 7.1z" fill="currentColor" stroke="none" /></>),

  /**
   * Stepping into the scene. Footprints and a walking figure both came out as
   * marks you had to squint at; an arrow going through a doorway does not.
   */
  walk: (<><path d="M14 3.6H19a1.4 1.4 0 0 1 1.4 1.4v14a1.4 1.4 0 0 1-1.4 1.4h-5" /><path d="M3.6 12h9.8" /><polyline points="9.6 8.2 13.4 12 9.6 15.8" /></>),

  /** Horizon line, scale figure, cone of vision. */
  horizon: (<><line x1="2" y1="12" x2="22" y2="12" /><path d="M4 19l7-5M20 19l-7-5" strokeOpacity="0.45" /></>),
  figure: (<><circle cx="12" cy="4.5" r="1.9" /><path d="M12 7v6M12 13l-2.5 5M12 13l2.5 5M8.5 9.5h7" /><path d="M3 21h18" strokeOpacity="0.4" /></>),
  cone: (<><path d="M12 3L4 20h16z" /><path d="M6.5 14h11" strokeOpacity="0.45" /></>),
  /** The sun, its bearing, its height, and the shadows it throws. */
  sun: (<><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.4M12 19.6V22M3.5 12H1.1M22.9 12h-2.4M5.6 5.6L3.9 3.9M20.1 20.1l-1.7-1.7M18.4 5.6l1.7-1.7M3.9 20.1l1.7-1.7" /></>),
  bearing: (<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5.2-5.2 2 2-5.2z" /></>),
  elevation: (<><path d="M2 19h20" /><circle cx="12" cy="10" r="3.4" /><path d="M12 3.5v2M5.6 6.4l1.4 1.4M18.4 6.4L17 7.8" /></>),
  shadow: (<><circle cx="9" cy="8" r="3.4" /><path d="M12.5 10.5L21 19H8" /></>),

  /** Plain white in place of the file's own materials. */
  matte: (<path d="M12 3s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10z" />),

  reset: (<><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.2-9.3L3 7" /></>),

  /** Fine adjustment, one step at a time. */
  minus: (<line x1="5" y1="12" x2="19" y2="12" />),
  plus: (<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>),

  /** Turn on the spot, and make two of it. */
  turnLeft: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" /></>),
  turnRight: (<><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 4 21 9 16 9" /></>),
  duplicate: (<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>),

  /** The setup panel, and the light/dark switch. */
  sliders: (<><line x1="2" y1="12" x2="22" y2="12" /><line x1="4" y1="17" x2="20" y2="20" /><line x1="4" y1="7" x2="20" y2="4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>),
  light: (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>),
  dark: (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),

  save: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
  trash: (<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />),
  upload: (<><path d="M12 16V4" /><polyline points="8 8 12 4 16 8" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>),
};

/**
 * What the body in a library figure is doing, drawn on the ground line.
 *
 * Thirty tiles all carrying the same stick figure is thirty tiles you have to
 * try one by one. The pose is the one thing about a figure worth knowing before
 * you place it, and it draws in five strokes.
 */
const GROUND = <path d="M3 20.4h18" strokeOpacity="0.3" />;

export const POSE_ICON: Record<string, React.ReactNode> = {
  /** Upright: head over hips over heels. */
  stand: (<><circle cx="12" cy="4" r="1.8" /><path d="M12 6.2v6.6M12 12.8l-2 7.4M12 12.8l2 7.4M8.6 8.6l3.4 1 3.4-1" />{GROUND}</>),

  /** Folded at the hips: head down and forward, legs straight. */
  bend: (<><circle cx="6.4" cy="10.6" r="1.8" /><path d="M8.2 10.2l5.4-1.6M13.6 8.6l1 11.6M13.6 8.6l3 11.6M8.6 11.4l-.8 5" />{GROUND}</>),

  /** One knee down, the other up. */
  kneel: (<><circle cx="10.4" cy="4.6" r="1.8" /><path d="M10.4 6.8v6.4M10.4 13.2l-4.2 5.2 4 1.8M10.4 13.2l3.8 2.6v4.6M10.8 9.4l3.4 2.6" />{GROUND}</>),

  /** Down on the haunches: hips low, knees high, feet under. */
  crouch: (<><circle cx="11.6" cy="6" r="1.8" /><path d="M11.6 8.2v4.4M11.6 12.6l-3.8 2.2.6 5.4M11.6 12.6l4 2.6-.8 5M9 10l4.6 2" />{GROUND}</>),

  /** Seated: thigh out, shin down. */
  sit: (<><circle cx="8" cy="6" r="1.8" /><path d="M8 8.2v5.6h6.8M8 13.8v6.4M14.8 13.8v6.4M9 10.4l4.6 2.2" />{GROUND}</>),

  /** Off the ground entirely. */
  air: (<><circle cx="12" cy="5.2" r="1.8" /><path d="M12 7.4v4.4M12 11.8l-3.6 2.8M12 11.8l3.8 2.4M8 8.4l4 1.2 4-2" /><path d="M3 20.4h18" strokeOpacity="0.22" strokeDasharray="2 3" /></>),
};
