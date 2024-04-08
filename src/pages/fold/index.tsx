import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import { MembershipFolder } from '@/lib/client/nova';

const getAllUsers = () => {
  const users = getUsers();
  console.log('Users: ', users);
};

export default function Fold() {
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

    // build proof 2
    // startTime = new Date().getTime();
    // let proof2 = await membershipFolder.continueFold(
    //   usersToFold[0][1],
    //   proof,
    //   1
    // );
    // endTime = new Date().getTime();
    // console.log(`Folded 2 in ${endTime - startTime}ms`);
    // console.log('Proof: ', proof2.substring(0, 30));

    // @TODO: Obfuscate proof
    // startTime = new Date().getTime();
    // let obfuscatedProof = await membershipFolder.obfuscate(proof2, 2);
    // endTime = new Date().getTime();
    // console.log(`Obfuscated in ${endTime - startTime}ms`);
    // console.log("Proof: ", obfuscatedProof.substring(0, 30));

    // Verify proof
    // startTime = new Date().getTime();
    // let verified = await membershipFolder.verify(proof2, 2, false);
    // endTime = new Date().getTime();
    // console.log(`Verified 1 in ${endTime - startTime}ms`)
  };

  return (
    <div>
      <Button onClick={() => fold()}>Generate Proof</Button>
    </div>
  );
}
