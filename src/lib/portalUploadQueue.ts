/**
 * Offline-очередь загрузки фото/видео.
 * Хранит файлы в IndexedDB, отправляет на /api/portal/photo последовательно,
 * с экспоненциальным backoff для 5xx/network ошибок. 4xx → failed (не повторяем).
 *
 * Использование (браузер):
 *   import { UploadQueue } from '/.../portalUploadQueue.js'; // или through inline
 *   await UploadQueue.enqueue(file, { event_id, content_task_id, uploader_id, caption });
 *   UploadQueue.subscribe((items) => updateUI(items));
 *   await UploadQueue.flush();
 */

export type QueueStatus = 'pending' | 'uploading' | 'failed';

export interface QueueItem {
  id: string;
  blob: Blob;
  name: string;
  size: number;
  mime: string;
  event_id: string;
  content_task_id: string | null;
  uploader_id: string | null; // id корня .portal-uploader (для адресации resp событий)
  caption: string | null;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: number;
  next_attempt_at: number; // unix ms
}

const DB_NAME = 'aidacamp-portal-uploads';
const STORE = 'queue';
const BACKOFF_MS = [1000, 5000, 30000, 120000, 120000, 120000];

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    Promise.resolve(fn(s)).then(resolve).catch(reject);
    t.onerror = () => reject(t.error);
  });
}

function uuid(): string {
  if ('randomUUID' in crypto) return (crypto as any).randomUUID();
  return 'u-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

type Listener = (items: QueueItem[]) => void;
const listeners = new Set<Listener>();
async function emit(): Promise<void> {
  const items = await listAll();
  listeners.forEach((l) => { try { l(items); } catch { /* ignore */ } });
}

export async function enqueue(blob: Blob, meta: {
  event_id: string | number;
  content_task_id?: string | null;
  uploader_id?: string | null;
  caption?: string | null;
  name?: string;
}): Promise<QueueItem> {
  const item: QueueItem = {
    id: uuid(),
    blob,
    name: meta.name || (blob as File).name || 'file',
    size: blob.size,
    mime: blob.type || 'application/octet-stream',
    event_id: String(meta.event_id),
    content_task_id: meta.content_task_id ?? null,
    uploader_id: meta.uploader_id ?? null,
    caption: meta.caption ?? null,
    status: 'pending',
    attempts: 0,
    last_error: null,
    created_at: Date.now(),
    next_attempt_at: Date.now(),
  };
  await tx('readwrite', (s) => new Promise<void>((res, rej) => {
    const r = s.add(item);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
  emit();
  // Сразу попытаться отправить (не дожидаемся)
  flush().catch(() => {});
  return item;
}

export async function listAll(): Promise<QueueItem[]> {
  return tx('readonly', (s) => new Promise<QueueItem[]>((res, rej) => {
    const r = s.getAll();
    r.onsuccess = () => res((r.result as QueueItem[]).sort((a, b) => a.created_at - b.created_at));
    r.onerror = () => rej(r.error);
  }));
}

export async function remove(id: string): Promise<void> {
  await tx('readwrite', (s) => new Promise<void>((res, rej) => {
    const r = s.delete(id);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
  emit();
}

export async function retry(id: string): Promise<void> {
  await tx('readwrite', (s) => new Promise<void>((res, rej) => {
    const g = s.get(id);
    g.onsuccess = () => {
      const it = g.result as QueueItem | undefined;
      if (!it) return res();
      it.status = 'pending';
      it.last_error = null;
      it.next_attempt_at = Date.now();
      const p = s.put(it);
      p.onsuccess = () => res();
      p.onerror = () => rej(p.error);
    };
    g.onerror = () => rej(g.error);
  }));
  emit();
  flush().catch(() => {});
}

async function update(item: QueueItem): Promise<void> {
  await tx('readwrite', (s) => new Promise<void>((res, rej) => {
    const r = s.put(item);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
}

let flushing = false;
export async function flush(): Promise<{ sent: number; failed: number; remaining: number }> {
  if (flushing) return { sent: 0, failed: 0, remaining: 0 };
  flushing = true;
  let sent = 0, failed = 0;
  try {
    const items = await listAll();
    const now = Date.now();
    for (const it of items) {
      if (it.status === 'failed') continue;
      if (it.next_attempt_at > now) continue;
      it.status = 'uploading';
      await update(it);
      emit();
      const fd = new FormData();
      fd.append('event_id', it.event_id);
      if (it.content_task_id) fd.append('content_task_id', it.content_task_id);
      if (it.caption) fd.append('caption', it.caption);
      fd.append('file', it.blob, it.name);
      try {
        const r = await fetch('/api/portal/photo', { method: 'POST', body: fd, credentials: 'include' });
        if (r.ok) {
          const data = await r.json().catch(() => ({} as any));
          if (data && data.ok) {
            await remove(it.id);
            sent++;
            document.dispatchEvent(new CustomEvent('portal-media:refresh', { detail: { eventId: it.event_id } }));
            document.dispatchEvent(new CustomEvent('portal-media:uploaded', {
              detail: { eventId: it.event_id, photoId: data.id, fileUrl: data.file_url, uploaderId: it.uploader_id },
            }));
            continue;
          }
          it.last_error = (data && data.error) || ('http ' + r.status);
        } else if (r.status >= 400 && r.status < 500) {
          it.status = 'failed';
          it.last_error = 'http ' + r.status;
          await update(it);
          failed++;
          emit();
          continue;
        } else {
          it.last_error = 'http ' + r.status;
        }
      } catch (e: any) {
        it.last_error = (e && e.message) ? e.message : 'network error';
      }
      // Retry с backoff
      it.attempts++;
      const delay = BACKOFF_MS[Math.min(it.attempts - 1, BACKOFF_MS.length - 1)];
      it.next_attempt_at = Date.now() + delay;
      it.status = 'pending';
      await update(it);
      emit();
    }
  } finally {
    flushing = false;
  }
  const remaining = (await listAll()).filter((x) => x.status !== 'failed').length;
  return { sent, failed, remaining };
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  listAll().then(cb).catch(() => {});
  return () => listeners.delete(cb);
}

/** Запускает периодический flush + слушает online-событие. Вызывать один раз из inline-скрипта. */
export function startAutoFlush(intervalMs = 60000): () => void {
  const onOnline = () => { flush().catch(() => {}); };
  window.addEventListener('online', onOnline);
  const t = setInterval(() => { flush().catch(() => {}); }, intervalMs);
  // Первая попытка
  flush().catch(() => {});
  return () => { window.removeEventListener('online', onOnline); clearInterval(t); };
}
