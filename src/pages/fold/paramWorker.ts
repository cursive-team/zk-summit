import { IDBPDatabase, openDB } from 'idb';

const bucketUrl = 'https://bjj-ecdsa-nova.us-southeast-1.linodeobjects.com';
const paramsUrl = `${bucketUrl}/bjj-ecdsa-nova-params-gzip-chunk`;
const dbName = 'bbj';
const storeName = 'params'

const addItem = async (db: IDBPDatabase, key: number | string, data: Blob) => {
  if (!db) return;
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.add(data, key);
};

// Check to see how many items exist in the store
const itemCount = async (db: IDBPDatabase): Promise<number> => {
  if (!db) return -1;
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return await store.count();
};

const getItems = async (db: IDBPDatabase): Promise<Array<Blob>> => {
  if (!db) return [];
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const data = await store.getAll();
  return data;
};

const getParam = async (index: number): Promise<Blob> => {
  const fullUrl = `${paramsUrl}/params_${index}.json`;
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/x-binary' },
  });
  return await res.blob();
};

onmessage = async (event: MessageEvent) => {
  // Open db
  const db = await openDB(dbName, 1, {
    upgrade(db) {
      // Create new store
      db.createObjectStore(storeName);
    },
  });
  const startIndex = await itemCount(db);
  console.log('Start index: ', startIndex);
  // If 10 chunks are not stored then fetch remaining
  if (startIndex !== 10) {
    console.log(`${startIndex} out of 10 param chunks stored`);
    for (let i = startIndex; i < 10; i++) {
      const param = await getParam(i);
      // Add chunk to indexdb
      await addItem(db, i, param);
      console.log(`Chunk ${i + 1} of 10 stored`);
    }
  }

  const chunks = await getItems(db);
  postMessage(chunks);
};
