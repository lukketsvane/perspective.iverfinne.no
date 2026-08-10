import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { chrome } from './ui';
import { holdRail, releaseRail, useRail } from '../lib/rail';
import { walkInput } from '../lib/walkInput';
import { endTour, nextStep, STEPS, useTourStep } from '../lib/tour';

/**
 * The five cards, the ring, and the mark over the walk corner.
 *
 * WHAT IT DRAWS, AND WHERE.
 *
 * The card is FIXED AT THE TOP and never moves. Placing it near whatever it is
 * pointing at is the obvious design and the wrong one here: every piece of
 * chrome in this tool lives along the bottom edge - the dock, the one panel
 * slot, the selection bar that pushes that slot up seventy pixels - and the
 * bottom-left quadrant is the walk stick. The top is the only band nothing
 * claims. Pinning it there costs one measurement, removes every collision, and
 * stops the copy hopping about under a reading eye between steps.
 *
 * NO SCRIM, EVER. Every step here needs the viewer to touch the thing
 * underneath it, and this app has no scrims by policy: a dimming layer over a
 * live WebGL canvas either blurs - resampling the whole frame on the device
 * this actually runs on - or hides the drawing the step is about.
 *
 * IT NEVER TOUCHES THE SLOT. No panel is opened, none is closed, no instrument
 * is armed and nothing is written to the scene. Every card ends because the
 * viewer did the thing or pressed Next.
 */

/** Matching `isStickZone` in WalkOverlay exactly. */
const STICK_FRACTION = 0.45;

export const Tour: React.FC = () => {
  const step = useTourStep();
  const running = step >= 0;
  const dark = useStore((s) => s.theme) === 'dark';
  const railVisible = useRail();
  const boxes = useStore((s) => s.boxes.length);
  const fov = useStore((s) => s.fov);

  const [rect, setRect] = useState<DOMRect | null>(null);
  /** Re-measured on resize, because the stick zone is read off the window. */
  const [frame, setFrame] = useState(() => ({
    w: typeof window === 'undefined' ? 0 : window.innerWidth,
    h: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  /*
   * What the step is waiting for, captured as it opens.
   *
   * A box NEW since this card appeared, not the first box in the scene - the
   * seat in the panel replays this on a scene that already has some. Likewise
   * the lens is measured against where it was when the card opened, so a
   * viewer who had already opened it right out is not stuck.
   */
  const entry = useRef({ boxes: 0, fov: 0 });
  /**
   * Set by the frame loop for the two conditions React cannot see.
   *
   * The walk input is a plain mutable module object with nothing subscribed to
   * it, and whether the tools panel is open is local state inside WalkOverlay -
   * so both are read the way a screen reader would, off the live DOM and off
   * the module, once a frame.
   */
  const [satisfied, setSatisfied] = useState(false);
  useEffect(() => {
    entry.current = { boxes, fov };
    setSatisfied(false);
    // Only when the step changes: this is a snapshot of the moment it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /*
   * HOLD THE CHROME UP FOR THE WHOLE TOUR.
   *
   * A card pointing at a control that has faded out points at nothing. Keyed
   * as 'tour', because the panels hold it too and one boolean cannot serve two
   * holders - see lib/rail.ts. Dropped at the last card, which is about the
   * fade and demonstrates it by letting it happen.
   */
  useEffect(() => {
    if (!running) return;
    holdRail('tour');
    return () => releaseRail('tour');
  }, [running]);

  const current = running ? STEPS[step] : null;
  useEffect(() => {
    if (current?.releasesRail) releaseRail('tour');
  }, [current]);

  /** The last card leaves with the chrome it just described. */
  useEffect(() => {
    if (current?.releasesRail && !railVisible) endTour();
  }, [current, railVisible]);

  useEffect(() => {
    if (!running) return;
    const measure = () => setFrame({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [running]);

  /*
   * One frame loop for the whole tour: one lookup, one rect, one read of the
   * walk input. It stops dead when the tour ends - a leaked frame loop here is
   * a permanent timer in a tool whose whole argument is that it gets out of the
   * way.
   *
   * An anchor is valid only when it is not inside `[inert]`. Every panel in the
   * slot is faded rather than unmounted and takes `inert` while it is not the
   * occupant, and the dock takes it the moment the rail fades - so that one
   * check covers the shut panel, the faded chrome and a mid-step panel swap.
   * Measuring the rect alone would find the block-out pencil with the panel
   * closed and draw a ring around nothing.
   */
  useEffect(() => {
    if (!current) {
      setRect(null);
      return;
    }
    let live = true;
    let warned = false;
    const find = (label: string) => {
      const el = document.querySelector(`[aria-label="${label}"]`);
      return el && !el.closest('[inert]') ? (el as HTMLElement) : null;
    };
    const tick = () => {
      if (!live) return;
      if (current.anchor) {
        const el = find(current.anchor) ?? (current.fallbackAnchor ? find(current.fallbackAnchor) : null);
        setRect(el ? el.getBoundingClientRect() : null);
        if (!el && !warned && import.meta.env?.DEV) {
          warned = true;
          console.warn(`Tour: no reachable control labelled "${current.anchor}"`);
        }
      } else setRect(null);
      if (current.markWalkZone && (walkInput.forward !== 0 || walkInput.strafe !== 0)) setSatisfied(true);
      // The panel the next card points into is opened by the viewer, never by
      // the tour - so this waits for the button itself to say it is open.
      if (current.anchor === 'Tools') {
        const tools = document.querySelector('[aria-label="Tools"]');
        if (tools?.getAttribute('aria-expanded') === 'true') setSatisfied(true);
      }
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(id);
    };
  }, [current]);

  /* What advances each card of its own accord. Next is always there as well. */
  useEffect(() => {
    if (!running) return;
    const done =
      satisfied ||
      (step === 1 && (fov >= 180 || Math.abs(fov - entry.current.fov) > 40)) ||
      (step === 3 && boxes > entry.current.boxes);
    if (!done) return;
    // A breath, so the card does not swap under a live thumb.
    const timer = setTimeout(nextStep, 400);
    return () => clearTimeout(timer);
  }, [running, step, fov, boxes, satisfied]);

  if (!running || !current) return null;

  const chip = `h-11 px-3 rounded-full border text-[11px] tracking-wide pointer-events-auto ${
    dark ? 'border-white/20 text-white/75' : 'border-black/15 text-black/60'
  }`;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" data-tour>
      {/*
        The walk corner, drawn once and only for its own card. Measured off
        window.innerWidth/innerHeight because that is literally what the stick
        zone reads - in dvh it would drift as iOS collapses its toolbar, and a
        mark that lies about where the stick is is worse than no mark.
      */}
      {current.markWalkZone && (
        <div
          aria-hidden
          className="absolute rounded-3xl border-2 border-dashed border-sky-500/40"
          style={{
            left: 8,
            width: frame.w * STICK_FRACTION - 16,
            top: frame.h * STICK_FRACTION + 8,
            height: frame.h * (1 - STICK_FRACTION) - 16,
          }}
        />
      )}

      {/* The ring: the app's one accent, and nothing else. No pulse and no
          glow - this tool's whole argument is that it is weightless, and a
          throbbing halo would be the loudest thing on the screen. It does not
          take the pointer, so the control inside it is pressed straight
          through. */}
      {rect && (
        <div
          aria-hidden
          className="absolute rounded-full border-2 border-sky-500 transition-all duration-200"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}

      {/* Only the two chips take a pointer: a look-drag begun over the card has
          to fall through to the gesture layer, because two of these cards ask
          for exactly that. */}
      <div
        role="status"
        aria-live="polite"
        className={`absolute top-safe-panel x-safe-panel inset-x-0 mx-auto max-w-[26rem] [@media(max-height:560px)]:mx-0 [@media(max-height:560px)]:mr-auto [@media(max-height:560px)]:max-w-[20rem] rounded-[1.75rem] border p-3 pointer-events-none ${chrome(dark)}`}
      >
        <div className="text-xs font-bold uppercase tracking-wide opacity-60">{current.headline}</div>
        <div className="text-sm leading-snug mt-1">{current.body}</div>
        <div className="flex items-center justify-between mt-2">
          {/* Same place, same size, every card, from the first frame. */}
          <button onClick={endTour} aria-label="Skip the tour" className={chip}>
            Skip
          </button>
          <span className="text-[11px] opacity-40">
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={step >= STEPS.length - 1 ? endTour : nextStep}
            aria-label={step >= STEPS.length - 1 ? 'Finish the tour' : 'Next step of the tour'}
            className={chip}
          >
            {step >= STEPS.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
