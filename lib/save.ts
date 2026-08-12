/**
 * Handing a finished file to the person who asked for it.
 *
 * THE ONE THAT WAS WRONG ON A PHONE. Every export in this tool used the same
 * idiom - a blob URL, a synthetic `<a download>`, a click - which is correct on
 * a desktop and is the worst available path in an iOS web app opened from the
 * home screen. There is no address bar there, no tab bar and no back gesture,
 * so WebKit cannot show a download; it falls back to a generic document
 * hand-off instead. What the viewer gets for "save the view as a picture" is a
 * grey page with a PNG file icon, a filename, and a list that starts "Open in
 * Instagram" - no Save Image anywhere on it, because at that point the system
 * has stopped treating the thing as a picture.
 *
 * The API that reaches the real share sheet with a file attached is Web Share
 * level 2, and it is the only one. `navigator.share({ files })` on iOS 15 and
 * up gives Save Image, Copy Photo, AirDrop, Messages and the rest, in
 * standalone as well as in a tab - which for a PNG of a drawing is the whole
 * point.
 *
 * ASKED, NOT SNIFFED. `navigator.canShare({ files })` is the gate, in the house
 * style of `quickLookAvailable` in lib/exportAR.ts: it answers the question
 * actually being asked - can this browser hand the viewer THIS file properly -
 * rather than the proxy question of whether we are in a home-screen app. It has
 * to be asked about the real payload, too: level 1 shipped text and URLs only
 * on several platforms, so `navigator.share` existing does not mean files work,
 * and handing a level-1 implementation a `files` array throws.
 *
 * A `File` and not a `Blob`, because the sheet takes the name and the type off
 * the file itself, and a bare Blob is refused.
 */

/** Whether this browser can hand the viewer these files as files. */
export const canShareFiles = (files: File[]): boolean => {
  if (typeof navigator === 'undefined') return false;
  const share = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof share.share !== 'function' || typeof share.canShare !== 'function') return false;
  try {
    return share.canShare({ files });
  } catch {
    // A level-1 implementation throws on `files` rather than answering.
    return false;
  }
};

/**
 * The old way, kept exactly as it was.
 *
 * It is still right everywhere the share sheet is not: a desktop viewer wants
 * the file in their downloads folder and would be baffled by a share sheet.
 */
const downloadFile = (file: Blob, fileName: string) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Give the viewer the file, by whichever route this browser actually has.
 *
 * DISMISSING THE SHEET IS NOT A FAILURE. A cancelled share rejects with
 * `AbortError`, and the caller of this is wrapped in `whileWorking`, which
 * turns anything thrown into the red hairline that means the tool broke.
 * Changing your mind about where a picture goes is not the tool breaking, so
 * that one rejection is swallowed and nothing else happens - in particular the
 * file is NOT then downloaded behind the viewer's back, which is the opposite
 * of what they just asked for.
 *
 * ANY OTHER REJECTION FALLS BACK. The one worth naming is `NotAllowedError`:
 * `share()` needs the user gesture still to be live, and Safari is the strictest
 * about it. Everything this tool shares is rendered first - a 5000 pixel canvas,
 * one image load per overlay, a PNG encode - and that work can outlast the tap.
 * Rather than pretend otherwise, the download is there to catch it, so the worst
 * case is the behaviour we had before rather than nothing at all.
 */
export const handOver = async (blob: Blob, fileName: string, type: string): Promise<boolean> => {
  const file = new File([blob], fileName, { type });
  if (canShareFiles([file])) {
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        files: [file],
      });
      return true;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return true;
      // Anything else - no permission, no activation, no handler - is a reason
      // to use the route that does not need any of those.
    }
  }
  downloadFile(blob, fileName);
  return true;
};
