import { IDBPDatabase, openDB } from "idb";
import { useEffect, useState } from "react";
import { User } from "@/lib/client/localStorage";

export type FoldProof = {
  proof: Blob; // the actual proof, compressed
  numFolds: number; // the number of folds in the proof
  locked: boolean; // whether or not the proof is locked
  obfuscated: boolean; // whether or not the proof has been obfuscated
  included: string[]; // the public key of the user who has been folded in
};

export enum TreeType {
  Attendee = "attendee",
  Speaker = "speaker",
  Talk = "talk",
}

export const validTreeTypes = ["attendee", "speaker", "talk"];

const useFolds = () => {
  const DB_NAME = "zksummit_folded";
  const STORE_NAME = "folds";

  const [db, setDb] = useState<IDBPDatabase | null>(null);

  /**
   * Add a new proof to the store
   * @param key - the membership type
   * @param proof - the proof to add
   * @param pubkey - the public key of the user who has been folded in
   */
  const addProof = async (key: TreeType, proof: Blob, pubkey: string) => {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const res = await store.get(key);
    if (res !== undefined) return;
    const data: FoldProof = {
      proof,
      numFolds: 1,
      locked: false,
      obfuscated: false,
      included: [pubkey],
    };
    await store.add(data, key);
  };

  /**
   * Set a proof to be locked or unlocked
   * @param key - the key of the proof type to lock / unlock
   * @param locked - lock or unlock the proof
   * @returns - whether or not
   */
  const setLocked = async (
    key: TreeType,
    locked: boolean
  ): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = await store.get(key);
    req.onsucess = async () => {
      const data = req.result as FoldProof;
      data.locked = locked;
      await store.put(data, key);
      return true;
    };
    req.onfailure = () => {
      return false;
    };
    return false;
  };

  /**
   * Update a proof and mark it as obfuscated
   * @param key - the key of the proof type to obfuscate
   * @param newProof - the new proof to update
   * @returns true if successful
   */
  const obfuscate = async (key: TreeType, newProof: Blob): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const data = await store.get(key);
    if (data === undefined) return false;
    data.obfuscated = true;
    data.proof = newProof;
    await store.put(data, key);
    return true;
  };

  /**
   * Given a proof type, update it with new proof and increment number of folds
   * @param key - the key of the proof type to increment
   * @param newProof - the new proof to update
   * @returns - true if successful
   */
  const incrementFold = async (
    key: TreeType,
    newProof: Blob,
    pubkey: string
  ): Promise<boolean> => {
    if (!db) return false;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const data = await store.get(key);
    if (data === undefined) return false;
    data.numFolds += 1;
    data.proof = newProof;
    data.included.push(pubkey);
    await store.put(data, key);
    return true;
  };

  /**
   * Get a proof from the store
   * @param key - the type of proof to retrieve
   * @returns - the proof if found, null otherwise
   */
  const getProof = async (key: TreeType): Promise<FoldProof | undefined> => {
    if (!db) return undefined;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    return await store.get(key);
  };

  /**
   * Filters out all users that are not available to be folded in and selects one from the top
   *
   * @param key - the type of proof to fold
   * @param users - the users to filter
   * @returns - a user that can be folded into the membership proof for this type
   */
  const getUserToFold = async (
    key: TreeType,
    users: User[]
  ): Promise<User | undefined> => {
    if (!db) return;
    // get the proof containing the users that have been folded in
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const data: FoldProof = await store.get(key);
    const foldedPks = data === undefined ? [] : data.included;

    // filter out users that are not available to be folded in
    let validUsers = users.filter((user) => {
      return (
        user.pkId !== "0" &&
        user.sigPk !== undefined &&
        !foldedPks.includes(user.sigPk)
      );
    });
    // return the first user that can be folded in if exists
    return validUsers.length > 0 ? validUsers[0] : undefined;
  };

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

  return {
    foldDbInitialized: !!db,
    addProof,
    getProof,
    setLocked,
    obfuscate,
    incrementFold,
    getUserToFold,
  };
};

export default useFolds;
