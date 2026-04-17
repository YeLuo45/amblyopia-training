const DB_NAME = 'amblyopia-offline';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Offline training sessions
      if (!database.objectStoreNames.contains('pendingSessions')) {
        database.createObjectStore('pendingSessions', { keyPath: 'sessionId' });
      }

      // Game records queue
      if (!database.objectStoreNames.contains('pendingEvents')) {
        database.createObjectStore('pendingEvents', { keyPath: 'id', autoIncrement: true });
      }

      // Game data cache
      if (!database.objectStoreNames.contains('gameCache')) {
        database.createObjectStore('gameCache', { keyPath: 'gameId' });
      }

      // User data cache
      if (!database.objectStoreNames.contains('userCache')) {
        database.createObjectStore('userCache', { keyPath: 'id' });
      }
    };
  });
}

export async function savePendingSession(session: {
  sessionId: string;
  childId: string;
  gameId: string;
  data: Record<string, unknown>;
}) {
  const database = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('pendingSessions', 'readwrite');
    const store = tx.objectStore('pendingSessions');
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSessions(): Promise<{
  sessionId: string;
  childId: string;
  gameId: string;
  data: Record<string, unknown>;
}[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingSessions', 'readonly');
    const store = tx.objectStore('pendingSessions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingSession(sessionId: string) {
  const database = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('pendingSessions', 'readwrite');
    const store = tx.objectStore('pendingSessions');
    const request = store.delete(sessionId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingEvent(event: {
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestampMs: number;
}) {
  const database = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('pendingEvents', 'readwrite');
    const store = tx.objectStore('pendingEvents');
    const request = store.add(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingEvents(): Promise<{
  id?: number;
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestampMs: number;
}[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingEvents', 'readonly');
    const store = tx.objectStore('pendingEvents');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingEvents() {
  const database = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction('pendingEvents', 'readwrite');
    const store = tx.objectStore('pendingEvents');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sync pending data when back online
export async function syncPendingData() {
  if (!navigator.onLine) return;

  try {
    const sessions = await getPendingSessions();
    for (const session of sessions) {
      // Sync session data
      await fetch('/api/training/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          child_id: session.childId,
          game_id: session.gameId,
          ...session.data,
        }),
      });
      await removePendingSession(session.sessionId);
    }

    // Sync events
    const events = await getPendingEvents();
    for (const event of events) {
      await fetch(`/api/training/session/${event.sessionId}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(event),
      });
    }
    await clearPendingEvents();

    console.log('Offline data synced successfully');
  } catch (error) {
    console.error('Failed to sync offline data:', error);
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, syncing pending data...');
    syncPendingData();
  });
}
