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
  check: (<polyline points="4 12.5 9.5 18 20 6.5" />),

  /**
   * A road running to a vanishing point on the horizon, ruled straight; and the
   * same road with its edges bowed, which is the whole of the difference
   * between the two projections.
   */
  straight: (<><line x1="2" y1="10" x2="22" y2="10" strokeOpacity="0.45" /><path d="M2 21L12 10M22 21L12 10" /><circle cx="12" cy="10" r="1.3" fill="currentColor" stroke="none" /></>),
  curved: (<><path d="M2 12c4-1.6 16-1.6 20 0" strokeOpacity="0.45" /><path d="M2 21C5 15 8 12 12 10.7M22 21c-3-6-6-9-10-10.3" /><circle cx="12" cy="10.5" r="1.3" fill="currentColor" stroke="none" /></>),
  stereographic: (<><circle cx="12" cy="12" r="8.2" /><path d="M12 3.8v16.4M3.8 12h16.4" strokeOpacity="0.45" /><path d="M6 18c1.8-4.4 4.1-6.8 6-6.8s4.2 2.4 6 6.8" /></>),
  cylindrical: (<><path d="M5 4h14v16H5z" /><path d="M5 8c2.2-1.3 4.5-2 7-2s4.8.7 7 2M5 16c2.2-1.3 4.5-2 7-2s4.8.7 7 2" strokeOpacity="0.45" /><line x1="12" y1="4" x2="12" y2="20" /></>),
  hyperbolic: (<><circle cx="12" cy="12" r="8.2" /><path d="M12 3.8c-3.4 3.2-5.2 6-5.2 8.2s1.8 5 5.2 8.2M12 3.8c3.4 3.2 5.2 6 5.2 8.2s-1.8 5-5.2 8.2" strokeOpacity="0.45" /><path d="M4.8 12h14.4" /></>),
  sevenTwenty: (<><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.1" strokeOpacity="0.45" /><path d="M4.8 12h14.4" /><path d="M12 3.8v16.4" /></>),

  /** A one-metre reference cube: the unit everything else is read against. */
  cube: (<><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" /></>),

  /** Horizon line and cone of vision. */
  horizon: (<><line x1="2" y1="12" x2="22" y2="12" /><path d="M4 19l7-5M20 19l-7-5" strokeOpacity="0.45" /></>),
  cone: (<><path d="M12 3L4 20h16z" /><path d="M6.5 14h11" strokeOpacity="0.45" /></>),

  /** Plain white in place of the file's own materials. */
  matte: (<path d="M12 3s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10z" />),

  /** Start again, and step back one move. */
  reset: (<><path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.2-9.3L3 7" /></>),
  undo: (<><polyline points="9 5 3.5 10.5 9 16" /><path d="M3.5 10.5H14a6.5 6.5 0 0 1 0 13H8" /></>),

  /** Take the view away as a picture. */
  camera: (<><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.7l1.4-2.2h6.8L16.8 7h2.7A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.6" /></>),

  /** Turn on the spot, and make two of it. */
  turnLeft: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 9 8 9" /></>),
  turnRight: (<><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 4 21 9 16 9" /></>),
  duplicate: (<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>),
  /** Remove duplicate meshes: a stack with a slash through extras. */
  dedup: (<><rect x="3" y="11" width="11" height="10" rx="2" /><path d="M7 11V7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4" /><line x1="17" y1="3" x2="7" y2="21" /></>),

  /** The setup panel, and the light/dark switch. */
  sliders: (<><line x1="2" y1="12" x2="22" y2="12" /><line x1="4" y1="17" x2="20" y2="20" /><line x1="4" y1="7" x2="20" y2="4" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>),
  light: (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>),
  dark: (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
  sky: (<><path d="M3 17.5h18" /><path d="M5 17.5a7 7 0 0 1 14 0" /><circle cx="12" cy="8" r="2.5" /><path d="M12 2.5v2M5.8 5.2l1.4 1.4M18.2 5.2l-1.4 1.4" /></>),

  /** Committing a scene to the browser: a floppy, still the clearest mark for it. */
  save: (<><path d="M4 5.6A1.6 1.6 0 0 1 5.6 4h9.6L20 8.8v9.6a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4z" /><path d="M8 4v5h7" /><rect x="8" y="13" width="8" height="7" rx="1" /></>),
  /** The scene library: framed views, stacked. */
  scenes: (<><rect x="3" y="6" width="13" height="12" rx="1.8" /><path d="M19 8.5v9a2 2 0 0 1-2 2H7.5" strokeOpacity="0.45" /><path d="M3 14.5l3.4-3 3 2.4 3-2.6 3.6 3.6" /></>),
  trash: (<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />),
  upload: (<><path d="M12 16V4" /><polyline points="8 8 12 4 16 8" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>),
  /** Scene JSON export: a box with an outward arrow and curly-brace hint. */
  sceneExport: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 12h8M14 9l3 3-3 3" /></>),
  /** Scene JSON import: a box with an inward arrow. */
  sceneImport: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M16 12H8M10 9l-3 3 3 3" /></>),
};
