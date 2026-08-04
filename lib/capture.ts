/**
 * Getting the view off the screen.
 *
 * The point of the tool is to set up a view and then draw from it, so the view
 * has to be able to leave: onto a second monitor, a tablet, or paper. The same
 * frame, shrunk, is what a saved scene is recognised by in the library.
 *
 * Both rely on the canvas keeping its last frame readable, which is what
 * `preserveDrawingBuffer` on the renderer is for.
 */

const sceneCanvas = () => document.querySelector('canvas');

/** Save the current view as a PNG. */
export const captureView = (fileName: string): boolean => {
  const canvas = sceneCanvas();
  if (!canvas) return false;

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
};

/** perspective-eye1.90m-210deg-2026-07-28.png */
export const captureFileName = (eyeHeight: number, fov: number): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `perspective-eye${eyeHeight.toFixed(2)}m-${Math.round(fov)}deg-${date}.png`;
};

/** How wide a saved scene's thumbnail is. Two across on the narrowest phone. */
const THUMBNAIL_WIDTH = 320;

/**
 * A small JPEG of the current frame.
 *
 * Kept deliberately cheap: a library of forty full-resolution PNGs would be
 * tens of megabytes of storage for pictures shown 150 px wide.
 */
export const captureThumbnail = (): string | undefined => {
  const canvas = sceneCanvas();
  if (!canvas?.width || !canvas.height) return undefined;

  try {
    const scale = Math.min(1, THUMBNAIL_WIDTH / canvas.width);
    const target = document.createElement('canvas');
    target.width = Math.max(1, Math.round(canvas.width * scale));
    target.height = Math.max(1, Math.round(canvas.height * scale));

    const context = target.getContext('2d');
    if (!context) return undefined;
    context.drawImage(canvas, 0, 0, target.width, target.height);
    return target.toDataURL('image/jpeg', 0.7);
  } catch {
    // A tainted or lost canvas is not worth failing a save over.
    return undefined;
  }
};
