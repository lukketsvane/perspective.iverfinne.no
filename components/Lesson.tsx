import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import { chrome } from './ui';
import { CARDS, CAST, OPENING, pingPong, sweepAt, type Card, type Cast, type Gate, type Stage } from '../lib/lesson';
import { hideRail, holdRail, releaseRail } from '../lib/rail';

/**
 * The hand on the controls - and, on nine cards out of sixteen, the hand
 * coming off them.
 *
 * lib/lesson.ts is the score. This is the conductor: it takes the tool over,
 * stages each card, and gives the tool back exactly as it found it.
 *
 * WHY IT DRIVES THE REAL APP RATHER THAN DRAWING PICTURES OF IT. Every diagram
 * in a perspective book is a lie of omission: it shows the end of a
 * transformation and asks you to believe the middle. The facts this lesson
 * exists to teach are all about the middle - the second vanishing point
 * WALKING onto the page as you turn, the corners of a flat sheet STRETCHING as
 * the lens opens, the verticals GATHERING as you look up - and there is no
 * picture of any of them.
 *
 * AND WHY IT LETS GO. The first draft ran the whole thing as a performance and
 * it was a film: correct, watchable, and agreed with rather than learned. The
 * middle of a transformation is worth more when it is your own thumb moving
 * it, so most cards now stage themselves and then hand the controls over and
 * WAIT. `hands: 'viewer'` stops this loop writing to walkInput at all; the
 * gate measures what the viewer does instead, and when they have done it the
 * card grows a sentence that was not there before.
 *
 * The measuring is cumulative rather than absolute - how far you have turned
 * ALTOGETHER, not how far you have ended up from where you started - because
 * "turn all the way round" is satisfied by going round, and a viewer who
 * overshoots and comes back has still been round.
 *
 * WHAT IT PROMISES TO GIVE BACK. Everything it touched: what was standing on
 * the floor, where you were, the sheet, the field, the guides, the ruling. One
 * snapshot on the way in, put back on the way out, including when the viewer
 * walks out in the middle - which is the case that matters, because that is
 * what somebody does when they are bored, and finding your scene gone is how a
 * tool loses somebody for good.
 */

/** Ease in and out, for every move between one card's stage and the next. */
const smooth = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** The shortest way round from one bearing to another. */
const wrap = (angle: number) => {
  let gap = angle % (Math.PI * 2);
  if (gap > Math.PI) gap -= Math.PI * 2;
  if (gap < -Math.PI) gap += Math.PI * 2;
  return gap;
};

const mixAngle = (from: number, to: number, t: number) => from + wrap(to - from) * t;

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
     * The first run of this was performed from inside a Hughes H-1, which is a
     * fair description of what the tool looks like to somebody who has not
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

/**
 * How much of the asked-for movement has been made, 0 to 1.
 *
 * Three of the four are distances TRAVELLED and start at nothing. The field is
 * not: it is a place arrived at, and the card has already put it somewhere, so
 * it is measured from where the card left it rather than from zero. Measured
 * from zero the thread under the card was half full before the viewer had
 * touched anything, which reads as "you are half way" and is a lie about a
 * gesture nobody has begun.
 */
const progressOf = (
  gate: Gate,
  roam: { turned: number; pitched: number; walked: number; field: number }
) => {
  if (gate.kind === 'turn') return roam.turned / gate.radians;
  if (gate.kind === 'pitch') return roam.pitched / gate.radians;
  if (gate.kind === 'walk') return roam.walked / gate.metres;
  const opened = useStore.getState().fov - roam.field;
  return opened / Math.max(gate.past - roam.field, 1e-3);
};

export const Lesson: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const [at, setAt] = useState(0);
  /** Whether the viewer has done what this card asked. */
  const [answered, setAnswered] = useState(false);
  /** How far along they are, for the thread under the card. */
  const [progress, setProgress] = useState(0);
  const held = useRef<Held | null>(null);
  /** The stage the current move started from, so it can be tweened out of. */
  const from = useRef<Stage>(OPENING);
  const began = useRef(0);
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
    return () => {
      releaseRail('lesson');
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

  // The move into this card, and then whatever it - or the viewer - does next.
  useEffect(() => {
    const stage: Stage = { ...OPENING, ...card.stage };
    const start = from.current;
    began.current = performance.now();
    setAnswered(false);
    setProgress(0);

    /*
     * The discrete things happen at once; only the continuous ones are moved.
     *
     * A projection cannot be half-changed and neither can a cast, so tweening
     * them would mean picking a moment in the middle to switch - and the
     * moment that reads best is the beginning, because then the whole of the
     * move is spent settling into the new sheet rather than jumping at the end
     * of it. The four-point card is the case that decides this: the flat sheet
     * has just run out, and the cylinder arriving as the field opens is the
     * answer arriving in the middle of the question.
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

    /*
     * The chrome goes down for every card that does not need it, and comes
     * back for the two that do.
     *
     * Once on mount was not enough and the reason is effect order: the overlay
     * runs `releaseRail()` when the tools panel closes - the same commit the
     * lesson mounts in - and a release re-arms the six second timer rather
     * than hiding anything. A timeout of zero lands after every effect in the
     * commit. Doing it per card also means a viewer who tapped the tool back
     * gets the performance again when they ask for the next one.
     */
    const settle = window.setTimeout(() => {
      if (card.chrome) holdRail('lesson');
      else {
        releaseRail('lesson');
        hideRail();
      }
    }, 0);

    const travel = card.travel ?? 1800;
    const viewers = card.hands === 'viewer';
    let frame = 0;

    /** What the viewer has done since the controls were handed over. */
    const roam = { turned: 0, pitched: 0, walked: 0, field: stage.fov };
    let watching: { yaw: number; pitch: number; x: number; z: number } | null = null;
    let told = false;

    const step = () => {
      const now = performance.now();
      const moving = Math.min(1, (now - began.current) / travel);
      const eased = smooth(moving);

      if (moving < 1 || !viewers) {
        // The director still has it: either mid-move, or on a card that stays
        // a performance because what it shows cannot be done by hand.
        const sweep = card.sweep;
        const phase =
          sweep && moving >= 1
            ? pingPong((((now - began.current - travel) / 1000 / sweep.seconds) % 1 + 1) % 1)
            : 0;

        const field = sweep?.field ? sweepAt(sweep.field, phase) : stage.fov;
        const yaw = sweep?.yaw ? sweepAt(sweep.yaw, phase) : stage.stand.yaw;
        const pitch = sweep?.pitch ? sweepAt(sweep.pitch, phase) : stage.stand.pitch;

        useStore.setState({
          fov: mix(start.fov, field, eased),
          cameraHeight: mix(start.cameraHeight, stage.cameraHeight, eased),
        });

        /*
         * The surfaces, STEPPED rather than tweened, and off the raw elapsed
         * time rather than off the ping-pong above.
         *
         * A projection cannot be half-changed, so this is a slideshow of three
         * and not a blend between them - and it must run round and round in one
         * direction, because plane, cylinder, sphere is an argument with an
         * order to it and a ping-pong would play the middle of it twice as
         * often as the ends.
         */
        if (sweep?.surfaces && moving >= 1) {
          const each = (sweep.seconds * 1000) / sweep.surfaces.length;
          const showing = sweep.surfaces[
            Math.floor(((now - began.current - travel) / each)) % sweep.surfaces.length
          ];
          if (useStore.getState().perspectiveMode !== showing) {
            useStore.setState({ perspectiveMode: showing });
          }
        }

        walkInput.position.x = mix(start.stand.x, stage.stand.x, eased);
        walkInput.position.z = mix(start.stand.z, stage.stand.z, eased);
        walkInput.yaw = mixAngle(start.stand.yaw, yaw, eased);
        walkInput.pitch = mix(start.stand.pitch, pitch, eased);
        // The drag-to-look offsets are the viewer's, and they are not wanted
        // on top of a move the lesson is making.
        walkInput.lookYaw = 0;
        walkInput.lookPitch = 0;
      } else {
        /*
         * THE CONTROLS ARE THEIRS. Nothing is written here at all - not the
         * yaw, not the position, not the field - because a loop that keeps
         * assigning them is a loop the viewer is fighting, and the whole point
         * of the card is that the change is theirs.
         *
         * Measured cumulatively: how far they have turned ALTOGETHER, not how
         * far they have ended up from where they began. "Turn all the way
         * round" is answered by going round, and somebody who overshoots and
         * comes back has still been round.
         */
        if (!watching) {
          watching = {
            yaw: walkInput.yaw + walkInput.lookYaw,
            pitch: walkInput.pitch + walkInput.lookPitch,
            x: walkInput.position.x,
            z: walkInput.position.z,
          };
        }
        const yaw = walkInput.yaw + walkInput.lookYaw;
        const pitch = walkInput.pitch + walkInput.lookPitch;
        roam.turned += Math.abs(wrap(yaw - watching.yaw));
        roam.pitched += Math.abs(pitch - watching.pitch);
        roam.walked += Math.hypot(
          walkInput.position.x - watching.x,
          walkInput.position.z - watching.z
        );
        watching = { yaw, pitch, x: walkInput.position.x, z: walkInput.position.z };

        if (card.gate) {
          const done = Math.min(1, Math.max(0, progressOf(card.gate, roam)));
          setProgress(done);
          if (done >= 1 && !told) {
            told = true;
            setAnswered(true);
          }
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      // Whatever the card ended on is where the next one starts from - which
      // for a viewer's card is wherever THEY left it, so the next move sets
      // off from the picture they are actually looking at.
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

  const chip = `h-11 px-3 rounded-full border text-[11px] tracking-wide pointer-events-auto transition-colors ${
    dark ? 'border-white/20 text-white/75' : 'border-black/15 text-black/60'
  }`;
  /* The one accent this app has, on the one control that is the next thing to
     do - which on an answered card is Neste and on an unanswered one is the
     picture itself. */
  const ready = `h-11 px-3 rounded-full border text-[11px] tracking-wide pointer-events-auto transition-colors border-sky-500 text-sky-500`;

  const last = at >= CARDS.length - 1;
  const asking = !!card.gate && !answered;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        /* Capped and scrollable, because a card GROWS: the sentence that
            appears when you have done the thing is a third of its height
            again, and on a short screen held sideways the whole of it must
            still fit somewhere. */
        className={`absolute top-safe-panel x-safe-panel inset-x-0 mx-auto max-w-[26rem] max-h-[62vh] overflow-y-auto overscroll-contain rounded-[1.125rem] border p-3 pointer-events-none ${chrome(dark)}`}
      >
        <div className="text-xs font-bold uppercase tracking-wide opacity-60">{card.headline}</div>
        <div className="text-sm leading-snug mt-1">{card.body}</div>
        {/* The sentence that was not there a moment ago. It is the content of
            the card; everything above it was the setup. */}
        {answered && card.found && (
          <div className="text-sm leading-snug mt-2 pt-2 border-t border-current/15">
            {card.found}
          </div>
        )}
        {/* How far round, how far walked, how far open: a hairline that fills.
            Not a number - a shape, because what it is measuring is a gesture
            and nobody turning their head wants a percentage. */}
        {asking && (
          <div className={`h-px mt-2 ${dark ? 'bg-white/15' : 'bg-black/10'}`} aria-hidden>
            <div
              className="h-px bg-sky-500 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <button onClick={onDone} aria-label="Leave the lesson" className={chip}>
            {last ? 'Ferdig' : 'Hopp over'}
          </button>
          {/* Sixteen marks rather than "4 / 16": at this length what a viewer
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
              useStore.setState({
                instrument: 'block',
                models: held.current?.models ?? [],
                lamps: held.current?.lamps ?? [],
              });
              onDone();
            }}
            aria-label={last ? 'Finish the lesson' : 'Next card of the lesson'}
            /* Never disabled while a card is asking for something: a viewer who
               cannot do the gesture - a desktop with no stick, a hand that has
               had enough - must always be able to go on. It simply stops being
               the accented thing until the picture has answered. */
            className={asking ? chip : ready}
          >
            {last ? 'Teikn' : 'Neste'}
          </button>
        </div>
      </div>
    </div>
  );
};
