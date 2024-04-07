import { User } from "./localStorage";
import {
  derDecodeSignature,
  getPublicInputsFromSignature,
} from "babyjubjub-ecdsa";

export type NovaWasm = typeof import("bjj_ecdsa_nova_wasm");

/** Private inputs to the folded membership circuit */
export type NovaPrivateInputs = {
  s: bigint;
  tx: bigint;
  ty: bigint;
  ux: bigint;
  uy: bigint;
  pathIndices: number[];
  siblings: bigint[];
};

export class MembershipFolder {
  // private

  public readonly r1cs_url = `${process.env.NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.r1cs`;
  public readonly wasm_url = `${process.env.NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.wasm`;

  constructor(
    /** The wasm binary for membership folding operations */
    public readonly wasm: NovaWasm,
    /** The public params used to prove folds */
    public readonly params: string
  ) {}

  /**
   * Initializes a new instance of the membership folder class
   */
  static async init(): Promise<MembershipFolder> {
    let wasm = await getWasm();
    let params = await getAllParamsByChunk();
    return new MembershipFolder(wasm, params);
  }

  /**
   * Folds in the first membership proof
   *
   * @param user - The user to fold membership for
   * @param root - the root of the tree to prove membership in
   * @returns The folding proof of membership
   */
  async startFold(user: User, root: bigint): Promise<string> {
    // check the user is not self or has not tapped
    if (user.pkId === "0")
      throw new Error(
        `Cannot fold user ${user.name}'s membership: self or untapped!`
      );
    // check the user has not already been folded
    if (user.folded === true)
      throw new Error(
        `User ${user.name}'s membership has already been folded!`
      );

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(user);

    // prove the membership
    return await this.wasm.generate_proof(
      this.r1cs_url,
      this.wasm_url,
      this.params,
      root.toString(),
      JSON.stringify(inputs)
    );
  }

  /**
   * Fold subsequent membership proofs
   *
   * @param user - The user to fold membership for
   * @param root - the root of the tree to prove membership in
   * @param proof - the previous fold to increment from
   * @returns The folding proof of membership
   */
  async continueFold(user: User, root: bigint, proof: string): Promise<string> {
    // check the user is not self or has not tapped
    if (user.pkId === "0")
      throw new Error(
        `Cannot fold user ${user.name}'s membership: self or untapped!`
      );
    // check the user has not already been folded
    if (user.folded === true)
      throw new Error(
        `User ${user.name}'s membership has already been folded!`
      );

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(user);

    // check the previous # of folds
    // @TODO
    let numFolds: bigint = BigInt(0);

    // build the zi_primary (output of previous fold)
    // this is predictable and getting it from verification doubles the work
    let zi_primary = [root.toString(), numFolds.toString()];

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
   * @param root - the root of the tree to prove membership in
   * @returns the obfuscated "final" proof
   */
  async obfuscate(proof: string, root: bigint): Promise<string> {
    // check the previous # of folds
    // @TODO
    let numFolds: bigint = BigInt(0);

    // build the zi_primary (output of previous fold)
    // this is predictable and getting it from verification doubles the work
    let zi_primary = [root.toString(), numFolds.toString()];

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
   * @param num_folds - the number of proofs verified in the fold
   * @param obfuscated - whether the proof is obfuscated
   */
  async verify(
    proof: string,
    num_verified: bigint,
    obfuscated: boolean = false
  ): Promise<boolean> {
    // get root
    let root = BigInt(0);

    // set num verified based on obfuscation
    let iterations = obfuscated ? num_verified + BigInt(1) : num_verified;

    try {
      await this.wasm.verify_proof(
        this.params,
        proof,
        root.toString(),
        Number(iterations)
      );
      return true;
    } catch (e) {
      console.error(`Failed to verify proof: ${e}`);
      return false;
    }
  }

  /**
   * Builds the private inputs for the folded membership circuit using a user record
   * @notice assumes validation on user record has been performed previously
   *
   * @param user - The user record to fold
   * @returns The private inputs for the folded membership circuit
   */
  static async makePrivateInputs(user: User): Promise<NovaPrivateInputs> {
    // decode the user's signature
    let sig = derDecodeSignature(user.sig!);
    // let;
    return {
        s: BigInt(0),
        tx: BigInt(0),
        ty: BigInt(0),
        ux: BigInt(0),
        uy: BigInt(0),
        pathIndices: Array(9).fill(0),
        siblings: Array(9).fill(BigInt(0)),
    }
  }

  /**
   * Gzip deflates a proof
   * @param proof - the proof to compress
   * @returns the compressed proof
   */
  async compress_proof(proof: string): Promise<Uint8Array> {
    return await this.wasm.compress_proof(proof);
  }

  /**
   * Gzip inflates a proof
   * @param compressed - the compressed proof
   * @returns the decompressed proof
   */
  async decompress_proof(compressed: Uint8Array): Promise<string> {
    return await this.wasm.decompress_proof(compressed);
  }
}

export const getAllParamsByChunk = async (): Promise<string> => {
  // get chunked files
  let requests = [];
  let data: Map<Number, Blob> = new Map();
  for (let i = 0; i < 10; i++) {
    let req = async () => {
      let full_url = `${process.env.NOVA_BUCKET_URL}/params_${i}.gz`;
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
  return wasm;
};
