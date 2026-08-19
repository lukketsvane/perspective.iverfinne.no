import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import { chrome } from './ui';
import { CARDS, CAST, OPENING, pingPong, sweepAt, type Card, type Cast, type Stage } from '../lib/lesson';
import { hideRail } from '../lib/rail';

/**
 * The hand on the controls.
 *
 * lib/lesson.ts is the score - twelve cards, each naming a state the app
 * should be in and, for three of them, a slow change to make while the card is
 * up. This is the conductor: it takes the tool over, moves it, and gives it
 * back exactly as it found it.
 *
 * WHY IT DRIVES THE REAL APP RATHER THAN DRAWING PICTURES OF IT. Every diagram
 * in a perspective book is a lie of omission: it shows the end of a
 * transformation and asks you to believe the middle. The three facts this
 * lesson exists to teach are all about the middle - the second vanishing point
 * WALKING onto the page as you turn, the corners of a flat sheet STRETCHING as
 * the lens opens, the verticals GATHERING as you look up - and there is no
 * picture of any of them. There is only the thing happening, which this app
 * can do at sixty frames a second because it was already built to.
 *
 * WHAT IT PROMISES TO GIVE BACK. Everything it touched: what was standing on
 * the floor, where you were, the sheet, the field, the guides, the ruling. It
 * takes one snapshot on the way in and puts it back on the way out, including
 * when the viewer walks out in the middle - which is the case that matters,
 * because that is the one somebody does when they are bored, and finding your
 * scene gone is how a tool loses somebody for good.
 *
 * It deliberately does NOT hold the chrome up. The dock fades on its own six
 * seconds after the last touch, which during a lesson is exactly right: what
 * is left is the picture and one card, and a tap brings the tool back whenever
 * it is wanted.
 */

/** Ease in and out, for every move between one card's stage and the next. */
const smooth = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** The shortest way round from one bearing to another. */
const mixAngle = (from: number, to: number, t: number) => {
  let gap = (to - from) % (Math.PI * 2);
  if (gap > Math.PI) gap -= Math.PI * 2;
  if (gap < -Math.PI) gap += Math.PI * 2;
  return from + gap * t;
};

/** A cast, as boxes the store can hold. */
const boxesFor = (cast: Cast, turn: number, surface: ReturnType<typeof useStore.getState>['surface']) =>
  CAST[cast].map(([x, z], at) => ({
    id: `lesson-${cast}-${at}`,
    position: [x, 0.5, z] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
    rotation: [0, turn, 0] as [number, number, number],
    surface,
  }));

/** Everything the lesson is allowed to touch, so it can all be put back. */
const snapshot = () => {
  const state = useStore.getState();
  return {
    boxes: state.boxes,
    /*
     * The meshes and the lamps go too, and come back.
     *
     * The lesson's stage is a bare floor and some cubes, and it has to be:
     * every card is about where the EDGES of a form point, and the shelf's
     * objects are scanned aircraft and horses with no straight edge on them.
     * The first run of this was performed from inside a Hughes H-1, which is
     * a fair description of what the tool looks like to somebody who has not
     * been told what it is for.
     */
    models: state.models,
    lamps: state.lamps,
    selectedId: state.selectedId,
    selectedModelId: state.selectedModelId,
    fov: state.fov,
    perspectiveMode: state.perspectiveMode,
    guides: state.guides,
    selectionGuides: state.selectionGuides,
    gridX: state.gridX,
    gridZ: state.gridZ,
    cameraHeight: state.cameraHeight,
    instrument: state.instrument,
    stand: {
      x: walkInput.position.x,
      z: walkInput.position.z,
      yaw: walkInput.yaw,
      pitch: walkInput.pitch,
    },
  };
};

type Held = ReturnType<typeof snapshot>;

export const Lesson: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const [at, setAt] = useState(0);
  const held = useRef<Held | null>(null);
  /*
   * WHETHER TO PUT IT ALL BACK, and the two ways out mean different things.
   *
   * Walking out means "this is not what I came for": the scene, the sheet and
   * the place you were standing all return, because finding your work gone is
   * how a tool loses somebody for good.
   *
   * Reaching the end means the opposite. The last card's whole subject is that
   * you now have the sheet - ruled, at five point, with a cube on it and its
   * own six points showing - and the honest thing to do with that is to hand
   * it over with the pencil in it rather than to sweep it away and give back
   * the blank page somebody arrived with.
   */
  const restore = useRef(true);
  /** The stage the current move started from, so it can be tweened out of. */
  const from = useRef<Stage>(OPENING);
  const began = useRef(0);
  const card: Card = CARDS[Math.min(at, CARDS.length - 1)];

  // The whole state of the tool, taken once, before a single thing is moved.
  useEffect(() => {
    held.current = snapshot();
    /*
     * The lesson stands the drawing instruments down as it starts.
     *
     * A block-out pencil still armed while the world is being turned under it
     * is a pencil that draws a box across three of the cards - and the last
     * card hands it back deliberately, which it cannot do if it was never put
     * away.
     */
    useStore.setState({ instrument: 'none', selectedModelId: null, models: [], lamps: [] });
    // The dock is not part of the performance. A touch brings it back.
    hideRail();
    return () => {
      const was = held.current;
      if (!was || !restore.current) return;
      useStore.setState({
        boxes: was.boxes,
        models: was.models,
        lamps: was.lamps,
        selectedId: was.selectedId,
        selectedModelId: was.selectedModelId,
        fov: was.fov,
        perspectiveMode: was.perspectiveMode,
        guides: was.guides,
        selectionGuides: was.selectionGuides,
        gridX: was.gridX,
        gridZ: was.gridZ,
        cameraHeight: was.cameraHeight,
        instrument: was.instrument,
      });
      walkInput.position.x = was.stand.x;
      walkInput.position.z = was.stand.z;
      walkInput.yaw = was.stand.yaw;
      walkInput.pitch = was.stand.pitch;
    };
  }, []);

  /*
   * Chrome down while a card is up, and back for the last one.
   *
   * A lesson is a performance, and a performance with a toolbar over it is a
   * screenshot of a menu. The hold above keeps the card's own row alive; the
   * dock is a different column and stays out of the way until the viewer asks
   * for it - except on the last card, whose entire subject is the controls.
   */

  // The move into this card, and then whatever it does while it sits there.
  useEffect(() => {
    const stage: Stage = { ...OPENING, ...card.stage };
    const start = from.current;
    began.current = performance.now();

    /*
     * The discrete things happen at once; only the continuous ones are moved.
     *
     * A projection cannot be half-changed and neither can a cast, so tweening
     * them would mean picking a moment in the middle to switch - and the
     * moment that reads best is the beginning, because then the whole of the
     * move is spent settling into the new sheet rather than jumping at the end
     * of it. Card eight is the case that decides this: the flat sheet has just
     * run out, and the cylinder arriving as the field opens is the answer
     * arriving in the middle of the question.
     */
    const surface = useStore.getState().surface;
    const cast = boxesFor(stage.cast, stage.turn, surface);
    useStore.setState({
      perspectiveMode: stage.mode,
      guides: stage.guides,
      selectionGuides: stage.selectionGuides,
      gridX: stage.gridX,
      gridZ: stage.gridZ,
      boxes: cast,
      // The first of the cast is what the selection's own construction rules
      // to, which is how a card asks for one cube's six points.
      selectedId: stage.selectionGuides > 0 && cast.length > 0 ? cast[0].id : null,
      selectedModelId: null,
    });

    const travel = card.travel ?? 1000;
    let frame = 0;

    /*
     * The chrome goes down for every card, not just the first.
     *
     * Once on mount was not enough and the reason is effect order: the overlay
     * runs `releaseRail()` when the tools panel closes - which is the same
     * commit the lesson mounts in - and a release re-arms the six second timer
     * rather than hiding anything. So the first card came up with the dock
     * over it. A timeout of zero lands after every effect in the commit, and
     * doing it per card means a viewer who tapped to bring the tool back gets
     * the performance again when they ask for the next one.
     */
    const settle = window.setTimeout(hideRail, 0);

    const step = () => {
      const now = performance.now();
      const moving = Math.min(1, (now - began.current) / travel);
      const eased = smooth(moving);

      // Where the sweep has got to, once the move into the card is over.
      const sweep = card.sweep;
      const phase =
        sweep && moving >= 1
          ? pingPong((((now - began.current - travel) / 1000 / sweep.seconds) % 1 + 1) % 1)
          : 0;

      const field = sweep?.field ? sweepAt(sweep.field, phase) : stage.fov;
      const yaw = sweep?.yaw ? sweepAt(sweep.yaw, phase) : stage.stand.yaw;
      const pitch = sweep?.pitch ? sweepAt(sweep.pitch, phase) : stage.stand.pitch;
      const turn = sweep?.turn ? sweepAt(sweep.turn, phase) : stage.turn;

      useStore.setState((state) => {
        const next: Partial<typeof state> = {
          fov: mix(start.fov, field, eased),
          cameraHeight: mix(start.cameraHeight, stage.cameraHeight, eased),
        };
        // The cube's own turn, when a card is about turning it. Rewritten in
        // place rather than through updateBox: this is a performance, not an
        // edit, and it must not land in the history the viewer takes back to.
        if (sweep?.turn && moving >= 1) {
          next.boxes = state.boxes.map((box) => ({
            ...box,
            rotation: [box.rotation[0], turn, box.rotation[2]] as [number, number, number],
          }));
        }
        return next;
      });

      walkInput.position.x = mix(start.stand.x, stage.stand.x, eased);
      walkInput.position.z = mix(start.stand.z, stage.stand.z, eased);
      walkInput.yaw = mixAngle(start.stand.yaw, yaw, eased);
      walkInput.pitch = mix(start.stand.pitch, pitch, eased);
      // The drag-to-look offsets are the viewer's, and they are not wanted on
      // top of a move the lesson is making.
      walkInput.lookYaw = 0;
      walkInput.lookPitch = 0;

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      // Whatever the card ended on is where the next one starts from.
      from.current = {
        ...stage,
        fov: useStore.getState().fov,
        stand: {
          x: walkInput.position.x,
          z: walkInput.position.z,
          yaw: walkInput.yaw,
          pitch: walkInput.pitch,
        },
      };
    };
  }, [at, card]);

  const chip = `h-11 px-3 rounded-full border text-[11px] tracking-wide pointer-events-auto ${
    dark ? 'border-white/20 text-white/75' : 'border-black/15 text-black/60'
  }`;

  const last = at >= CARDS.length - 1;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={`absolute top-safe-panel x-safe-panel inset-x-0 mx-auto max-w-[26rem] rounded-[1.125rem] border p-3 pointer-events-none ${chrome(dark)}`}
      >
        <div className="text-xs font-bold uppercase tracking-wide opacity-60">{card.headline}</div>
        <div className="text-sm leading-snug mt-1">{card.body}</div>
        <div className="flex items-center justify-between mt-2">
          <button onClick={onDone} aria-label="Leave the lesson" className={chip}>
            {last ? 'Ferdig' : 'Hopp over'}
          </button>
          {/* Twelve marks rather than "4 / 12": at this length what a viewer
              wants is a shape, not a sum. */}
          <div className="flex items-center gap-1" aria-hidden>
            {CARDS.map((_, mark) => (
              <span
                key={mark}
                className={`rounded-full transition-all duration-300 ${
                  mark === at
                    ? 'w-1.5 h-1.5 bg-sky-500'
                    : `w-1 h-1 ${mark < at ? 'opacity-40' : 'opacity-20'} ${dark ? 'bg-white' : 'bg-black'}`
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (!last) {
                setAt((was) => was + 1);
                return;
              }
              // The sheet stays, and the pencil comes back into the hand it
              // was taken out of. See `restore` above for why this exit is not
              // the same exit as walking away.
              restore.current = false;
              // The sheet and the cube stay; what was standing on the floor
              // before comes back with them, because the lesson borrowed it
              // rather than replacing it.
              useStore.setState({
                instrument: 'block',
                models: held.current?.models ?? [],
                lamps: held.current?.lamps ?? [],
              });
              onDone();
            }}
            aria-label={last ? 'Finish the lesson' : 'Next card of the lesson'}
            className={chip}
          >
            {last ? 'Teikn' : 'Neste'}
          </button>
        </div>
      </div>
    </div>
  );
};
