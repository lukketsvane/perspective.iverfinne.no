import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import { ACTS, CARDS, CAST, OPENING, pingPong, sweepAt, type Act, type Card, type Cast, type Gate, type Stage } from '../lib/lesson';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { loadModelFromUrl } from '../lib/loadModel';
import { holdRail, muteRail, releaseRail, unmuteRail } from '../lib/rail';

/**
 * The hand on the controls - and, on ten cards out of twenty-two, the hand
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
  CAST[cast].map(([x, z, height], at) => {
    // A metre unless the cast says otherwise, and standing ON the floor rather
    // than centred on it - which is the whole of what the eye-level cards are
    // about, so it cannot be approximated.
    const tall = height ?? 1;
    return {
      id: `lesson-${cast}-${at}`,
      position: [x, tall / 2, z] as [number, number, number],
      scale: [1, tall, 1] as [number, number, number],
      rotation: [0, turn, 0] as [number, number, number],
      surface,
    };
  });

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
  /*
   * The tone the words stand on: the page's own mount, not a colour of this
   * component's choosing. The same argument the lens gate's matting makes - a
   * wash has to read as the mount the drawing is on rather than as a scrim
   * somebody laid over it, and this app has twenty-three possible mounts.
   */
  const backdrop = useStore((s) => s.backdrop);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const tone = backdrop === 'paper' ? backgroundGray : backdrop;
  const wash = `rgba(${tone}, ${tone}, ${tone}, 0.9)`;
  const [at, setAt] = useState(0);
  /** Whether the viewer has done what this card asked. */
  const [answered, setAnswered] = useState(false);
  /** How far along they are, for the thread under the instruction. */
  const [progress, setProgress] = useState(0);
  /**
   * The act title standing over the picture, if one is.
   *
   * Held for two and a half seconds at the top of each of the four acts, with
   * the words underneath faded out behind it. It is the only full-screen
   * moment in the app and the only place a single word is the whole picture.
   */
  const [curtain, setCurtain] = useState<Act | null>(
    () => ACTS.find((act) => act.at === 0) ?? null
  );
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
      unmuteRail('lesson');
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
      // The stage is cleared of figures with every card and refilled below if
      // this one names any, so a card never inherits the last card's company.
      models: [],
      // The first of the cast is what the selection's own construction rules
      // to, which is how a card asks for one cube's six points.
      selectedId: stage.selectionGuides > 0 && cast.length > 0 ? cast[0].id : null,
      selectedModelId: null,
    });

    /*
     * The figures arrive when they arrive. The card is not held for a fetch:
     * the boxes are the lesson, the astronaut is company, and on the second
     * meeting the loader already holds the parsed file so he is simply there.
     */
    let standing = true;
    if (stage.figures?.length) {
      void Promise.all(
        stage.figures.map(({ who, at: spot, turn }) => {
          const entry = MESH_LIBRARY.find((mesh) => mesh.id === who);
          if (!entry) return Promise.resolve(null);
          return loadModelFromUrl(entry.url, entry.name, spot, entry.height)
            .then(({ model }) => ({ ...model, id: `lesson-${who}`, rotationY: turn ?? 0 }))
            .catch(() => null);
        })
      ).then((loaded) => {
        const arrived = loaded.filter((figure): figure is NonNullable<typeof figure> => figure !== null);
        if (standing && arrived.length) useStore.setState({ models: arrived });
      });
    }

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
      if (card.chrome) {
        unmuteRail('lesson');
        holdRail('lesson');
      } else {
        releaseRail('lesson');
        // Down and KEPT down. Putting it away was not enough: every card here
        // asks for a gesture, a gesture is a touch, and a touch used to bring
        // the whole dock back up over the card asking for it.
        muteRail('lesson');
      }
    }, 0);

    const opens = ACTS.find((act) => act.at === at) ?? null;
    setCurtain(opens);
    const raise = opens ? window.setTimeout(() => setCurtain(null), 2500) : undefined;

    /*
     * A viewer who has asked for stillness gets cuts, not rides. The opening
     * glide already honours this (see glideWalkerTo); a lesson that then pans
     * for two seconds between every card would be the same motion under a
     * different name. One millisecond rather than zero, because the tween
     * divides by it. The sweeps stay: they are not travel, they are the
     * demonstration itself, run at the pace of a head turning.
     */
    const still =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const travel = still ? 1 : card.travel ?? 1800;
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
        const eye = sweep?.height ? sweepAt(sweep.height, phase) : stage.cameraHeight;

        useStore.setState({
          fov: mix(start.fov, field, eased),
          cameraHeight: mix(start.cameraHeight, eye, eased),
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

      /*
       * The answer on the cards that have no question to pass.
       *
       * Three director cards carry a found - the ruler card, where the answer
       * is where the line lands on each of the four heights; the posture card,
       * where it is that the line came down with you; and the depth card,
       * where it is that the metre steps shrink - and a found only ever
       * arrived through a gate, so on all of them the best sentence on the
       * card was unreachable. They get it when the showing has had its time:
       * one full cycle for a sweep, a reading of the body for a still card.
       */
      if (!card.gate && card.found && !told) {
        const shown = travel + (card.sweep ? card.sweep.seconds * 1000 : 7000);
        if (now - began.current >= shown) {
          told = true;
          setAnswered(true);
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      standing = false;
      window.clearTimeout(settle);
      if (raise !== undefined) window.clearTimeout(raise);
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

  /*
   * THE PRESENTATION, AND IT IS NOT A PANEL.
   *
   * The first two drafts put the lesson in the same glass card the panels use:
   * a rounded slab with a border, two pill buttons and a row of dots. It read
   * as a dialog over an app, which is exactly what it is not - and a dialog is
   * a thing you dismiss. It made the most considered part of this tool feel
   * like the most skippable.
   *
   * So there is no card. The words sit ON the picture, over a wash of the
   * page's own tone that fades to nothing before it reaches the middle of the
   * screen, and the picture goes all the way to every edge. One idea at a time,
   * large, arriving rather than appearing. The controls are: tap the words to
   * go on. That is the whole interface.
   *
   * WHAT WENT, AND WHY EACH ONE. The border and the fill, because they drew a
   * box round the words and the words are not in a box, they are on a
   * photograph. The two pills, because a row of buttons is a form. The dots,
   * because eighteen dots is a progress bar pretending to be jewellery - it is
   * a hairline across the top of the screen now, which is what it always was.
   * And "Hopp over", because an escape hatch in the corner of the frame is an
   * invitation to use it, and this is a thing to be inside rather than to get
   * through.
   *
   * IT IS STILL LEAVABLE, and it has to be: a tool that traps you is a tool
   * you do not open twice. The way out is a single unlabelled mark in the far
   * corner at a third of an opacity - present, findable, and not shouting. The
   * difference between that and a pill marked "skip" is the difference between
   * a door and a sign pointing at a door.
   */
  const last = at >= CARDS.length - 1;
  const asking = !!card.gate && !answered;
  const ink = dark ? 'text-white' : 'text-black';

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none">
      {/*
        * How far through, as a hairline across the very top.
        *
        * A single line rather than eighteen dots. Dots say "how many are left"
        * as a countable, which invites counting; a line says "how far" as a
        * proportion, which is the only thing anybody wants to know and the
        * only one that does not read as a chore.
        */}
      <div className={`absolute top-0 inset-x-0 h-px ${dark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden>
        <div
          className="h-px bg-sky-500/70 transition-[width] duration-700 ease-out"
          style={{ width: `${((at + 1) / CARDS.length) * 100}%` }}
        />
      </div>

      {/* The way out. Unlabelled, dim, and in the one corner nothing else uses. */}
      <button
        onClick={onDone}
        aria-label="Leave the lesson"
        className={`absolute top-safe-panel left-3 w-9 h-9 rounded-full pointer-events-auto opacity-30 hover:opacity-70 transition-opacity ${ink}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <path d="M17 7 7 17M7 7l10 10" />
        </svg>
      </button>

      {/*
        * THE ACT TITLE, full screen, for two and a half seconds.
        *
        * The only moment in this app where a word is the whole picture. It is
        * what turns eighteen cards from a list into a piece with movements, and
        * it is worth the seconds because at card eleven of a list nobody knows
        * whether they are near the end.
        */}
      {curtain && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          /* A dim over the whole picture for the length of the title, in the
             page's own tone. Not to hide it: a title moment that does not
             change the light is a caption, and the words have to be the
             brightest thing on screen for the two seconds they own it. */
          style={{
            background: `rgba(${tone}, ${tone}, ${tone}, 0.55)`,
            animation: 'lesson-fade-dim 2500ms ease-in-out both',
          }}
        >
          <div
            className={`text-[30px] font-light tracking-[0.16em] uppercase ${ink}`}
            style={{ animation: 'lesson-curtain 2500ms ease-in-out both' }}
          >
            {curtain.title}
          </div>
          <div
            className={`mt-3 text-[13px] tracking-wide ${ink} opacity-55`}
            style={{ animation: 'lesson-rise 900ms 320ms ease-out both' }}
          >
            {curtain.line}
          </div>
        </div>
      )}

      {/*
        * The words, and the wash they stand on.
        *
        * The wash is the PAGE's own tone rather than a colour of its own, for
        * the same reason the lens gate's matting is: it has to read as the
        * mount the drawing is on and not as a scrim somebody laid over it. It
        * fades to nothing well before the middle of the screen, so the picture
        * is never boxed in - which on the five point card is the difference
        * between seeing the whole sphere and seeing the top of it.
        *
        * The whole block is the advance control. Tapping words to turn a page
        * is the oldest interaction there is, it needs no affordance, and it
        * leaves every pixel above it live for the drags that half these cards
        * ask for.
        */}
      {/*
        * THE WASH IS ON A DIV, NOT ON THE BUTTON, and that is not a detail.
        *
        * index.html carries `button { background-image: none !important }` -
        * a rule from the day every control in this app was a glyph on glass
        * and none of them was allowed to look like a raised key. It is right,
        * and it silently deleted this gradient: the words came up straight on
        * the picture with nothing behind them, which on the pages where the
        * ground is light and the ink is white is a paragraph nobody can read.
        *
        * So the wash is a plate and the button sits in it.
        */}
      <div
        className={`absolute inset-x-0 bottom-0 pt-24 pointer-events-none transition-opacity duration-500 ${
          curtain ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `linear-gradient(to top, ${wash} 0%, ${wash} 42%, transparent 100%)`,
        }}
      >
      <button
        onClick={() => {
          if (curtain) return;
          if (!last) {
            setAt((was) => was + 1);
            return;
          }
          /*
           * The SHEET stays - the wide ruled page the lesson just handed over -
           * and the pencil comes into the hand. Everything else goes back to
           * before the lesson: the scene, and WHERE YOU STOOD. This used to
           * keep the last card's stand while restoring the scene, which put
           * the returning aeroplane through your view from three metres - the
           * lesson ended inside the fuselage, with the practice cube standing
           * in its tail. See `restore` above for why this exit is not the
           * same exit as walking away.
           */
          restore.current = false;
          const before = held.current;
          useStore.setState({
            instrument: 'block',
            models: before?.models ?? [],
            lamps: before?.lamps ?? [],
            boxes: before?.boxes ?? [],
            selectedId: before?.selectedId ?? null,
            selectedModelId: before?.selectedModelId ?? null,
            cameraHeight: before?.cameraHeight ?? useStore.getState().cameraHeight,
          });
          if (before) {
            walkInput.position.x = before.stand.x;
            walkInput.position.z = before.stand.z;
            walkInput.yaw = before.stand.yaw;
            walkInput.pitch = before.stand.pitch;
            walkInput.lookYaw = 0;
            walkInput.lookPitch = 0;
          }
          onDone();
        }}
        aria-label={last ? 'Finish the lesson' : 'Next card of the lesson'}
        className={`w-full ${card.chrome ? 'pb-safe-lesson-chrome' : 'pb-safe-lesson'} px-6 text-left pointer-events-auto ${ink}`}
      >
        <div key={`h-${at}`} className="text-[11px] uppercase tracking-[0.2em] opacity-45"
          style={{ animation: 'lesson-rise 620ms ease-out both' }}>
          {card.headline}
        </div>
        <div key={`b-${at}`} className="mt-2 text-[21px] leading-[1.3] font-light max-w-[30rem]"
          style={{ animation: 'lesson-rise 700ms 90ms ease-out both' }}>
          {card.body}
        </div>

        {/* How far round, how far walked, how far open. Under the instruction
            it belongs to, growing, and gone the moment it is answered. */}
        {asking && (
          <div className={`mt-4 h-px max-w-[30rem] ${dark ? 'bg-white/15' : 'bg-black/12'}`} aria-hidden>
            <div className="h-px bg-sky-500 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}

        {/* The sentence that was not there a moment ago. It arrives from
            further down and slower than the rest, because it is the answer and
            the others were the question. */}
        {answered && card.found && (
          <div key={`f-${at}`} className="mt-4 max-w-[30rem]"
            style={{ animation: 'lesson-arrive 820ms ease-out both' }}>
            <div className="w-8 h-px bg-sky-500 mb-3" aria-hidden />
            <div className="text-[19px] leading-[1.34] font-light">{card.found}</div>
          </div>
        )}

        <div className={`mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] ${asking ? 'opacity-30' : 'opacity-70'} transition-opacity duration-500`}>
          {last ? 'Teikn' : 'Vidare'}
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </div>
      </button>
      </div>
    </div>
  );
};
