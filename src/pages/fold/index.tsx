import { Button } from '@/components/Button';
import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/client/localStorage';
import { MembershipFolder } from '@/lib/client/nova';
import { Spinner } from '@/components/Spinner';
import { toast } from 'sonner';
import { useWorker } from '@/hooks/useWorker';
import { TreeType } from '@/lib/client/indexDB';
import { IndexDBWrapper } from '@/lib/client/indexDB';

export default function Fold() {
  const {
    downloadParamsChunk,
    startFold,
    incrementFold,
    foldAll,
    obfuscateFold,
    folding,
    downloadingChunks,
    chunksDownloaded,
  } = useWorker();
  const [canFinalize, setCanFinalize] = useState<boolean>(false);
  const [canVerify, setCanVerify] = useState<boolean>(false);
  const [chunks, setChunks] = useState<Array<Blob>>([]);
  const [db, setDB] = useState<IndexDBWrapper | null>(null);
  const [isProving, setIsProving] = useState<boolean>(false);
  const [numFolded, setNumFolded] = useState<number>(0);

  useEffect(() => {
    (async () => {
      // Init IndexDB
      const db = new IndexDBWrapper();
      await db.init();

      // Download params
      await downloadParamsChunk();
      const stored = await db.getChunks();
      setChunks(stored);
      setDB(db);
    })();
  }, []);

  useEffect(() => {
    if (!chunks.length || !db) return;
    // get the proof attendee type
    (async () => {
      const proofData = await db.getFold(TreeType.Attendee);
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
  }, [canFinalize, canVerify, chunks, db]);

  const finalize = async () => {
    if (!db) return;
    // get proof from indexdb
    setIsProving(true);
    const proofData = await db.getFold(TreeType.Attendee);
    if (proofData === undefined) {
      toast.error('No proof to finalize!');
      setIsProving(false);
      return;
    } else if (proofData.obfuscated === true) {
      toast.error('Proof has already been finalized!');
      setIsProving(false);
      return;
    }

    // Obfuscate in web worker
    await obfuscateFold();

    setCanFinalize(false);
    setCanVerify(true);
    setIsProving(false);
    toast.success(
      `Finalized folded proof of ${proofData.numFolds} attendees met!`
    );
  };

  const fold = async () => {
    if (!db) return;
    setIsProving(true);
    // get users who are not speakers
    const users = Object.values(getUsers()).filter((user) => !user.isSpeaker);

    // get user that can be folded in
    let foldableUsers = await db.getUsersToFold(TreeType.Attendee, users);
    if (foldableUsers === undefined) {
      toast.info('No attendees to fold in!');
      setIsProving(false);
      return;
    }

    // Get proof count
    const proof = await db.getFold(TreeType.Attendee);
    const proofCount = proof?.numFolds ?? 0;

    await foldAll(foldableUsers);

    setCanFinalize(true);
    setIsProving(false);
    toast.success(
      `Folded proofs of ${proofCount + foldableUsers.length} attendees met!`
    );
  };

  const verify = async () => {
    if (!db) return;
    setIsProving(true);
    // get proof from indexdb
    const proofData = await db.getFold(TreeType.Attendee);
    if (proofData === undefined) {
      toast.error('No proof to verify!');
      return;
    } else if (proofData.obfuscated === false) {
      toast.error('Proof has not been finalized!');
      return;
    }

    const params = new Blob(chunks);
    // Initialize membership folder
    const membershipFolder = await MembershipFolder.initWithIndexDB(params);

    // decompress proof
    const proof = await membershipFolder.decompressProof(
      new Uint8Array(await proofData.proof.arrayBuffer())
    );
    await membershipFolder.verify(proof, proofData.numFolds, true);
    setIsProving(false);
    toast.success(
      `Verified folded proof of ${proofData.numFolds} attendees met!`
    );
  };

  return (
    <div>
      {!chunks.length ? (
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
              {!isProving && (
                <Button onClick={() => fold()}>Generate Proof</Button>
              )}
            </>
          )}
          {isProving && <Spinner />}
        </>
      )}
    </div>
  );
}
