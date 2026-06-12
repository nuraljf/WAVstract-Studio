// Guest library persistence (WAV-44). IndexedDB keeps every extracted sound's
// ORIGINAL file plus its row metadata on-device, so a guest's table survives
// reloads instead of living (and dying) in React state. Signed-in users keep
// the Supabase cloud library (use-studio); on sign-in any local sounds are
// uploaded to the account and their local copies removed.
//
// Everything here is best-effort: callers fire-and-forget with .catch — a
// browser without IndexedDB (or a quota failure) degrades to the old
// in-memory behavior, never a broken UI.

export type LocalSoundRow = {
  id: string; // the Sound id (snd_*) — stable across reloads
  name: string;
  duration: number;
  peaks: number[];
  favorite: boolean;
  cover: string | null; // data URL
  mime: string | null;
  // Audio bytes as a SERIALIZED ArrayBuffer (WAV-52): iOS WebKit stores Blobs
  // in IndexedDB as file references that can come back unreadable in a later
  // session — which is why restored rows wouldn't play on the phone.
  data?: ArrayBuffer;
  blob?: Blob; // legacy rows written by the first WAV-44 build
  createdAt: number;
};

/** Don't serialize enormous videos into the DB — those rows stay session-only. */
export const LOCAL_PERSIST_MAX_BYTES = 256 * 1024 * 1024;

/** Rebuild a playable/uploadable File from whichever shape the row carries. */
export function localRowFile(r: LocalSoundRow): File {
  const bits: BlobPart[] = r.data ? [r.data] : r.blob ? [r.blob] : [];
  return new File(bits, r.name, { type: r.mime ?? "" });
}

const DB_NAME = "wavstract-local";
const STORE = "sounds";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // a failed open shouldn't poison every later call — allow a retry
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function asPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function saveLocalSound(row: LocalSoundRow): Promise<void> {
  await asPromise((await store("readwrite")).put(row));
}

/** Oldest first, so restored rows keep their original table order
 *  (use-studio prepends new extracts). */
export async function listLocalSounds(): Promise<LocalSoundRow[]> {
  const rows = (await asPromise((await store("readonly")).getAll())) ?? [];
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

/** Merge-patch a stored row; silently ignores rows that aren't stored. */
export async function patchLocalSound(
  id: string,
  patch: Partial<Omit<LocalSoundRow, "id" | "blob">>,
): Promise<void> {
  const s = await store("readwrite");
  const row = await asPromise(s.get(id) as IDBRequest<LocalSoundRow | undefined>);
  if (!row) return;
  await asPromise(s.put({ ...row, ...patch }));
}

export async function deleteLocalSound(id: string): Promise<void> {
  await asPromise((await store("readwrite")).delete(id));
}
