import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Controller, EffectFade, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import { classed } from '@tw-classed/react';
import { Card } from './Card';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/client/utils';
import { Icons } from '../Icons';
import {
  getAuthToken,
  getFoldedProof,
  getKeys,
  getLocationSignatures,
  getProfile,
  getUsers,
} from '@/lib/client/localStorage';
import { Button } from '../Button';
import Link from 'next/link';
import { logClientEvent } from '@/lib/client/metrics';
import { toast } from 'sonner';
import { type PutBlobResult } from '@vercel/blob';
import { upload } from '@vercel/blob/client';
import { encryptFoldedProofMessage } from '@/lib/client/jubSignal';
import { loadMessages } from '@/lib/client/jubSignalClient';
import { useWorker } from '@/hooks/useWorker';
import { IndexDBWrapper, TreeType } from '@/lib/client/indexDB';
import { Spinner } from '../Spinner';

dayjs.extend(duration);
const UNFOLDED_DATE = '2024-03-10 15:59:59';
const CountdownLabel = classed.span('text-primary font-semibold text-xs');

interface FoldedItemProps {
  image?: string;
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: (param: number) => ReactNode;
}

interface FolderCardProps {
  items: FoldedItemProps[];
  onClose?: () => void;
}

export type ProofData = {
  uri: string;
  numFolded: number;
};

export type ProofPost = {
  attendees: ProofData | undefined;
  speakers: ProofData | undefined;
  talks: ProofData | undefined;
};

export const FOLDED_MOCKS: FolderCardProps['items'] = [
  {
    image: '/bg-gradient-card.png',
    children: (
      <>
        <Icons.ZKFolded
          className='text-primary w-full'
          height={100}
          width={100}
        />
      </>
    ),
  },
  {
    subtitle: "We're so happy you joined us at ZK Summit 11!",
    description: () => 'Ready to review your memories?',
  },
  {
    title: 'ZK11 - a symposium for brilliant minds.',
    description: (param: number) =>
      `You connected with ${param} other attendees`,
  },
  {
    title: '47 speakers filled the academy for a full day of talks.',
    description: (param: number) => `You attended ${param} talks`,
  },
  {
    title: 'Dialogue catalyzed the evolution of zk research.',
    description: (param: number) => `You met ${param} speakers`,
  },
  {
    title: 'Knowledge blossomed through interaction.',
    description: () => `You were 1 of 500 at ZK11!`,
  },
];

const FoldedCardSteps = ({ items = [], onClose }: FolderCardProps) => {
  const { work, finalize, folding, obfuscating } = useWorker();
  const [finalizedProgress, setFinalizedProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [numAttendees, setNumAttendees] = useState(0);
  const [numTalks, setNumTalks] = useState(0);
  const [numSpeakers, setNumSpeakers] = useState(0);
  const [provingStarted, setProvingStarted] = useState(false);

  const [numTotalProvingRequirements, setNumTotalProvingRequirements] =
    useState(0);
  const [proofId, setProofId] = useState<string>();

  useEffect(() => {
    const users = getUsers();
    const talks = getLocationSignatures();
    const foldedProof = getFoldedProof();

    const userSignatures = Object.values(users).filter((user) => user.sig);
    setNumAttendees(userSignatures.filter((user) => !user.isSpeaker).length);
    setNumSpeakers(userSignatures.filter((user) => user.isSpeaker).length);
    setNumTalks(Object.keys(talks).length);

    if (foldedProof) {
      setProofId(foldedProof.pfId);
    }
  }, []);

  const pagination = {
    clickable: true,
    bulletActiveClass: 'folded-dot-active',
    renderBullet: (index: number, className: string) => {
      return `<div data-index="${index}" class="my-2 folded-dot ${className}"></div>`;
    },
  };

  const getTwitterShareUrl = () => {
    if (!proofId) return '';

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `🧺 zkSummit 11 FOLDED 🧺: I made a Nova folding proof attesting to my zkSummit Athens experience, built by @cursive_team and @mach34_. Go verify it yourself!`
    )}&url=${encodeURIComponent(
      `https://zksummit.cursive.team/folded/${proofId}`
    )}`;
  };

  /**
   * Upload a proof blob and return the url to the blob
   *
   * @param proof - the compressed obfuscated proof
   * @param treeType - the type of tree the proof is for
   * @returns the url to the uploaded proof
   */
  const uploadProof = async (
    proof: Blob,
    treeType: TreeType
  ): Promise<string> => {
    const name = `${treeType}Proof`;
    const newBlob: PutBlobResult = await upload(name, proof, {
      access: 'public',
      handleUploadUrl: '/api/folding/upload',
    });
    return newBlob.url;
  };

  const saveFinalizedProofs = async (data: ProofPost): Promise<string> => {
    const token = getAuthToken();
    const keys = getKeys();
    const profile = getProfile();
    if (!token || token.expiresAt < new Date() || !keys || !profile) {
      throw new Error('Please sign in to save your proof.');
    }

    const response = await fetch('/api/folding/proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authToken: token.value, data }),
    });

    if (!response.ok) {
      throw new Error('Failed to save proof');
    }

    const { proofUuid } = await response.json();

    const senderPrivateKey = keys.encryptionPrivateKey;
    const recipientPublicKey = profile.encryptionPublicKey;
    const encryptedMessage = await encryptFoldedProofMessage({
      proofId: proofUuid,
      proofLink: proofUuid,
      senderPrivateKey,
      recipientPublicKey,
    });

    // Send folded proof info as encrypted jubSignal message to self
    // Simultaneously refresh activity feed
    try {
      await loadMessages({
        forceRefresh: false,
        messageRequests: [
          {
            encryptedMessage,
            recipientPublicKey,
          },
        ],
      });
    } catch (error) {
      console.error(
        'Error sending encrypted folded proof info to server: ',
        error
      );
      toast.error('An error occured while saving the proof. Please try again.');
    }

    return proofUuid;
  };

  const beginProving = async () => {
    logClientEvent('foldedProvingStarted', {});

    if (numAttendees === 0 && numTalks === 0 && numSpeakers === 0) {
      toast.error('Nothing to prove! Tap some cards to get started.');
      return;
    }

    // ensure all proofs are folded
    await work(
      Object.values(getUsers()),
      Object.values(getLocationSignatures())
    );

    const db = new IndexDBWrapper();
    await db.init();

    setProvingStarted(true);
    let proofUris: Map<TreeType, ProofData> = new Map();
    const finalizeProof = async (treeType: TreeType) => {
      // obfuscate the proof
      let success = await finalize(treeType);
      if (!success) {
        console.log(`No membership proof of type ${treeType} was ever made`);
        return;
      }
      setFinalizedProgress((prev) => prev + 1);
      console.log('Finalized proof for treeType: ', treeType);
      // get the proof from the db
      const proofData = await db.getFold(treeType);
      if (proofData === undefined) {
        console.log(`No proof data found for ${treeType} tree`);
      } else {
        // post the proof to blob store
        let proofBlobUri = await uploadProof(proofData!.proof, treeType);
        console.log(`Posted ${treeType} proof to ${proofBlobUri}`);
        // track the proof and numFolded for each tree
        proofUris.set(treeType, {
          uri: proofBlobUri,
          numFolded: proofData!.numFolds,
        });
      }
    };
    await Promise.all([
      finalizeProof(TreeType.Attendee),
      finalizeProof(TreeType.Speaker),
      finalizeProof(TreeType.Talk),
    ]);

    // post the results to the server
    const proofPost = {
      attendees: proofUris.get(TreeType.Attendee),
      speakers: proofUris.get(TreeType.Speaker),
      talks: proofUris.get(TreeType.Talk),
    };

    const proofUuid = await saveFinalizedProofs(proofPost);
    setProofId(proofUuid);
    setProvingStarted(false);
  };

  return (
    <main className='relative'>
      <Icons.Cursive
        className='fixed top-[47px] left-[22px] text-primary z-10'
        height={19}
        width={63}
      />
      <div className='fixed flex items-center gap-8 right-[22px] top-[47px] z-10'>
        <button
          aria-label='close'
          type='button'
          className='size-[18x] rounded-full bg-white/60 p-1'
          onClick={() => onClose?.()}
        >
          <Icons.ControllerClose className='text-iron-950' />
        </button>
      </div>
      <Swiper
        pagination={pagination}
        modules={[EffectFade, Controller, Pagination, Autoplay]}
        effect='fade'
        autoplay={{
          delay: 2500,
          disableOnInteraction: false,
          stopOnLastSlide: true,
        }}
        className='h-screen'
        spaceBetween={0}
        slidesPerView={1}
        onSlideChange={(swiper: any) => {
          const isLastSlide = swiper.activeIndex === items.length - 1;
          if (isLastSlide) {
            swiper.autoplay.stop();
          }
          setActiveIndex(swiper?.activeIndex ?? 0);
        }}
      >
        {items?.map(
          ({ title, subtitle, description, children, image }, itemIndex) => {
            return (
              <SwiperSlide
                key={itemIndex}
                className={cn(!!image ? 'bg-cover bg-center' : 'bg-main')}
                style={{
                  backgroundImage: image ? `url('${image}')` : undefined,
                  backgroundSize: image ? 'cover' : undefined,
                }}
              >
                <div className='flex flex-col gap-6 grow h-screen items-center justify-center px-10'>
                  {itemIndex !== items.length - 1 && (
                    <>
                      {children}
                      {title && (
                        <h4 className='text-primary leading-[32px] font-medium font-sans text-3xl text-center'>
                          {title}
                        </h4>
                      )}
                      {subtitle && (
                        <span className='text-primary font-bold font-sans text-lg text-center'>
                          {subtitle}
                        </span>
                      )}
                      {description && (
                        <span className='text-primary font-normal font-sans text-base text-center'>
                          {itemIndex === 2 && description(numAttendees)}
                          {itemIndex === 3 && description(numTalks)}
                          {itemIndex === 4 && description(numSpeakers)}
                          {![2, 3, 4].includes(itemIndex) && description(0)}
                        </span>
                      )}
                    </>
                  )}
                  {itemIndex === items.length - 1 && (
                    <>
                      {proofId && (
                        <>
                          <h4 className='text-primary leading-[32px] font-medium font-sans text-3xl text-center'>
                            {'Proof is ready'}
                          </h4>
                          <span className='text-primary font-bold font-sans text-lg text-center'>
                            {
                              'Allow anyone to verify your ZK Summit experience.'
                            }
                          </span>
                          <Link href={getTwitterShareUrl()} target='_blank'>
                            <Button
                              onClick={() =>
                                logClientEvent('foldedTwitterShareProof', {})
                              }
                              icon={
                                <Icons.Twitter className='text-primary bg-white mr-3' />
                              }
                            >
                              {'Share on Twitter'}
                            </Button>
                          </Link>
                        </>
                      )}
                      {!proofId && provingStarted && (
                        <>
                          <h4 className='text-primary leading-[32px] font-medium font-sans text-3xl text-center'>
                            {'Generating your proof...'}
                          </h4>
                          <span className='text-primary font-bold font-sans text-lg text-center'>
                            {'This may take a minute. Please be patient!'}
                          </span>
                          <Spinner />
                        </>
                      )}
                      {!proofId && !provingStarted && (
                        <>
                          {children}
                          {title && (
                            <h4 className='text-primary leading-[32px] font-medium font-sans text-3xl text-center'>
                              {title}
                            </h4>
                          )}
                          {subtitle && (
                            <span className='text-primary font-bold font-sans text-lg text-center'>
                              {subtitle}
                            </span>
                          )}
                          {description && (
                            <span className='text-primary font-normal font-sans text-base text-center'>
                              {itemIndex === 2 && description(numAttendees)}
                              {itemIndex === 3 && description(numTalks)}
                              {itemIndex === 4 && description(numSpeakers)}
                              {![2, 3, 4].includes(itemIndex) && description(0)}
                            </span>
                          )}
                          <Button onClick={beginProving}>Prove it</Button>
                        </>
                      )}
                      {}
                    </>
                  )}
                </div>
              </SwiperSlide>
            );
          }
        )}
      </Swiper>
    </main>
  );
};

export const FolderCard = ({ items }: FolderCardProps) => {
  const [isOpened, setIsOpened] = useState(false);
  const [hasCountdown, setHasCountdown] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const isDatePassed = dayjs().isAfter(dayjs(UNFOLDED_DATE));
    setHasCountdown(!isDatePassed);

    if (isDatePassed) return;
    const interval = setInterval(() => {
      const targetDate = dayjs(UNFOLDED_DATE);
      const currentDate = dayjs();
      const duration = dayjs.duration(targetDate.diff(currentDate));
      const days = duration.days();
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { days, hours, minutes, seconds } = countdown;

  return (
    <div>
      <div
        className={cn(
          'fixed inset-0 bg-main duration-300',
          isOpened ? 'z-[100] opacity-100' : 'z-[-10] opacity-0',
          {}
        )}
      >
        <FoldedCardSteps
          items={items}
          onClose={() => {
            setIsOpened(false);
          }}
        />
      </div>
      <Card.Base
        aria-label='Folded Card'
        onClick={() => setIsOpened(!isOpened)}
        className={cn({
          'pointer-events-none': hasCountdown,
          'py-4': !hasCountdown,
        })}
        style={{
          backgroundImage: "url('/bg-glitter.png')",
        }}
      >
        <div className='flex flex-col gap-2 text-center pt-4 pb-4 px-6 '>
          {hasCountdown && (
            <CountdownLabel>
              Available in:{' '}
              {days === 1
                ? `${days} day, `
                : days === 0
                ? ''
                : `${days} days, `}
              {hours.toString().padStart(2, '0')}:
              {minutes.toString().padStart(2, '0')}:
              {seconds.toString().padStart(2, '0')}
            </CountdownLabel>
          )}
          <h3 className='font-bold font-sans text-[21px] text-black'>
            ZK11 Folded
          </h3>
          <span className='text-xs text-iron-900'>
            Using client-side Nova folding proofs, create and share a Spotify
            Wrapped-like summary of your zkSummit11!
          </span>
        </div>
      </Card.Base>
    </div>
  );
};
