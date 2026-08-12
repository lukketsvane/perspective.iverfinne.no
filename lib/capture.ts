/**
 * Getting the view off the screen.
 *
 * The point of the tool is to set up a view and then draw from it, so the view
 * has to be able to leave: onto a second monitor, a tablet, or paper. And what
 * leaves should be the drawing, not a photograph of the app - which means at a
 * size worth printing, with the construction on it, and without the artefacts
 * of a canvas that was built to keep sixty frames a second on a phone.
 *
 * The thumbnail a saved scene is recognised by is the opposite problem and is
 * still just a small JPEG of the glass.
 */

import { handOver } from './save';

const sceneCanvas = () => document.querySelector('canvas');

/**
 * Whoever can draw the picture again, larger.
 *
 * The curvilinear frame is not the scene rendered through a camera - it is a
 * full-screen pass over a source, and only the component that owns that pass
 * can run it at another size. So it lends the ability out rather than the tool
 * reaching in. With nothing registered (in the room, in a real one, where the
 * picture is the phone's own camera) the export falls back to the glass.
 */
type FrameRenderer = (width: number, height: number) => HTMLCanvasElement | null;

let drawFrame: FrameRenderer | null = null;

export const registerFrameRenderer = (renderer: FrameRenderer | null) => {
  drawFrame = renderer;
};

/**
 * How much bigger the exported picture is than the frame it was set up in.
 *
 * Three: a laptop frame comes out around 3000 px on the long edge, which is a
 * sheet of A3 at 250 dpi and about as much as anyone draws from. Past that the
 * gain is invisible and the wait is not.
 */
const EXPORT_SCALE = 3;

/** And what no browser should be asked to hold in one image. */
const EXPORT_LIMIT = 5000;

/**
 * The construction, drawn over the picture at the same size.
 *
 * The vanishing points and the cone are SVG over the canvas rather than in it,
 * so a screenshot of the canvas has never had them - which is the half of the
 * picture the tool is actually for. Each one is re-rendered at the export's
 * scale from its own markup: a viewBox of the frame's own size against a width
 * of the exported size means every line comes out the same weight relative to
 * the picture as it is on screen.
 */
const overlay = (svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    copy.setAttribute('width', String(width));
    copy.setAttribute('height', String(height));
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  });

/**
 * Save the view as a PNG, drawn again at export size.
 *
 * Returns false only when there is nothing on screen to draw at all; a failure
 * further in falls back to the glass rather than to nothing, because a picture
 * at screen resolution is worth more than an error.
 */
export const captureView = async (fileName: string): Promise<boolean> => {
  const canvas = sceneCanvas();
  if (!canvas) return false;

  const frame = { width: window.innerWidth, height: window.innerHeight };
  // The third clause used to be a max against EXPORT_SCALE, which inside a min
  // against EXPORT_SCALE can never change the answer - so "never smaller than
  // what is already on the glass" was doing nothing at all. It is true anyway:
  // the canvas is capped at a pixel ratio of about 2 and the export is 3.
  const scale = Math.min(EXPORT_SCALE, EXPORT_LIMIT / Math.max(frame.width, frame.height));
  const width = Math.round(frame.width * scale);
  const height = Math.round(frame.height * scale);

  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  const context = sheet.getContext('2d');
  if (!context) return false;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const drawn = drawFrame?.(width, height) ?? null;
  context.drawImage(drawn ?? canvas, 0, 0, width, height);

  for (const svg of Array.from(document.querySelectorAll('svg'))) {
    // Only the overlays over the scene; the icons in the chrome are svg too.
    if (!svg.classList.contains('absolute')) continue;
    const picture = await overlay(svg, width, height);
    if (picture) context.drawImage(picture, 0, 0, width, height);
  }

  const blob = await new Promise<Blob | null>((resolve) => sheet.toBlob(resolve, 'image/png'));
  if (!blob) return false;

  // The share sheet where there is one, the download where there is not - see
  // lib/save.ts for why a picture in particular has to go the first way on a
  // phone. This used to be the download, unconditionally.
  return handOver(blob, fileName, 'image/png');
};

/** perspective-eye1.90m-210deg-2026-07-28.png */
/**
 * What the file is called.
 *
 * Eye height, field, and which of the three sheets it was drawn on. The last of
 * those was missing, and it is the one you must know before putting a pencil on
 * the picture: an equidistant 180 and a stereographic 180 are different
 * drawings of the same room, and nothing in the pixels says which.
 */
export const captureFileName = (eyeHeight: number, fov: number, mode: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `perspective-eye${eyeHeight.toFixed(2)}m-${Math.round(fov)}deg-${mode}-${date}.png`;
};

/** How wide a saved scene's thumbnail is. Two across on the narrowest phone. */
const THUMBNAIL_WIDTH = 320;

/**
 * A small JPEG of the current frame.
 *
 * Kept deliberately cheap: a library of forty full-resolution PNGs would be
 * tens of megabytes of storage for pictures shown 150 px wide. This one does
 * read the glass, which is what `preserveDrawingBuffer` on the renderer is for.
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
