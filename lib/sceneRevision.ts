import { useStore } from '../store';

/**
 * A number that changes whenever anything in the scene does.
 *
 * Two of the most expensive things the renderer does - the six cube faces the
 * curvilinear view is read off, and the sun's shadow map - depend on the scene
 * and not on where you are looking. Redoing them every frame for a scene that
 * has not moved is most of the cost of both, and it is the reason dragging the
 * sun felt like wading.
 *
 * So they are redone when this changes, and skipped when it has not. It is read
 * outside React deliberately: a counter that re-rendered the tree would cost
 * more than the work it is trying to avoid.
 */
export const sceneRevision = { value: 0 };

useStore.subscribe(() => {
  sceneRevision.value += 1;
});

/**
 * The same again, once the scene has actually been built.
 *
 * The subscription above fires when the store changes, which is *before* React
 * has put the new geometry in the scene. A frame landing in that gap redraws
 * the cube and the shadows for a scene that does not contain the new chair yet,
 * writes down the revision it drew, and then has no reason ever to draw again -
 * so in a curvilinear frame the chair is not merely late, it is absent, along
 * with its world matrix, which is what makes it untappable as well as invisible.
 * It comes back the moment anything else changes, which is what made it look
 * like an intermittent fault rather than a missed frame.
 *
 * Marking it a second time, from inside the commit, closes the gap: whichever
 * side of the frame React lands on, one of the two marks is still unread.
 */
export const markSceneBuilt = () => {
  sceneRevision.value += 1;
};
