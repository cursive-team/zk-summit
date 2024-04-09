import { expose } from "comlink";
import { MembershipFolder } from "@/lib/client/nova";
import { User } from "@/lib/client/localStorage";
import { IndexDBWrapper, TreeType } from "@/lib/client/indexDB";

/**
 * A general thread for handling all folding operations in the background
 * 0. Checks indexdb that no valid lock is present
 * 1. Downloads params
 * 2. Folds all attendees
 * 3. Folds all speakers
 * 4. Folds all talks
 * 
 * @param users - the users to fold
 */
async function work(users: User[]) {
  // instantiate indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // attempt to set a lock on the db
  let lock = await db.setLock();
  // terminate the lock if it is undefined
  if (lock === undefined)
    return;
  // download params
  lock = await downloadParams(lock);
  if (lock === undefined)
    return;
  // todo: sort speakers and attendees
  
  // prove attendee folds
  lock = await foldAttendees(users, lock);
  if (lock === undefined)
    return;
  // todo: prove speaker folds

  // todo: prove talk folds

  // remove the lock
  await db.releaseLock(lock);
}


/**
 * Fold all attendees given a set of users
 * 
 * @param users - valid users to fold into the attendee membership proof
 * @param lock - the previously set timelock
 * @returns the last lock set during execution, or undefined if timeout
 */
async function foldAttendees(users: User[], lock: number): Promise<number | undefined> {
  let newLock: number | undefined = lock;

  // Initialize indexdb
  const db = new IndexDBWrapper();
  await db.init();

  console.log(`${users.length} users to fold`)

  // get params
  const params = new Blob(await db.getChunks());
  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params);

  // Check if fold already exists
  let previousProof = await db.getFold(TreeType.Attendee);

  let startIndex = previousProof ? 0 : 1;
  // If no previous attendee proof, start a new fold
  if (!previousProof) {
    const proof = await membershipFolder.startFold(users[0]);
    // compress the proof
    const compressed = await membershipFolder.compressProof(proof);
    const proofBlob = new Blob([compressed]);
    // check that timelock has not expired
    let res = await db.checkLock(newLock);
    if (res === false) {
      console.log(`Worker lock expired, terminating...`);
      return;
    } else {
      await db.addFold(TreeType.Attendee, proofBlob, users[0].sigPk!);
      console.log(`First ${users.length} attendee membership proof folded`);
      newLock = await db.setLock(newLock);
      if (newLock === undefined) {
        console.log(`Worker lock expired, terminating...`);
        return;
      }
    }
  }

  // fold sequentially
  for (let i = startIndex; i < users.length; i++) {
    const user = users[i];
    const proofData = await db.getFold(TreeType.Attendee);
    let proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData!.proof.arrayBuffer())
    );
    // fold in membership
    proof = await membershipFolder.continueFold(user, proof, proofData!.numFolds);
    // compress the proof
    const compressed = await membershipFolder.compressProof(proof);
    const proofBlob = new Blob([compressed]);
    // check that timelock has not expired
    let res = await db.checkLock(newLock);
    if (res === false) {
      console.log(`Worker lock expired, terminating...`);
      return;
    } else {
      await db.incrementFold(TreeType.Attendee, proofBlob, user.sigPk!);
      console.log(`${i} of ${users.length} users folded`)
      newLock = await db.setLock(newLock);
      if (newLock === undefined) {
        console.log(`Worker lock expired, terminating...`);
        return;
      }
    }
  }
  return newLock;
}

/**
 * Obfuscate a fold for via web worker
 *
 * @param params - gzip compressed params
 */
async function workerObfuscateFold() {
  // Initialize indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // get params
  const params = new Blob(await db.getChunks());
  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params);

  const proofData = await db.getFold(TreeType.Attendee);
  // decompress proof
  let proof = await membershipFolder.decompressProof(
    new Uint8Array(await proofData!.proof.arrayBuffer())
  );
  // obfuscate proof
  let obfuscatedProof = await membershipFolder.obfuscate(
    proof,
    proofData!.numFolds
  );
  // compress the proof
  const compressed = await membershipFolder.compressProof(obfuscatedProof);
  const proofBlob = new Blob([compressed]);
  // store the compressed proof
  await db.obfuscateFold(TreeType.Attendee, proofBlob);
}

/**
 * Get chunks of public_params.json and store in indexdb
 * 
 * @param lock - the timestamp of the lock to start with
 * @return - the last lock set
 */
async function downloadParams(lock: number): Promise<number | undefined> {
  let newLock: number | undefined = lock;
  // instantiate indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // get chunk count
  const chunkIndex = await db.countChunks();
  if (chunkIndex === 10) {
    console.log('Chunks previously cached');
    return lock;
  }
  // get the next chunk
  console.log(`${chunkIndex} of 10 chunks stored`)
  for (let i = chunkIndex; i < 10; i++) {
    const chunkURI = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${i}.gz`;
    const chunk = await fetch(chunkURI, {
      headers: { "Content-Type": "application/x-binary" },
    }).then(async (res) => await res.blob());
    // check the lock hasn't expired
    let res = await db.checkLock(newLock);
    if (res === false) {
      return;
    } else {
      console.log(`Chunk ${i + 1} of 10 stored`);
      await db.addChunk(i, chunk);
      newLock = await db.setLock(newLock);
      if (newLock === undefined) {
        return;
      }
    }
  }
  return newLock;
}

const exports = {
  work,
  workerObfuscateFold,
};

export type FoldingWorker = typeof exports;

expose(exports);
