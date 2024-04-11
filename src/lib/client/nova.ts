import { merkleProofFromObject } from "../shared/utils";
import { LocationSignature, User } from "./localStorage";
import {
  derDecodeSignature,
  getPublicInputsFromSignature,
  publicKeyFromString,
  hexToBigInt,
  getECDSAMessageHash,
  MerkleProof,
  bigIntToHex,
} from "babyjubjub-ecdsa";
import { TreeRoots } from "@/pages/api/tree/root";
import { TreeType } from "./indexDB";
import { fetchWithRetry } from "./utils";

export type NovaWasm = typeof import("bjj_ecdsa_nova_wasm");

/** Private inputs to the folded membership circuit */
export type NovaPrivateInputs = {
  s: string;
  Tx: string;
  Ty: string;
  Ux: string;
  Uy: string;
  pathIndices: number[];
  siblings: string[];
};

export class MembershipFolder {
  // private

  public readonly r1cs_url = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.r1cs`;
  public readonly wasm_url = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.wasm`;

  constructor(
    /** The wasm binary for membership folding operations */
    public readonly wasm: NovaWasm,
    /** The public params used to prove folds */
    public readonly params: string,
    /** Get the roots for the tree types */
    public readonly roots: TreeRoots
  ) { }

  /**
   * Initializes a new instance of the membership folder class
   */
  static async init(): Promise<MembershipFolder> {
    // get wasm
    let wasm = await getWasm();
    // get tree roots
    let roots: TreeRoots = await fetchWithRetry("/api/tree/root").then(
      async (res) => await res.json()
    );
    // get params
    let params = await getAllParamsByChunk();
    return new MembershipFolder(wasm, params, roots);
  }

  /**
   * Initializes a new instance of the membership folder class
   */
  static async initWithIndexDB(
    compressedParams: Blob,
    wasm: NovaWasm
  ): Promise<MembershipFolder> {
    // get wasm
    // let wasm = await getWasm();
    // get tree roots
    let roots: TreeRoots = await fetchWithRetry("/api/tree/root").then(
      async (res) => await res.json()
    );

    // decompress params
    let ds = new DecompressionStream("gzip");
    let reader = compressedParams.stream().pipeThrough(ds).getReader();
    let done = false;
    let params = "";
    while (!done) {
      let decompressed = await reader.read();
      done = decompressed.done;
      params += new TextDecoder().decode(decompressed.value);
    }
    return new MembershipFolder(wasm, params, roots);
  }

  /**
   * Prove the first fold in a membership tree
   * 
   * @param pk - the public key of the member
   * @param sig - the signature of the member
   * @param msg - the message signed by the member 
   * @param treeType - the type of tree to fold into
   * @returns - the proof of folding for the membership circuit
   */
  async startFold(
    pk: string,
    sig: string,
    msg: string,
    treeType: TreeType
  ): Promise<string> {
    // fetch merkle proof for the user
    const merkleProof = await fetchWithRetry(
      `/api/tree/proof?treeType=${treeType}&pubkey=${pk}`
    )
      .then(async (res) => await res.json())
      .then(merkleProofFromObject);
      
    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(sig, pk, msg, merkleProof);

    // prove the membership
    return await this.wasm.generate_proof(
      this.r1cs_url,
      this.wasm_url,
      this.params,
      merkleProof.root.toString(),
      JSON.stringify(inputs)
    );
  }

  /**
   * Fold subsequent membership proofs
   *
   * @param proof - the previous fold to increment from
   * @param numFolds - the number of memberships verified in the fold
   * @param sig - the signature by the member
   * @param pk - the public key of the member
   * @param msg - the message signed by the member
   * @param treeType - the type of tree to fold into
   * @returns The folding proof of membership
   */
  async continueFold(
    proof: string,
    numFolds: number,
    pk: string,
    sig: string,
    msg: string,
    treeType: "attendee" | "speaker" | "talk"
  ): Promise<string> {
    // fetch merkle proof for the user
    const merkleProof = await fetchWithRetry(
      `/api/tree/proof?treeType=${treeType}&pubkey=${pk}`
    )
      .then(async (res) => await res.json())
      .then(merkleProofFromObject);

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(
      sig,
      pk,
      msg,
      merkleProof
    );

    // build the zi_primary (output of previous fold)
    // this is predictable and getting it from verification doubles the work
    let zi_primary = [merkleProof.root.toString(), BigInt(numFolds).toString()];

    // prove the membership
    return await this.wasm.continue_proof(
      this.r1cs_url,
      this.wasm_url,
      this.params,
      proof,
      JSON.stringify(inputs),
      zi_primary
    );
  }

  /**
   * Perform the chaff step with random witness for this instance to obfuscate folded total witness
   * @param proof - the proof to obfuscate
   * @param numFolds - the number of memberships verified in the fold
   * @param root - the root of the tree to prove membership in
   * @returns the obfuscated "final" proof
   */
  async obfuscate(proof: string, numFolds: number, treeType: TreeType): Promise<string> {
    // build the zi_primary (output of previous fold)
    let root;
    if (treeType === TreeType.Attendee)
      root = this.roots.attendeeMerkleRoot;
    else if (treeType === TreeType.Speaker)
      root = this.roots.speakerMerkleRoot;
    else 
      root = this.roots.talksMerkleRoot;
    let zi_primary = [
      hexToBigInt(root).toString(),
      BigInt(numFolds).toString(),
    ];

    return await this.wasm.obfuscate_proof(
      this.r1cs_url,
      this.wasm_url,
      this.params,
      proof,
      zi_primary
    );
  }

  /**
   * Verifies a folded membership proofs
   *
   * @param proof - the proof to verify
   * @param numFolds - the number of memberships verified in the fold
   * @param obfuscated - whether the proof is obfuscated
   */
  async verify(
    proof: string,
    numFolds: number,
    treeType: TreeType,
    obfuscated: boolean = false
  ): Promise<boolean> {
    // set num verified based on obfuscation
    const iterations = obfuscated ? numFolds + 1 : numFolds;
    // let iterations = 2;
    let root;
    if (treeType === TreeType.Attendee)
      root = this.roots.attendeeMerkleRoot;
    else if (treeType === TreeType.Speaker)
      root = this.roots.speakerMerkleRoot;
    else 
      root = this.roots.talksMerkleRoot;
    try {
      let res = await this.wasm.verify_proof(
        this.params,
        proof,
        hexToBigInt(root).toString(),
        Number(iterations)
      );
      console.log(
        `Verification output of ${obfuscated ? "chaffed " : ""
        }proof of ${numFolds} memberships:`,
        res
      );
      return true;
    } catch (e) {
      console.error(`Failed to verify proof: ${e}`);
      return false;
    }
  }

  /**
   * Gzip deflates a proof
   * @param proof - the proof to compress
   * @returns the compressed proof
   */
  async compressProof(proof: string): Promise<Uint8Array> {
    return await this.wasm.compress_proof(proof);
  }

  /**
   * Gzip inflates a proof
   * @param compressed - the compressed proof
   * @returns the decompressed proof
   */
  async decompressProof(compressed: Uint8Array): Promise<string> {
    return await this.wasm.decompress_proof(compressed);
  }

  /**
   * Builds private inputs for a folded membership proof
   *
   * @param sig - the signature by the member
   * @param pk - the public key of the member
   * @param msg - the message signed by the member
   * @param merkleProof - the merkle inclusion proof for the member in the tree
   * @returns The private inputs for the folded membership circuit
   */
  static async makePrivateInputs(
    sig: string,
    pk: string,
    msg: string,
    merkleProof: MerkleProof
  ): Promise<NovaPrivateInputs> {
    // decode the user's signature
    const decodedSig = derDecodeSignature(sig);
    const messageHash = hexToBigInt(getECDSAMessageHash(msg));
    const pubkey = publicKeyFromString(pk);
    const { T, U } = getPublicInputsFromSignature(decodedSig, messageHash, pubkey);
    return {
      s: decodedSig.s.toString(),
      Tx: T.x.toString(),
      Ty: T.y.toString(),
      Ux: U.x.toString(),
      Uy: U.y.toString(),
      pathIndices: merkleProof.pathIndices,
      siblings: merkleProof.siblings.map((sibling) => sibling.toString()),
    };
  }
}

export const getAllParamsByChunk = async (): Promise<string> => {
  // get chunked files
  let requests = [];
  let data: Map<Number, Blob> = new Map();
  for (let i = 0; i < 10; i++) {
    let req = async () => {
      let full_url = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${i}.gz`;
      let res = await fetchWithRetry(full_url, {
        headers: { "Content-Type": "application/x-binary" },
      }).then(async (res) => await res.blob());
      data.set(i, res);
    };
    requests.push(req());
  }

  // await all requests
  await Promise.all(requests);

  // build into one blob
  let chunks = [];
  for (let i = 0; i < 10; i++) {
    chunks.push(data.get(i)!);
  }
  let compressed = new Blob(chunks);

  // decompress blob
  let ds = new DecompressionStream("gzip");
  let reader = compressed.stream().pipeThrough(ds).getReader();
  let done = false;
  let params = "";
  while (!done) {
    let decompressed = await reader.read();
    done = decompressed.done;
    params += new TextDecoder().decode(decompressed.value);
  }

  return params;
};

/**
 * Import and instantiate the Nova WASM module
 *
 * @return - The Nova WASM module
 */
export const getWasm = async (): Promise<NovaWasm> => {
  const wasm = await import("bjj_ecdsa_nova_wasm");
  await wasm.default();
  // let concurrency = Math.floor(navigator.hardwareConcurrency / 3) * 2;
  // if (concurrency < 1) concurrency = 1;
  let concurrency = navigator.hardwareConcurrency - 1;
  await wasm.initThreadPool(concurrency);
  return wasm;
};
