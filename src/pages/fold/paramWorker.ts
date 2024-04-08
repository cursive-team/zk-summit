import { IndexDBWrapper } from '@/shared/indexDBWrapper';


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

/**
 * Download missing param chunks or read from IndexDB
 */
onmessage = async () => {
  // Init IndexDB wrapper
  const db = new IndexDBWrapper('zksummit_folded', 'params');
  await db.init();
  const startIndex = await db.countEntries();

  // If 10 chunks are not stored then fetch remaining
  if (startIndex !== 10) {
    console.log(`${startIndex} out of 10 param chunks stored`);
    for (let i = startIndex; i < 10; i++) {
      const param = await getParamsSequential(i);
      // Add chunk to indexdb
      await db.addEntry(i, param);
      console.log(`Chunk ${i + 1} of 10 stored`)
    }
  }

  postMessage(await db.getEntries());
};
