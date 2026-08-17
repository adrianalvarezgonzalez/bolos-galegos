const DB_NAME = 'bolos-galegos';
const DB_VERSION = 1;

let dbInstance = null;

export function getDb() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('players')) {
        db.createObjectStore('players', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('games')) {
        const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
        gamesStore.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error(`IndexedDB error: ${event.target.error}`));
    };
  });
}

export function transaction(storeNames, mode = 'readonly') {
  return getDb().then(db => {
    const tx = db.transaction(storeNames, mode);
    return tx;
  });
}

export function getStore(storeName, mode = 'readonly') {
  return transaction(storeName, mode).then(tx => tx.objectStore(storeName));
}

export function dbGet(storeName, key) {
  return getStore(storeName).then(store => {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbGetAll(storeName) {
  return getStore(storeName).then(store => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbPut(storeName, value) {
  return getStore(storeName, 'readwrite').then(store => {
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbDelete(storeName, key) {
  return getStore(storeName, 'readwrite').then(store => {
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbGetByIndex(storeName, indexName, value) {
  return getStore(storeName).then(store => {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbClear(storeName) {
  return getStore(storeName, 'readwrite').then(store => {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function dbClearAll() {
  return getDb().then(db => {
    const storeNames = Array.from(db.objectStoreNames);
    const tx = db.transaction(storeNames, 'readwrite');
    return Promise.all(storeNames.map(name => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore(name).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }));
  });
}
