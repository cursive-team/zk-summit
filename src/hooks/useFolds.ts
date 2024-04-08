import { IDBPDatabase, openDB } from 'idb';
import { useEffect, useState } from 'react';

export type FoldProof = {
  proof: Blob; // the actual proof, compressed
  numFolds: number; // the number of folds in the proof
  locked: boolean; // whether or not the proof is locked
  obfuscated: boolean; // whether or not the proof has been obfuscated
}

export enum TreeType {
  Attendee = "attendee",
  Speaker = "speaker",
  Talk = "talk"
};

const useFolds = () => {
  const DB_NAME = "zksummit_folded";
  const STORE_NAME = "folds";

  const [db, setDb] = useState<IDBPDatabase | null>(null);

  /**
   * Add a new proof to the store
   * @param key - the membership type
   * @param proof - the proof to add
   */
  const addProof = async (key: TreeType, proof: Blob) => {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const res = await store.get(key);
    if (res !== undefined) return;
    const data: FoldProof = {
      proof,
      numFolds: 1,
      locked: false,
      obfuscated: false
    };
    await store.add(data, key);
  }

  
  /**
   * Set a proof to be locked or unlocked
   * @param key - the key of the proof type to lock / unlock
   * @param locked - lock or unlock the proof
   * @returns - whether or not 
   */
  const setLocked = async (key: TreeType, locked: boolean): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = await store.get(key);
    req.onsucess = async () => {
      const data = req.result as FoldProof;
      data.locked = locked;
      await store.put(data, key);
      return true;
    }
    req.onfailure = () => {
      return false;
    }
    return false;
  }

  /**
   * Update a proof and mark it as obfuscated
   * @param key - the key of the proof type to obfuscate
   * @param newProof - the new proof to update
   * @returns true if successful
   */
  const obfuscate = async (key: TreeType, newProof: Blob): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = await store.get(key);
    req.onsucess = async () => {
      const data = req.result as FoldProof;
      data.obfuscated = true;
      await store.put(data, key);
      return true;
    }
    req.onfailure = () => {
      return false;
    }
    return false;
  }

  /**
   * Given a proof type, update it with new proof and increment number of folds
   * @param key - the key of the proof type to increment
   * @param newProof - the new proof to update
   * @returns - true if successful
   */
  const incrementFold = async (key: TreeType, newProof: Blob): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = await store.get(key);
    req.onsucess = async () => {
      const data = req.result as FoldProof;
      data.proof = newProof;
      data.numFolds += 1;
      await store.put(data, key);
      return true;
    }
    req.onfailure = () => {
      return false;
    }
    return false;
  }


  /**
   * Get a proof from the store
   * @param key - the type of proof to retrieve
   * @returns - the proof if found, null otherwise
   */
  const getProof = async (key: TreeType): Promise<FoldProof | null> => {
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return await store.get(key);
  }
 
  useEffect(() => {
    (async () => {
      // Create new db
      const res = await openDB(DB_NAME, 1, {
        upgrade(db) {
          // Create new store
          db.createObjectStore(STORE_NAME);
        },
      });
      setDb(res);
    })();
  }, []);

  return { foldDbInitialized: !!db, addProof, getProof, setLocked, obfuscate, incrementFold };
};

export default useFolds;
