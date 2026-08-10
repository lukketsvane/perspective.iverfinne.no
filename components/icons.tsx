import React from 'react';
import type { Surface } from '../types';

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

  /** A road running to a vanishing point on the horizon, its edges bowed. */
  curved: (<><path d="M2 12c4-1.6 16-1.6 20 0" strokeOpacity="0.45" /><path d="M2 21C5 15 8 12 12 10.7M22 21c-3-6-6-9-10-10.3" /><circle cx="12" cy="10.5" r="1.3" fill="currentColor" stroke="none" /></>),
  cylindrical: (<><path d="M5 4h14v16H5z" /><path d="M5 8c2.2-1.3 4.5-2 7-2s4.8.7 7 2M5 16c2.2-1.3 4.5-2 7-2s4.8.7 7 2" strokeOpacity="0.45" /><line x1="12" y1="4" x2="12" y2="20" /></>),

  /**
   * Stereographic: the conformal sheet. Circles stay circles and angles stay
   * angles, so it is drawn as circles crossing squarely - the one thing this
   * projection promises and the others do not.
   */
  stereographic: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.4" strokeOpacity="0.55" /><circle cx="12" cy="12" r="1.4" strokeOpacity="0.4" /><path d="M12 3v18M3 12h18" strokeOpacity="0.35" /><circle cx="12" cy="12" r="7" strokeOpacity="0.25" /></>),

  /**
   * The ground's two rulings, one switch each: the lines that run away from you
   * to their point, and the lines that cross them.
   */
  gridAway: (<><path d="M2.5 21 11 8M21.5 21 13 8" /><path d="M6.6 21 11.6 8M17.4 21 12.4 8" strokeOpacity="0.4" /><line x1="2" y1="6.5" x2="22" y2="6.5" strokeOpacity="0.3" /></>),
  gridAcross: (<><path d="M2.5 20.5c5-2.2 14-2.2 19 0M4.2 15.6c4-1.4 11.6-1.4 15.6 0M5.6 11.6c3.2-.9 9.6-.9 12.8 0M6.7 8.6c2.6-.6 8-.6 10.6 0" /><line x1="2" y1="6.5" x2="22" y2="6.5" strokeOpacity="0.3" /></>),

  /** A one-metre reference cube: the unit everything else is read against. */
  cube: (<><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" /></>),

  /**
   * Which way a box is being sized: a box with one of its three dimensions
   * called out. W, H and D were letters on a screen that has no other writing
   * on it - and they are the wrong letters in most languages anyway.
   */
  axisWidth: (<><path d="M5 8.5h14v9H5z" strokeOpacity="0.35" /><path d="M4 21h16" /><path d="M6.4 19.2 4 21l2.4 1.8M17.6 19.2 20 21l-2.4 1.8" /></>),
  axisHeight: (<><path d="M7.5 5h9v14h-9z" strokeOpacity="0.35" /><path d="M3 4v16" /><path d="M1.2 6.4 3 4l1.8 2.4M1.2 17.6 3 20l1.8-2.4" /></>),
  axisDepth: (<><path d="M8 8h11v11H8z" strokeOpacity="0.35" /><path d="M5.5 16.5 16.5 5.5" /><path d="M5.5 12.6v3.9h3.9M16.5 9.4V5.5h-3.9" /></>),

  /**
   * How far off the ground a thing is standing: the floor, the thing up above
   * it, and the gap between them with an arrow in it.
   */
  lift: (<><path d="M3 21h18" /><rect x="7.5" y="3" width="9" height="6.5" rx="0.8" /><path d="M12 18.5v-6M9.6 14.9 12 12.5l2.4 2.4" strokeOpacity="0.65" /></>),

  /**
   * How far round the lens may open: the cone sight actually covers, the
   * whole sphere on the page, and the band that repeats without end.
   */
  fieldHuman: (<><path d="M12 20V11" strokeOpacity="0.5" /><path d="M12 11L4 3M12 11l8-8" /><path d="M5.2 7.6a9.4 9.4 0 0 1 13.6 0" strokeOpacity="0.6" /></>),
  fieldSphere: (<><circle cx="12" cy="12" r="8.6" /><line x1="2" y1="12" x2="22" y2="12" strokeOpacity="0.4" /><path d="M12 3.4a13 13 0 0 0 0 17.2M12 3.4a13 13 0 0 1 0 17.2" strokeOpacity="0.5" /></>),
  fieldEndless: (<><path d="M12 12c-2-2.8-3.4-4.2-5.2-4.2a4.2 4.2 0 0 0 0 8.4C8.6 16.2 10 14.8 12 12zM12 12c2-2.8 3.4-4.2 5.2-4.2a4.2 4.2 0 0 1 0 8.4C15.4 16.2 14 14.8 12 12z" /></>),

  /** A row of the same thing, marching away: the diminution lesson. */
  row: (<><rect x="3" y="7" width="4.6" height="12" rx="0.6" /><rect x="10.5" y="8.8" width="3.4" height="8.6" rx="0.5" strokeOpacity="0.75" /><rect x="16.2" y="10" width="2.5" height="6" rx="0.4" strokeOpacity="0.55" /><rect x="20.3" y="10.9" width="1.8" height="4.2" rx="0.3" strokeOpacity="0.4" /></>),

  /**
   * The lamps: a bulb hanging from its plumb, a spot with its cone, and the
   * switch. The bulb doubles as the "add a light" tile.
   */
  lampBulb: (<><path d="M12 2.5v3" strokeOpacity="0.5" /><circle cx="12" cy="10.5" r="4.6" /><path d="M10.2 17.4h3.6M10.7 19.8h2.6" /><path d="M5.6 5.6l1.6 1.6M18.4 5.6l-1.6 1.6M4 10.5h2.2M17.8 10.5H20" strokeOpacity="0.5" /></>),
  lampSpot: (<><path d="M12 2.5v2.6" strokeOpacity="0.5" /><path d="M8.6 6.4h6.8l1.4 4.4H7.2z" /><path d="M8.2 12.6L5 20.5M15.8 12.6L19 20.5M12 12.6V21" strokeOpacity="0.5" /></>),
  power: (<><path d="M12 3.5v7" /><path d="M7.2 6.8a7 7 0 1 0 9.6 0" /></>),

  /** A sheet mounted on a page: the drawing, and what is behind it. */
  backdrop: (<><rect x="2.5" y="3.5" width="19" height="17" rx="1.6" fill="currentColor" fillOpacity="0.9" stroke="none" /><rect x="7" y="7.5" width="10" height="9" rx="0.8" fill="none" stroke="currentColor" strokeOpacity="0.9" /></>),

  /** A box being drawn: the footprint down, the height going up. */
  block: (<><path d="M4 17.5l6-2.6 8 2.2-6 2.8z" /><path d="M12 14.9V6.2M9.8 8.4 12 6.2l2.2 2.2" strokeOpacity="0.65" /></>),

  /** The drafting divider, legs open over the arc it spans. */
  measure: (<><path d="M12 3.5L5.5 20M12 3.5L18.5 20" /><circle cx="12" cy="4.6" r="1.5" /><path d="M6.8 16.6a11.5 11.5 0 0 1 10.4 0" strokeOpacity="0.55" /></>),

  /** A phone held up, and the turn that steers the view. */
  arLook: (<><rect x="8.5" y="4.5" width="7" height="13" rx="1.4" /><path d="M12 21.8a9.5 9.5 0 0 0 7.8-4M12 21.8l2.6-.4M12 21.8l-.9-2.4" strokeOpacity="0.7" /><circle cx="12" cy="15.3" r="0.8" fill="currentColor" stroke="none" /></>),

  /**
   * A box standing inside a bracketed frame: the thing put down in the room.
   *
   * The corner brackets are the mark every AR placement viewer uses for
   * "somewhere out there", and the box in them is what this one puts there.
   */
  ar: (<><path d="M3 8V4.8A1.8 1.8 0 0 1 4.8 3H8M16 3h3.2A1.8 1.8 0 0 1 21 4.8V8M21 16v3.2a1.8 1.8 0 0 1-1.8 1.8H16M8 21H4.8A1.8 1.8 0 0 1 3 19.2V16" /><path d="M12 8.1l3.6 2v4l-3.6 2-3.6-2v-4z" /><path d="M12 12.1l3.6-2M12 12.1v4.1M12 12.1L8.4 10.1" strokeOpacity="0.55" /></>),

  /** Horizon line, and the field of view, which is the lens control's mark. */
  horizon: (<><line x1="2" y1="12" x2="22" y2="12" /><path d="M4 19l7-5M20 19l-7-5" strokeOpacity="0.45" /></>),
  cone: (<><path d="M12 3L4 20h16z" /><path d="M6.5 14h11" strokeOpacity="0.45" /></>),

  /**
   * How much of the room's construction is drawn, as the drawing itself: bare
   * frame, then the eye-level line, then the curved sheet it is all ruled on.
   */
  guides0: (<><path d="M3 12h3M10.5 12h3M18 12h3" strokeOpacity="0.4" /></>),
  guides1: (<><line x1="2" y1="12" x2="22" y2="12" /></>),
  guides2: (<><line x1="2" y1="12" x2="22" y2="12" /><path d="M3.2 7.5c4-2.4 13.6-2.4 17.6 0M6.5 3.4c2-.8 9-.8 11 0M3.2 16.5c4 2.4 13.6 2.4 17.6 0" strokeOpacity="0.7" /></>),

  /**
   * What dragging lands on: free, then three rulers of increasing coarseness.
   */
  snapFree: (<><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6" strokeOpacity="0.4" /></>),
  snapFine: (<><path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" strokeOpacity="0.55" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /></>),
  snapMedium: (<><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" strokeOpacity="0.6" /><circle cx="9.5" cy="14.5" r="1.9" fill="currentColor" stroke="none" /></>),
  snapCoarse: (<><rect x="6.5" y="6.5" width="11" height="11" rx="1" strokeOpacity="0.7" /><circle cx="6.5" cy="17.5" r="2.1" fill="currentColor" stroke="none" /></>),

  /**
   * The light, taken apart: where it stands on the compass, how high it is, how
   * hard it burns, how warm it is, and whether it throws shadows.
   */
  bearing: (<><circle cx="12" cy="12" r="8.6" /><path d="M15.4 8.6l-2.1 5.3-5.3 2.1 2.1-5.3z" fill="currentColor" stroke="none" /><path d="M12 1.6v2M12 20.4v2" strokeOpacity="0.45" /></>),
  elevation: (<><path d="M2.5 20h19" /><circle cx="12" cy="10.5" r="3.4" /><path d="M12 3.4v2.2M5.9 6.4l1.6 1.6M18.1 6.4l-1.6 1.6" /><path d="M4.5 20a7.5 7.5 0 0 1 3-6" strokeOpacity="0.4" /></>),
  strength: (<><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /><path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" /><path d="M4.9 4.9l2.4 2.4M16.7 16.7l2.4 2.4M19.1 4.9l-2.4 2.4M4.9 19.1l2.4-2.4" strokeOpacity="0.5" /></>),
  kelvin: (<><path d="M10 14.5V4.6a2 2 0 0 1 4 0v9.9" /><circle cx="12" cy="17.4" r="3.4" /><path d="M16.6 6.4h3.6M16.6 9.8h2.4M16.6 13.2h3.6" strokeOpacity="0.5" /></>),
  shadow: (<><circle cx="8.6" cy="8" r="3.4" /><path d="M12.2 10.6L21 19.6H7.4z" fill="currentColor" stroke="none" strokeOpacity="0.35" fillOpacity="0.35" /></>),
  /** The same shape as one solid black, which is precisely the difference. */
  shadowHard: (<><circle cx="8.6" cy="8" r="3.4" /><path d="M12.2 10.6L21 19.6H7.4z" fill="currentColor" stroke="none" /></>),
  fill: (<><circle cx="12" cy="12" r="4" strokeOpacity="0.5" /><path d="M12 2.4v2.6M2.4 12h2.6M19 12h2.6M12 19v2.6" strokeOpacity="0.5" /><path d="M4.4 4.4l1.9 1.9M17.7 17.7l1.9 1.9" strokeOpacity="0.5" /><path d="M12 8a4 4 0 0 1 0 8z" fill="currentColor" stroke="none" /></>),

  /**
   * The box a thing blocks into, standing on its own footprint: the
   * construction drawn around every object rather than around the room.
   */
  cage: (<><path d="M8 7.5l8-3.5 4 2v9l-8 3.5-4-2z" strokeOpacity="0.9" /><path d="M8 7.5l4 2 8-3.5M12 9.5v9" strokeOpacity="0.5" /><path d="M3 20.5l6-2.6 5 2.2-6 2.6z" strokeOpacity="0.45" /></>),
  /** The same cage on everything at once: the scene blocked in whole. */
  cages: (<><path d="M10 4.5l6-2.5 4 1.8v6.5l-6 2.5-4-1.8z" strokeOpacity="0.9" /><path d="M10 4.5l4 1.8 6-2.5M14 6.3v6.5" strokeOpacity="0.5" /><path d="M3 13.5l5-2.2 3.5 1.6v5.6l-5 2.2-3.5-1.6z" strokeOpacity="0.9" /><path d="M3 13.5l3.5 1.6 5-2.2M6.5 15.1v5.6" strokeOpacity="0.5" /></>),

  /**
   * How solidly a thing is drawn, as that thing: the same cube filled, then
   * painted plain, then drawn as line, then taken away and left as its own
   * construction.
   */
  /**
   * The selection's own points: a box with its edges carried off to a pair of
   * them on the eye line, which is the whole of what the switch turns on.
   */
  vanishing: (<><path d="M2.5 9h19" strokeOpacity="0.3" /><circle cx="2.5" cy="9" r="1.4" fill="currentColor" stroke="none" /><circle cx="21.5" cy="9" r="1.4" fill="currentColor" stroke="none" /><path d="M9 12.2 2.5 9M9 19 2.5 9M15 10.9 21.5 9M15 17.7 21.5 9" strokeOpacity="0.4" strokeDasharray="2.5 2.5" /><path d="M9 12.2l6-1.3v6.8L9 19z" /></>),

  surfaceSolid: (<><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" fill="currentColor" fillOpacity="0.7" /><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" strokeOpacity="0.3" /></>),
  matte: (<path d="M12 3s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10z" />),
  surfaceWire: (<><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" strokeOpacity="0.75" /><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21" strokeOpacity="0.75" /><path d="M12 11.5V3M12 11.5l8 5.3M12 11.5l-8 5.3" strokeOpacity="0.75" /></>),

  /**
   * The room: a wall square on, the four corners running back to the eye, and
   * the opening you are standing in.
   */
  room: (<><rect x="2.5" y="4" width="19" height="16" rx="1" /><rect x="8.5" y="9.5" width="7" height="5.5" rx="0.5" strokeOpacity="0.65" /><path d="M2.5 4l6 5.5M21.5 4l-6 5.5M2.5 20l6-5M21.5 20l-6-5" strokeOpacity="0.4" /></>),
  /** The same room with its surfaces in it, for the rung that has walls. */
  roomWalls: (<><rect x="2.5" y="4" width="19" height="16" rx="1" fill="currentColor" fillOpacity="0.16" /><rect x="8.5" y="9.5" width="7" height="5.5" rx="0.5" strokeOpacity="0.65" fill="currentColor" fillOpacity="0.12" /><path d="M2.5 4l6 5.5M21.5 4l-6 5.5M2.5 20l6-5M21.5 20l-6-5" strokeOpacity="0.4" /></>),

  /**
   * A size that is settled, and one that is not: a padlock with the two sizing
   * arrows inside it, since what is shut is the sizing rather than the thing.
   */
  lockSize: (<><rect x="4" y="11" width="16" height="9.5" rx="2" /><path d="M8 11V7.6a4 4 0 0 1 8 0V11" /><path d="M8.8 15.8h6.4" strokeOpacity="0.75" /><path d="M10.5 14.2 8.8 15.8l1.7 1.6M13.5 14.2l1.7 1.6-1.7 1.6" strokeOpacity="0.75" /></>),
  unlockSize: (<><rect x="4" y="11" width="16" height="9.5" rx="2" /><path d="M8 11V7.6a4 4 0 0 1 7.4-2.1" /><path d="M8.8 15.8h6.4" strokeOpacity="0.75" /><path d="M10.5 14.2 8.8 15.8l1.7 1.6M13.5 14.2l1.7 1.6-1.7 1.6" strokeOpacity="0.75" /></>),

  /**
   * The line drawing: a form given by its outline and two lines wrapping round
   * it. Not a shaded ball and not a wireframe - the two marks the mode makes.
   */
  ink: (<><circle cx="12" cy="12" r="9" /><path d="M5.6 8.4a9 9 0 0 0 12.8 0" strokeOpacity="0.7" /><path d="M7.6 15.6a9 9 0 0 0 8.8 0" strokeOpacity="0.45" /></>),
  /** The same sphere with its dark half spotted solid: the brush page. */
  brush: (<><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18 14 14 0 0 1-4.6-9A14 14 0 0 1 12 3z" fill="currentColor" stroke="none" /></>),

  /** Step back or forward one move. */
  undo: (<><polyline points="9 5 3.5 10.5 9 16" /><path d="M3.5 10.5H14a6.5 6.5 0 0 1 0 13H8" /></>),
  redo: (<><polyline points="15 5 20.5 10.5 15 16" /><path d="M20.5 10.5H10a6.5 6.5 0 0 0 0 13h6" /></>),

  /** Take the view away as a picture. */
  camera: (<><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.7l1.4-2.2h6.8L16.8 7h2.7A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.6" /></>),

  /** Make two of it. */
  duplicate: (<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></>),

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

/** Which cube goes on the button, for the rung the thing is currently on. */
export const SURFACE_ICON: Record<Surface, React.ReactNode> = {
  original: I.surfaceSolid,
  matte: I.matte,
  ink: I.ink,
  brush: I.brush,
  wire: I.surfaceWire,
};
