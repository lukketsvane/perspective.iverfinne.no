import { BoxData } from '../types';

/**
 * A study, packed into the URL.
 *
 * AR lives on the phone and composing is easier on a big screen, so the handoff
 * between the two has to be trivial: build the study, copy the link, open it on
 * the iPhone, tap AR. Everything rides in the fragment, so no server ever sees
 * the scene and no round trip is needed to restore one.
 *
 * Boxes are stored as flat number tuples rounded to the centimetre, which keeps
 * a typical study to a link that survives a text message.
 */

const round = (v: number) => Math.round(v * 100) / 100;

type PackedBox = [number, number, number, number, number, number, number, number, number];

const toBase64Url = (text: string) =>
  btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (text: string) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
};

export const encodeScene = (boxes: BoxData[]): string => {
  const packed: PackedBox[] = boxes.map((b) => [
    round(b.position[0]), round(b.position[1]), round(b.position[2]),
    round(b.scale[0]), round(b.scale[1]), round(b.scale[2]),
    round(b.rotation[0]), round(b.rotation[1]), round(b.rotation[2]),
  ]);
  return toBase64Url(JSON.stringify(packed));
};

export const decodeScene = (encoded: string): Omit<BoxData, 'id'>[] | null => {
  try {
    const packed = JSON.parse(fromBase64Url(encoded));
    if (!Array.isArray(packed)) return null;
    return packed
      .filter((b: unknown) => Array.isArray(b) && b.length === 9 && b.every((n) => typeof n === 'number'))
      .map((b: PackedBox) => ({
        position: [b[0], b[1], b[2]] as [number, number, number],
        scale: [b[3], b[4], b[5]] as [number, number, number],
        rotation: [b[6], b[7], b[8]] as [number, number, number],
      }));
  } catch {
    return null;
  }
};

/** The current page, carrying this study. */
export const shareUrl = (boxes: BoxData[]): string => {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#s=${encodeScene(boxes)}`;
};

/** Read a study out of the address bar, if one was passed in. */
export const sceneFromUrl = (): Omit<BoxData, 'id'>[] | null => {
  if (typeof window === 'undefined') return null;
  const match = /[#&]s=([A-Za-z0-9\-_]+)/.exec(window.location.hash);
  if (!match) return null;
  const boxes = decodeScene(match[1]);
  return boxes && boxes.length > 0 ? boxes : null;
};

/**
 * Hand the link to whatever the device does best: the share sheet on a phone,
 * the clipboard on a desktop. Returns what happened, for the notice.
 */
export const shareScene = async (boxes: BoxData[]): Promise<'shared' | 'copied' | 'failed'> => {
  const url = shareUrl(boxes);
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };

  if (nav.share) {
    try {
      await nav.share({ title: 'Perspective study', url });
      return 'shared';
    } catch (error) {
      // A cancelled share sheet is not a failure worth reporting.
      if ((error as Error)?.name === 'AbortError') return 'shared';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
};
