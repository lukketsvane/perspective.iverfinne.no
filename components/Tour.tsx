import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { chrome } from './ui';
import { holdRail, releaseRail, useRail } from '../lib/rail';
import { walkInput } from '../lib/walkInput';
import { endTour, nextStep, STEPS, useTourStep, type Gate, type TourStep } from '../lib/tour';

/**
 * The nine cards, the ring, the line between them, and the gesture.
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
 * WHICH MEANS THE CARD IS ALWAYS FAR FROM WHAT IT IS ABOUT - the length of the
 * screen, on a phone. A ring alone leaves the viewer to notice a circle in
 * their peripheral vision and connect it to a sentence at the other end, and on
 * the step that rings a control inside a panel there are twenty round buttons
 * within a thumb's width of the right one. So the ring does not work alone:
 *
 *   THE LINE joins the card to the ring, so the two are read as one object.
 *   THE RING takes the control's own corner radius, so a round button gets a
 *     circle and a shelf tile gets a rounded square rather than a hoop around a
 *     square peg.
 *   THE GESTURE says how - a tap ripple, an arrow along the axis the control
 *     actually reads, the two strokes a box is drawn with. Half the controls
 *     here are dragged and no ring can say that.
 *
 * ON MOTION. The house rule is that nothing here pulses or glows: this tool's
 * whole argument is that it is weightless, and a throbbing halo would be the
 * loudest thing on screen. The ring and the line obey that - they are drawn
 * once and they hold still. The gesture glyph does not, and it is the one
 * exception in the app: a static arrow is a picture of a drag, an arrow with
 * something travelling down it IS the drag, and this is the only place in the
 * tool whose job is to teach a movement. It is small, it is one direction, it
 * is off entirely under prefers-reduced-motion, and it is gone the moment the
 * step is satisfied.
 *
 * NO SCRIM, EVER. Every step here needs the viewer to touch the thing
 * underneath it, and this app has no scrims by policy: a dimming layer over a
 * live WebGL canvas either blurs - resampling the whole frame on the device
 * this actually runs on - or hides the drawing the step is about.
 *
 * IT NEVER TOUCHES THE SLOT. No panel is opened, none is closed, no instrument
 * is armed and nothing is written to the scene. Every card ends because the
 * viewer did the thing the card asked for, or pressed Neste.
 */

/** Matching `isStickZone` in WalkOverlay exactly. */
const STICK_FRACTION = 0.45;

/** The app's one accent, as a value the SVG can use. */
const ACCENT = 'rgb(14 165 233)';

/**
 * The footprint stroke of the block-out glyph, and the way its head is turned.
 *
 * A fixed run rather than a fraction of the window: it is a diagram of a
 * gesture, not a target to hit, and one that stretched with the viewport would
 * be a hand-span on a phone and a stride on a desktop for no reason. Down and
 * to the right, because that is a footprint running away from the eye on a
 * floor drawn in perspective.
 */
const DRAG = { x: 86, y: 40, deg: (Math.atan2(40, 86) * 180) / Math.PI };

/**
 * Which way the viewer is facing, read off the pair a look-drag actually
 * writes.
 *
 * There are two pairs, and which one moves depends on whether the phone's
 * orientation sensor is driving: with it, a drag turns you ON TOP of the
 * sensor's heading and writes lookYaw/lookPitch; without it - every desktop,
 * and every phone that has not granted the sensor - the drag IS the heading and
 * writes yaw/pitch. This branch is the same one the pointer handler in
 * WalkOverlay branches on, and it has to be: watching only the sensor pair
 * meant the first card of the tour never passed on a desktop, which is where it
 * was being read.
 */
const heading = () =>
  walkInput.useDeviceOrientation
    ? { yaw: walkInput.lookYaw, pitch: walkInput.lookPitch }
    : { yaw: walkInput.yaw, pitch: walkInput.pitch };

/**
 * What the frame loop reports back, all of it measured off the live DOM.
 *
 * One object rather than four pieces of state so that a frame publishes one
 * consistent picture - a rect from this frame with a satisfied flag from the
 * last is how a ring ends up drawn around the wrong thing for one frame.
 */
interface Sighting {
  rect: DOMRect | null;
  /** The anchor's own corner radius, so the ring is its shape and not a hoop. */
  radius: number;
  /** Where the card actually ends, so the line leaves it rather than near it. */
  cardBottom: number;
  done: boolean;
}

const NOTHING: Sighting = { rect: null, radius: 0, cardBottom: 0, done: false };

export const Tour: React.FC = () => {
  const step = useTourStep();
  const running = step >= 0;
  const dark = useStore((s) => s.theme) === 'dark';
  const railVisible = useRail();
  const boxes = useStore((s) => s.boxes.length);
  const fov = useStore((s) => s.fov);
  const instrument = useStore((s) => s.instrument);
  const presetName = useStore((s) => s.presetName);

  const [sighting, setSighting] = useState<Sighting>(NOTHING);
  const card = useRef<HTMLDivElement>(null);
  /** Re-measured on resize, because the stick zone is read off the window. */
  const [frame, setFrame] = useState(() => ({
    w: typeof window === 'undefined' ? 0 : window.innerWidth,
    h: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  /*
   * Where everything stood when this card opened.
   *
   * Every gate is measured against this rather than against zero, because the
   * seat in the panel replays the tour on a tool that has been used: a box NEW
   * since the card appeared, a lens moved FROM where it was, a page dealt after
   * the card asked for one. Against absolutes, a viewer who already had three
   * boxes would find four cards answering themselves the instant they opened.
   */
  const entry = useRef({ boxes: 0, fov: 0, yaw: 0, pitch: 0, preset: null as string | null });
  useEffect(() => {
    entry.current = {
      boxes,
      fov,
      ...heading(),
      preset: presetName,
    };
    setSighting(NOTHING);
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

  const current: TourStep | null = running ? STEPS[step] : null;
  useEffect(() => {
    if (current?.releasesRail) releaseRail('tour');
  }, [current]);

  /** The last card leaves with the chrome it just described. */
  useEffect(() => {
    if (current?.releasesRail && !railVisible) endTour();
  }, [current, railVisible]);

  /*
   * THE HEADING BASELINE IS TAKEN ON TOUCH, NOT WHEN THE CARD OPENS.
   *
   * "Has the view turned" cannot be answered by comparing against the moment
   * the card appeared, because the app turns the view itself: the opening scene
   * cannot say where to stand until it knows how big the thing it is framing
   * is, so it seeds the walker's heading a beat after mount - which is a beat
   * after the tour arms. Measured from the card's own opening, that seeding read
   * as a drag and the first card of the tour answered itself before anyone had
   * touched the screen.
   *
   * Re-baselining on every pointerdown says the thing actually meant: the view
   * turned DURING A TOUCH. A tap moves the baseline and passes nothing; the app
   * moving the camera on its own moves it too, and is likewise not a gesture.
   */
  useEffect(() => {
    if (!running) return;
    const rebase = () => {
      const now = heading();
      entry.current.yaw = now.yaw;
      entry.current.pitch = now.pitch;
    };
    window.addEventListener('pointerdown', rebase, true);
    return () => window.removeEventListener('pointerdown', rebase, true);
  }, [running]);

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
   * ONE FRAME LOOP FOR THE WHOLE TOUR: one lookup, one rect, one read of the
   * walk input, one gate. It stops dead when the tour ends - a leaked frame
   * loop here is a permanent timer in a tool whose whole argument is that it
   * gets out of the way.
   *
   * The gates that live out here rather than in React's own dependency list do
   * so because React cannot see them: the walk input is a plain mutable module
   * object with nothing subscribed to it, and whether a panel is open is local
   * state inside WalkOverlay. Both are read the way a screen reader would - off
   * the module, and off the live DOM.
   *
   * An anchor is valid only when it is not inside `[inert]`. Every panel in the
   * slot is faded rather than unmounted and takes `inert` while it is not the
   * occupant, and the dock takes it the moment the rail fades - so that one
   * check covers the shut panel, the faded chrome and a mid-step panel swap.
   * Measuring the rect alone would find the block-out pencil with the shelf
   * closed and draw a ring around nothing.
   */
  useEffect(() => {
    if (!current) {
      setSighting(NOTHING);
      return;
    }
    let live = true;
    let warned = false;
    const find = (label: string) => {
      const el = document.querySelector(`[aria-label="${label}"]`);
      return el && !el.closest('[inert]') ? (el as HTMLElement) : null;
    };
    const open = (label: string) => find(label)?.getAttribute('aria-expanded') === 'true';

    /** Everything the DOM and the module can answer. The store's half is below. */
    const passed = (gate: Gate | undefined): boolean => {
      switch (gate) {
        case 'look': {
          const now = heading();
          return (
            Math.abs(now.yaw - entry.current.yaw) > 0.12 ||
            Math.abs(now.pitch - entry.current.pitch) > 0.12
          );
        }
        case 'walk':
          return walkInput.forward !== 0 || walkInput.strafe !== 0;
        case 'tools':
          return open('Tools');
        // The shelf has no aria-expanded to ask - "Add model" swaps between two
        // shelves rather than toggling one panel - so the shelf itself answers,
        // by way of a tile that exists nowhere else.
        case 'shelf':
          return find('Add cube') !== null;
        default:
          return false;
      }
    };

    const tick = () => {
      if (!live) return;
      let rect: DOMRect | null = null;
      let radius = 0;
      if (current.anchor) {
        const el = find(current.anchor) ?? (current.fallbackAnchor ? find(current.fallbackAnchor) : null);
        if (el) {
          rect = el.getBoundingClientRect();
          radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        } else if (!warned && import.meta.env?.DEV) {
          warned = true;
          console.warn(`Tour: no reachable control labelled "${current.anchor}"`);
        }
      }
      // Measured, not guessed: the card's height is however far its copy wraps,
      // which is a different number on every card and at every width. A line
      // that starts at a fixed distance down the viewport either leaves a gap
      // under the card or begins inside it, and both read as two marks rather
      // than one.
      const cardBottom = card.current ? card.current.getBoundingClientRect().bottom + 6 : 0;
      const done = passed(current.gate);
      setSighting((was) =>
        // Same picture, same object: setState with a fresh object every frame
        // re-renders the whole overlay sixty times a second for nothing.
        was.rect?.top === rect?.top &&
        was.rect?.left === rect?.left &&
        was.rect?.width === rect?.width &&
        was.radius === radius &&
        was.cardBottom === cardBottom &&
        was.done === done
          ? was
          : { rect, radius, cardBottom, done }
      );
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(id);
    };
  }, [current]);

  /*
   * What advances each card of its own accord.
   *
   * The three gates React CAN see are here, where they cost nothing: a store
   * subscription already re-runs this the moment any of them moves. The rest
   * arrive as `sighting.done` from the loop above. Neste is always there as
   * well, for anyone who would rather read than do.
   */
  useEffect(() => {
    if (!running || !current) return;
    const done =
      sighting.done ||
      // Moved a long way from where the card found it, and nothing else. It
      // used to pass on `fov >= 180` as well, which was a shortcut for "wide
      // enough to have seen the sheet bow" back when the tool opened at 90.
      // It opens at 210 now, so that clause was true before the card appeared
      // and the step answered itself.
      (current.gate === 'lens' && Math.abs(fov - entry.current.fov) > 30) ||
      (current.gate === 'box' && boxes > entry.current.boxes) ||
      (current.gate === 'pencil' && instrument === 'block') ||
      (current.gate === 'page' && presetName !== entry.current.preset);
    if (!done) return;
    // A breath, so the card does not swap under a live thumb - and long enough
    // that the tick the ring turns green on is actually seen.
    const timer = setTimeout(nextStep, 450);
    return () => clearTimeout(timer);
  }, [running, current, sighting.done, fov, boxes, instrument, presetName]);

  if (!running || !current) return null;

  const chip = `h-11 px-3 rounded-full border text-[11px] tracking-wide pointer-events-auto ${
    dark ? 'border-white/20 text-white/75' : 'border-black/15 text-black/60'
  }`;

  const { rect, radius, cardBottom, done } = sighting;
  /*
   * Where the line from the card lands.
   *
   * The card is at the top and every anchor is below it, so the line always
   * runs downwards and always meets the ring at its top edge. Anything cleverer
   * - nearest edge, shortest path - buys nothing on a layout where one end is
   * pinned to the top band and the other is along the bottom.
   */
  const target = rect ? { x: rect.left + rect.width / 2, y: rect.top - 6 } : null;
  const walkZone = {
    x: 8,
    y: frame.h * STICK_FRACTION + 8,
    w: frame.w * STICK_FRACTION - 16,
    h: frame.h * (1 - STICK_FRACTION) - 16,
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" data-tour>
      {/*
        Every mark except the card, in one SVG over the whole window.
        Absolutely-positioned divs cannot draw a line between two points, and
        four separately positioned elements is four layouts to keep in step; one
        viewport-sized SVG in CSS pixels is one coordinate system, and the same
        one getBoundingClientRect answers in.
      */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox={`0 0 ${frame.w} ${frame.h}`}
        style={{ color: ACCENT }}
      >
        <style>{`
          @keyframes tour-run { to { stroke-dashoffset: -24 } }
          @keyframes tour-tap { 0% { r: 14; opacity: .55 } 70%, 100% { r: 30; opacity: 0 } }
          .tour-run { animation: tour-run 1.1s linear infinite }
          .tour-tap { animation: tour-tap 1.8s ease-out infinite }
          @media (prefers-reduced-motion: reduce) {
            .tour-run, .tour-tap { animation: none }
            .tour-tap { opacity: .35 }
          }
        `}</style>

        {/* THE LINE. From under the card down to the ring, and a dot where it
            lands, so the eye is delivered rather than pointed. */}
        {target && (
          <g opacity={done ? 0.25 : 0.55}>
            <path
              d={`M ${target.x} ${cardBottom} L ${target.x} ${target.y}`}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="2 5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={target.x} cy={cardBottom} r={2.5} fill="currentColor" />
          </g>
        )}

        {/* THE RING, in the anchor's own shape. Not a pulse and not a glow: it
            is drawn once and it holds still, and the only thing that ever
            changes about it is that it goes solid when the step is done. */}
        {rect && (
          <rect
            x={rect.left - 5}
            y={rect.top - 5}
            width={rect.width + 10}
            height={rect.height + 10}
            rx={radius > 0 ? radius + 5 : 7}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            opacity={done ? 1 : 0.9}
            style={{ transition: 'all 200ms' }}
          />
        )}

        {/* THE GESTURE, over the anchor, and only until it has been made. */}
        {!done && current.gesture === 'tap' && rect && (
          <circle
            className="tour-tap"
            cx={rect.left + rect.width / 2}
            cy={rect.top + rect.height / 2}
            r={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
        )}

        {/* Sideways, under the control, because sideways is the only axis a
            round control in this app reads. */}
        {!done && current.gesture === 'dragX' && rect && (
          <g transform={`translate(${rect.left + rect.width / 2} ${rect.bottom + 14})`}>
            <path
              className="tour-run"
              d="M -34 0 L 34 0"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 34 0 l -7 -5 v 10 z" fill="currentColor" />
            <path d="M -34 0 l 7 -5 v 10 z" fill="currentColor" />
          </g>
        )}

        {/* Look and walk have no control to sit on, so they are drawn where the
            gesture is actually made: across the middle of the picture, and
            inside the stick quadrant. */}
        {!done && current.gesture === 'dragFree' && (
          <g transform={`translate(${frame.w / 2} ${frame.h * 0.42})`} opacity={0.8}>
            <path
              className="tour-run"
              d="M -60 0 L 60 0"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 60 0 l -8 -6 v 12 z" fill="currentColor" />
            <path d="M -60 0 l 8 -6 v 12 z" fill="currentColor" />
          </g>
        )}

        {/* The stick quadrant, measured off window.innerWidth/innerHeight
            because that is literally what isStickZone reads - in dvh it would
            drift as iOS collapses its toolbar, and a mark that lies about where
            the stick is is worse than no mark. */}
        {current.markWalkZone && (
          <>
            <rect
              x={walkZone.x}
              y={walkZone.y}
              width={walkZone.w}
              height={walkZone.h}
              rx={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="7 7"
              opacity={done ? 0.25 : 0.45}
            />
            {!done && (
              <g transform={`translate(${walkZone.x + walkZone.w / 2} ${walkZone.y + walkZone.h / 2})`}>
                <circle className="tour-tap" r={14} fill="none" stroke="currentColor" strokeWidth={2} />
                <path
                  className="tour-run"
                  d="M 0 26 L 0 -26"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M 0 -26 l -6 8 h 12 z" fill="currentColor" />
              </g>
            )}
          </>
        )}

        {/* The two strokes a box is drawn with, laid out where the floor is:
            below the horizon and off to the right, clear of the stick quadrant
            and clear of the dock. The same place the harness draws its box, and
            for the same reasons. */}
        {!done && current.gesture === 'blockOut' && (
          <g transform={`translate(${frame.w * 0.5} ${frame.h * 0.66})`} opacity={0.9}>
            {/* One: the footprint, dragged out across the floor. The head is
                turned to lie along the stroke - an arrowhead drawn as a fixed
                little triangle points wherever it was authored, which on a
                sloping run is a second arrow disagreeing with the first. */}
            <path
              className="tour-run"
              d={`M 0 0 L ${DRAG.x} ${DRAG.y}`}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeLinecap="round"
              fill="none"
            />
            <g transform={`translate(${DRAG.x} ${DRAG.y}) rotate(${DRAG.deg})`}>
              <path d="M 0 0 l -9 -6 v 12 z" fill="currentColor" />
            </g>
            <text x={0} y={-10} fill="currentColor" fontSize={13} fontWeight={700} textAnchor="middle">
              1
            </text>
            {/* Two: the height, pulled straight up from where the first ended. */}
            <g transform={`translate(${DRAG.x} ${DRAG.y})`}>
              <path
                className="tour-run"
                d="M 0 0 L 0 -56"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M 0 -56 l -6 9 h 12 z" fill="currentColor" />
              <text x={14} y={-34} fill="currentColor" fontSize={13} fontWeight={700}>
                2
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Only the two chips take a pointer: a look-drag begun over the card has
          to fall through to the gesture layer, because three of these cards ask
          for exactly that. */}
      <div
        ref={card}
        role="status"
        aria-live="polite"
        className={`absolute top-safe-panel x-safe-panel inset-x-0 mx-auto max-w-[26rem] [@media(max-height:560px)]:mx-0 [@media(max-height:560px)]:mr-auto [@media(max-height:560px)]:max-w-[20rem] rounded-[1.125rem] border p-3 pointer-events-none ${chrome(dark)}`}
      >
        <div className="text-xs font-bold uppercase tracking-wide opacity-60">{current.headline}</div>
        <div className="text-sm leading-snug mt-1">{current.body}</div>
        <div className="flex items-center justify-between mt-2">
          {/* Same place, same size, every card, from the first frame. The
              labels are what the viewer reads; the aria-labels are the names
              the tour and the harness anchor on, and stay English with every
              other one in the app. */}
          <button onClick={endTour} aria-label="Skip the tour" className={chip}>
            Hopp over
          </button>
          {/* Nine dots rather than "4 / 9". At this length a viewer wants to
              know how much is left, which is a shape rather than a sum - and
              the filled one moving along is the only progress the tour keeps. */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, at) => (
              <span
                key={at}
                className={`rounded-full transition-all duration-300 ${
                  at === step
                    ? 'w-1.5 h-1.5 bg-sky-500'
                    : `w-1 h-1 ${at < step ? 'opacity-40' : 'opacity-20'} ${dark ? 'bg-white' : 'bg-black'}`
                }`}
              />
            ))}
          </div>
          <button
            onClick={step >= STEPS.length - 1 ? endTour : nextStep}
            aria-label={step >= STEPS.length - 1 ? 'Finish the tour' : 'Next step of the tour'}
            className={chip}
          >
            {step >= STEPS.length - 1 ? 'Ferdig' : 'Neste'}
          </button>
        </div>
      </div>
    </div>
  );
};
