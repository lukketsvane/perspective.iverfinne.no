/**
 * A scene as one file, geometry and all.
 *
 * Saving into the browser has always kept the meshes: an imported file goes
 * into storage and the scene points at it, so a composition reopens whole a
 * week later. Exporting did not. It wrote the arrangement and a list of
 * `asset:` references, which mean nothing anywhere else - so a project carried
 * to another machine arrived as an empty grid with the boxes still in it.
 *
 * So a scene file is a container now, built the way GLB is: a short header, a
 * JSON manifest, and the mesh bytes after it, uncompressed because a GLB is
 * already compressed and base64 in JSON would cost a third of the file for
 * nothing.
 *
 *   magic    4 bytes   "PSPV"
 *   version  uint32    1
 *   json     uint32    length of the manifest, in bytes
 *   manifest utf8      the scene, plus where each mesh sits below
 *   meshes   bytes     concatenated, each padded to a 4-byte boundary
 *
 * The four meshes the app ships with stay as plain `/meshes/...` references:
 * they are part of the app, they are the same on every copy of it, and
 * embedding three megabytes of chair in every export would be paying to carry
 * something both ends already have.
 */

import { getAsset, isAssetRef, putAssetAs } from './assets';
import type { SceneFile } from './sceneJson';

const MAGIC = 'PSPV';
const VERSION = 1;
const HEADER = 12;

export interface BundledMesh {
  ref: string;
  name: string;
  byteOffset: number;
  byteLength: number;
}

interface Manifest extends SceneFile {
  meshes: BundledMesh[];
}

const align = (value: number) => (value + 3) & ~3;

/** Every imported mesh a scene stands on, read back out of storage. */
export const gatherMeshes = async (refs: string[]) => {
  const wanted = Array.from(new Set(refs.filter(isAssetRef)));
  const found: { ref: string; name: string; bytes: ArrayBuffer }[] = [];
  for (const ref of wanted) {
    const asset = await getAsset(ref);
    if (asset) found.push({ ref, name: asset.name, bytes: asset.bytes });
  }
  return found;
};

export const packBundle = (scene: SceneFile, meshes: { ref: string; name: string; bytes: ArrayBuffer }[]): Blob => {
  const placed: BundledMesh[] = [];
  let offset = 0;
  for (const mesh of meshes) {
    placed.push({ ref: mesh.ref, name: mesh.name, byteOffset: offset, byteLength: mesh.bytes.byteLength });
    offset = align(offset + mesh.bytes.byteLength);
  }

  const manifest: Manifest = { ...scene, meshes: placed };
  const json = new TextEncoder().encode(JSON.stringify(manifest));

  const header = new ArrayBuffer(HEADER);
  const view = new DataView(header);
  for (let i = 0; i < 4; i++) view.setUint8(i, MAGIC.charCodeAt(i));
  view.setUint32(4, VERSION, true);
  view.setUint32(8, json.byteLength, true);

  // Each mesh padded out to its aligned length, so offsets in the manifest are
  // the offsets a reader will find.
  const body: BlobPart[] = [];
  meshes.forEach((mesh, index) => {
    body.push(mesh.bytes);
    const padding = align(placed[index].byteLength) - placed[index].byteLength;
    if (padding) body.push(new Uint8Array(padding));
  });

  return new Blob([header, json, ...body], { type: 'application/octet-stream' });
};

/** True if this file is a bundle rather than the plain JSON of older exports. */
export const isBundle = async (file: File): Promise<boolean> => {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return String.fromCharCode(...head) === MAGIC;
};

/**
 * Read a bundle, putting its meshes back into this browser's storage.
 *
 * They go back under the reference the manifest names rather than under a
 * fresh hash of their bytes: the hash depends on what the browser will hash
 * with, and a phone on a plain http address has no SubtleCrypto - so a file
 * written there and read here would otherwise land under a different name than
 * the scene is looking for.
 */
export const readBundle = async (file: File): Promise<SceneFile> => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (view.getUint32(4, true) !== VERSION) {
    throw new Error('That scene file was written by a different version.');
  }

  const jsonLength = view.getUint32(8, true);
  const manifest = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, HEADER, jsonLength))
  ) as Manifest;

  const meshesAt = HEADER + jsonLength;
  for (const mesh of manifest.meshes ?? []) {
    const bytes = buffer.slice(meshesAt + mesh.byteOffset, meshesAt + mesh.byteOffset + mesh.byteLength);
    await putAssetAs(mesh.ref, bytes, mesh.name);
  }

  return manifest;
};
