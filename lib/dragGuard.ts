/**
 * A short veto on the click that follows a drag.
 *
 * Release a drag and the pointer is over the floor, not over the thing you were
 * dragging - so the browser's click lands on the ground plane, whose job is to
 * clear the selection. The result was that every move deselected what it had
 * just moved. This marks the moment a drag ended so the ground can ignore the
 * click that belongs to it.
 */
let ignoreUntil = 0;

export const noteDragEnd = () => {
  ignoreUntil = performance.now() + 250;
};

export const dragJustEnded = () => performance.now() < ignoreUntil;
