import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { walkInput } from '../lib/walkInput';
import {
  ACTS,
  CARDS,
  CAST,
  LESSON_LIGHT,
  OPENING,
  WHOLE_SHEET,
  pingPong,
  sweepAt,
  type Act,
  type Card,
  type Cast,
  type Gate,
  type Stage,
} from '../lib/lesson';
import { MESH_LIBRARY } from '../lib/meshLibrary';
import { loadModelFromUrl } from '../lib/loadModel';
import { holdRail, muteRail, releaseRail, unmuteRail } from '../lib/rail';
import { MAX_FIELD, wholeSheetField } from '../lib/projection';
import { sunlight } from '../lib/sky';

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
 * the floor, where you were, the sheet, the field, the guides, the ruling -
 * and the sky, which it takes down to a low sun so the construction can be
 * seen at all. One
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

/**
 * A card's wished-for field, in the frame it actually got.
 *
 * `WHOLE_SHEET` is a card saying "open it until the whole sheet is on the
 * page", which is not a number until there is a window to ask - see the
 * constant's own note. Everything else passes straight through.
 *
 * A FIFTH WIDER THAN THE SUM SAYS, and the fifth is the whole point of doing
 * it. `wholeSheetField` answers "when does the shorter edge stop cropping the
 * sheet", which is the field at which the sheet exactly TOUCHES both edges -
 * and a disc that touches the edges of the screen is still a picture you are
 * inside. What these cards are for is the opposite: a sheet with paper round
 * it, sitting on the page, the way a curvilinear study is set out before a
 * line goes down. The margin is what makes it read as a drawing rather than as
 * a very wide view, and it also keeps the bottom of the sheet clear of the
 * words, which on a phone sit across the last third of the frame.
 */
const SHEET_MARGIN = 1.2;

const fieldFor = (want: number) =>
  want === WHOLE_SHEET
    ? Math.min(
        MAX_FIELD,
        Math.round(
          wholeSheetField(
            typeof window === 'undefined' ? 1 : window.innerWidth,
            typeof window === 'undefined' ? 1 : window.innerHeight
          ) * SHEET_MARGIN
        )
      )
    : want;

/**
 * THE LIGHT THE LESSON IS TAUGHT UNDER, and the promise to give the other one
 * back.
 *
 * See `LESSON_LIGHT`: the construction is a shader laid into the picture at a
 * fraction of an ink, and over a bright afternoon sky most of it cannot be
 * followed at all. The lesson takes the sun down to the last of the light for
 * as long as it runs.
 *
 * The shadows are forced hard rather than left as the viewer had them, and
 * that is not tidiness. One card in the deck hides a long box behind a cube
 * and tells you afterwards that the only thing that gave it away was what fell
 * on the floor - which is a lie if the viewer happened to have shadows off.
 */
const eveningLight = () => {
  const state = useStore.getState();
  /* Clear. See LESSON_LIGHT: the cloud deck is the one thing in the sky that
     can put a white shape behind a grey line, and every card here is a grey
     line somebody is being asked to follow. */
  const cover = 0;
  const { intensity, temperature } = sunlight(LESSON_LIGHT.elevation, cover);
  return {
    sunEnvironment: true,
    // Not simulated: an hour is a different height of sun in June than in
    // December, and a lesson that is legible in August and black in January
    // is not a lesson. The air and the cloud are pinned for the same reason -
    // a viewer who left the weather at overcast should still be taught in a
    // sky the construction stands out against.
    sky: { ...state.sky, simulate: false, cover, air: 1 },
    sun: {
      ...state.sun,
      azimuth: LESSON_LIGHT.azimuth,
      elevation: LESSON_LIGHT.elevation,
      intensity,
      temperature,
      shadows: 'hard' as const,
    },
  };
};

/** A cast, as boxes the store can hold. */
const boxesFor = (cast: Cast, turn: number, surface: ReturnType<typeof useStore.getState>['surface']) =>
  CAST[cast].map(({ at: [x, z], size, turn: own, lift, tilt }, at) => {
    // A metre cube unless the cast says otherwise.
    const [wide, tall, deep] = size ?? [1, 1, 1];
    const lean = tilt ?? 0;
    /*
     * STANDING ON THE FLOOR rather than centred on it, which is the whole of
     * what the eye-level cards are about and so cannot be approximated - and
     * for anything that LEANS it is not half the height either. The corner
     * that touches the ground is the lowest one, and a box leaning by an angle
     * about the axis across your view has its centre exactly
     * (tall*cos + deep*sin)/2 above that corner.
     *
     * Worked out for a lean alone. A box that both leaned and turned would
     * need the whole rotated box measured, and nothing in the deck does both -
     * the one card that leans anything leaves the stage's turn at zero.
     */
    const rest = (Math.abs(tall * Math.cos(lean)) + Math.abs(deep * Math.sin(lean))) / 2;
    return {
      id: `lesson-${cast}-${at}`,
      position: [x, (lift ?? 0) + rest, z] as [number, number, number],
      scale: [wide, tall, deep] as [number, number, number],
      rotation: [lean, turn + (own ?? 0), 0] as [number, number, number],
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
     * The lesson's stage is a bare floor, some cubes, and whoever the card
     * asked for by name - and it has to be. Most cards are about where the
     * EDGES of a form point, and back when the shelf carried scanned aircraft
     * and horses there was not a straight edge among them: the first run of
     * this was performed from inside a nineteen-megabyte racer, which is a
     * fair description of what the tool looks like to somebody who has not
     * been told what it is for. The shelf is one character now and the second
     * act is about bodies, so the clearing is less about keeping the stage
     * legible and more about the promise below - that whatever you had is
     * exactly what you get back.
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
    /*
     * The hour goes too, and comes back.
     *
     * The lesson teaches under its own low sun (see `eveningLight`), which
     * means it writes on three things a viewer may well have composed by hand:
     * whether the sky is drawn at all, whether it is simulated, and where the
     * light is. A tool that hands back your scene and keeps your sky is a tool
     * that took something.
     */
    sky: state.sky,
    sun: state.sun,
    sunEnvironment: state.sunEnvironment,
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
  roam: { turned: number; pitched: number; walked: number; field: number; picked: Set<string> }
) => {
  if (gate.kind === 'turn') return roam.turned / gate.radians;
  if (gate.kind === 'pitch') return roam.pitched / gate.radians;
  if (gate.kind === 'walk') return roam.walked / gate.metres;
  if (gate.kind === 'pick') return roam.picked.size / gate.boxes;
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
  /*
   * WHICH CARDS HAVE ALREADY GIVEN UP THEIR ANSWER, so that going back to one
   * does not take it away again.
   *
   * A found sentence is earned - that is the whole design - but it is earned
   * ONCE. The commonest reason anybody steps back a card is that they tapped
   * through the answer before they had finished reading it, and a back arrow
   * that returns them to the question with the answer stripped off is a back
   * arrow that cannot do the one job it was added for.
   *
   * A ref rather than state: nothing renders off it directly, it is read at
   * the top of the card effect and written when a card answers, and putting it
   * in state would re-run that effect the moment it changed.
   */
  const solved = useRef<Set<number>>(new Set());
  /*
   * The card we were on before this one, so the deck knows it is being walked
   * backwards. Only the act titles care: an act title is an ARRIVAL, held
   * full-screen for two and a half seconds, and stepping back one card into
   * the top of an act you have already been through should not perform the
   * arrival again.
   */
  const cameFrom = useRef(0);
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
    useStore.setState({
      instrument: 'none',
      selectedModelId: null,
      models: [],
      lamps: [],
      ...eveningLight(),
    });
    /*
     * And the dock goes down IN THIS COMMIT, not in the next one.
     *
     * Every card mutes the rail from a timeout of zero, which has to wait for
     * the whole commit to land (see the settle timer below) - and the first
     * card is the one where that wait is visible, because the first thing on
     * screen after the offer is tapped is the act title, held large over the
     * picture. The dock takes its fade to go, so KULA arrived over a toolbar
     * that was still on its way out: the one full-screen moment in the app,
     * with a menu ghosting through the bottom of it. Muting here starts the
     * fade a commit earlier, and a mute is idempotent, so the per-card one
     * below is unaffected.
     */
    muteRail('lesson');
    return () => {
      unmuteRail('lesson');
      releaseRail('lesson');
      const was = held.current;
      if (!was) return;
      /*
       * THE SKY COMES BACK BY BOTH DOORS, and it is the one thing that does.
       *
       * Walking out puts everything back and reaching the end deliberately
       * does not - the last card's whole subject is that the ruled sheet is
       * now yours, so it is handed over rather than swept away. The hour is
       * not part of that gift. Nobody finishes a lesson wanting the tool left
       * at six degrees above the horizon; the low sun was a way of making the
       * construction readable while the lesson was talking, and the moment it
       * stops talking it is somebody else's weather again.
       */
      useStore.setState({ sky: was.sky, sun: was.sun, sunEnvironment: was.sunEnvironment });
      if (!restore.current) return;
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
    /*
     * The card's stage, with any wished-for field turned into a real one - see
     * `fieldFor`. Resolved once, here, so that everything below (the tween,
     * the sweep, the lens gate's own reading of where the card left the field)
     * is looking at the same number.
     */
    const asked: Stage = { ...OPENING, ...card.stage };
    const stage: Stage = { ...asked, fov: fieldFor(asked.fov) };
    /*
     * Resolved AGAIN on every frame rather than once here, because how wide
     * the whole sheet is depends on the shape of the window and a phone gets
     * turned over. A card that worked its field out at mount and then held it
     * would show a cropped disc for the rest of its life to anybody who
     * rotated the frame while it was up. It is a ceiling and two divisions.
     */
    const wideNow = () => fieldFor(asked.fov);
    const sweepNow = () =>
      card.sweep?.field
        ? ([fieldFor(card.sweep.field[0]), fieldFor(card.sweep.field[1])] as [number, number])
        : undefined;
    const start = from.current;
    began.current = performance.now();
    // Already answered once means answered now: see `solved`.
    const known = solved.current.has(at);
    const goingBack = at < cameFrom.current;
    cameFrom.current = at;
    setAnswered(known);
    setProgress(known ? 1 : 0);

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
        stage.figures.map(({ who, at: spot, turn, lift }, index) => {
          const entry = MESH_LIBRARY.find((mesh) => mesh.id === who);
          if (!entry) return Promise.resolve(null);
          return loadModelFromUrl(entry.url, entry.name, spot, entry.height, entry.lift)
            .then(({ model }) => ({
              ...model,
              /*
               * Keyed on the SLOT and not on who is standing in it. A flock is
               * eight figures out of five files, so two of them are the same
               * mesh - and while the id was `lesson-${who}` the second copy
               * carried the first one's id, which is a duplicate React key and
               * a store that cannot tell two of its own models apart.
               */
              id: `lesson-figure-${index}`,
              rotationY: turn ?? 0,
              // Whatever the pose is already off the ground by, plus whatever
              // it is standing on. The first is the file's - a jump is in the
              // air - and the second is the card's.
              position: [spot[0], model.position[1] + (lift ?? 0), spot[1]] as [number, number, number],
            }))
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

    const opens = goingBack ? null : ACTS.find((act) => act.at === at) ?? null;
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
    const roam = { turned: 0, pitched: 0, walked: 0, field: stage.fov, picked: new Set<string>() };
    let watching: { yaw: number; pitch: number; x: number; z: number } | null = null;
    let told = known;

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

        const opening = sweepNow();
        const field = opening ? sweepAt(opening, phase) : wideNow();
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
        /*
         * And what has been taken hold of, counted as a SET of ids rather than
         * as a tally of taps: the card asks for several different boxes, and a
         * viewer prodding the same one nine times has not chosen anything. The
         * one the card started on is already in here on the first frame, which
         * is right - its construction was on screen to be read before anybody
         * touched the glass.
         */
        const held = useStore.getState().selectedId;
        if (held) roam.picked.add(held);

        if (card.gate) {
          const done = Math.min(1, Math.max(0, progressOf(card.gate, roam)));
          setProgress(done);
          if (done >= 1 && !told) {
            told = true;
            solved.current.add(at);
            setAnswered(true);
          }
        }
      }

      /*
       * The answer on the cards that have no question to pass.
       *
       * Four director cards carry a found - the sheets slideshow, the ruler,
       * the posture sweep and the shrinking steps - and a found only ever
       * arrived through a gate, so on all of them the best sentence on the
       * card was unreachable. They get it when the showing has had its time:
       * one full cycle for a sweep, a reading of the body for a still card.
       */
      if (!card.gate && card.found && !told) {
        const shown = travel + (card.sweep ? card.sweep.seconds * 1000 : 7000);
        if (now - began.current >= shown) {
          told = true;
          solved.current.add(at);
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

  /** One card on. On the last one, that means out - with the sheet kept. */
  const goNext = () => {
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
     * same exit as walking away. (The sky is not in here: it goes back by
     * BOTH doors, from the unmount above.)
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
  };

  /** One card back, which the first card has nothing to be. */
  const goBack = () => {
    if (curtain) return;
    setAt((was) => Math.max(0, was - 1));
  };

  /*
   * THE PAGE UNDER THE THUMB.
   *
   * Drag the words sideways and they follow; let go past a threshold and the
   * deck turns - right for the card behind, left for the next one, which is
   * the way a book has always worked and the way the arrow at the bottom of
   * every card already points. Under the threshold it springs back, which is
   * how you learn what the threshold was without being told.
   *
   * TRACKED IN A REF AND DRAWN FROM STATE, because those are two different
   * jobs: the gesture has to be exact and the paint only has to be smooth.
   * Writing the origin into state would re-render on pointerdown before a
   * finger had moved at all.
   *
   * IT ONLY EVER TAKES A HORIZONTAL DRAG. Six pixels of slack before anything
   * moves, and nothing at all if the finger is going more up than sideways -
   * a card's words are the one place on this screen where a vertical drag is
   * somebody scrolling by reflex, and stealing that would make the block feel
   * broken rather than clever. Once it IS a horizontal drag the pointer is
   * captured, so the rest of the gesture belongs to the card however far off
   * the block it wanders.
   *
   * The first card drags at a quarter weight going backwards, because there is
   * nothing behind it: the block still moves, which says the gesture was
   * heard, and it plainly does not want to. Nothing else is damped - going on
   * from the last card is finishing the lesson, which is a thing the viewer is
   * entitled to do with a thumb, and a drag that looks reluctant and then does
   * it anyway is worse than one that just does it.
   */
  const held0 = useRef<{ id: number; x: number; y: number; taken: boolean } | null>(null);
  /*
   * A DRAG THAT DID NOT REACH THE THRESHOLD MUST DO NOTHING AT ALL, and
   * `preventDefault` on the pointerup is not what stops it: a browser raises
   * the click from the same gesture regardless, so a forty-pixel drag that
   * plainly meant "not that far" was being counted as a tap and going on to
   * the next card - the one outcome the spring-back is there to promise it
   * would not do. The click is swallowed here instead, and the flag is cleared
   * on the next press down so a gesture that never raises a click (a pointer
   * let go off the block, a cancel) cannot eat the tap after it.
   */
  const dragged = useRef(false);
  const [slide, setSlide] = useState(0);
  /** How far a thumb has to travel before the deck turns. */
  const TURN_AT = 64;

  const resist = (by: number) => (by > 0 && at === 0 ? by * 0.25 : by);

  const onDown = (event: React.PointerEvent) => {
    if (curtain) return;
    dragged.current = false;
    held0.current = { id: event.pointerId, x: event.clientX, y: event.clientY, taken: false };
  };

  const onMove = (event: React.PointerEvent) => {
    const grip = held0.current;
    if (!grip || grip.id !== event.pointerId) return;
    const by = event.clientX - grip.x;
    const up = event.clientY - grip.y;
    if (!grip.taken) {
      if (Math.abs(by) < 6 || Math.abs(up) > Math.abs(by)) return;
      grip.taken = true;
      dragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setSlide(resist(by));
  };

  const onUp = (event: React.PointerEvent) => {
    const grip = held0.current;
    held0.current = null;
    setSlide(0);
    if (!grip || grip.id !== event.pointerId || !grip.taken) return;
    const by = event.clientX - grip.x;
    if (by >= TURN_AT) goBack();
    else if (by <= -TURN_AT) goNext();
  };

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
        * THE WAY BACK IS THE WORDS THEMSELVES NOW, and the arrow that used to
        * be here is gone.
        *
        * Going back had to exist - the commonest thing anybody does with a
        * deck this long is tap through an answer half-read - and for a while
        * it was a second small mark beside the cross. The case against it was
        * always the case the pills lost: the corner of the frame is not where
        * this thing lives, and two controls up there is a toolbar starting to
        * grow. What settles it is that the words are ALREADY the control.
        * Tapping them goes on; there is no reason the same block should not
        * also go back, and a page you turn with your thumb both ways is one
        * gesture rather than a gesture and a button.
        *
        * So: drag the words to the right and the card behind comes in from the
        * left, drag them left and the next one arrives. The block follows the
        * finger while it is down, which is the whole affordance - nothing has
        * to be labelled, because you can see the page moving.
        *
        * WHAT IS LEFT HERE IS FOR THE PEOPLE WHO CANNOT DRAG. A swipe is
        * invisible to a screen reader and impossible on a keyboard, and
        * "invisible to a screen reader" is not a design decision, it is a
        * missing control. This is the same button as before with nothing drawn
        * in it: reachable by tab, announced by name, and not a mark in the
        * frame. The arrow keys do the same job for anyone already holding the
        * block (see the key handler below).
        */}
      {at > 0 && (
        <button
          onClick={() => goBack()}
          aria-label="Back one card of the lesson"
          /* Hidden until it is focused, and then it is the arrow that used to
             live here - drawn, ringed and in the corner, so somebody tabbing
             through can see where they are. The safe-area top is an inline
             style rather than a class: `top-safe-panel` is hand-written CSS
             rather than a Tailwind utility, so there is no `focus:` variant of
             it to generate, and a class that quietly does not exist is worse
             than no class. */
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', left: '3.5rem' }}
          className={`sr-only pointer-events-auto focus:not-sr-only focus:absolute focus:w-9 focus:h-9 focus:rounded-full focus:border focus:border-current focus:opacity-70 ${ink}`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H6M11 6l-6 6 6 6" />
          </svg>
        </button>
      )}

      {/*
        * WHERE THE WALKING IS DONE, on the two cards that ask for it.
        *
        * The best card in the deck is the one you WALK - the rank of cubes
        * sliding across the page while the point they aim at refuses to move -
        * and the second is the flock. Both of them depend on a control that
        * has no mark on the glass at all: the lower-left quarter of the
        * picture is a thumbstick, and it appears under your thumb rather than
        * sitting somewhere waiting to be found. That is exactly right for
        * somebody who already knows, and it is a dead end for somebody being
        * taught, who is told in words to put a thumb on a part of the picture
        * that looks like every other part of the picture. A card whose gesture
        * cannot be found is a card with a progress line that never fills.
        *
        * So on those two cards only, a ring the size of the stick's own reach
        * stands in the zone, with a mark inside it that keeps pushing. It is
        * a quarter of an opacity, it is drawn in the ink everything else here
        * is drawn in, and it goes the moment the first step is taken - the
        * point is to answer "where", not to be a control.
        */}
      {card.gate?.kind === 'walk' && !answered && (
        <div
          /*
           * WHITE, AND NOT THE PAGE'S INK. Everything else in this overlay is
           * drawn in the ink the PAGE takes - black on a light sheet - and
           * that is right for words standing on a wash. This mark stands on
           * the floor of the picture, and the picture is a dusk: black at a
           * quarter of an opacity on a dark grey floor is nothing at all, and
           * it was nothing at all until it was looked at. A light mark with a
           * dark shadow under it reads on either.
           */
          className={`absolute pointer-events-none text-white transition-opacity duration-700 ${
            progress > 0.02 || curtain ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            left: 'calc(22% - 32px)',
            top: '56%',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))',
          }}
          aria-hidden
        >
          <svg viewBox="0 0 64 64" className="w-16 h-16 opacity-40" fill="none" stroke="currentColor">
            <circle cx="32" cy="32" r="30" strokeWidth="1" />
            <circle
              cx="32"
              cy="32"
              r="5"
              strokeWidth="1.5"
              style={{ animation: 'lesson-push 2600ms ease-in-out infinite' }}
            />
          </svg>
        </div>
      )}

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
            className={`px-8 text-center text-[30px] font-light tracking-[0.16em] uppercase ${ink}`}
            style={{ animation: 'lesson-curtain 2500ms ease-in-out both' }}
          >
            {curtain.title}
          </div>
          {/*
            * THE LINE UNDER IT WRAPS, WHICH IT DID NOT.
            *
            * Centred in a flex column with no width and no padding, a title's
            * line is laid out as one unbroken row and simply runs off both
            * edges of the frame. On a phone held upright that is not an edge
            * case, it is four acts out of five: AUGET's line came up as
            * "Horisonten er ikkje ein stad. Han er hogda di" with the last two
            * words past the glass. The one full-screen moment in the app, and
            * the sentence it exists to say was cut in half.
            *
            * A width to wrap inside, a margin to wrap before, and the lines
            * balanced against each other so a two-line sentence does not come
            * out as a row and an orphan.
            */}
          <div
            className={`mt-3 px-10 max-w-[22rem] text-center text-balance text-[13px] leading-[1.5] tracking-wide ${ink} opacity-55`}
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
      {/*
        * AND IT CANNOT GROW OFF THE TOP OF THE SCREEN.
        *
        * The plate hangs from the bottom edge, so a card taller than the frame
        * does not overflow downwards where you would see it - it grows UPWARDS,
        * past y = 0, and the first lines of it are simply not on the phone any
        * more. The glossary is the card that finds this: eight rows of
        * equivalences, a lead-in and an answer, which on a small phone is most
        * of the glass. Every card in the deck is short enough not to need this
        * and one small screen is enough for that to stop being true, so the
        * plate is bounded and scrolls when it has to.
        *
        * A vertical drag inside it scrolls, and a horizontal one still turns
        * the deck: the button already declares `touch-action: pan-y`, and the
        * swipe handler ignores a gesture that is going more up than sideways.
        * The gradient is on the scroll container itself, so it stays put while
        * the words move under it rather than sliding away with them.
        */}
      <div
        className={`absolute inset-x-0 bottom-0 pt-24 max-h-[100dvh] overflow-y-auto overscroll-contain pointer-events-none transition-opacity duration-500 ${
          curtain ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `linear-gradient(to top, ${wash} 0%, ${wash} 42%, transparent 100%)`,
        }}
      >
      <button
        onClick={() => {
          // Whatever the drag decided, it has decided it. See `dragged`.
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          goNext();
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          held0.current = null;
          dragged.current = false;
          setSlide(0);
        }}
        /* The keyboard's half of the same gesture. A block you can only turn
           by dragging is a block half the people who open this cannot turn. */
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goBack();
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goNext();
          }
        }}
        aria-label={last ? 'Finish the lesson' : 'Next card of the lesson'}
        /* touch-action: the browser must not claim the horizontal drag for a
           back-navigation or an overscroll before the handler above sees it. */
        style={{
          transform: slide ? `translateX(${slide}px)` : undefined,
          transition: slide ? undefined : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: 'pan-y',
        }}
        className={`w-full ${card.chrome ? 'pb-safe-lesson-chrome' : 'pb-safe-lesson'} px-6 text-left pointer-events-auto ${ink}`}
      >
        <div key={`h-${at}`} className="text-[11px] uppercase tracking-[0.2em] opacity-45"
          style={{ animation: 'lesson-rise 620ms ease-out both' }}>
          {card.headline}
        </div>
        {/*
          * THE QUESTION STEPS ASIDE WHEN THE ANSWER ARRIVES.
          *
          * Both at once is how it was, and on a phone it was too much paper.
          * A body and a found together run to twenty lines - better than half
          * an upright screen - and what is under that half is the PICTURE the
          * card is about: the four posts the horizon is supposed to be cutting,
          * the two boxes whose fractions you are being asked to compare, the
          * top faces closing towards the line. Card after card asked you to
          * look at something and then covered it with the sentence explaining
          * what you would have seen.
          *
          * A card is a question and then an answer, so it can be one at a
          * time. The headline stays, the body collapses on the same curve the
          * found arrives on, and the block ends up about the height it had
          * before the reveal - which is what leaves the picture standing.
          *
          * NOT ON THE GLOSSARY CARD. Its body is the line that introduces the
          * list under it ("the same things, other words - here is how they
          * stand in the books"), and a list of eight equivalences with its
          * lead-in silently removed is a list nobody knows what to do with.
          *
          * A grid rather than a height, because the body's height depends on
          * how it wraps and nothing in CSS can transition to `auto`. One row
          * going from 1fr to 0fr does animate, and the overflow-hidden child
          * is what keeps the text from spilling while it closes.
          */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
            answered && card.found && !card.terms && !card.stays
              ? 'grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            <div key={`b-${at}`} className="mt-2 text-[21px] leading-[1.3] font-light max-w-[30rem]"
              style={{ animation: 'lesson-rise 700ms 90ms ease-out both' }}>
              {card.body}
            </div>
          </div>
        </div>

        {/*
          * THE ONE CARD THAT IS A LIST, and it is laid out as a definition list
          * rather than as a table.
          *
          * Two columns of equal weight would read as a comparison of two
          * vocabularies, which is not what this is: one of them is the deck's
          * own and the reader already has it, and the other is the thing being
          * handed over. So the deck's word takes the headline's own small
          * capitals - the register this app uses for a label all through - and
          * the trade's takes the body's weight, because that is the half worth
          * reading.
          *
          * Each row rises a beat after the one above it, on the same curve as
          * everything else on the card, so a list of six arrives as a list
          * rather than as a block landing.
          */}
        {card.terms && (
          /* Eight rows rather than six, and tighter than they were: the two
             that were added - where you are standing, and how much of the
             sphere your sheet takes in - are the ideas the deck used all the
             way through without ever naming, and they cost sixty pixels on a
             card that was already the tallest in the deck. */
          <div key={`t-${at}`} className="mt-3.5 max-w-[30rem] flex flex-col gap-1.5">
            {card.terms.map(([ours, theirs], row) => (
              <div key={ours} className="flex items-baseline gap-3"
                style={{ animation: `lesson-rise 620ms ${180 + row * 60}ms ease-out both` }}>
                <div className="text-[11px] uppercase tracking-[0.16em] opacity-45 w-[7.5rem] shrink-0">
                  {ours}
                </div>
                <div className="text-[16px] leading-[1.25] font-light">{theirs}</div>
              </div>
            ))}
          </div>
        )}

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
