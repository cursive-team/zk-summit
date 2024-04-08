import { merkleProofFromObject } from "../shared/utils";
import { User } from "./localStorage";
import {
  derDecodeSignature,
  getPublicInputsFromSignature,
  publicKeyFromString,
  hexToBigInt,
  getECDSAMessageHash,
  MerkleProof,
} from "babyjubjub-ecdsa";
import { TreeRoots } from "../server/folding";

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
  ) {}

  /**
   * Initializes a new instance of the membership folder class
   */
  static async init(): Promise<MembershipFolder> {
    // get wasm
    let wasm = await getWasm();
    // get tree roots
    let roots: TreeRoots = await fetch("/api/tree/root").then(
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
    compressedParams: Blob
  ): Promise<MembershipFolder> {
    // get wasm
    let wasm = await getWasm();
    // get tree roots
    let roots: TreeRoots = await fetch("/api/tree/root").then(
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
   * Folds in the first membership proof
   *
   * @param user - The user to fold membership for
   * @param root - the root of the tree to prove membership in
   * @returns The folding proof of membership
   */
  async startFold(user: User): Promise<string> {
    // check the user is not self or has not tapped
    if (user.pkId === "0")
      throw new Error(
        `Cannot fold user ${user.name}'s membership: self or untapped!`
      );

    // check the user has a signature
    if (!user.sig || !user.sigPk || !user.msg) {
      throw new Error(
        `Cannot fold user ${user.name}'s membership: no signature!`
      );
    }

    // check the user has not already been folded
    // fetch merkle proof for the user
    const merkleProof = await fetch(
      `/api/tree/proof?treeType=attendee&pubkey=${user.sigPk}`
    )
      .then(async (res) => await res.json())
      .then(merkleProofFromObject);

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(user, merkleProof);

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
   * @param user - The user to fold membership for
   * @param proof - the previous fold to increment from
   * @param numFolds - the number of memberships verified in the fold
   * @returns The folding proof of membership
   */
  async continueFold(
    user: User,
    proof: string,
    numFolds: number
  ): Promise<string> {
    // check the user is not self or has not tapped
    if (user.pkId === "0")
      throw new Error(
        `Cannot fold user ${user.name}'s membership: self or untapped!`
      );

    // check the user has a signature
    if (!user.sig || !user.sigPk || !user.msg) {
      throw new Error(
        `Cannot fold user ${user.name}'s membership: no signature!`
      );
    }

    // fetch merkle proof for the user
    const merkleProof = await fetch(
      `/api/tree/proof?treeType=attendee&pubkey=${user.sigPk}`
    )
      .then(async (res) => await res.json())
      .then(merkleProofFromObject);

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(user, merkleProof);

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
  async obfuscate(proof: string, numFolds: number): Promise<string> {
    // build the zi_primary (output of previous fold)
    let zi_primary = [
      hexToBigInt(this.roots.attendeeMerkleRoot).toString(),
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
    obfuscated: boolean = false
  ): Promise<boolean> {
    // set num verified based on obfuscation
    let iterations = obfuscated ? numFolds + 1 : numFolds;
    // let iterations = 2;
    try {
      let res = await this.wasm.verify_proof(
        this.params,
        proof,
        hexToBigInt(this.roots.attendeeMerkleRoot).toString(),
        Number(iterations)
      );
      console.log(
        `Verification output of ${
          obfuscated ? "chaffed " : ""
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
   * Builds the private inputs for the folded membership circuit using a user record
   * @notice assumes validation on user record has been performed previously
   *
   * @param user - The user record to fold
   * @param merkleProof - the merkle inclusion proof for this user in the tree
   * @returns The private inputs for the folded membership circuit
   */
  static async makePrivateInputs(
    user: User,
    merkleProof: MerkleProof
  ): Promise<NovaPrivateInputs> {
    if (!user.sig || !user.sigPk || !user.msg) {
      throw new Error("User record missing required fields");
    }

    // decode the user's signature
    let sig = derDecodeSignature(user.sig);
    let messageHash = hexToBigInt(getECDSAMessageHash(user.msg));
    let pubkey = publicKeyFromString(user.sigPk);
    const { T, U } = getPublicInputsFromSignature(sig, messageHash, pubkey);
    return {
      s: sig.s.toString(),
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
      let res = await fetch(full_url, {
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
  await wasm.initThreadPool(navigator.hardwareConcurrency - 1);
  return wasm;
};
