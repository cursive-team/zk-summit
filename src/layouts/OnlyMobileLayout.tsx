'use client';

import MobileDetect from 'mobile-detect';
import React, { useEffect, useMemo, useRef } from 'react';
import { APP_CONFIG } from '@/shared/constants';
import { FullPageBanner } from '@/components/FullPageBanner';
import { useRouter } from 'next/router';
import path from 'path';

interface OnlyMobileProps {
  children?: React.ReactNode;
}

export default function OnlyMobileLayout({ children }: OnlyMobileProps) {
  const md = useRef<any>();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      md.current = new MobileDetect(window?.navigator?.userAgent);
      if (!window.location.pathname.includes("/qr")) {
        setIsMobile(md.current?.mobile() !== null);
      } else {
        setIsMobile(true);
      }
      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) return null;
  return (
    <>
      {!isMobile ? (
        <FullPageBanner
          description={`${APP_CONFIG.APP_NAME} is only available on mobile devices. Please visit the website on your phone in order to take part in the experience.`}
        />
      ) : (
        children
      )}
    </>
  );
}
