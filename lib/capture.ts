/**
 * Save the current view as a PNG.
 *
 * The point of the tool is to set up a view and then draw from it, so the view
 * has to be able to leave the screen: onto a second monitor, a tablet, or
 * paper. With the camera feed on, the video is composited underneath first -
 * the WebGL canvas is transparent in that mode, and a picture of floating
 * cubes on nothing is not the reference that was set up.
 */
export const captureView = (fileName: string): boolean => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;

  const video = document.querySelector('video');
  let dataUrl: string;

  if (video && video.videoWidth > 0) {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return false;

    // Match the video's object-cover framing so the saved frame is what was
    // on screen, not a stretched version of it.
    const scale = Math.max(out.width / video.videoWidth, out.height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    ctx.drawImage(
      video,
      (out.width - drawWidth) / 2,
      (out.height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    dataUrl = out.toDataURL('image/png');
  } else {
    dataUrl = canvas.toDataURL('image/png');
  }

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
