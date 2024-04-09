import { IDBPDatabase, openDB } from "idb";
import { useEffect, useState } from "react";

export type ArtifactType = "params" | "pk" | "vk"

const useArtifacts = (artifactType: ArtifactType) => {
  const DB_NAME = "zksummit_folded";
  const STORE_NAME = "params";

  const [db, setDb] = useState<IDBPDatabase | null>(null);

  const addChunk = async (key: number | string, data: Blob) => {
    if (!db) return;
    const tx = db.transaction(artifactType, "readwrite");
    const store = tx.objectStore(artifactType);
    await store.add(data, key);
  };

  // Check to see how many items exist in the store
  const chunkCount = async (): Promise<number> => {
    if (!db) return -1;
    const tx = db.transaction(artifactType, "readonly");
    const store = tx.objectStore(artifactType);
    return await store.count();
  };

  const getChunks = async (): Promise<Array<Blob>> => {
    if (!db) return [];
    const tx = db.transaction(artifactType, "readonly");
    const store = tx.objectStore(artifactType);
    const data = await store.getAll();
    return data;
  };

  useEffect(() => {
    (async () => {
      // Create new db
      const res = await openDB(DB_NAME, 1, {
        upgrade(db) {
          // Create new store
          db.createObjectStore(STORE_NAME);
          db.createObjectStore("folds");
          db.createObjectStore("pk")
          db.createObjectStore("vk")
        },
      });
      setDb(res);
    })();
  }, []);

  return { addChunk, paramsDbInitialized: !!db, getChunks, chunkCount };
};

export default useArtifacts;
