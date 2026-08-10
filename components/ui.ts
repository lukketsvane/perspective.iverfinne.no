/**
 * The one description of what the floating chrome looks like.
 *
 * Every panel in this app is the same object: a translucent, blurred, hairline
 * surface over a live scene, in one of two themes. That description was copied
 * into each component that drew one, so a change to the glass meant finding
 * five near-identical strings and hoping. It is written once here.
 */

/** Panels, bars and sheets: the blurred surface itself. */
export const chrome = (dark: boolean) =>
  dark ? 'bg-neutral-950/92 text-white border-white/20' : 'bg-white/92 text-black border-gray-300';

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
    dark ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-black/5'
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
    dark ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-black/5'
  }`;

/** A square in a grid of things you can pick. */
export const tile = (dark: boolean) =>
  dark ? 'bg-white/10 hover:bg-white/15 active:bg-white/20' : 'bg-black/5 hover:bg-black/10 active:bg-black/15';

/** A readout you can drag: the number *is* the control. */
export const readout = (dark: boolean) =>
  `flex items-center justify-center min-w-[3.75rem] sm:min-w-[5.5rem] px-2 sm:px-3 h-11 rounded-full touch-none cursor-ew-resize border transition-colors ${
    dark ? 'bg-white/10 border-white/20 hover:bg-white/15' : 'bg-black/5 border-gray-300 hover:bg-black/10'
  }`;

/** The one accent colour: a control that is currently doing something. */
export const ACTIVE = '!text-sky-500';
