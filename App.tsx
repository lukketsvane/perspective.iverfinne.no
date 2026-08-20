import { useEffect, useRef, useState } from 'react';
import { isSketch } from './types';
import { Scene } from './components/Scene';
import { WalkOverlay } from './components/WalkOverlay';
import { VanishingPoints } from './components/VanishingPoints';
import { Measures } from './components/Measures';
import { MeshSheet } from './components/MeshSheet';
import { SceneSheet } from './components/SceneSheet';
import { useStore, saveSettings, currentView, standingRoom } from './store';
import { loadModelFile, loadModelFromUrl, modelRadius } from './lib/loadModel';
import { findFreeSpot, onTheFloor } from './lib/placement';
import { MESH_LIBRARY, openingMesh } from './lib/meshLibrary';
import { focusPoint } from './lib/focus';
import { glideWalkerTo, walkInput } from './lib/walkInput';
import { fieldOf } from './lib/projection';
import { constructionInk, pageHex } from './lib/inkMaterial';
import { keepAwake } from './lib/wakeLock';
import { useSkyClock } from './lib/skyClock';
import { useAutoDeal } from './lib/autoDeal';
import { holdPreviews, resumePreviews } from './lib/meshPreview';
import { downloadSceneFile, readSceneFile, toSceneFile } from './lib/sceneJson';
import { beginActivity, reportFailure } from './lib/activity';
import { Activity } from './components/Activity';
import { CameraFeed } from './components/CameraFeed';
import { Gate } from './components/Gate';
import { Lesson } from './components/Lesson';
import { Hints } from './components/Hints';
import type { SceneModel } from './types';

/** The application is always a first-person workspace. */
export default function App() {
  const theme = useStore((s) => s.theme);
  const backgroundGray = useStore((s) => s.backgroundGray);
  const surface = useStore((s) => s.surface);
  const backdrop = useStore((s) => s.backdrop);
  const addModel = useStore((s) => s.addModel);
  const standObject = useStore((s) => s.standObject);
  const applyScene = useStore((s) => s.applyScene);
  const loadSceneHistory = useStore((s) => s.loadSceneHistory);
  const loadOwnMeshes = useStore((s) => s.loadOwnMeshes);
  const rememberMesh = useStore((s) => s.rememberMesh);
  // The lights are not here: they are chrome, not a sheet - the overlay stands
  // them in the tools row's slot over a live dock, so the covering rule below
  // never applies to them.
  const [sheet, setSheet] = useState<'meshes' | 'scenes' | null>(null);
  /* The perspective lesson, which takes the whole tool over while it runs. */
  const [teaching, setTeaching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadSceneHistory();
    loadOwnMeshes();
    // A reference is propped up and drawn from; it does not get to go dark.
    keepAwake();
  }, [loadSceneHistory, loadOwnMeshes]);
  useEffect(() => useStore.subscribe((state) => saveSettings(state)), []);

  /*
   * The two things that happen without being asked.
   *
   * The sky's clock moves the simulated hour along and keeps a live sky live;
   * the dealer turns a page of the deck over in the gaps between working. Both
   * are here rather than inside the overlay because neither is chrome - they go
   * on whether or not a panel is open, and the overlay unmounts nothing.
   */
  useSkyClock();
  useAutoDeal();

  /*
   * The status bar is part of the page, on a phone saved to the home screen.
   *
   * Its style is "default", which lets iOS paint it from theme-color - so the
   * meta follows the live paper. Drag the tone and the bar sweeps with it;
   * cross into board and the clock goes to chalk. The one thing it must never
   * be is black-translucent's fixed white text over a white sheet.
   */
  useEffect(() => {
    // Read straight off the page the renderer is using. It used to re-derive
    // the tone from the ramp here, because the live value was written from a
    // layout effect inside the canvas's own reconciler and reading it from
    // out here raced and lost. It is written from a store subscription now,
    // which lands before any render that could read it - so there is one
    // answer to what is behind the drawing, and the bar quotes it rather than
    // recomputing it and hoping the two agree.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', pageHex()));
  }, [surface, backgroundGray, backdrop]);

  /** Above this, it is something you look at standing up. */
  const EYE_TO_EYE = 1.2;

  /**
   * How far the opening object is turned off square, in radians.
   *
   * Forty degrees, which is the three-quarter view every product photograph and
   * every drawing lesson opens on. Square-on, a thing this long is a one-point
   * construction: one face, one point, and its whole depth hidden behind its own
   * back. Turned, all three of its axes run off to three separate places, and
   * the box drawn round it says so. That is the first thing the tool should be
   * showing, so it is what it starts with.
   */
  const OPENING_TURN = 0.7;

  /*
   * THE EYE STANDS ON THE Z AXIS, AND IT WAS WORTH TRYING NOT TO.
   *
   * With six things round the racer rather than one, standing on the scene's
   * own axis looked like the mistake: everything at much the same distance,
   * spread along the horizon, a team photograph. So the eye was walked
   * twenty-two degrees round to port, with the racer turned by the same angle
   * so it went on presenting its three-quarter.
   *
   * It is worse, measured rather than argued: the yard is composed for a
   * viewer on the axis, and moving the viewer reprojects all of it at once.
   * The stores rack swings across the fuselage and stands in front of the
   * cockpit; the marshaller and the pilot slide off the left edge; the bowser
   * loses its cab off the right. Every one of those is a placement that was
   * chosen against a frame that no longer exists.
   *
   * The thing actually wrong with the opening was never the bearing. It is
   * that half the frame is empty floor, and that is a matter of where the eye
   * AIMS - see `middle` in the solve below.
   */

  /**
   * THE YARD ROUND THE RACER: who else is standing there when the tool opens.
   *
   * The aircraft is the subject and the reason these four are not. Alone on the
   * grid it is a beautiful object and a poor drawing: nothing in the frame says
   * how big it is except a ruling you have to already believe in, nothing else
   * is at a different depth, and there is no second form for its own to be read
   * against. A man at six metres, a truck at eight and a rack at seven fix all
   * three at once, and every one of them is a size you already know.
   *
   * WHERE THEY STAND is chosen against the racer's own box - 8.2 m long, 7.6 m
   * across the wings, turned forty degrees - and every one of them is clear of
   * it by more than a wingtip. Laid out by hand rather than handed to
   * `findFreeSpot`, which answers "somewhere that is not inside something
   * else"; this is a composition, and the difference between the two is the
   * difference between a yard and a car park.
   *
   * THE PILOT IS NOT IN THE AEROPLANE. He is modelled sitting on a plain chair,
   * which is a man waiting to fly and not a man flying, and dropping him into
   * the cockpit would put a chair in there with him. He sits off the port wing
   * where you can walk round him - and being the one seated figure here, he is
   * also the only one whose whole mass is folded rather than standing, which is
   * the harder drawing of the two.
   *
   * The bell is not here. It is on the shelf, and what it is for is a lesson in
   * lathe-turned form rather than a thing an airfield has lying about.
   */
  /**
   * The turn that points a figure at the aircraft from wherever it is standing.
   *
   * WORKED OUT, NOT EYEBALLED, and the first go at this was eyeballed: the
   * marshaller who used to stand here had his back to the racer, signalling at
   * nobody. It looks like a thing you can see and fix by nudging a number, and
   * it was not, because the figures on the shelf then were authored facing
   * opposite ways - so one turn that was right for one of them was a hundred
   * and eighty degrees wrong for the next, which is exactly the shape of
   * mistake that survives a glance at a screenshot.
   *
   * That is fixed in the files now rather than here: every figure in the
   * library faces +Z at a turn of zero, measured once by rendering each from
   * the four cardinal directions and seeing which tile showed a front, and the
   * quarter turns baked in. So this is just a bearing. The aircraft is on the
   * origin, so the bearing from a standing place to it is the bearing of the
   * negated position - and moving anybody leaves them still looking at it.
   */
  const towardsTheRacer = (at: [number, number]) => Math.atan2(-at[0], -at[1]);

  /*
   * WHERE THE FOUR OF THEM STAND, AND WHY IT IS THIS TIGHT.
   *
   * The yard before this one was laid out for an eye standing seventeen metres
   * back. The eye stands at SEVEN AND A THIRD now - the lens went to 210 and the
   * frame solve came in with it - and nobody re-composed the yard, so half of
   * it was outside the frame and one figure was standing behind the viewer's
   * own head. That is the shape of mistake a screenshot does not show you,
   * because what is missing from a picture does not appear in it.
   *
   * The frame is the binding constraint and it is worth writing down. Portrait,
   * the field is measured along the LONG edge, so 210 degrees down the height
   * leaves about 89 across the width - a half-angle of roughly 44. A figure at
   * depth d from the eye has to stand within about 0.75 d of the axis to be
   * comfortably inside that, and outside about six metres from the origin to be
   * clear of the aeroplane. Those two do not both hold anywhere in the near
   * half: at three metres in front of the racer there is a metre and a half of
   * frame either side of it, and no more.
   *
   * So the near pair stand INSIDE six metres, in the gap between the port wing
   * and the nose where the machine does not actually reach, and the far pair
   * are seen past it. Every one of these was tried in the running app and
   * looked at; four earlier arrangements put somebody behind the tail, off the
   * edge, or under a wing.
   */
  const GROUND_CREW: { id: string; at: [number, number]; turn: number }[] = [
    /*
     * NEAREST, AND DOWN ON ONE KNEE: three and a half metres out, off the port
     * bow, in front of the wing rather than under it.
     *
     * Kneeling is the pose that needs to be near. He is 1.4 m to the top of his
     * cap where the standing men are 1.7, and a low folded figure at the back
     * of a yard is a smudge - both of the other short poses tried at depth
     * vanished behind the tailplane. Near, he is the one who reads as being at
     * WORK, the only one of the four with a job in his hands, and the line he
     * is hauling runs from the apron up past his head: the one long straight in
     * this scene that is neither the aeroplane nor the grid.
     */
    { id: 'crew-kneeling', at: [-2.2, 4.4], turn: towardsTheRacer([-2.2, 4.4]) },
    /*
     * FOLDED RIGHT UP, five metres out on the starboard side, clear of the
     * tailplane rather than under it.
     *
     * The hardest drawing here - a whole man compressed into 1.2 m with every
     * limb foreshortened at once - so he goes where he is big enough to be
     * worth drawing. Staggered two metres deeper than the kneeling man on
     * purpose: side by side at the same distance the two of them read as a
     * matched pair flanking the machine, which is an arrangement and not a
     * yard.
     *
     * A pilot squatting beside his aeroplane doing nothing is what waiting for
     * weather looks like, which is the ordinary reason a racer is standing
     * still with men round it.
     */
    { id: 'pilot-crouched', at: [2.8, 3.2], turn: towardsTheRacer([2.8, 3.2]) },
    /*
     * BEHIND THE PORT WING, eleven metres out, seen underneath it.
     *
     * There is no room on that side to stand him anywhere else: the wingtip
     * reaches to within three degrees of the frame edge, so on the left a
     * figure is either in front of the wing or behind it, and the front is
     * taken. Behind is the right answer anyway - head down over a board and
     * perfectly still, he is the far mark the eye measures the near men
     * against, and being partly occluded is what tells you he is beyond the
     * wing rather than beside it.
     */
    { id: 'crew-clipboard', at: [-6.0, -1.6], turn: towardsTheRacer([-6.0, -1.6]) },
    /*
     * FURTHEST, thirteen metres out and well past the aircraft's own plane, so
     * the four of them end up at four separate depths - three and a half, five,
     * eleven, thirteen. That spread is the whole reason for standing them
     * anywhere in particular: it is what makes the yard a measured space rather
     * than a row.
     *
     * Being the far one he is also the smallest, and being upright and still he
     * is the one that survives being small.
     */
    { id: 'crew-standing', at: [7.4, -3.0], turn: towardsTheRacer([7.4, -3.0]) },
  ];

  /**
   * Stand where the whole of it can be seen, and look at its middle.
   *
   * IT HAS TO FIT IN BOTH DIRECTIONS, which is what this used to get wrong.
   * The old solve measured the object against the VERTICAL field only, and
   * then threw the answer away: the distance it actually used was the object's
   * own length, clamped by how much floor the room has. On an upright phone
   * that happened to look fine. Turned sideways it was a disaster - a landscape
   * frame has barely twenty degrees of pitch and ninety of yaw, the car is six
   * metres long, and the tool opened with its tail and its back wheel off the
   * bottom right of the screen.
   *
   * So both fields are asked, and the binding one wins: how far back the
   * object's LENGTH has to be to sit inside the horizontal half-field, how far
   * back its HEIGHT has to be to sit inside the vertical one, and stand at
   * whichever is greater. A six-metre car cannot fill a portrait phone without
   * being cropped, and the honest answer there is to stand further back.
   *
   * A ROOM TOO SMALL TO SEE ITS OWN CONTENTS FROM IS NOT A ROOM.
   *
   * The floor bounds where you can stand, and with the default ten-metre room
   * up that bound is 3.8 m - while a six-metre car on an upright phone needs
   * nearly ten, because a 90 degree field is only 41 degrees WIDE when the
   * longest edge of the frame is the vertical one. So the search returned the
   * right answer and a hard clamp threw it away, and the tool opened with the
   * car running off both edges. That is the crop, and it is the whole of it.
   *
   * The clamp is not the thing to remove: standing outside your own walls,
   * looking in through them, is not a view anybody wants either. The room is
   * the thing to change. It is furniture - the walls are there to give the
   * scene a corner to read against, and a shell that will not let you back far
   * enough to see what is inside it has failed at the one job it has. So when
   * the framing needs more floor than there is, the room grows to give it,
   * squarely, and only as far as it must. With the walls down nothing bounds
   * it at all.
   *
   * Then whether to kneel. Anything taller than about a metre is something you
   * meet from your own height - a person, a car - and dropping to its waist
   * would be a strange way to do it. Anything lower has to be knelt to, or it
   * is a thing on the floor seen from above.
   */
  const frame = (size: [number, number, number]) => {
    const { cameraHeight, fov, room, roomLevel, setCameraHeight } = useStore.getState();
    const field = fieldOf(fov, window.innerWidth, window.innerHeight);

    /**
     * How much of each half-field the object is allowed to take.
     *
     * NINETY-SIX PER CENT, AND IT WAS EIGHTY-SIX. Fourteen per cent of margin
     * on every edge is a lot of air when the subject is the whole reason for
     * the view: on an upright phone it stood the eye eighteen metres off an
     * eight-metre aeroplane and left the thing a band across the middle with
     * empty floor under it and empty page over it. Ninety-six brings the eye
     * in by about a sixth and the aircraft and its yard grow to match, without
     * crossing the line this number exists to hold - the whole of the object
     * is still inside the frame, which is the rule, and the four per cent left
     * is the honest slack for the corner cases the search is solving against.
     */
    const FILL = 0.96;
    const halfYaw = Math.min(field.halfYaw, Math.PI * 0.46);
    const halfPitch = Math.min(field.halfPitch, Math.PI * 0.46);

    /*
     * The width to clear is what the TURN actually presents.
     *
     * Not the object's length - the opening turns it forty degrees off square,
     * which is the whole point, so that all three of its axes run to three
     * separate points, and a turned box shows some of its side as well as some
     * of its end. Not the footprint's diagonal either, which is what this used
     * to take: the diagonal is the width at the one bearing that presents it,
     * forty-five degrees off, and everywhere else it is an over-estimate. On
     * the car it is twelve per cent over, which is a metre of air added to
     * every edge for nothing.
     *
     * AND IT IS NOT A WIDTH AT ALL, IT IS FOUR CORNERS.
     *
     * A width has to be held at some depth to become an angle, and the depth
     * that matters is not the one through the middle of the object. The corner
     * that reaches furthest across the frame is also the one nearest the eye,
     * and being nearer it subtends more - on the car in portrait, 21.0 degrees
     * against the 17.8 the mid-plane width predicted, which is a corner one
     * degree outside a 20.7 degree field. That is the front wing, off the edge
     * of an upright phone, at a distance the solve had just certified.
     *
     * So the four corners of the turned footprint are carried about and asked
     * directly. It is the same trigonometry either way, done in the right
     * place: each corner has its own lateral offset and its own depth.
     */
    /*
     */
    const cos = Math.cos(OPENING_TURN);
    const sin = Math.sin(OPENING_TURN);
    const feet = ([1, -1] as const).flatMap((a) =>
      ([1, -1] as const).map((b) => {
        const x = (a * size[0]) / 2;
        const z = (b * size[2]) / 2;
        return { x: x * cos + z * sin, z: -x * sin + z * cos };
      })
    );
    /** The widest any corner reaches, standing d back. */
    const widest = (d: number) =>
      Math.max(...feet.map((foot) => Math.atan(Math.abs(foot.x) / Math.max(d - foot.z, 0.35))));
    /** ...and how far the nearest of them is in front of the origin. */
    const deep = Math.max(...feet.map((foot) => foot.z));
    /*
     * AIMED AT THE MIDDLE, and raising that was tried and put back.
     *
     * Half the opening frame is empty floor, and aiming higher looks like the
     * fix: lift the aim to seven tenths of the object's height and the horizon
     * should drop out of the centre. It does not. At the distance an eight
     * metre aeroplane has to be stood at to fit an upright phone - eighteen
     * metres - moving the aim point up by sixty centimetres is one degree of
     * pitch, which is nothing; and because `fits` measures both ends of the
     * object from the aim, aiming higher puts the FOOT further from it and the
     * solve answers by standing further back still. Measured: 16.9 m became
     * 18.3 m for a frame that looked the same.
     *
     * The empty floor is not a bug in the aim. It is what standing in a field
     * at eye height and looking level at something eighteen metres away
     * genuinely looks like, and the only lever that moves it is how much of the
     * field the subject is allowed - which is FILL, above.
     */
    const middle = size[1] / 2;
    const eye = size[1] >= EYE_TO_EYE ? cameraHeight : Math.max(0.8, middle + 0.55);

    /*
     * ...and the height to clear is not the object's height either.
     *
     * A long thing seen from a standing eye runs a long way DOWN the frame:
     * its near end is close, and the angle from the horizon down to the ground
     * at that near end is most of the vertical field on a landscape phone. The
     * old solve measured the object's own height, which is the one number that
     * has nothing to do with it, and the tool opened with the front wheel off
     * the bottom of the screen.
     *
     * AND IT HAS TO FIT AROUND WHERE THE CAMERA WILL ACTUALLY POINT.
     *
     * The pitch is not free: the eye is aimed at the object's middle, which
     * keeps the horizon and the vanishing points on the page, and that is the
     * lesson the opening view exists to teach - so it is not something to give
     * up to centre a car. But the vertical span is not centred on the object's
     * middle. It runs from the GROUND at the near edge, which is far below it,
     * up to the near top edge, which is barely above; the middle of that span
     * sits some way beneath the point being looked at. Measuring the span's
     * total width against the whole field, as this did, therefore passes
     * distances at which the near end is still off the bottom - by six per
     * cent of the frame on a landscape phone, which is the front wheel.
     *
     * So each end is measured from the aim rather than from each other, and
     * the worse of the two has to fit its half of the field.
     *
     * Both conditions are transcendental in the distance, so they are searched
     * rather than solved. Sixteen halvings settle it to a centimetre, once,
     * when the object is stood up.
     */
    const fits = (d: number) => {
      if (widest(d) > halfYaw * FILL) return false;
      const near = Math.max(d - deep, 0.35);
      const aim = Math.atan2(middle - eye, d);
      // Signed, both of them: a thing shorter than the eye has its top BELOW
      // the horizon, and calling that a rise of nothing was a small lie that
      // stood you further back than the shape needed.
      const top = Math.atan((size[1] - eye) / near);
      const foot = -Math.atan(eye / near);
      return Math.max(Math.abs(top - aim), Math.abs(foot - aim)) <= halfPitch * FILL;
    };
    let low = 0.9;
    let high = 60;
    if (!fits(high)) low = high;
    else {
      for (let i = 0; i < 16; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) high = mid;
        else low = mid;
      }
    }
    const wanted = Math.min(60, Math.max(0.9, high));

    /*
     * Grow the room to the view rather than crop the view to the room.
     *
     * Squarely, because the object is turned and a room that gained ten metres
     * of depth and none of width is a corridor with a car across it. Only when
     * the walls are up, only as far as short, and setRoom's own limit of forty
     * metres still has the last word - past that the honest answer really is
     * that you cannot see the thing from inside the building.
     */
    const standing = () => (roomLevel > 0 ? standingRoom(useStore.getState().room) : Infinity);
    if (roomLevel > 0 && wanted > standing()) {
      const side = 2 * (wanted + 1.2);
      useStore.getState().setRoom({
        width: Math.max(room.width, side),
        depth: Math.max(room.depth, side),
      });
    }
    const distance = Math.min(standing(), wanted);

    setCameraHeight(eye);
    /*
     * Glided, not teleported. This lands one to three seconds after boot -
     * whenever the aircraft finishes parsing - and it used to land as a hard
     * cut from the default stand to the solved one, which read as the picture
     * snapping under whoever was already looking at it. See glideWalkerTo for
     * who wins if the viewer is saying something at the time.
     */
    walkInput.lookYaw = 0;
    walkInput.lookPitch = 0;
    walkInput.seeded = true;
    glideWalkerTo({ x: 0, z: distance, yaw: 0, pitch: Math.atan2(middle - eye, distance) });

    // Kept so a turned phone can be answered - see below.
    framed.current = { size, z: distance, pitch: walkInput.pitch, eye };
  };

  /**
   * The opening framing, and the pose it chose - so turning the phone can be
   * answered rather than ignored.
   *
   * The whole solve depends on the shape of the window: at 90 degrees the
   * field is laid on the longest edge, so upright a phone has 41 degrees of
   * yaw and 90 of pitch, and on its side exactly the other way round. Those
   * are different answers - nine metres back against six for the same car -
   * and the framing ran once, on mount, and never again. Open upright and turn
   * the phone and the car went off the right-hand edge; the tool had framed
   * itself for a window that no longer existed.
   *
   * Only while the view is still the one that was chosen, though. The moment
   * you walk, turn or kneel, where you are standing is yours, and a framing
   * that reasserted itself every time the address bar collapsed would be the
   * worse bug by far. So the pose is remembered, and the first time the live
   * one differs from it this stops watching for good.
   */
  const framed = useRef<{ size: [number, number, number]; z: number; pitch: number; eye: number } | null>(null);
  useEffect(() => {
    const reframe = () => {
      const held = framed.current;
      if (!held) return;
      const moved =
        Math.abs(walkInput.position.x) > 0.01 ||
        Math.abs(walkInput.position.z - held.z) > 0.01 ||
        Math.abs(walkInput.yaw) > 0.004 ||
        Math.abs(walkInput.pitch - held.pitch) > 0.004 ||
        Math.abs(walkInput.lookYaw) > 0.004 ||
        Math.abs(walkInput.lookPitch) > 0.004 ||
        Math.abs(useStore.getState().cameraHeight - held.eye) > 0.01;
      if (moved) {
        framed.current = null;
        return;
      }
      frame(held.size);
    };
    window.addEventListener('resize', reframe);
    window.addEventListener('orientationchange', reframe);
    return () => {
      window.removeEventListener('resize', reframe);
      window.removeEventListener('orientationchange', reframe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The scene the tool starts from: the racer on the origin with its yard round
   * it, framed to fill the frame with the aircraft.
   *
   * Both the opening and the reset go through here, so those two are the same
   * state by construction rather than by two pieces of code agreeing. Reset
   * therefore means "back to how this started", which is a place to draw from,
   * rather than "empty grid", which is a place to look at.
   *
   * EVERYTHING IS FETCHED BEFORE ANYTHING STANDS UP. The crew could be stood as
   * they arrived, which would put the aircraft on the grid a moment sooner - and
   * would also mean the guard below is asked five separate times, so a viewer
   * who placed a chair during the load would find half a yard landing on top of
   * it. One await, one guard, one arrangement: it either all happens or none of
   * it does. They are fetched in parallel and the four men come to a third of
   * what the aircraft alone weighs, so the wall clock is the aircraft's either
   * way.
   *
   * Twenty-six megabytes over the network before anything stands up, and
   * twenty of them are the aeroplane. The hairline says so, rather than the
   * grid sitting empty for a second and a half with nothing to suggest that it
   * will not stay that way. (A reset pays nothing: the parsed sources are still
   * in hand, kept alive by the undo step.)
   */
  const standOpening = () => {
    const entry = openingMesh();
    const done = beginActivity();
    return Promise.all([
      loadModelFromUrl(entry.url, entry.name, [0, 0], entry.height),
      ...GROUND_CREW.map((who) => {
        const mesh = MESH_LIBRARY.find((m) => m.id === who.id);
        if (!mesh) return Promise.resolve(null);
        return loadModelFromUrl(mesh.url, mesh.name, who.at, mesh.height)
          .then(({ model }) => ({ ...model, rotationY: who.turn }))
          // One missing file is a thinner yard, not a tool that failed to open.
          .catch(() => null);
      }),
    ])
      .then(([{ model }, ...crew]) => {
        // Anything the viewer did in the meantime wins: a scene opened from the
        // library, or a mesh placed by hand, is not something to land on top of.
        const { models, boxes } = useStore.getState();
        if (models.length || boxes.length) return;
        standObject({ ...model, position: [0, 0, 0], rotationY: OPENING_TURN });
        crew.forEach((who) => who && standObject(who));
        // A scanned figure arrives normalised and is scaled on the way in, so
        // what it will stand at is its authored size times that scale. The turn
        // is not folded in: the framing wants the longest edge either way, and
        // the diagonal it presents when turned is within a few per cent of it.
        //
        // Framed on the AIRCRAFT, not on everything standing there. The yard is
        // for walking into and drawing from inside; a frame solved round the
        // whole of it would open on a wide shot of four small things.
        frame(model.size.map((metres) => metres * model.scale) as [number, number, number]);
      })
      .catch((error) => {
        console.error('Could not stand the opening model up:', error);
        reportFailure();
      })
      .finally(done);
  };

  /**
   * What is standing there when the tool opens. Guarded because a strict mode
   * double-mount would otherwise stand up two of them.
   */
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    standOpening();
    // Once: this is the scene the tool arrives with, not something that follows
    // any later state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /**
   * Stand a new mesh clear of everything already placed, near the gaze point.
   *
   * Everything, now: this asked only about the other meshes, so a chair set
   * down where a blocked-in box already stood went straight through it.
   */
  const place = (model: Omit<SceneModel, 'id'>, quiet?: boolean) => {
    const [x, z] = findFreeSpot(
      onTheFloor(useStore.getState()),
      [focusPoint.x, focusPoint.z],
      modelRadius(model)
    );
    addModel({ ...model, position: [x, 0, z] }, quiet);
  };

  /**
   * Loading something that was asked for.
   *
   * The library's own thumbnails are drawn on this same thread, so they are
   * stood down for the duration: the mesh you tapped should not queue behind
   * pictures of the ones you did not.
   */
  const whileLoading = async (id: string, work: () => Promise<void>) => {
    setBusy(id);
    holdPreviews();
    const done = beginActivity();
    try {
      await work();
    } catch (error) {
      console.error('Could not load that mesh:', error);
      reportFailure();
    } finally {
      done();
      resumePreviews();
      setBusy(null);
    }
  };

  const placeLibraryMesh = (id: string) => {
    const entry = MESH_LIBRARY.find((mesh) => mesh.id === id);
    if (!entry) return;
    const scene = entry.kind === 'scene';
    return whileLoading(id, async () => {
      const { model } = await loadModelFromUrl(
        entry.url,
        entry.name,
        scene ? [0, 0] : [focusPoint.x, focusPoint.z],
        entry.height
      );
      if (!model.previewSupported) return;
      // A room goes on the origin, squarely, and does not go looking for a
      // clear patch of floor to stand beside what is already there - it *is*
      // the floor. Standing one where you happened to be looking would put you
      // in the middle of a wall.
      if (scene) addModel({ ...model, kind: 'scene', position: [0, 0, 0] });
      else place(model);
    });
  };

  /**
   * A file dropped in.
   *
   * It is placed *and* kept: the shelf is what makes an import worth the walk to
   * the file picker, since the second time you want that chair it is already
   * here. A file the browser cannot read is not put on the shelf - there would
   * be nothing to place from it.
   */
  const importModels = (files: FileList) =>
    whileLoading('import', async () => {
      /*
       * ONE STEP BACK FOR THE WHOLE DROP, taken before any of it lands.
       *
       * Twenty files used to be twenty steps, which is wrong twice over. To
       * undo a drop you had to press it twenty times. And a parsed mesh is
       * held in memory while ANY history entry still names its file - that is
       * what makes undo able to bring it back - so twenty steps pinned twenty
       * meshes for the twenty-five actions afterwards, in the scene or not.
       * Dropping a folder of figures on a phone spends its memory on the
       * history of the drop rather than on the drop.
       */
      useStore.getState().beginChange();
      for (const file of Array.from(files)) {
        const { model } = await loadModelFile(file, [focusPoint.x, focusPoint.z]);
        if (!model.previewSupported) continue;
        place(model, true);
        await rememberMesh(model.fileUrl, model.name);
      }
    });

  /** Place one of the viewer's own again, from the shelf. */
  const placeOwnMesh = (url: string, name: string) =>
    whileLoading(url, async () => {
      const { model } = await loadModelFromUrl(url, name, [focusPoint.x, focusPoint.z]);
      if (model.previewSupported) place(model);
    });

  const exportScene = async () => {
    setBusy('export');
    const done = beginActivity();
    try {
      const state = useStore.getState();
      // Filed under whatever the open project is called, which is the whole
      // point of it having a name: an export used to land as `scene.perspective`
      // however many of them you wrote, so a folder of them was a folder of
      // one filename with numbers after it.
      const open = state.sceneHistory.find((scene) => scene.id === state.currentSceneId);
      await downloadSceneFile(
        toSceneFile(state.boxes, state.models, state.lamps, currentView(state), open?.name)
      );
    } catch (error) {
      console.error('Could not write the scene file:', error);
      reportFailure();
    } finally {
      done();
      setBusy(null);
    }
  };

  const importScene = async (file: File) => {
    setBusy('import');
    const done = beginActivity();
    try {
      const { boxes, models, lamps, view, skipped } = await readSceneFile(file);
      applyScene({ boxes, models, lamps, view });
      if (skipped.length > 0) {
        console.warn(`Some meshes were skipped on import:\n${skipped.join('\n')}`);
        // Part of a scene arriving is not a success, and the file it came from
        // is the only place the missing geometry now exists.
        reportFailure();
      }
      setSheet(null);
    } catch (error) {
      console.error('Scene import failed:', error);
      reportFailure();
    } finally {
      done();
      setBusy(null);
    }
  };

  const isDark = theme === 'dark';
  return (
    <div
      className="fixed inset-0 w-screen h-screen font-sans selection:bg-none"
      // The same page the canvas paints, so the safe-area strips above and
      // below it are the mount rather than an approximation of it.
      style={{ minHeight: '100dvh', backgroundColor: pageHex() }}
    >
      <Scene />
      {/* The real room, under everything the tool draws over it. */}
      <CameraFeed />
      <Activity />
      {/* Hold any control to be told what it is. */}
      <Hints />
      {teaching && <Lesson onDone={() => setTeaching(false)} />}
      {/* The frame a lens composes into, over the picture and under the
          chrome - ruled in the same ink as the rest of the construction. */}
      <Gate ink={constructionInk(isSketch(surface), isDark)} />
      <VanishingPoints color={constructionInk(isSketch(surface), isDark)} />
      <Measures />
      {/*
        * Both libraries are handed to the overlay rather than drawn over it.
        *
        * They used to come up from the bottom edge as modal sheets, which put
        * them on top of the dock - so the moment either was open the whole
        * toolbar was gone, and you could not see what you were placing a mesh
        * into. They stand in the panel slot now, above the dock and beside the
        * tools and the lights, as one row you scroll sideways. Which is what
        * they are: a shelf.
        */}
      <WalkOverlay
        onModels={() => setSheet((at) => (at === 'meshes' ? null : 'meshes'))}
        onScenes={() => setSheet((at) => (at === 'scenes' ? null : 'scenes'))}
        shelfOpen={sheet !== null}
        onShelfAway={() => setSheet(null)}
        onLesson={() => setTeaching(true)}
        shelf={
          sheet === 'meshes' ? (
            <MeshSheet
              onPlace={placeLibraryMesh}
              onPlaceOwn={placeOwnMesh}
              onImport={importModels}
              busyId={busy}
            />
          ) : sheet === 'scenes' ? (
            <SceneSheet
              onClose={() => setSheet(null)}
              onExport={exportScene}
              onImport={importScene}
              busy={busy !== null}
            />
          ) : null
        }
      />
    </div>
  );
}
