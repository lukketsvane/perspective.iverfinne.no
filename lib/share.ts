import { BoxData, SceneModel } from '../types';
import { MESH_LIBRARY } from './meshLibrary';

/**
 * A study, packed into the URL.
 *
 * Composing is easier on a big screen and drawing happens on the phone, so the
 * handoff between the two has to be trivial: build the study, copy the link,
 * open it there. Everything rides in the fragment, so no server ever sees the
 * scene and no round trip is needed to restore one.
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

/**
 * Library figures, packed by index.
 *
 * Only the built-in meshes can travel: an imported file lives in this browser's
 * memory as a blob, and there is nowhere for the other end to fetch it from.
 * Those are left behind rather than pretended about.
 */
type PackedModel = [number, number, number, number, number];

const encodeModels = (models: SceneModel[]): string => {
  const packed: PackedModel[] = [];
  models.forEach((model) => {
    const index = MESH_LIBRARY.findIndex((entry) => entry.url === model.fileUrl);
    if (index < 0) return;
    packed.push([
      index,
      round(model.position[0]),
      round(model.position[2]),
      Math.round(model.rotationY * 100) / 100,
      Math.round(model.scale * 1000) / 1000,
    ]);
  });
  return toBase64Url(JSON.stringify(packed));
};

export interface SharedModel {
  meshId: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

const decodeModels = (encoded: string): SharedModel[] => {
  try {
    const packed = JSON.parse(fromBase64Url(encoded));
    if (!Array.isArray(packed)) return [];
    return packed
      .filter((m: unknown) => Array.isArray(m) && m.length === 5 && m.every((n) => typeof n === 'number'))
      .map((m: PackedModel) => ({
        meshId: MESH_LIBRARY[m[0]]?.id,
        position: [m[1], 0, m[2]] as [number, number, number],
        rotationY: m[3],
        scale: m[4],
      }))
      .filter((m): m is SharedModel => Boolean(m.meshId));
  } catch {
    return [];
  }
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
export const shareUrl = (boxes: BoxData[], models: SceneModel[] = []): string => {
  const base = `${window.location.origin}${window.location.pathname}`;
  const packedModels = encodeModels(models);
  const modelPart = packedModels && packedModels !== toBase64Url('[]') ? `&m=${packedModels}` : '';
  return `${base}#s=${encodeScene(boxes)}${modelPart}`;
};

/** Read a study out of the address bar, if one was passed in. */
export const sceneFromUrl = (): { boxes: Omit<BoxData, 'id'>[]; models: SharedModel[] } | null => {
  if (typeof window === 'undefined') return null;
  const boxMatch = /[#&]s=([A-Za-z0-9\-_]+)/.exec(window.location.hash);
  if (!boxMatch) return null;
  const boxes = decodeScene(boxMatch[1]);
  if (!boxes || boxes.length === 0) return null;

  const modelMatch = /[#&]m=([A-Za-z0-9\-_]+)/.exec(window.location.hash);
  return { boxes, models: modelMatch ? decodeModels(modelMatch[1]) : [] };
};

/**
 * Hand the link to whatever the device does best: the share sheet on a phone,
 * the clipboard on a desktop. Returns what happened, for the notice.
 */
export const shareScene = async (
  boxes: BoxData[],
  models: SceneModel[] = []
): Promise<'shared' | 'copied' | 'failed'> => {
  const url = shareUrl(boxes, models);
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
