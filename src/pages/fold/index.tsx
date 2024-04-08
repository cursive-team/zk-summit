import { Button } from "@/components/Button";
import { useEffect, useState } from "react";
import { getUsers } from "@/lib/client/localStorage";
import useParams from "@/hooks/useParams";
import { MembershipFolder } from "@/lib/client/nova";
import { Spinner } from "@/components/Spinner";
import { toast } from "sonner";
import useFolds, { TreeType } from "@/hooks/useFolds";

/**
 * Gets a public params gzipped chunk from the server
 * @param index - the chunk index to retrieve
 * @returns - the gzipped chunk
 */
const getParamsSequential = async (index: number): Promise<Blob> => {
  const fullUrl = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${index}.gz`;
  const res = await fetch(fullUrl, {
    headers: { "Content-Type": "application/x-binary" },
  });
  return await res.blob();
};

export default function Fold() {
  const { addChunk, getChunks, chunkCount, paramsDbInitialized } = useParams();
  const { addProof, getProof, incrementFold, obfuscate, getUserToFold } =
    useFolds();
  const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false);
  const [membershipFolder, setMembershipFolder] =
    useState<MembershipFolder | null>(null);
  const [canFinalize, setCanFinalize] = useState<boolean>(false);
  const [canVerify, setCanVerify] = useState<boolean>(false);
  const [numFolded, setNumFolded] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<string | number | null>(null);
  const [isProving, setIsProving] = useState<boolean>(false)

  useEffect(() => {
    if (!paramsDbInitialized || chunksDownloaded) return;
    (async () => {
      // handle downloading chunks
      const startIndex = await chunkCount();
      // If 10 chunks are not stored then fetch remaining
      if (startIndex !== 10) {
        const id = toast.loading("Downloading Nova Folding params file!");
        setIsLoading(id);
        console.log(`${startIndex} out of 10 param chunks stored`);
        for (let i = startIndex; i < 10; i++) {
          const param = await getParamsSequential(i);
          // Add chunk to indexdb
          await addChunk(i, param);
          console.log(`Chunk ${i + 1} of 10 stored`);
        }
        setChunksDownloaded(true);
      } else {
        setChunksDownloaded(true);
      }
    })();
  }, [paramsDbInitialized]);

  useEffect(() => {
    // instantiate membership folder class
    if (!chunksDownloaded || membershipFolder !== null) return;
    let loadingId = isLoading;
    if (loadingId === null)
      loadingId = toast.loading("Downloading Nova Folding params file!");
    // begin folding users
    (async () => {
      const compressedParams = new Blob(await getChunks());
      const folding = await MembershipFolder.initWithIndexDB(compressedParams);
      setMembershipFolder(folding);
      toast.dismiss(loadingId);
      setIsLoading(null);
    })();
  }, [chunksDownloaded]);

  useEffect(() => {
    if (!chunksDownloaded || membershipFolder === null) return;
    // get the proof attendee type
    (async () => {
      const proofData = await getProof(TreeType.Attendee);
      if (proofData === undefined) {
        // if no proof found, cannot finalize or verify
        setCanFinalize(false);
        setCanVerify(false);
        return;
      } else if (proofData.obfuscated === false) {
        // if proof found and not obfuscated, can finalize
        setNumFolded(proofData.numFolds);
        setCanFinalize(true);
        setCanVerify(false);
      } else {
        setNumFolded(proofData.numFolds);
        setCanFinalize(false);
        setCanVerify(true);
      }
    })();
  }, [membershipFolder, canFinalize, canVerify]);

  const fold = async () => {
    if (!membershipFolder) return;
    setIsProving(true);
    // get users who are not speakers
    const users = Object.values(getUsers()).filter((user) => !user.isSpeaker);

    // get user that can be folded in
    let user = await getUserToFold(TreeType.Attendee, users);
    if (user === undefined) {
      toast.info("No attendees to fold in!");
      setIsProving(false);
      return;
    }

    // generate the first proof
    let proof = await membershipFolder.startFold(user);
    let compressed = new Blob([await membershipFolder.compressProof(proof)]);
    await addProof(TreeType.Attendee, compressed, user.sigPk!);
    let proofCount = 1;
    setNumFolded(1);

    // build successive proofs
    user = await getUserToFold(TreeType.Attendee, users);
    while (user !== undefined) {
      // get proof from indexdb
      const proofData = await getProof(TreeType.Attendee);
      // proof data should not be null since we just created a proof
      proof = await membershipFolder.decompressProof(
        new Uint8Array(await proofData!.proof.arrayBuffer())
      );
      // fold in membership
      proof = await membershipFolder.continueFold(
        user,
        proof,
        proofData!.numFolds
      );
      compressed = new Blob([await membershipFolder.compressProof(proof)]);
      // store incremented fold
      await incrementFold(TreeType.Attendee, compressed, user.sigPk!);
      setNumFolded(proofData!.numFolds + 1);
      proofCount++;
      // get next user to fold
      user = await getUserToFold(TreeType.Attendee, users);
      // await membershipFolder.verify(proof, proofData!.numFolds + 1, false);
    }
    setCanFinalize(true);
    setIsProving(false);
    toast.success(`Folded proofs of ${proofCount} attendees met!`);
  };

  const finalize = async () => {
    if (!membershipFolder) return;
    // get proof from indexdb
    setIsProving(true);
    const proofData = await getProof(TreeType.Attendee);
    if (proofData === undefined) {
      toast.error("No proof to finalize!");
      setIsProving(false);
      return;
    } else if (proofData.obfuscated === true) {
      toast.error("Proof has already been finalized!");
      setIsProving(false);
      return;
    }

    // decompress proof
    const proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData.proof.arrayBuffer())
    );
    const obfuscatedProof = await membershipFolder.obfuscate(
      proof,
      proofData.numFolds
    );

    // store obfuscated proof
    const compressed = new Blob([
      await membershipFolder.compressProof(obfuscatedProof),
    ]);
    await obfuscate(TreeType.Attendee, compressed);

    setCanFinalize(false);
    setCanVerify(true);
    setIsProving(false);
    toast.success(
      `Finalized folded proof of ${proofData.numFolds} attendees met!`
    );
  };

  const verify = async () => {
    if (!membershipFolder) return;
    setIsProving(true);
    // get proof from indexdb
    const proofData = await getProof(TreeType.Attendee);
    if (proofData === undefined) {
      toast.error("No proof to verify!");
      setIsProving(false);
      return;
    } else if (proofData.obfuscated === false) {
      toast.error("Proof has not been finalized!");
      setIsProving(false);
      return;
    }
    // decompress proof
    const proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData.proof.arrayBuffer())
    );
    // verify
    await membershipFolder.verify(proof, proofData.numFolds, true);
    setIsProving(false);
    toast.success(
      `Verified folded proof of ${proofData.numFolds} attendees met!`
    );
  };

  return (
    <div>
      {!chunksDownloaded || !membershipFolder ? (
        <></>
      ) : (
        <>
          {numFolded !== 0 ? (
            <>
              <p>Number of proofs folded: {numFolded}</p>
              {canFinalize && !isProving && (
                <Button onClick={() => finalize()}>Finalize Proof</Button>
              )}
              {canVerify && !isProving && (
                <Button onClick={() => verify()}>Verify Proof</Button>
              )}
            </>
          ) : (
            <>
              {!isProving && (<Button onClick={() => fold()}>Generate Proof</Button>)}
            </>
          )}
          {isProving && <Spinner />}
        </>
      )}
    </div>
  );
}
