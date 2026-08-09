import * as THREE from 'three';
import { useStore } from '../store';
import { pickGround, pickObject, project, screenReach } from './pick';

/**
 * Taking hold of something.
 *
 * The rule is the one the scene always meant: a tap on a thing selects it and
 * stops there, and the *second* grab is what moves it - so brushing past a
 * figure while looking around never shoves it across the room. What follows
 * here is only ever reached when the finger lands on the thing already selected.
 *
 * Which it does is decided by where on it the finger lands. A face handle
 * pushes and pulls that face; anywhere else slides the whole thing along the
 * floor. Holding shift lifts it instead, for anything meant to be off the
 * ground.
 *
 * All of it goes through the same projection-correct picker as the tap, so a
 * chair follows the finger in a five-point sheet exactly as it does in a flat
 * one - which a flat ray, cast through a curved picture, cannot do.
 */

export interface Grab {
  move: (clientX: number, clientY: number, lift: boolean) => void;
  end: () => void;
}

/** Each pixel of upward drag raises what is held by this much. */
const LIFT_RATE = 0.02;

/** Smallest a box may be pushed down to, whatever the snap is set to. */
const MIN_BOX_DIM = 0.1;

/**
 * How few pixels a metre of the box's own axis may cover before the push-pull
 * stops tracking the finger and starts being a rate.
 *
 * A face turned nearly end-on to the eye moves almost nowhere on screen however
 * far it travels in the world, so following it exactly would mean a metre per
 * pixel. Clamped, the drag stays usable and only stops being one-to-one where
 * one-to-one has no meaning left.
 */
const MIN_PIXELS_PER_METRE = 12;
const MAX_PIXELS_PER_METRE = 3000;

/**
 * How far a face handle has to sit from the middle of its own box before it is
 * a thing you can aim at.
 *
 * Meet a box square on and the face pointing at you lands exactly over its
 * centre - so the most ordinary way to stand in front of a box would have been
 * the one way you could not move it, because the middle of it was a resize
 * handle. A face that has not separated itself from the box is not offered:
 * grabbing there moves the box, and the mark is not drawn.
 */
export const HANDLE_SEPARATION = 30; // pixels

/** Which way one of a box's faces looks, once the box has been turned. */
export const faceOutward = (
  rotation: [number, number, number],
  axis: 0 | 1 | 2,
  sign: 1 | -1 = 1
) =>
  new THREE.Vector3(
    axis === 0 ? sign : 0,
    axis === 1 ? sign : 0,
    axis === 2 ? sign : 0
  ).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));

/** Whether that face has drawn far enough clear of the box to be taken hold of. */
export const faceIsReachable = (
  centre: THREE.Vector3,
  outward: THREE.Vector3,
  halfExtent: number
) => screenReach(centre, outward.clone().multiplyScalar(halfExtent)) >= HANDLE_SEPARATION;

/**
 * Draw the line under the gesture, but not before it has done anything.
 *
 * Taking hold of the selection and letting go without moving is how anyone
 * checks they have hold of the right thing. If that pushed a step onto the
 * history, undo would spend its first press putting nothing back.
 */
const once = () => {
  let drawn = false;
  return () => {
    if (drawn) return;
    drawn = true;
    useStore.getState().beginChange();
  };
};

const snapper = () => {
  const step = useStore.getState().snapStep;
  return (value: number) => (step > 0 ? Math.round(value / step) * step : value);
};

/** Slide the selection along a level plane, or lift it off one. */
const carry = (
  clientX: number,
  clientY: number,
  read: () => { position: [number, number, number]; floor: number } | null,
  write: (position: [number, number, number]) => void
): Grab | null => {
  const held = read();
  if (!held) return null;

  const start = held.position;
  const startY = clientY;
  const plane = start[1];
  const grabbed = pickGround(clientX, clientY, plane) ?? new THREE.Vector3(start[0], plane, start[2]);
  const commit = once();

  return {
    move: (x, y, lift) => {
      const snap = snapper();
      if (lift) {
        commit();
        const risen = snap(start[1] + (startY - y) * LIFT_RATE);
        write([start[0], Math.max(held.floor, risen), start[2]]);
        return;
      }
      const now = pickGround(x, y, plane);
      if (!now) return;
      commit();
      write([snap(start[0] + now.x - grabbed.x), start[1], snap(start[2] + now.z - grabbed.z)]);
    },
    end: () => undefined,
  };
};

/**
 * Push or pull one face of a box.
 *
 * The face follows the finger: how far a metre of the box's own axis reaches
 * across the screen is measured once, at the moment it is taken hold of, and the
 * drag is divided by it. So the same gesture sizes a box near the eye and one
 * across the room at the rate each of them actually appears to move.
 *
 * The opposite face stays where it is, which is what makes this sizing rather
 * than scaling: the centre shifts by half of whatever the box grew by.
 */
const pushFace = (
  clientX: number,
  clientY: number,
  id: string,
  handle: { axis: 0 | 1 | 2; sign: 1 | -1 }
): Grab | null => {
  const box = useStore.getState().boxes.find((b) => b.id === id);
  if (!box) return null;

  const outward = faceOutward(box.rotation, handle.axis, handle.sign);
  const centre = new THREE.Vector3(...box.position);
  if (!faceIsReachable(centre, outward, box.scale[handle.axis] / 2)) return null;

  const here = project(centre);
  const along = project(centre.clone().add(outward));
  if (!here || !along) return null;

  const reach = Math.hypot(along.x - here.x, along.y - here.y);
  const pixelsPerMetre = THREE.MathUtils.clamp(reach, MIN_PIXELS_PER_METRE, MAX_PIXELS_PER_METRE);
  const towardsX = (along.x - here.x) / Math.max(reach, 1e-5);
  const towardsY = (along.y - here.y) / Math.max(reach, 1e-5);

  const startX = clientX;
  const startY = clientY;
  const startScale = [...box.scale] as [number, number, number];
  const startPosition = [...box.position] as [number, number, number];
  const commit = once();

  return {
    move: (x, y) => {
      commit();
      const snap = snapper();
      const step = useStore.getState().snapStep;
      // How far the finger travelled along the face's own outward direction.
      const travelled = ((x - startX) * towardsX + (y - startY) * towardsY) / pixelsPerMetre;

      const scale = [...startScale] as [number, number, number];
      scale[handle.axis] = Math.max(
        step > 0 ? step : MIN_BOX_DIM,
        snap(startScale[handle.axis] + travelled)
      );

      const grown = scale[handle.axis] - startScale[handle.axis];
      const position = [
        startPosition[0] + outward.x * (grown / 2),
        startPosition[1] + outward.y * (grown / 2),
        startPosition[2] + outward.z * (grown / 2),
      ] as [number, number, number];

      useStore.getState().updateBox(id, { scale, position });
    },
    end: () => undefined,
  };
};

/**
 * What the finger has taken hold of, if anything.
 *
 * Null for everything else - empty air, an object that is not the selection,
 * the floor - and the walk layer goes on to read the same pointer as a look or
 * a step, exactly as it did before.
 */
export const grabAt = (clientX: number, clientY: number): Grab | null => {
  const { selectedId, selectedModelId, selectedLampId } = useStore.getState();
  if (!selectedId && !selectedModelId && !selectedLampId) return null;

  const hit = pickObject(clientX, clientY);
  if (!hit) return null;

  if (hit.type === 'box') {
    if (hit.id !== selectedId) return null;
    // A handle that has not separated itself from the box refuses, and the grab
    // becomes what it looks like: a hand on the box, moving it.
    if (hit.handle) {
      const push = pushFace(clientX, clientY, hit.id, hit.handle);
      if (push) return push;
    }

    return carry(
      clientX,
      clientY,
      () => {
        const box = useStore.getState().boxes.find((b) => b.id === hit.id);
        // A box is held by its centre, so the floor for it is half its height.
        return box ? { position: [...box.position] as [number, number, number], floor: box.scale[1] / 2 } : null;
      },
      (position) => useStore.getState().updateBox(hit.id, { position })
    );
  }

  if (hit.type === 'lamp') {
    if (hit.id !== selectedLampId) return null;
    return carry(
      clientX,
      clientY,
      () => {
        const lamp = useStore.getState().lamps.find((l) => l.id === hit.id);
        // A lamp slides in its own horizontal plane and lifts like anything
        // else - but never into the floor, where a light is a mistake.
        return lamp
          ? { position: [...lamp.position] as [number, number, number], floor: 0.1 }
          : null;
      },
      (position) => useStore.getState().updateLamp(hit.id, { position })
    );
  }

  if (hit.id !== selectedModelId) return null;
  return carry(
    clientX,
    clientY,
    () => {
      const model = useStore.getState().models.find((m) => m.id === hit.id);
      // A model is held by its feet.
      return model ? { position: [...model.position] as [number, number, number], floor: 0 } : null;
    },
    (position) => useStore.getState().updateModel(hit.id, { position })
  );
};

/**
 * Two fingers on the selection: turn it, size it, and slide it, at once.
 *
 * The three readings a pair of fingers gives - the angle between them, the
 * distance, and where their midpoint is - are exactly the three things you want
 * to do to a chair you are placing, so all three are read at once rather than
 * being three separate modes to choose between.
 *
 * Turning and sizing both have a dead band, and they have to. Nobody twists two
 * fingers without also changing the gap a little, or spreads them without also
 * rolling the wrist, so without one, going for either would quietly do all
 * three. Past the dead band the reading is offset rather than jumped, so the
 * object does not lurch the moment the band is crossed.
 *
 * The slide is the same ground picking as the one-finger drag, so the object
 * stays under the midpoint of the two fingers instead of travelling at some
 * fixed number of centimetres per pixel that is right at one distance only.
 */
export interface Pinch {
  move: (ax: number, ay: number, bx: number, by: number) => void;
  end: () => void;
}

/** How far a gesture has to go before it is read as a turn, or as a resize. */
const TURN_DEAD = 0.06; // radians, about 3.5 degrees

/** Fifteen degrees: what a two-point construction is built out of. */
const TURN_STEP = Math.PI / 12;
const SIZE_DEAD = 0.08; // 8 per cent of the starting gap

const offset = (value: number, dead: number) =>
  value > dead ? value - dead : value < -dead ? value + dead : 0;

export const pinchOn = (ax: number, ay: number, bx: number, by: number): Pinch | null => {
  const state = useStore.getState();
  const box = state.selectedId ? state.boxes.find((b) => b.id === state.selectedId) : null;
  const model = state.selectedModelId ? state.models.find((m) => m.id === state.selectedModelId) : null;
  if (!box && !model) return null;

  const startGap = Math.max(Math.hypot(bx - ax, by - ay), 1);
  const startAngle = Math.atan2(by - ay, bx - ax);
  const startTurn = box ? box.rotation[1] : model!.rotationY;
  const startPosition = [...(box ? box.position : model!.position)] as [number, number, number];
  const startSize = box ? ([...box.scale] as [number, number, number]) : model!.scale;

  const plane = startPosition[1];
  const grabbed = pickGround((ax + bx) / 2, (ay + by) / 2, plane);
  const commit = once();

  return {
    move: (nax, nay, nbx, nby) => {
      commit();
      const snap = snapper();
      const gap = Math.max(Math.hypot(nbx - nax, nby - nay), 1);
      /*
       * The turn snaps when the drag does.
       *
       * Position has always snapped and rotation never did, so forty-five
       * degrees - the two-point setup - was unhittable by hand on every device,
       * and squaring something back up after a nudge was a matter of eye. It
       * lands on fifteen-degree steps, which is what a two-point construction
       * is built out of; snap off and it is free, as everything else is.
       */
      const swung = offset(Math.atan2(nby - nay, nbx - nax) - startAngle, TURN_DEAD);
      const turned =
        useStore.getState().snapStep > 0
          ? Math.round(swung / TURN_STEP) * TURN_STEP
          : swung;
      const grown = 1 + offset(gap / startGap - 1, SIZE_DEAD);

      const centreX = (nax + nbx) / 2;
      const centreY = (nay + nby) / 2;
      const now = grabbed ? pickGround(centreX, centreY, plane) : null;
      const position = [...startPosition] as [number, number, number];
      if (now && grabbed) {
        position[0] = snap(startPosition[0] + now.x - grabbed.x);
        position[2] = snap(startPosition[2] + now.z - grabbed.z);
      }

      if (box) {
        const scale = (startSize as [number, number, number]).map((side) =>
          Math.max(MIN_BOX_DIM, side * grown)
        ) as [number, number, number];
        // Sized about its base, so a box standing on the floor stays on it.
        position[1] = startPosition[1] + (scale[1] - (startSize as [number, number, number])[1]) / 2;
        useStore.getState().updateBox(box.id, {
          scale,
          position,
          rotation: [box.rotation[0], startTurn - turned, box.rotation[2]],
        });
        return;
      }

      useStore.getState().updateModel(model!.id, {
        position,
        rotationY: startTurn - turned,
        scale: THREE.MathUtils.clamp((startSize as number) * grown, 0.02, 50),
      });
    },
    end: () => undefined,
  };
};

/**
 * What the pointer is over, for a machine with a cursor to say so with.
 *
 * A phone has nothing to show this with and does not need it; a desktop does,
 * because there is otherwise no way to tell that the face under the arrow is a
 * handle and the rest of the box is not.
 */
export type Hovering = 'none' | 'select' | 'move' | 'size';

export const hoverAt = (clientX: number, clientY: number): Hovering => {
  const { selectedId, selectedModelId } = useStore.getState();
  const hit = pickObject(clientX, clientY);
  if (!hit) return 'none';
  if (hit.type === 'box' && hit.id === selectedId) {
    if (!hit.handle) return 'move';
    const box = useStore.getState().boxes.find((b) => b.id === hit.id);
    if (!box) return 'move';
    const outward = faceOutward(box.rotation, hit.handle.axis, hit.handle.sign);
    return faceIsReachable(new THREE.Vector3(...box.position), outward, box.scale[hit.handle.axis] / 2)
      ? 'size'
      : 'move';
  }
  if (hit.type === 'model' && hit.id === selectedModelId) return 'move';
  if (hit.type === 'lamp' && hit.id === useStore.getState().selectedLampId) return 'move';
  return 'select';
};
