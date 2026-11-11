'use client';
// Local-only consult history. Entries are encrypted with AES-GCM under a key derived (HKDF) from a
// NEP-413 signature over a fixed message, so only the same wallet can unlock them. Nothing here is sent anywhere.
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import type { Opinion } from './schema';

type Signer = (message: string, nonce: Uint8Array) => Promise<{ signature: string }>;

export type HistoryEntry = {
  id: string;
  consultId: number;
  tokenId: string;
  specialist: string;
  createdAt: string;
  caseText: string;
  opinion: Opinion | null;
  text: string;
  verified: { passed: number; total: number };
};

const DB = 'sublee-history';
const STORE = 'entries';
const KEY_MESSAGE = 'Sublee: unlock my private consult history on this device.\nThis does not send a transaction or cost anything.';
// Fixed nonce so the same wallet produces the same signature (ed25519 is deterministic) and thus the same key.
const KEY_NONCE = sha256(utf8ToBytes('sublee-history-v1'));
const CHECK = 'sublee-history-ok';

const keys = new Map<string, CryptoKey>(); // per account, for this tab only

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(STORE, { keyPath: ['account', 'id'] });
      s.createIndex('account', 'account');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((res, rej) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      }),
  );
}

type Row = { account: string; id: string; iv: Uint8Array; ct: ArrayBuffer };

async function seal(key: CryptoKey, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8ToBytes(JSON.stringify(value)) as BufferSource);
  return { iv, ct };
}
async function unseal<T>(key: CryptoKey, row: Row): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: row.iv as BufferSource }, key, row.ct);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

export function isUnlocked(account: string) {
  return keys.has(account);
}

/** Ask the wallet for the history signature and derive the key. Throws if it doesn't match existing history. */
export async function unlock(account: string, sign: Signer): Promise<void> {
  if (keys.has(account)) return;
  const { signature } = await sign(KEY_MESSAGE, KEY_NONCE);
  const raw = hkdf(sha256, Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)), utf8ToBytes(account), utf8ToBytes('sublee_history_v1'), 32);
  const key = await crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const existing = await tx<Row | undefined>('readonly', (s) => s.get([account, '_check']));
  if (existing) {
    try {
      if ((await unseal<string>(key, existing)) !== CHECK) throw new Error();
    } catch {
      throw new Error('This wallet produced a different key than the one your history was saved with, so it can’t be opened.');
    }
  } else {
    const sealed = await seal(key, CHECK);
    await tx('readwrite', (s) => s.put({ account, id: '_check', ...sealed }));
  }
  keys.set(account, key);
}

export async function saveEntry(account: string, e: HistoryEntry) {
  const key = keys.get(account);
  if (!key) throw new Error('History is locked');
  const sealed = await seal(key, e);
  await tx('readwrite', (s) => s.put({ account, id: e.id, ...sealed }));
}

export async function listEntries(account: string): Promise<HistoryEntry[]> {
  const key = keys.get(account);
  if (!key) throw new Error('History is locked');
  const rows = await tx<Row[]>('readonly', (s) => s.index('account').getAll(account));
  const out: HistoryEntry[] = [];
  for (const r of rows) if (r.id !== '_check') out.push(await unseal<HistoryEntry>(key, r));
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteEntry(account: string, id: string) {
  await tx('readwrite', (s) => s.delete([account, id]));
}

/** Remove every entry for this wallet on this device, including the key check. */
export async function deleteAll(account: string) {
  await tx('readwrite', (s) => s.delete(IDBKeyRange.bound([account, ''], [account, '￿'])));
  keys.delete(account);
}
