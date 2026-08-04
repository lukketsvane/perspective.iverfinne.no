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
  dark ? 'bg-black/60 text-white border-white/20' : 'bg-white/80 text-black border-gray-300';

/** A round 44 px control - the smallest target a thumb can be asked to hit. */
export const iconButton = (dark: boolean) =>
  `flex items-center justify-center w-11 h-11 rounded-full transition-transform active:scale-95 ${
    dark ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-black/5'
  }`;

/** A square in a grid of things you can pick. */
export const tile = (dark: boolean) =>
  dark ? 'bg-white/10 hover:bg-white/15 active:bg-white/20' : 'bg-black/5 hover:bg-black/10 active:bg-black/15';

/** A readout you can drag: the number *is* the control. */
export const readout = (dark: boolean) =>
  `flex items-center justify-center min-w-[5.5rem] px-3 h-11 rounded-full touch-none cursor-ew-resize border backdrop-blur-md transition-colors ${
    dark ? 'bg-black/50 border-white/20 hover:bg-white/10' : 'bg-white/80 border-gray-300 hover:bg-black/5'
  }`;

/** A text field on the glass. */
export const field = (dark: boolean) =>
  `h-11 px-4 rounded-full border text-sm outline-none min-w-0 ${
    dark
      ? 'bg-black/50 border-white/20 text-white placeholder:text-white/40 focus:border-white/40'
      : 'bg-white/80 border-gray-300 text-black placeholder:text-black/30 focus:border-black/40'
  }`;

/** The one accent colour: a control that is currently doing something. */
export const ACTIVE = '!text-sky-500';
