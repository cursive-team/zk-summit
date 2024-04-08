import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import useParams from '@/hooks/useParams';
import { MembershipFolder } from '@/lib/client/nova';
import { Spinner } from '@/components/Spinner';
import { toast } from 'sonner';
import useFolds, { TreeType } from '@/hooks/useFolds';

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

const getAllUsers = () => {
  const users = getUsers();
  console.log('Users: ', users);
};

export default function Fold() {
  const {
    addChunk,
    getChunks,
    chunkCount,
    paramsDbInitialized
  } = useParams();
  const {
    addProof,
    getProof,
    incrementFold,
    obfuscate,
  } = useFolds();
  const [chunksDownloaded, setChunksDownloaded] = useState<boolean>(false);
  const [membershipFolder, setMembershipFolder] =
    useState<MembershipFolder | null>(null);

  // const paramWorker = new Worker(
  //   new URL('./paramWorker.ts', import.meta.url)
  // );
  // paramWorker.postMessage({});
  // paramWorker.onmessage = (event: MessageEvent) => {
  //   console.log('Event: ', event);
  // };

  useEffect(() => {
    console.log("Chunks downloaded", chunksDownloaded);
    if (!paramsDbInitialized || chunksDownloaded) return;
    (async () => {
      // handle downloading chunks
      const startIndex = await chunkCount();
      // If 10 chunks are not stored then fetch remaining
      if (startIndex !== 10) {
        const id = toast.loading("Downloading Nova Folding params file!");
        console.log(`${startIndex} out of 10 param chunks stored`);
        for (let i = startIndex; i < 10; i++) {
          const param = await getParamsSequential(i);
          // Add chunk to indexdb
          await addChunk(i, param);
          console.log(`Chunk ${i + 1} of 10 stored`);
        }
        toast.dismiss(id)
        setChunksDownloaded(true);
      } else {
        setChunksDownloaded(true);
      }
    })();
  }, [paramsDbInitialized]);

  useEffect(() => {
    // instantiate membership folder class
    if (!chunksDownloaded || membershipFolder !== null) return;
    // begin folding users
    (async () => {
      console.log('Doing something');
      const compressedParams = new Blob(await getChunks());
      const folding = await MembershipFolder.initWithIndexDB(compressedParams);
      setMembershipFolder(folding);
    })();
  }, [chunksDownloaded]);

  const fold = async () => {
    if (!membershipFolder) return;
    let users = getUsers();
    let usersToFold = Object.entries(users).filter(
      ([_, user]) => !user.folded && user.pkId !== '0'
    );
    let startTime = new Date().getTime();

    // build proof 1
    let proof = await membershipFolder.startFold(usersToFold[0][1]);

    // store proof 1
    let compressed = new Blob([await membershipFolder.compressProof(proof)]);
    await addProof(TreeType.Attendee, compressed);

    let endTime = new Date().getTime();
    console.log(`Folded 1 in ${endTime - startTime}ms`);

    // retrieve proof 1
    let proofData = await getProof(TreeType.Attendee);
    proof = await membershipFolder.decompressProof(new Uint8Array(await proofData!.proof.arrayBuffer()));

    startTime = new Date().getTime();
    // build proof 2
    proof = await membershipFolder.continueFold(
      usersToFold[0][1],
      proof,
      proofData!.numFolds
    );
    endTime = new Date().getTime();
    console.log(`Folded 2 in ${endTime - startTime}ms`);    

    // store proof 2
    compressed = new Blob([await membershipFolder.compressProof(proof)]);
    const x = await incrementFold(TreeType.Attendee, compressed);
    console.log("x: ", x);

    // get proof 2
    proofData = await getProof(TreeType.Attendee);
    proof = await membershipFolder.decompressProof(new Uint8Array(await proofData!.proof.arrayBuffer()));
    
    // obfuscate proof
    let obfuscatedProof = await membershipFolder.obfuscate(proof, proofData!.numFolds);
    
    // store obfuscated proof
    compressed = new Blob([await membershipFolder.compressProof(obfuscatedProof)]);
    await obfuscate(TreeType.Attendee, compressed);

    // retrieve obfuscated proof
    proofData = await getProof(TreeType.Attendee);
    console.log("Obfuscated: ", proofData!.obfuscated);

    // // obfuscate proof
    // startTime = new Date().getTime();
    // let obfuscatedProof = await membershipFolder.obfuscate(proof2, 2);
    // endTime = new Date().getTime();
    // console.log(`Obfuscated in ${endTime - startTime}ms`);
    // console.log("Proof: ", obfuscatedProof.substring(0, 30));

    // // verify proof
    // startTime = new Date().getTime();
    // let verified = await membershipFolder.verify(obfuscatedProof, 2, true);
    // endTime = new Date().getTime();
    // console.log(`Verified 1 in ${endTime - startTime}ms`);
  };

  return (
    <div>
      {!chunksDownloaded ? (
        <>
        </>
      ) : (
        <>
          <Button onClick={() => fold()}>Generate Proof</Button>
        </>
      )}
    </div>
  );
}
