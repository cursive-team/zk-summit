import { IDBPDatabase, openDB } from "idb";
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

/**
 * Wrapper class for index db
 */
export class IndexDBWrapper {
  db: IDBPDatabase | null = null;

  constructor(
    public readonly name = "zksummit_folded",
    public readonly paramsStore = "params",
    public readonly foldsStore = "folds"
  ) {}

  /**
   * Initialize db and store
   */
  async init() {
    const stores = {
      params: this.paramsStore,
      folds: this.foldsStore,
    };
    const res = await openDB(this.name, 1, {
      upgrade(db) {
        db.createObjectStore(stores.params);
        db.createObjectStore(stores.folds);
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
      const tx = this.db.transaction(this.paramsStore, "readwrite");
      const store = tx.objectStore(this.paramsStore);
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
      const tx = this.db.transaction(this.paramsStore, "readonly");
      const store = tx.objectStore(this.paramsStore);
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
      const tx = this.db.transaction(this.paramsStore, "readonly");
      const store = tx.objectStore(this.paramsStore);
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
      const tx = this.db.transaction(this.foldsStore, "readwrite");
      const store = tx.objectStore(this.foldsStore);
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
   * @returns - true if successful
   */
  async incrementFold(key: TreeType, newProof: Blob, pubkey: string) {
    if (this.db) {
      const tx = this.db.transaction(this.foldsStore, "readwrite");
      const store = tx.objectStore(this.foldsStore);
      const data = await store.get(key);
      if (data === undefined) {
        throw new Error(`IncrementFold: Proof for ${key} does not exist`);
      }
      data.numFolds += 1;
      data.proofs = newProof;
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
   * @returns true if successful
   */
  async obfuscateFold(key: TreeType, newProof: Blob) {
    if (this.db) {
      const tx = this.db.transaction(this.paramsStore, "readwrite");
      const store = tx.objectStore(this.paramsStore);
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
      const tx = this.db.transaction(this.foldsStore, "readwrite");
      const store = tx.objectStore(this.foldsStore);
      return await store.get(key);
    } else {
      throw Error("DB not initialized");
    }
  }

  /**
   * Filters out all users that are not available to be folded in and selects one from the top
   *
   * @param key - the type of proof to fold
   * @param users - the users to filter
   * @returns - a user that can be folded into the membership proof for this type
   */
  async getUserToFold(key: TreeType, users: User[]): Promise<User | undefined> {
    if (this.db) {
      // get pubkeys already folded in
      const tx = this.db.transaction(this.foldsStore, "readwrite");
      const store = tx.objectStore(this.foldsStore);
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
    } else {
      throw Error("DB not initialized");
    }
  }
}
