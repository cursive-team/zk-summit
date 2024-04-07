import { Button } from '@/components/Button';
import { useEffect } from 'react';
import useIndexDB from '@/hooks/useIndexDB';

export default function Fold() {
  const { addItem, dbInitialized, itemCount } = useIndexDB('bbj', 'params');
  useEffect(() => {
    if (!dbInitialized) return;
    (async () => {
      const paramWorker = new Worker(
        new URL('./paramWorker.ts', import.meta.url)
      );
      paramWorker.postMessage({});
      paramWorker.onmessage = (event: MessageEvent) => {
        console.log('Event: ', event);
      };
      // const getParam = async (index: number): Promise<Blob> => {
      //   const fullUrl = `${paramsUrl}/params_${index}.json`;
      //   const res = await fetch(fullUrl, {
      //     headers: { 'Content-Type': 'application/x-binary' },
      //   });
      //   return await res.blob();
      // };

      // const startIndex = await itemCount();
      // // If 10 chunks are not stored then fetch remaining
      // if (startIndex !== 10) {
      //   console.log(`${startIndex} out of 10 param chunks stored`);
      //   for (let i = startIndex; i < 10; i++) {
      //     const param = await getParam(i);
      //     // Add chunk to indexdb
      //     await addItem(i, param);
      //     console.log(`Chunk ${i + 1} of 10 stored`);
      //   }
      // }
      // console.log('Updated count: ', await itemCount());
    })();
  }, [dbInitialized]);

  return (
    <div>
      <Button onClick={() => null}>Generate Proof</Button>
    </div>
  );
}
