
const DB_NAME = 'TryKaroDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

// Helper to open the database with Caching
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
        resolve(dbInstance);
        return;
    }

    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Handle connection closing to reset cache
      dbInstance.onclose = () => {
          dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const saveImageToDB = async (base64: string | null | undefined): Promise<string | null> => {
  if (!base64) return null;
  if (base64.startsWith('img_') || base64.startsWith('http')) return base64;
  if (!base64.startsWith('data:image')) return base64;

  try {
      const db = await openDB();
      const id = generateId();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(base64, id);

        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      });
  } catch (e) {
      return base64;
  }
};

export const getImageFromDB = async (id: string | null | undefined): Promise<string | null> => {
  if (!id) return null;
  if (id.startsWith('data:image') || id.startsWith('http')) return id;

  try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
  } catch (e) {
      return null;
  }
};

export const deleteImageFromDB = async (id: string): Promise<void> => {
  if (!id || !id.startsWith('img_')) return;
  try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
  } catch (e) {
      // Ignore delete errors
  }
};
