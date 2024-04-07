import { MERKLE_TREE_DEPTH } from "@/shared/constants";
import { merkleProofFromObject } from "../shared/utils";
import { User } from "./localStorage";
import {
  derDecodeSignature,
  getPublicInputsFromSignature,
  computeMerkleProof,
  publicKeyFromString,
  hexToBigInt,
  getECDSAMessageHash,
  MerkleProof,
  bigIntToHex,
} from "babyjubjub-ecdsa";
import { TreeResponse } from "@/pages/api/tree/root";

export type NovaWasm = typeof import("bjj_ecdsa_nova_wasm");

/** Private inputs to the folded membership circuit */
export type NovaPrivateInputs = {
  s: string;
  tx: string;
  ty: string;
  ux: string;
  uy: string;
  pathIndices: number[];
  siblings: string[];
};

export class MembershipFolder {
  // private

  public readonly r1cs_url = `${process.env.NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.r1cs`;
  public readonly wasm_url = `${process.env.NOVA_BUCKET_URL}/bjj_ecdsa_batch_fold.wasm`;
  public readonly attendee_root: bigint = BigInt(
    "0x1d38ba4c24c07eb8f00732feac18d88e0e8b312f8b02fcd5b9909788b928708c"
  );
  public readonly speaker_root: bigint = BigInt(
    "0x1427a8faa329cb273dd77ff77966eb7fe180d9b21b7a3e8cf2235b600161fc5d"
  );
  public readonly talk_root: bigint = BigInt(
    "0x3050d69c58e4816855a6ac2d15c0ec6f6b59bf93312c86ba2e6d002ac53e2d11"
  );

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
  async startFold(user: User): Promise<string> {
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
   * @returns The folding proof of membership
   */
  async continueFold(user: User, proof: string): Promise<string> {
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

    // fetch merkle proof for the user
    const merkleProof = await fetch(
      `/api/tree/proof?treeType=attendee&pubkey=${user.sigPk}`
    )
      .then(async (res) => await res.json())
      .then(merkleProofFromObject);

    // generate the private inputs for the folded membership circuit
    let inputs = await MembershipFolder.makePrivateInputs(user, merkleProof);

    // check the previous # of folds
    // @TODO
    let numFolds: bigint = BigInt(0);

    // build the zi_primary (output of previous fold)
    // this is predictable and getting it from verification doubles the work
    let zi_primary = [bigIntToHex(merkleProof.root), numFolds.toString()];

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
    // check the previous # of folds
    // @TODO
    let iterations = bigIntToHex(BigInt(numFolds));

    // fetch root
    let root = await fetch("/api/tree/root")
      .then(async (res) => await res.json())
      .then((res: TreeResponse) => res.attendeeMerkleRoot);

    // build the zi_primary (output of previous fold)
    // this is predictable and getting it from verification doubles the work
    let zi_primary = [root, bigIntToHex(BigInt(numFolds))];

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
    // get root
    let root = await fetch("/api/tree/root")
      .then(async (res) => await res.json())
      .then((res: TreeResponse) => res.attendeeMerkleRoot);

    // set num verified based on obfuscation
    let iterations = obfuscated ? numFolds + 1 : numFolds;

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
    // decode the user's signature
    let sig = derDecodeSignature(user.sig!);
    let messageHash = hexToBigInt(getECDSAMessageHash(user.msg!));
    let pubkey = publicKeyFromString(user.sigPk!);
    const { T, U } = getPublicInputsFromSignature(sig, messageHash, pubkey);
    return {
      s: sig.s.toString(),
      tx: T.x.toString(),
      ty: T.y.toString(),
      ux: U.x.toString(),
      uy: U.y.toString(),
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
