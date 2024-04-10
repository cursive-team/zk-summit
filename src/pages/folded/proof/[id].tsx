import { Icons } from '@/components/Icons';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GetFoldingProofResponse } from '@/pages/api/folding/proof';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/Button';

const ProofDownload = (): JSX.Element => {
  const { id } = useParams();
  const [fetchingProof, setFetchingProof] = useState<boolean>(true);
  const [foldingResponse, setFoldingResponse] =
    useState<GetFoldingProofResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/folding/proof?proofUuid=${id}`);
        const data = await response.json();
        setFoldingResponse(data);
      } catch (err) {
        console.log('Error: ', err);
      } finally {
        setFetchingProof(false);
      }
    })();
  }, [id]);

  if (!fetchingProof) {
    return (
      <div className='flex flex-col h-screen items-center overflow-hidden'>
        <div className='px-4 my-4'>
          <Icons.Cursive color='#4015EC' />
        </div>
        <div className='flex flex-grow items-center'>
          <Spinner label='Fetching proof data...' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center min-h-screen'>
      <div className='px-4 my-4'>
        <Icons.Cursive color='#4015EC' />
      </div>
      <div className='flex flex-col flex-grow gap-2 items-center justify-center px-4'>
        {foldingResponse?.attendeeProofUrl && (
          <Button
            onClick={() =>
              window.open(foldingResponse.attendeeProofUrl, '_blank')
            }
          >
            Download attendee proof (must GZIP inflate)
          </Button>
        )}
        {foldingResponse?.speakerProofUrl && (
          <Button
            onClick={() =>
              window.open(foldingResponse.speakerProofUrl, '_blank')
            }
          >
            Download speaker proof (must GZIP inflate)
          </Button>
        )}
        {foldingResponse?.talkProofUrl && (
          <Button
            onClick={() => window.open(foldingResponse.talkProofUrl, '_blank')}
          >
            Download talk proof (must GZIP inflate)
          </Button>
        )}
      </div>
    </div>
  );
};

ProofDownload.getInitialProps = () => {
  return { showFooter: false, showHeader: false };
};

export default ProofDownload;
