import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import { MembershipFolder } from '@/lib/client/nova';
import { Spinner } from '@/components/Spinner';
import { toast } from 'sonner';
import { useWorker} from '@/hooks/useWorker';

export default function Fold() {
  const {
    downloadParamsChunk,
    startFold,
    incrementFold,
    obfuscateFold,
    folding,
    downloadingChunks,
    chunksDownloaded,
  } = useWorker();
  // const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false);
  // const [membershipFolder, setMembershipFolder] =
  //   useState<MembershipFolder | null>(null);
  // const [chunks, setChunks] = useState<Array<Blob>>([]);
  // const [canFinalize, setCanFinalize] = useState<boolean>(false);
  // const [canVerify, setCanVerify] = useState<boolean>(false);
  // const [numFolded, setNumFolded] = useState<number>(0);
  // const [isLoading, setIsLoading] = useState<string | number | null>(null);

  /**
 * Gets a public params gzipped chunk from the server
 * @param index - the chunk index to retrieve
 * @returns - the gzipped chunk
 */
  const getParamsSequential = async (index: number): Promise<Blob> => {
    const fullUrl = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${index}.gz`;
    const res = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/x-binary' },
    });
    return await res.blob();
  };

  useEffect(() => {
    // Create param worker
    const worker = new Worker(new URL('./paramWorker.ts', import.meta.url));
    // Send message initiating param download
    worker.postMessage({});

    worker.onmessage = async (event: MessageEvent) => {
      const chunks = event.data;
      setChunks(chunks);
    };

    return () => {
      worker.terminate();
    };
  }, []);

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
    let loadingId = isLoading
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
    if (!chunks.length) return;
    const compressedParams = new Blob(chunks);
    let users = Object.entries(getUsers());
    let usersToFold = users.filter(
      ([_, user]) => !user.folded && user.pkId !== '0'
    );

    // Exit if no users to fold
    if (usersToFold.length === 0) {
      console.log('No new users to fold');
      return;
    } else {
      console.log(`${usersToFold.length} users to fold`);
    }

    let startTime = new Date().getTime();
    let endTime = startTime;

    const worker = new Worker(new URL('./foldWorker.ts', import.meta.url));

    // Check if inital fold exists or not
    // TODO: Check index db
    if (false) {
      // TODO: Get proof from IndexDB
    } else {
      worker.postMessage({
        compressedParams,
        iteration: 0,
        user: usersToFold[0][1],
      });
    }

    worker.onmessage = async (event: MessageEvent) => {
      const { iteration, proof } = event.data;
      console.log(`Folded ${iteration} of ${usersToFold.length} users`);
      endTime = new Date().getTime();

      console.log(`Folded ${iteration} in ${endTime - startTime}ms`);
      console.log('Proof: ', proof.substring(0, 30));

      const nextIteration = iteration + 1;

      const user = usersToFold[nextIteration]
        ? usersToFold[nextIteration][1]
        : null;
      // Continue fold if next user exists
      if (user) {
        startTime = new Date().getTime();
        worker.postMessage({
          compressedParams,
          iteration: nextIteration,
          proof,
          user,
        });
      } else {
        console.log('All users folded');
      }
    };

    // =========== NEED TO MOVE CODE BELOW INTO WORKER ===========

    // get user that can be folded in
    let user = await getUserToFold(TreeType.Attendee, users);
    if (user === undefined) {
      toast.info("No attendees to fold in!");
      return;
    }

    // generate the first proof
    let proof = await membershipFolder.startFold(user);
    let compressed = new Blob([await membershipFolder.compressProof(proof)]);
    await addProof(TreeType.Attendee, compressed, user.sigPk!);
    setNumFolded(1);

    // build successive proofs
    user = await getUserToFold(TreeType.Attendee, users);
    while (user !== undefined) {
      // get proof from indexdb
      const proofData = await getProof(TreeType.Attendee);
      // proof data should not be null since we just created a proof
      proof = await membershipFolder.decompressProof(new Uint8Array(await proofData!.proof.arrayBuffer()));
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
      // get next user to fold
      user = await getUserToFold(TreeType.Attendee, users);
    }
    setCanFinalize(true);
    toast.success(`Folded proofs of ${numFolded} attendees met!`)
  };

  // retrieve proof 1
  let proofData = await getProof(TreeType.Attendee);
  proof = await membershipFolder.decompressProof(
    new Uint8Array(await proofData!.proof.arrayBuffer())
  );

  // decompress proof
  const proof = await membershipFolder.decompressProof(
    new Uint8Array(await proofData.proof.arrayBuffer())
  );
  endTime = new Date().getTime();
  console.log(`Folded 2 in ${endTime - startTime}ms`);

  // store proof 2
  compressed = new Blob([await membershipFolder.compressProof(proof)]);
  const x = await incrementFold(TreeType.Attendee, compressed);
  console.log('x: ', x);

  // get proof 2
  proofData = await getProof(TreeType.Attendee);
  proof = await membershipFolder.decompressProof(
    new Uint8Array(await proofData!.proof.arrayBuffer())
  );

  // obfuscate proof
  let obfuscatedProof = await membershipFolder.obfuscate(
    proof,
    proofData!.numFolds
  );

  // store obfuscated proof
  compressed = new Blob([
    await membershipFolder.compressProof(obfuscatedProof),
  ]);
  await obfuscate(TreeType.Attendee, compressed);

  // retrieve obfuscated proof
  proofData = await getProof(TreeType.Attendee);
  console.log('Obfuscated: ', proofData!.obfuscated);

  const verify = async () => {
    if (!membershipFolder) return;
    // get proof from indexdb
    const proofData = await getProof(TreeType.Attendee);
    if (proofData === undefined) {
      toast.error("No proof to verify!");
      return;
    } else if (proofData.obfuscated === false) {
      toast.error("Proof has not been finalized!");
      return;
    }
    // decompress proof
    const proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData.proof.arrayBuffer())
    );
    await membershipFolder.verify(
      proof,
      proofData.numFolds,
      true
    );
    toast.success(`Verified folded proof of ${proofData.numFolds} attendees met!`)
  }

  return (
    <div>
  {
    !chunks.length ? (
      <></>
    ) : (
      <>
        {numFolded !== 0 ? (
          <>
            <p>Number of proofs folded: {numFolded}</p>
            {canFinalize && (
              <Button onClick={() => finalize()}>Finalize Proof</Button>
            )}
            {canVerify && (
              <Button onClick={() => verify()}>Verify Proof</Button>
            )}
          </>
        ) : (
          <Button onClick={() => fold()}>Generate Proof</Button>
        )}
      </>
    )
  }
    </div >
  );
}
