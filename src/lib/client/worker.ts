import { expose } from "comlink";
import { MembershipFolder, NovaWasm } from "@/lib/client/nova";
import { LocationSignature, User } from "@/lib/client/localStorage";
import { IndexDBWrapper, TreeType } from "@/lib/client/indexDB";

/**
 * A general thread for handling all folding operations in the background
 * 0. Checks indexdb that no valid lock is present
 * 1. Downloads params
 * 2. Folds all attendees
 * 3. Folds all speakers
 * 4. Folds all talks
 * 
 * @param users - all users that exist in local storage
 * @param talks - all talks that exist in local storage
 */
async function work(users: User[], talks: LocationSignature[]) {
  // instantiate indexdb
  const db = new IndexDBWrapper();
  await db.init();

  console.log("users", users);

  console.log("Filtering users and talks");
  // sort attendees and speakers
  let attendees = users.filter((user) => {
    return !user.isSpeaker && user.pkId !== "0" && user.sig && user.sigPk && user.msg;
  });
  let speakers = users.filter((user) => {
    return user.isSpeaker && user.pkId !== "0" && user.sig && user.sigPk && user.msg;
  });

  // filter out attendees, speakers, and talks with no talks
  const attendeePks = await db.getUnincluded(
    TreeType.Attendee,
    attendees.map(user => user.sigPk!)
  );
  attendees = attendees.filter(user => attendeePks.includes(user.sigPk!));
  console.log(`Found ${attendees.length} attendees to fold`);
  const speakerPks = await db.getUnincluded(
    TreeType.Speaker,
    speakers.map(user => user.sigPk!)
  );
  speakers = speakers.filter(user => speakerPks.includes(user.sigPk!));
  console.log(`Found ${speakers.length} speakers to fold`);

  const talkPks = await db.getUnincluded(
    TreeType.Talk,
    talks.map(talk => talk.pk)
  );
  talks = talks.filter(talk => talkPks.includes(talk.pk));
  console.log(`Found ${talks.length} talks to fold`);

  // attempt to set a lock on the db
  let lock = await db.setLock();
  // terminate the lock if it is undefined
  if (lock === undefined)
    return;

  // download params
  console.log("Beginning params download")
  lock = await downloadParams(lock);
  if (lock === undefined)
    return;
  // todo: sort speakers and attendees

  // instantiate wasm
  const wasm = await import("bjj_ecdsa_nova_wasm");
  await wasm.default();
  // let concurrency = Math.floor(navigator.hardwareConcurrency / 3) * 2;
  // if (concurrency < 1) concurrency = 1;
  let concurrency = navigator.hardwareConcurrency - 1;
  await wasm.initThreadPool(concurrency);

  // prove attendee folds
  if (attendees.length > 0) {
    console.log("Beginning attendee folding");
    lock = await fold(
      attendees.map(attendee => attendee.sigPk!),
      attendees.map(attendee => attendee.sig!),
      attendees.map(attendee => attendee.msg!),
      TreeType.Attendee,
      lock,
      wasm
    );
    if (lock === undefined)
      return;
  }

  // prove speaker folds
  if (speakers.length > 0) {
    console.log("Beginning speaker folding");
    lock = await fold(
      speakers.map(speaker => speaker.sigPk!),
      speakers.map(speaker => speaker.sig!),
      speakers.map(speaker => speaker.msg!),
      TreeType.Speaker,
      lock,
      wasm
    );
    if (lock === undefined)
      return;
  }
  // todo: prove talk folds
  if (talks.length > 0) {
    console.log("Beginning talk folding");
    console.log("talks: ", talks);
    lock = await fold(
      talks.map(talk => talk.pk),
      talks.map(talk => talk.sig),
      talks.map(talk => talk.msg),
      TreeType.Talk,
      lock,
      wasm
    );
    if (lock === undefined)
      return;
  }

  // remove the lock
  console.log("Nova worker terminating successfully");
  await db.releaseLock(lock);
}


/**
 * Fold all { speakers | attendees } given a set of users
 * 
 * @param users - valid users to fold into the membership proof
 * @param lock - the previously set timelock
 * @returns the last lock set during execution, or undefined if timeout
 */
async function fold(
  pks: string[],
  sigs: string[],
  msgs: string[],
  treeType: TreeType,
  lock: number,
  wasm: NovaWasm
): Promise<number | undefined> {
  console.log(`${sigs.length} ${treeType}s to fold`);

  // define new lock
  let newLock: number | undefined = lock;

  // Initialize indexdb
  const db = new IndexDBWrapper();
  await db.init();


  // get params
  const params = new Blob(await db.getChunks());
  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params, wasm);

  // Check if fold already exists
  let previousProof = await db.getFold(treeType);

  let startIndex = previousProof ? 0 : 1;
  // If no previous attendee proof, start a new fold
  if (!previousProof) {
    const proof = await membershipFolder.startFold(pks[0], sigs[0], msgs[0], treeType);
    // compress the proof
    const compressed = await membershipFolder.compressProof(proof);
    const proofBlob = new Blob([compressed]);
    // check that timelock has not expired
    let res = await db.checkLock(newLock);
    if (res === false) {
      console.log(`Worker lock expired, terminating...`);
      return;
    } else {
      await db.addFold(treeType, proofBlob, pks[0]);
      console.log(`First ${treeType} membership proof folded`);
      newLock = await db.setLock(newLock);
      if (newLock === undefined) {
        console.log(`Worker lock expired, terminating...`);
        return;
      }
    }
  }

  // fold sequentially
  for (let i = startIndex; i < sigs.length; i++) {
    const proofData = await db.getFold(treeType);
    let proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData!.proof.arrayBuffer())
    );
    // fold in membership
    proof = await membershipFolder.continueFold(
      proof,
      proofData!.numFolds,
      pks[i],
      sigs[i],
      msgs[i],
      treeType
    );
    // compress the proof
    const compressed = await membershipFolder.compressProof(proof);
    const proofBlob = new Blob([compressed]);
    // check that timelock has not expired
    let res = await db.checkLock(newLock);
    if (res === false) {
      console.log(`Worker lock expired, terminating...`);
      return;
    } else {
      await db.incrementFold(treeType, proofBlob, pks[i]);
      console.log(`${i} of ${sigs.length} ${treeType}s folded`)
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

  // instantiate wasm
  const wasm = await import("bjj_ecdsa_nova_wasm");
  await wasm.default();
  // let concurrency = Math.floor(navigator.hardwareConcurrency / 3) * 2;
  // if (concurrency < 1) concurrency = 1;
  let concurrency = navigator.hardwareConcurrency - 1;
  await wasm.initThreadPool(concurrency);

  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params, wasm);

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
