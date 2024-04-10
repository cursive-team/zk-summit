import { ModalProps, Modal } from './Modal';
import { useEffect } from 'react';
import { useScripts } from '@/hooks/useScripts';
import { classed } from '@tw-classed/react';
import { createFlower } from '@/lib/client/flower';

const Label = classed.span('text-iron-600 text-xs font-normal');
const Description = classed.span(
  'text-center text-iron-700 text-sm font-regular'
);

interface ProfilePicModalProps extends ModalProps {
  size?: number;
  pubKey: string;
  name: string;
}

const ProfilePicModal = ({
  isOpen,
  setIsOpen,
  pubKey,
  name,
  size = 320,
}: ProfilePicModalProps) => {
  const isLoaded = useScripts();

  useEffect(() => {
    if (!isLoaded || !isOpen) return;
    const stage = new window.createjs.Stage(
      document.getElementById('propic-modal')
    );
    const center_x = stage.canvas.width / 2;
    const center_y = stage.canvas.height / 2;
    createFlower(stage, pubKey, center_x, center_y, size / 4);
  }, [isLoaded, isOpen, size, pubKey]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      <div className='p-4'></div>
      <div className='flex flex-col gap-10 mt-10'>
        <div className='flex flex-col gap-4'>
          <div className='mx-auto'>
            <div className='flex flex-col gap-4 h-full'>
              <div className='flex flex-col gap-2 bg-white/40 rounded-[8px]'>
                <canvas
                  className='artwork-webgl flex p-0 m-0 rounded-[8px]'
                  id='propic-modal'
                  height={size}
                  width={size}
                ></canvas>
              </div>
              <div className='relative flex flex-col gap-4'>
                <div className={'absolute inset-0 flex flex-col gap-2 w-full'}>
                  <Description>
                    <b>{name}</b>
                    {`'s signature flower`}
                  </Description>
                  <div className='text-center px-5' style={{ lineHeight: 1 }}>
                    <Label>
                      {`Upon tapping ${name}'s card, you received a unique digital signature 
                      as a private, verifiable proof of meeting. This signature is
                      visualized as a generative art flower for your garden.`}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

ProfilePicModal.displayName = 'ProfilePicModal';
export { ProfilePicModal };
