/**
 * The one description of what the floating chrome looks like.
 *
 * Every panel in this app is the same object: a translucent, blurred, hairline
 * surface over a live scene, in one of two themes. That description was copied
 * into each component that drew one, so a change to the glass meant finding
 * five near-identical strings and hoping. It is written once here.
 */

/**
 * Panels, bars and sheets: the surface itself.
 *
 * GLASS. Half a fill, a wide blur, and a little saturation under it - the
 * material iOS and macOS are made of, and the reason it is worth its cost here
 * is the same reason it is worth theirs: it is the only treatment that lets the
 * scene through without letting the DRAWING through.
 *
 * This panel used to be ninety-six per cent opaque with nothing behind it, and
 * the comment here argued the case: the page is black, the drawing is white
 * paper, and that is the widest gap a screen has - eight per cent of 255 laid
 * over a panel that is itself 10 put the racer's lines twenty levels above the
 * panel around them, and the drawing read straight through the menu. Every
 * answer available at the time was a trade between "you can see the scene
 * behind the chrome" and "you can read the chrome", and four more per cent of
 * paint bought the second by giving up the first entirely.
 *
 * A blur is not on that line at all. Opacity dims the drawing and keeps its
 * structure - a white line at eight per cent is still a white line, and a line
 * is what the eye finds. Forty pixels of blur average the whole neighbourhood
 * into one tone, so what arrives under the panel is not lines at all but the
 * broad value of that part of the picture. There is nothing left to read
 * through, which is why the fill can come down from 96 to the fifties and the
 * panel still reads as a solid object with words on it.
 *
 * SEVENTY-EIGHT PER CENT, WHICH IS NOT AN IOS NUMBER. Apple's glass sits over
 * a wallpaper and a page of text - a picture with no white lines on black in
 * it. Measured here at the fifties, the racer read through the tools panel as a
 * pale shape with a hard edge, blur and all: forty pixels of blur turn a white
 * line into a broad white smear, and a broad white smear under a panel that is
 * itself 10 is still the brightest thing on the screen. At 78 the scene is a
 * value that moves under the glass rather than a picture you can make out, and
 * the panel is an object with words on it. That is the trade the material was
 * brought in for, and this is where it actually lands on this page.
 *
 * IT IS NOT FREE, and the old comment was right about the bill: the thing
 * behind every panel here is a live WebGL canvas, so the compositor resamples
 * it every frame a panel is open. That is the cost of the material. It is paid
 * only while something is open - the dock and the bars are the same glass, and
 * they are what the tool looks like.
 *
 * AND IT IS INERT FOR A MOMENT AT A TIME, which is worth knowing before
 * somebody goes looking for the bug. An ancestor at any opacity other than 1 is
 * a backdrop root, and a backdrop-filter inside one has nothing behind it to
 * sample. The whole chrome column fades on the rail's 1500 ms clock, so for the
 * length of that fade every panel in it is a flat fill with a blur that is
 * computed and does nothing. It cannot be seen: the same fade has the panel at
 * a fraction of its own opacity for exactly those milliseconds.
 */
export const chrome = (dark: boolean) =>
  dark
    ? 'bg-neutral-950/78 backdrop-blur-2xl backdrop-saturate-150 text-white border-white/15'
    : 'bg-white/78 backdrop-blur-2xl backdrop-saturate-150 text-black border-black/10';

/**
 * A round 44 px control - the smallest target a thumb can be asked to hit.
 *
 * Forty on a phone, forty-four on anything wider.
 *
 * It was forty below 360 px, where seven in a row stopped fitting. The dock
 * carries eight now - the block-out pencil and the measure came up out of the
 * tools row - and eight at forty-four is 392 px of controls, which no phone
 * has: measured, a 390 px frame gives the dock 366 and every one of them
 * wrapped to a second row. At forty they are 360 and it is one row again.
 *
 * Four pixels of one dimension is a worse target than 44; a row that has
 * folded in half over the drawing is worse than either. The height does not
 * move, and a thumb is wider than it is tall.
 */
export const iconButton = (dark: boolean) =>
  `flex items-center justify-center w-11 max-[429px]:w-10 h-11 rounded-full transition-transform active:scale-95 ${
    dark
      ? 'text-white hover:bg-white/10 disabled:hover:bg-transparent'
      : 'text-gray-900 hover:bg-black/5 disabled:hover:bg-transparent'
  }`;

/**
 * The same, for a bar that has run out of phone.
 *
 * Forty pixels rather than forty-four, and only below the width where the full
 * size stops fitting. Every one of these is a thing you can do to what you are
 * holding, and the alternative to four pixels was pushing one of them off the
 * edge of the screen - which is not a smaller target, it is no target.
 */
export const snugIconButton = (dark: boolean) =>
  `flex items-center justify-center w-10 h-11 sm:w-11 rounded-full transition-transform active:scale-95 ${
    dark
      ? 'text-white hover:bg-white/10 disabled:hover:bg-transparent'
      : 'text-gray-900 hover:bg-black/5 disabled:hover:bg-transparent'
  }`;

/**
 * A square in a grid of things you can pick.
 *
 * The fill alone was not enough to see. A tenth of white over a panel that is
 * itself 92 per cent black is about four values of separation, so a shelf of
 * them read as icons floating on glass rather than as a grid of targets - and
 * the only tile anybody could actually see the edges of was the import one,
 * because it happens to carry a dashed border. An edge is what makes a tile a
 * tile: the hairline does the work the fill was failing to do, and the fill
 * stays low so the picture on it is the brightest thing in the square.
 */
export const tile = (dark: boolean) =>
  dark
    ? 'bg-white/[0.07] border border-white/15 hover:bg-white/[0.12] active:bg-white/20'
    : 'bg-black/[0.04] border border-black/10 hover:bg-black/[0.08] active:bg-black/15';

/** A readout you can drag: the number *is* the control. */
export const readout = (dark: boolean) =>
  `flex items-center justify-center min-w-[3.75rem] sm:min-w-[5.5rem] px-2 sm:px-3 h-11 rounded-full touch-none cursor-ew-resize border transition-colors ${
    dark ? 'bg-white/10 border-white/20 hover:bg-white/15' : 'bg-black/5 border-gray-300 hover:bg-black/10'
  }`;

/**
 * The number that follows a drag: a small hard-edged pill of the current value.
 *
 * The room's size, the field, the eye level, a box's height as it is pulled -
 * four controls hand back a live number the same way, and the string that drew
 * it was written out four times in three files. It is one thing.
 */
export const bubble = (dark: boolean) =>
  `px-3 py-1 rounded-full text-xs font-bold tabular-nums border shadow-xl whitespace-nowrap backdrop-blur-xl backdrop-saturate-150 ${
    dark ? 'bg-neutral-950/80 text-white border-white/15' : 'bg-white/80 text-black border-black/10'
  }`;

/** The one accent colour: a control that is currently doing something. */
export const ACTIVE = '!text-sky-500';

/**
 * Where a floating panel sits when the window is SHORT.
 *
 * Keyed on height rather than on orientation: what matters is how much room
 * there is above the dock, and a short window is a short window whether it is
 * a landscape phone, a split view or a browser with three toolbars in it.
 *
 * Hung from the right. Centred, a panel opened from the right-hand thumb
 * cluster came up most of a hand's width away from the button that opened it,
 * and the left two thirds of the frame - which is the part the drawing is in -
 * had a bar across it. Every panel shares this one edge, so they all arrive in
 * the same place. Upright it stays centred: there is one dock there, in the
 * middle, and a panel pinned to one side of a 390 px screen would be lopsided
 * for nothing.
 *
 * Written out in full rather than composed: Tailwind finds classes by reading
 * the source text, so a variant assembled at runtime is one that never gets a
 * rule generated for it.
 */
export const SIDEWAYS_SLOT =
  // Full width first, or there is nothing for justify-end to push against: the
  // dock's column centres its items, so a shrink-to-fit row is already in the
  // middle and telling its contents to sit right moves nothing. (The panels
  // above the dock are absolutely positioned across the frame and were already
  // full width, so this costs them nothing.)
  '[@media(max-height:560px)]:w-full [@media(max-height:560px)]:justify-end';
