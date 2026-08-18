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
 * THE MATERIAL IS IN index.html, under .glass-light and .glass-dark, and the
 * long argument for it is there too. It is six declarations that only mean
 * anything together - a fill, a blur, a contrast collapse, a brightness lift,
 * a saturation recovery and a lit rim - and written out as a Tailwind string
 * it was a line nobody could read and a set of numbers nobody could relate to
 * each other.
 *
 * WHAT STAYS HERE is what is genuinely a choice per theme rather than part of
 * the material: which way the ink runs, and how dark the hairline is.
 *
 * It was a flat fill at 78 per cent until now, on the reasoning that the page
 * is often black and the drawing is white paper - the widest gap a screen has -
 * so anything more transparent let the racer's lines read straight through the
 * menu. That was true of a fill and a blur. It stopped being true once the
 * backdrop got a contrast collapse in front of it: there is no line left under
 * the panel to read through, so the paint could come off. See index.html.
 *
 * IT IS NOT FREE. The thing behind every panel here is a live WebGL canvas, so
 * the compositor resamples it every frame a panel is open. That is the cost of
 * the material, and it is the same cost it always was - the blur is a shade
 * NARROWER than the 40 px it used to be, and contrast, brightness and
 * saturation are per-pixel arithmetic on top of it.
 */
export const chrome = (dark: boolean) =>
  dark ? 'glass-dark text-white border-white/15' : 'glass-light text-black border-black/10';

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
 * AN EDGE, AND NO FILL AT REST.
 *
 * The fill came first and was never enough on its own: a tenth of white over a
 * panel that is itself 92 per cent black is about four values of separation, so
 * a shelf of them read as icons floating on glass rather than as a grid of
 * targets. The hairline was added to fix that and did - an edge is what makes a
 * tile a tile - which left the fill doing nothing except making every tile look
 * like a key to be pressed. That is the one thing this interface is not: a
 * global rule strips the background off every button in the app precisely so
 * that shape, border and glyph carry it, and a grid of filled rectangles was
 * the last place still arguing with that rule.
 *
 * The fill survives where it means something: under a finger and under a
 * cursor, which is feedback rather than decoration, and it is gone the moment
 * either leaves.
 */
export const tile = (dark: boolean) =>
  dark
    ? 'border border-white/15 hover:bg-white/[0.08] active:bg-white/15'
    : 'border border-black/10 hover:bg-black/[0.06] active:bg-black/12';

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
  `px-3 py-1 rounded-full text-xs font-bold tabular-nums border whitespace-nowrap ${chrome(dark)}`;

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
