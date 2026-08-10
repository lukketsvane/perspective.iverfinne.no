/**
 * Everything that has to outlive the tab.
 *
 * A scene built out of imported meshes is only worth saving if the meshes come
 * back with it. A `blob:` URL does not survive a reload — it is a handle on
 * memory this page happens to be holding — so an imported file is written into
 * IndexedDB under a hash of its own bytes and referred to afterwards as
 * `asset:<hash>`. Two imports of the same file land on the same key and share
 * one copy.
 *
 * Saved scenes live in the same database, so a scene and the geometry it names
 * cannot get separated by a storage quota that evicts one and not the other.
 */

import type { SavedScene } from '../types';

const DB_NAME = 'perspective';
const DB_VERSION = 2;
const ASSETS = 'assets';
const SCENES = 'scenes';
const PREVIEWS = 'previews';
const LIBRARY = 'library';

export const ASSET_SCHEME = 'asset:';

/** True for a reference to an imported file held in this browser. */
export const isAssetRef = (url: string) => url.startsWith(ASSET_SCHEME);

export interface StoredAsset {
  /** The file name it was imported under, which is also where the format is read from. */
  name: string;
  bytes: ArrayBuffer;
  addedAt: number;
}

/**
 * Private browsing, a blocked origin, or a browser without IndexedDB: the tool
 * still has to work for the length of the session, it just cannot promise
 * anything past a reload.
 */
const memoryAssets = new Map<string, StoredAsset>();
const memoryScenes = new Map<string, SavedScene>();
const memoryLibrary = new Map<string, OwnMesh>();

let connection: Promise<IDBDatabase | null> | null = null;

const open = (): Promise<IDBDatabase | null> => {
  if (connection) return connection;
  connection = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS);
      if (!db.objectStoreNames.contains(SCENES)) db.createObjectStore(SCENES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PREVIEWS)) db.createObjectStore(PREVIEWS);
      if (!db.objectStoreNames.contains(LIBRARY)) db.createObjectStore(LIBRARY, { keyPath: 'url' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return connection;
};

/** Run one request against one store, resolving to null on any failure. */
const transact = async <T>(
  store: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest
): Promise<T | null> => {
  const db = await open();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(store, mode);
      const request = work(tx.objectStore(store));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

// ---------------------------------------------------------------------------
// Imported meshes
// ---------------------------------------------------------------------------

/**
 * A key for a file's contents.
 *
 * SHA-256 where it is available. It is not on an insecure origin, which is
 * exactly where this app gets used most — a phone opening the dev server over
 * the local network — so there is a plain hash behind it. Neither is a security
 * boundary; both only have to separate one mesh from another.
 */
const fingerprint = async (bytes: ArrayBuffer): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest).slice(0, 16))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* fall through */
    }
  }
  const view = new Uint8Array(bytes);
  let hash = 0x811c9dc5;
  for (let i = 0; i < view.length; i++) {
    hash ^= view[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${view.length.toString(16)}-${hash.toString(16)}`;
};

/** Keep an imported file, and return the reference the scene records. */
export const putAsset = async (bytes: ArrayBuffer, name: string): Promise<string> => {
  const ref = ASSET_SCHEME + (await fingerprint(bytes));
  await putAssetAs(ref, bytes, name);
  return ref;
};

/**
 * Keep a file under a reference somebody else chose.
 *
 * This is how a scene bundle puts its meshes back. They cannot be re-hashed on
 * the way in: the hash depends on what the browser will hash with, and an
 * origin without SubtleCrypto - which is any phone opening this over plain
 * http on the local network - falls back to a different one. Re-hashing would
 * file the mesh under a name the scene is not looking for.
 */
export const putAssetAs = async (ref: string, bytes: ArrayBuffer, name: string): Promise<void> => {
  const record: StoredAsset = { name, bytes, addedAt: Date.now() };
  memoryAssets.set(ref, record);
  await transact(ASSETS, 'readwrite', (store) => store.put(record, ref));
};

export const getAsset = async (ref: string): Promise<StoredAsset | null> => {
  const cached = memoryAssets.get(ref);
  if (cached) return cached;
  const stored = await transact<StoredAsset>(ASSETS, 'readonly', (store) => store.get(ref));
  if (stored) memoryAssets.set(ref, stored);
  return stored ?? null;
};

const assetRefs = async (): Promise<string[]> => {
  const keys = await transact<IDBValidKey[]>(ASSETS, 'readonly', (store) => store.getAllKeys());
  return (keys ?? []).map(String);
};

/**
 * Drop imported meshes nothing points at any more.
 *
 * Called after a scene is deleted: a saved scene, the scene on screen, a step
 * through the history - or a place on the viewer's own shelf, which is the
 * whole point of the shelf and is why the caller has to hand those in too.
 */
export const pruneAssets = async (keep: Iterable<string>): Promise<void> => {
  const live = new Set(keep);
  const refs = await assetRefs();
  await Promise.all(
    refs
      .filter((ref) => !live.has(ref))
      .map(async (ref) => {
        memoryAssets.delete(ref);
        await transact(ASSETS, 'readwrite', (store) => store.delete(ref));
      })
  );
};

// ---------------------------------------------------------------------------
// The viewer's own library
// ---------------------------------------------------------------------------
// A file dropped into the scene used to be a one-off: it stood there, it was
// saved with the scene, and placing it a second time meant finding it on disk
// again. But the shelf of things you draw against is personal - a chair from
// your own room is worth more to you than the three that ship here - so an
// import is now put on that shelf. The bytes were already being kept under a
// hash of themselves; this is the short record that says the viewer wants it
// listed, and that it is not to be swept up with the rest.

export interface OwnMesh {
  /** The `asset:` reference, which is also the key. */
  url: string;
  /** What the file was called, minus the extension. */
  name: string;
  addedAt: number;
}

/** Everything on the shelf, oldest first, so the order does not shuffle. */
export const readLibrary = async (): Promise<OwnMesh[]> => {
  const stored = await transact<OwnMesh[]>(LIBRARY, 'readonly', (store) => store.getAll());
  const meshes = stored ?? Array.from(memoryLibrary.values());
  // Newest first. The shelf is one row you push sideways, so the far end of it
  // is the expensive place to be - and the thing most likely to be wanted next
  // is the thing just put there.
  return [...meshes].sort((a, b) => b.addedAt - a.addedAt);
};

export const addToLibrary = async (url: string, name: string): Promise<OwnMesh> => {
  const existing = memoryLibrary.get(url);
  if (existing) return existing;
  const mesh: OwnMesh = { url, name, addedAt: Date.now() };
  memoryLibrary.set(url, mesh);
  await transact(LIBRARY, 'readwrite', (store) => store.put(mesh));
  return mesh;
};

export const removeFromLibrary = async (url: string): Promise<void> => {
  memoryLibrary.delete(url);
  await transact(LIBRARY, 'readwrite', (store) => store.delete(url));
};

// ---------------------------------------------------------------------------
// Library thumbnails
// ---------------------------------------------------------------------------
// Drawing seventy previews costs a few seconds of fetching and rendering. It is
// the same seventy files every time, so the pictures are kept: the library is
// instant from the second visit on.

export const getPreview = async (url: string): Promise<string | null> =>
  (await transact<string>(PREVIEWS, 'readonly', (store) => store.get(url))) ?? null;

export const putPreview = async (url: string, dataUrl: string): Promise<void> => {
  await transact(PREVIEWS, 'readwrite', (store) => store.put(dataUrl, url));
};

// ---------------------------------------------------------------------------
// Saved scenes
// ---------------------------------------------------------------------------

/**
 * Every saved scene, newest first - and whether that list can be trusted.
 *
 * The difference matters more than it looks. `pruneAssets` deletes every
 * imported mesh no live scene refers to, and the list of live scenes is built
 * from this. A failed read returning an empty array is indistinguishable from
 * a viewer with no saved scenes, so one storage hiccup plus one tap of "take
 * this off the shelf" used to delete every mesh they had ever imported - while
 * the scenes that referred to them were still sitting on disk. Silent in the
 * session, because the parsed geometry was still in memory; found the next day.
 */
export const readScenes = async (): Promise<{ scenes: SavedScene[]; trusted: boolean }> => {
  const stored = await transact<SavedScene[]>(SCENES, 'readonly', (store) => store.getAll());
  const trusted = stored !== null && stored !== undefined;
  const scenes = stored ?? Array.from(memoryScenes.values());
  return { scenes: [...scenes].sort((a, b) => b.updatedAt - a.updatedAt), trusted };
};

export const writeScene = async (scene: SavedScene): Promise<void> => {
  memoryScenes.set(scene.id, scene);
  await transact(SCENES, 'readwrite', (store) => store.put(scene));
};

export const eraseScene = async (id: string): Promise<void> => {
  memoryScenes.delete(id);
  await transact(SCENES, 'readwrite', (store) => store.delete(id));
};
