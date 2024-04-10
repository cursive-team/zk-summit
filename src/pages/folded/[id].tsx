import { Button } from '@/components/Button';
import { createFlower } from '@/lib/client/flower';
import { useScripts } from '@/hooks/useScripts';
import { useEffect, useMemo, useState } from 'react';
import { Icons } from '@/components/Icons';
import { Card } from '@/components/cards/Card';
import { useParams } from 'next/navigation';
import { IndexDBWrapper, TreeType } from '@/lib/client/indexDB';
import { GetFoldingProofResponse } from '../api/folding/proof';
import { Spinner } from '@/components/Spinner';
import { useWorker } from '@/hooks/useWorker';
import Link from 'next/link';

type UserProofs = {
  attendee?: {
    proof: Blob;
    count: number;
  };
  speaker?: {
    proof: Blob;
    count: number;
  };
  talk?: {
    proof: Blob;
    count: number;
  };
};

const Folded = (): JSX.Element => {
  const { id } = useParams();
  const { verify } = useWorker();
  const isLoaded = useScripts();
  const [dowloadingParams, setDownloadingParams] = useState<number>(0);
  const [fetchingProof, setFetchingProof] = useState<boolean>(false);
  const [numToVerify, setNumToVerify] = useState<number>(0);
  const [verified, setVerified] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<number>(0);
  const [user, setUser] = useState<GetFoldingProofResponse | null>(null);
  const [userProofs, setUserProofs] = useState<UserProofs>({});

  const flowerSize = 128;

  const downloadParams = async () => {
    // Check how many params are stored
    const db = new IndexDBWrapper();
    await db.init();

    const chunkIndex = await db.countChunks();

    if (chunkIndex !== 10) {
      setDownloadingParams(chunkIndex * 10 + 0.0001);

      for (let i = chunkIndex; i < 10; i++) {
        const chunkURI = `${process.env.NEXT_PUBLIC_NOVA_BUCKET_URL}/params_${i}.gz`;
        const chunk = await fetch(chunkURI, {
          headers: { 'Content-Type': 'application/x-binary' },
        }).then(async (res) => await res.blob());
        await db.addChunk(i, chunk);
        setDownloadingParams((prev) => prev + 10);
      }
      setTimeout(() => {
        setDownloadingParams(0);
      }, 500);
    }
  };

  const handleVerify = async () => {
    await downloadParams();
    // spawn worker if proof exists for type
    let requests = [];

    const verifyProof = async (proof: Blob, numVerified: number, treeType: TreeType) => {
      const success = await verify(proof, numVerified, treeType);
      if (success) setVerifying((prev) => prev + 1);
    };

    if (userProofs.attendee) {
      requests.push(
        verifyProof(userProofs.attendee.proof, userProofs.attendee.count, TreeType.Attendee)
      );
      setNumToVerify((prev) => prev + 1);
    }
    if (userProofs.speaker) {
      requests.push(
        verifyProof(userProofs.speaker.proof, userProofs.speaker.count, TreeType.Speaker)
      );
      setNumToVerify((prev) => prev + 1);
    }
    if (userProofs.talk) {
      requests.push(verifyProof(userProofs.talk.proof, userProofs.talk.count, TreeType.Talk));
      setNumToVerify((prev) => prev + 1);
    }
    await Promise.all(requests);
    setVerified(true);
  };

  const stats = useMemo(() => {
    if (!user) return [];
    const attendeeCount = user.attendeeProofCount ?? 0;
    const attendeeText = `Connection${attendeeCount === 1 ? '' : 's'} made`;
    const speakerCount = user.speakerProofCount ?? 0;
    const speakerText = `Speaker${speakerCount === 1 ? '' : 's'} met`;
    const talkCount = user.talkProofCount ?? 0;
    const talkText = `Talk${talkCount === 1 ? '' : 's'} attended`;
    return [
      { count: talkCount, title: talkText },
      { count: attendeeCount, title: attendeeText },
      { count: speakerCount ?? 0, title: speakerText },
    ];
  }, [user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const stage = new window.createjs.Stage(
      document.getElementById('propic-modal')
    );
    const center_x = stage.canvas.width / 2;
    const center_y = stage.canvas.height / 2;
    createFlower(stage, user.userPublicKey, center_x, center_y, flowerSize / 4);
  }, [isLoaded, user]);

  useEffect(() => {
    (async () => {
      // Check if proof id exists or not
      const response = await fetch(`/api/folding/proof?proofUuid=${id}`);
      if (response.ok) {
        // get proof data for the user
        const foldingData: GetFoldingProofResponse = await response.json();
        console.log("foldingData: ", foldingData);
        // get blobs for each proof type
        const proofBlobs: Map<TreeType, Blob> = new Map();
        const getProof = async (uri: string, treeType: TreeType) => {
          const proof = await fetch(uri).then(async (res) => await res.blob());
          proofBlobs.set(treeType, proof);
        };
        let requests = [];
        if (foldingData.attendeeProofCount && foldingData.attendeeProofUrl)
          requests.push(
            getProof(foldingData.attendeeProofUrl, TreeType.Attendee)
          );
        if (foldingData.speakerProofCount && foldingData.speakerProofUrl)
          requests.push(
            getProof(foldingData.speakerProofUrl, TreeType.Speaker)
          );
        if (foldingData.talkProofCount && foldingData.talkProofUrl)
          requests.push(getProof(foldingData.talkProofUrl, TreeType.Talk));
        await Promise.all(requests);

        // set the user data
        const data: UserProofs = {};
        const attendeeBlob = proofBlobs.get(TreeType.Attendee);
        if (attendeeBlob) {
          data.attendee = {
            proof: attendeeBlob,
            count: foldingData.attendeeProofCount!,
          };
        }
        const speakerBlob = proofBlobs.get(TreeType.Speaker);
        if (speakerBlob) {
          data.speaker = {
            proof: speakerBlob,
            count: foldingData.speakerProofCount!,
          };
        }
        const talkBlob = proofBlobs.get(TreeType.Talk);
        if (talkBlob) {
          data.talk = {
            proof: talkBlob,
            count: foldingData.talkProofCount!,
          };
        }
        setUserProofs(data);

        setUser(foldingData);
      } else {
        const { error } = await response.json();
        if (error === 'Proof not found') {
          // TODO: User not found
        }
      }
      setFetchingProof(false);
    })();
  }, []);

  if (fetchingProof) {
    return (
      <div className='flex flex-col h-full items-center'>
        <div className='p-4'>
          <Icons.Cursive color='#4015EC' />
        </div>
        <div className='flex items-center h-full'>
          <Spinner label='Fetching proof data...' />
        </div>
      </div>
    );
  } else if (!user) {
    return (
      <div className='flex flex-col h-full items-center'>
        <div className='p-4'>
          <Icons.Cursive color='#4015EC' />
        </div>
        <div className='flex items-center h-full p-4'>
          No proof found with id: {id}
        </div>
      </div>
    );
  } else {
    return (
      <div className='flex flex-col items-center'>
        <div className='p-4'>
          <Icons.Cursive color='#4015EC' />
        </div>
        <div className='p-16 pt-0 max-w-[390px] w-full'>
          <div className='flex flex-col items-center gap-2'>
            <canvas
              className='artwork-webgl flex p-0 m-0 rounded-[8px]'
              id='propic-modal'
              height={flowerSize}
              width={flowerSize}
            />
          </div>
          <div className='text-center'>
            <div className='text-primary text-3xl'>{user?.userName}</div>
            <div className='mt-2 text-primary text-2xl'>
              went to ZK Summit 11
            </div>
          </div>
          <div className='mt-4'>
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`border ${
                  index ? 'border-t-0' : 'border-t'
                }  border-primary flex gap-4 items-center p-4 text-primary`}
              >
                <div className='bg-white border border-primary px-1.5 py-0.5'>
                  {stat.count}
                </div>
                <div className='font-bold'>{stat.title}</div>
              </div>
            ))}
          </div>
          <div className='mt-4'>
            {dowloadingParams ? (
              <div className='text-center'>
                <div className='mb-2'>
                  Downloading params {Math.floor(dowloadingParams) / 10} of 10
                </div>
                <div className='relative'>
                  <Card.Progress
                    style={{
                      width: `${dowloadingParams}%`,
                    }}
                  />
                </div>
              </div>
            ) : verified ? (
              <div className='flex flex-col items-center gap-4'>
                <div className='flex gap-2 items-center font-bold text-primary'>
                  <Icons.checkedCircle stroke='#4015EC' />
                  <div>Valid proof</div>
                </div>
                <a
                  className='font-bold text-primary underline'
                  href='https://github.com/cursive-team/zk-summit?tab=readme-ov-file#zk-summit-folded'
                >
                  How was this proof generated?
                </a>
                <Link
                  className='font-bold text-primary underline'
                  href={`/folded/proof/${id}`}
                >
                  View proof
                </Link>
              </div>
            ) : (
              <div>
                {numToVerify > 0 ? (
                  <div className='text-center'>
                    <div className='mb-2'>
                      {verifying} of {numToVerify} proofs verified
                    </div>
                    <div className='relative'>
                      <Card.Progress
                        style={{
                          width: `${verifying / numToVerify}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => handleVerify()}>Verify</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

Folded.getInitialProps = () => {
  return { showFooter: false, showHeader: false };
};

export default Folded;
