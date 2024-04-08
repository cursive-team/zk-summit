import { expose } from "comlink";
import { MembershipFolder } from "@/lib/client/nova";
import { User } from "@/lib/client/localStorage";
import { IndexDBWrapper, TreeType } from "@/lib/client/indexDB";

/**
 * Start a fold for via web worker
 *
 * @param params - gzip compressed params
 * @param user - the user to fold in a membership for
 */
async function workerStartFold(user: User) {
  // Initialize indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // get params
  const params = new Blob(await db.getChunks());
  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params);
  // create a folding proof starting with this user
  const proof = await membershipFolder.startFold(user);
  // compress the proof
  const compressed = await membershipFolder.compressProof(proof);
  const proofBlob = new Blob([compressed]);
  // store the compressed proof

  await db.addFold(TreeType.Attendee, proofBlob, user.sigPk!);
}

/**
 * Increment a fold for via web worker
 *
 * @param params - gzip compressed params
 * @param user - the user to fold in a membership for
 */
async function workerIncrementFold(user: User) {
  // Initialize indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // get params
  const params = new Blob(await db.getChunks());
  // Initialize membership folder
  const membershipFolder = await MembershipFolder.initWithIndexDB(params);

  // retrieve previous proof
  const proofData = await db.getFold(TreeType.Attendee);
  // decompress proof
  let proof = await membershipFolder.decompressProof(
    new Uint8Array(await proofData!.proof.arrayBuffer())
  );
  // fold in membership
  proof = await membershipFolder.continueFold(user, proof, proofData!.numFolds);
  // compress the proof
  const compressed = await membershipFolder.compressProof(proof);
  const proofBlob = new Blob([compressed]);
  // store the compressed proof
  await db.incrementFold(TreeType.Attendee, proofBlob, user.sigPk!);
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
 * Get the next chunk of params via worker and store it in indexdb
 */
async function workerGetParamsChunk(): Promise<boolean> {
  // instantiate indexdb
  const db = new IndexDBWrapper();
  await db.init();
  // get chunk count
  const chunkIndex = await db.countChunks();
  if (chunkIndex === 10) {
    console.log('All chunks stored')
    return true;
  }
  // get the next chunk
  console.log(`${chunkIndex} of 10 chunks stored`)
  for (let i = chunkIndex; i < 10; i++) {
    const chunkURI = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${i}.gz`;
    const chunk = await fetch(chunkURI, {
      headers: { "Content-Type": "application/x-binary" },
    }).then(async (res) => await res.blob());
    // store the chunk in the db
    await db.addChunk(i, chunk);
    console.log(`Chunk ${i + 1} of 10 stored`);
  }
  return true;
}

const exports = {
  workerStartFold,
  workerIncrementFold,
  workerObfuscateFold,
  workerGetParamsChunk,
};

export type FoldingWorker = typeof exports;

expose(exports);
