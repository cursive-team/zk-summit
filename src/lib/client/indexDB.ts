import { IDBPDatabase, openDB } from "idb";
import { User } from "@/lib/client/localStorage";
import { INDEXDB_STORES } from "@/shared/constants";

export type FoldProof = {
  proof: Blob; // the actual proof, compressed
  numFolds: number; // the number of folds in the proof
  locked: boolean; // whether or not the proof is locked
  obfuscated: boolean; // whether or not the proof has been obfuscated
  included: string[]; // the public key of the user who has been folded in
};

// timeout period for a worker lock
export const LOCK_STALE_TIME = 1000 * 5;

export enum TreeType {
  Attendee = "attendee",
  Speaker = "speaker",
  Talk = "talk",
}

/**
 * Wrapper class for index db
 */
export class IndexDBWrapper {
  db: IDBPDatabase | null = null;

  constructor() { }

  /**
   * Initialize db and store
   */
  async init() {
    const res = await openDB(process.env.NEXT_PUBLIC_NOVA_INDEXDB_NAME!, 1, {
      upgrade(db) {
        db.createObjectStore(INDEXDB_STORES.PARAMS);
        db.createObjectStore(INDEXDB_STORES.FOLDS);
        db.createObjectStore(INDEXDB_STORES.LOCKS);
      },
    });
    this.db = res;
  }

  /**
   * Checks whether db has been initialized
   *
   * @returns {boolean} - Whether db is null
   */
  initialized(): boolean {
    return !!this.db;
  }

  /// PARAMS FUNCTIONS ///

  /**
   * Adds a params chunk to the store
   *
   * @param key - the index of the chunk
   * @param chunk - chunk of gzipped public_params.json
   */
  async addChunk(key: number, chunk: Blob) {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.PARAMS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.PARAMS);
      await store.add(chunk, key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Returns the number of params chunks in the store
   *
   * @returns the number of chunks
   */
  async countChunks(): Promise<number> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.PARAMS, "readonly");
      const store = tx.objectStore(INDEXDB_STORES.PARAMS);
      return await store.count();
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Returns all the param chunks in the store
   *
   * @returns all of the chunks downloaded so far
   */
  async getChunks(): Promise<Array<Blob>> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.PARAMS, "readonly");
      const store = tx.objectStore(INDEXDB_STORES.PARAMS);
      const data = await store.getAll();
      return data;
    } else {
      throw Error("DB not initialized");
    }
  }

  /// FOLDS FUNCTIONS ///

  /**
   * Add a new proof to the store
   * @param key - the membership type
   * @param proof - the proof to add
   * @param pubkey - the public key of the user who has been folded in
   */
  async addFold(key: TreeType, proof: Blob, pubkey: string) {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.FOLDS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.FOLDS);
      const res = await store.get(key);
      if (res !== undefined) {
        throw new Error(`AddProof: Proof for ${key} already exists`);
      }
      const data: FoldProof = {
        proof,
        numFolds: 1,
        locked: false,
        obfuscated: false,
        included: [pubkey],
      };
      await store.add(data, key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Given a proof type, update it with new proof and increment number of folds
   * @param key - the key of the proof type to increment
   * @param newProof - the new proof to update
   */
  async incrementFold(key: TreeType, newProof: Blob, pubkey: string) {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.FOLDS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.FOLDS);
      const data = await store.get(key);
      if (data === undefined) {
        throw new Error(`IncrementFold: Proof for ${key} does not exist`);
      }
      data.numFolds += 1;
      data.proof = newProof;
      data.included.push(pubkey);
      await store.put(data, key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Update a proof and mark it as obfuscated
   * @param key - the key of the proof type to obfuscate
   * @param newProof - the new proof to update
   */
  async obfuscateFold(key: TreeType, newProof: Blob) {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.FOLDS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.FOLDS);
      const data = await store.get(key);
      if (data === undefined) {
        throw new Error(`ObfuscateFold: Proof for ${key} does not exist`);
      }
      data.obfuscated = true;
      data.proof = newProof;
      await store.put(data, key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Get a folding proof from the store
   * @param key - the type of proof to retrieve
   * @returns - the proof if found, null otherwise
   */
  async getFold(key: TreeType): Promise<FoldProof | undefined> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.FOLDS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.FOLDS);
      return await store.get(key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Filters out all members of a given tree type that have not yet been folded in
   * @notice expects other checks on users to have been performed already
   * @param key - the type of proof to fold
   * @param memberPk - the member to filter
   * @
   * @returns - members that can be folded into the membership proof for this type
   */
  async getUnincluded(key: TreeType, memberPk: string[]): Promise<string[]> {
    if (this.db) {
      // get pubkeys already folded in
      const tx = this.db.transaction(INDEXDB_STORES.FOLDS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.FOLDS);
      const data: FoldProof = await store.get(key);
      const foldedPks = data === undefined ? [] : data.included;

      // filter out users that are not available to be folded in
      return memberPk.filter((member) => {
        return (!foldedPks.includes(member));
      });
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Attempt to set the db lock (from a worker)
   * If same worker previously set the lock, pass prevLock to update the lock
   * Otherwise supply no arguments to set a new lock
   * 
   * @param prevLock - the optional previous timestamp of a lock to update
   * @returns - the current timestamp set for the lock, or undefined if locked by another worker
   */
  async setLock(prevLock?: number): Promise<number | undefined> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.LOCKS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.LOCKS);
      // look for existing locks
      const existingLocks = await store.getAll();
      if (existingLocks.length !== 0) {
        // if lock set by different worker
        if (!prevLock || existingLocks[0] !== prevLock) {
          // see if the lock is stale
          if (Date.now() - existingLocks[0] < LOCK_STALE_TIME) {
            // if lock has not timed out, return undefined
            return undefined;
          }
          // delete the stale lock
          await store.delete(1);
        }
        // otherwise, delete the worker's previous lock
        await store.delete(1);
      }
      // add a lock at current time
      let timestamp = Date.now();
      await store.add(timestamp, 1);
      return timestamp;
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Checks that a given lock is valid
   * 
   * @param number - the lock timestamp to check
   * @returns - true if the lock is still held, and false otherwise
   */
  async checkLock(lock: number): Promise<boolean> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.LOCKS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.LOCKS);
      const existingLocks = await store.getAll();
      return existingLocks.length !== 0 && existingLocks[0] === lock;
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Release the lock on the db by knowing the timestamp of the lock
   * 
   * @param timestamp - the timestamp of the lock to release
   * @return - true if lock was released, false if lock was not found
   */
  async releaseLock(timestamp: number): Promise<boolean> {
    if (this.db) {
      const tx = this.db.transaction(INDEXDB_STORES.LOCKS, "readwrite");
      const store = tx.objectStore(INDEXDB_STORES.LOCKS);
      // look for given lock
      const lock = await store.get(1);
      if (lock === undefined || lock != timestamp) {
        console.log("failed to release lock");
        return false;
      }
      await store.delete(1);
      return true;
    } else {
      throw Error("DB not initialized");
    }
    
  }

  async logoutIndexDB() {
    if (this.db) {
      const tx = this.db.transaction(
        [
          INDEXDB_STORES.FOLDS,
          INDEXDB_STORES.LOCKS,
        ],
        "readwrite"
      );
      const foldsStore = tx.objectStore(INDEXDB_STORES.FOLDS);
      const locksStore = tx.objectStore(INDEXDB_STORES.LOCKS);
      await foldsStore.clear();
      await locksStore.clear();
    }
  }
}
