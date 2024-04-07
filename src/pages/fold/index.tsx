import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import useIndexDB from '@/hooks/useIndexDB';
import { MembershipFolder } from '@/lib/client/nova';

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
  const { addItem, getItems, dbInitialized, itemCount } = useIndexDB(
    'zksummit_folded',
    'params'
  );
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
    if (!dbInitialized || chunksDownloaded) return;
    (async () => {
      const startIndex = await itemCount();
      // If 10 chunks are not stored then fetch remaining
      if (startIndex !== 10) {
        console.log(`${startIndex} out of 10 param chunks stored`);
        for (let i = startIndex; i < 10; i++) {
          const param = await getParamsSequential(i);
          // Add chunk to indexdb
          await addItem(i, param);
          console.log(`Chunk ${i + 1} of 10 stored`);
          setChunksDownloaded(true);
        }
      } else {
        setChunksDownloaded(true);
      }
    })();
  }, [dbInitialized]);

  useEffect(() => {
    // instantiate membership folder class
    if (!chunksDownloaded || membershipFolder !== null) return;
    // begin folding users
    (async () => {
      console.log('Doing something');
      const compressedParams = new Blob(await getItems());
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
    let endTime = new Date().getTime();
    console.log(`Folded 1 in ${endTime - startTime}ms`);
    console.log('Proof: ', proof.substring(0, 30));

    // build proof 2
    startTime = new Date().getTime();
    let proof2 = await membershipFolder.continueFold(
      usersToFold[0][1],
      proof,
      1
    );
    endTime = new Date().getTime();
    console.log(`Folded 2 in ${endTime - startTime}ms`);
    console.log('Proof: ', proof2.substring(0, 30));

    // obfuscate proof
    // startTime = new Date().getTime();
    // let obfuscatedProof = await membershipFolder.obfuscate(proof2, 2);
    // endTime = new Date().getTime();
    // console.log(`Obfuscated in ${endTime - startTime}ms`);
    // console.log("Proof: ", obfuscatedProof.substring(0, 30));

    // verify proof
    startTime = new Date().getTime();
    let verified = await membershipFolder.verify(proof2, 2, false);
    endTime = new Date().getTime();
    console.log(`Verified 1 in ${endTime - startTime}ms`);
  };

  return (
    <div>
      <Button onClick={() => fold()}>Generate Proof</Button>
    </div>
  );
}
