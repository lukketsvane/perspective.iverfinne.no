/**
 * Save the current view as a PNG.
 *
 * The point of the tool is to set up a view and then draw from it, so the view
 * has to be able to leave the screen: onto a second monitor, a tablet, or
 * paper.
 */
export const captureView = (fileName: string): boolean => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;

  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
};

/** eye-1.90m-60deg-2026-07-28.png */
export const captureFileName = (eyeHeight: number, fov: number): string => {
  const date = new Date().toISOString().slice(0, 10);
  return `perspective-eye${eyeHeight.toFixed(2)}m-${Math.round(fov)}deg-${date}.png`;
};
