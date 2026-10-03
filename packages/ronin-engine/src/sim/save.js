import { LEDGER_VERSION, initSystems } from './ledger.js';
// ---- Saving: the ledger is plain JSON (a fresh world is about 3 MB, mostly its ~6,700 people). One slot for the alpha. ----
// The browser's IndexedDB holds it (room for years of play); localStorage (about 5 MB) is only a fallback. Both are async-safe to call.
export const SAVE_KEY = 'chud.world';
export const serialize = L => JSON.stringify(L);
export function deserialize(json) {
  const L = JSON.parse(json);
  if (L.v !== LEDGER_VERSION) throw new Error(`save is version ${L.v}, this game reads ${LEDGER_VERSION}`);
  initSystems(L);   // a system added since the save starts from its init()
  return L;
}
function idb() {
  return new Promise((res, rej) => { const q = indexedDB.open('chud', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('saves'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('saves', mode), r = fn(tx.objectStore('saves'));
  tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
export async function saveWorld(L) {
  const json = serialize(L);
  try { await idbDo('readwrite', s => s.put(json, SAVE_KEY)); return true; } catch {}
  try { localStorage.setItem(SAVE_KEY, json); return true; } catch { return false; }
}
export async function loadWorld() {
  try { const json = await idbDo('readonly', s => s.get(SAVE_KEY)); if (json) return deserialize(json); } catch {}
  try { const json = localStorage.getItem(SAVE_KEY); return json ? deserialize(json) : null; } catch { return null; }
}
