import type { ConversationRecord, IConversationStore } from './types';

const STORE_NAME = 'conversations';
const DB_VERSION = 2;

export class IndexedDBStore implements IConversationStore {
  private ready: Promise<void>;

  constructor(private dbName: string = 'WaterCalculator') {
    this.ready = this.openDB();
  }

  private openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('platform', 'platform', { unique: false });
          store.createIndex('title', 'title', { unique: false });
        } else {
          const store = req.transaction!.objectStore(STORE_NAME);
          if (!store.indexNames.contains('title')) {
            store.createIndex('title', 'title', { unique: false });
          }
        }
      };

      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  private db(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async create(record: ConversationRecord): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(record);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async update(
    id: string,
    fields: Partial<Pick<ConversationRecord, 'waterMl' | 'tokenCount' | 'title' | 'updatedAt'>>
  ): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) { db.close(); return reject(new Error(`Record ${id} not found`)); }
        Object.assign(record, fields);
        store.put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async findByUrl(url: string): Promise<ConversationRecord | null> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('url');
      const req = index.get(url);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => reject(req.error);
    });
  }

  async findByTitle(title: string, platform: string): Promise<ConversationRecord | null> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('title');
      const req = index.get(title);
      req.onsuccess = () => {
        const record = req.result ?? null;
        db.close();
        if (record && record.platform === platform) {
          resolve(record);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async findAll(): Promise<ConversationRecord[]> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    await this.ready;
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }
}
