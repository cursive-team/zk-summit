import { Button } from '@/components/Button';
import { createFlower } from '@/lib/client/flower';
import { useScripts } from '@/hooks/useScripts';
import { useEffect, useState } from 'react';
import { Icons } from '@/components/Icons';
import { Card } from '@/components/cards/Card';

const Folded = (): JSX.Element => {
  const isLoaded = useScripts();
  const [verifying, setVerifying] = useState<number>(0);
  const [verified, setVerified] = useState<boolean>(false);

  const fakePubkey = '0x01209328159023859';
  const fakeSize = 128;

  const stats = [
    { count: '042', title: 'Talks attended' },
    { count: '500', title: 'Connections made' },
    { count: '042', title: 'Speakers met' },
  ];

  const handleVerify = () => {
    const interval = setInterval(() => {
      setVerifying((prev) => {
        if (prev === 100) {
          clearInterval(interval);
          setVerified(true);
          return 0;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (!isLoaded) return;
    const stage = new window.createjs.Stage(
      document.getElementById('propic-modal')
    );
    const center_x = stage.canvas.width / 2;
    const center_y = stage.canvas.height / 2;
    createFlower(stage, fakePubkey, center_x, center_y, fakeSize / 4);
  }, [isLoaded]);
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
            height={fakeSize}
            width={fakeSize}
          />
        </div>
        <div className='text-center'>
          <div className='text-primary text-3xl'>User</div>
          <div className='mt-2 text-primary text-2xl'>went to ZK Summit 11</div>
        </div>
        <div className='mt-4'>
          {stats.map((stat, index) => (
            <div
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
          {verified ? (
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
              <a
                className='font-bold text-primary underline'
                href='https://github.com/cursive-team/zk-summit?tab=readme-ov-file#zk-summit-folded'
              >
                View proof in plaintext
              </a>
            </div>
          ) : (
            <div>
              {verifying > 0 ? (
                <div className='text-center'>
                  <div className='mb-2'>Verifying...</div>
                  <div className='relative'>
                    <Card.Progress
                      style={{
                        width: `${verifying}%`,
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
};

Folded.getInitialProps = () => {
  return { showFooter: false, showHeader: false };
};

export default Folded;
