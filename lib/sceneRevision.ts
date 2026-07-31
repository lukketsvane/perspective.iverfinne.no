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
