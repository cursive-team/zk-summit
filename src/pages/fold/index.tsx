import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import useParams from '@/hooks/useParams';
import { MembershipFolder } from '@/lib/client/nova';
import { Spinner } from '@/components/Spinner';
import { toast } from 'sonner';
import useFolds, { TreeType } from '@/hooks/useFolds';

const getAllUsers = () => {
  const users = getUsers();
  console.log('Users: ', users);
};

export default function Fold() {
  const { addChunk, getChunks, chunkCount, paramsDbInitialized } = useParams();
  const { addProof, getProof, incrementFold, obfuscate } = useFolds();
  const [chunks, setChunks] = useState<Array<Blob>>([]);

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

    // build proof 1
    let proof = await membershipFolder.startFold(usersToFold[0][1]);

    // store proof 1
    let compressed = new Blob([await membershipFolder.compressProof(proof)]);
    await addProof(TreeType.Attendee, compressed);

    let endTime = new Date().getTime();
    console.log(`Folded 1 in ${endTime - startTime}ms`);

    // retrieve proof 1
    let proofData = await getProof(TreeType.Attendee);
    proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData!.proof.arrayBuffer())
    );

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
      {!chunks.length ? (
        <></>
      ) : (
        <>
          <Button onClick={() => fold()}>Generate Proof</Button>
        </>
      )}
    </div>
  );
}
