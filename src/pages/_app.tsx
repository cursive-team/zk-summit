import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { FullPageBanner } from '@/components/FullPageBanner';
import { TransitionWrapper } from '@/components/Transition';
import useSettings from '@/hooks/useSettings';
import OnlyMobileLayout from '@/layouts/OnlyMobileLayout';
import { DM_Sans } from 'next/font/google';
import '@/styles/globals.css';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { StateMachineProvider } from "little-state-machine";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => toast.error(`Something went wrong: ${error.message}`),
  }),
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

export default function App({ Component, pageProps }: AppProps) {
  const { isIncognito } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);

  const [isMaintenance, setIsMaintenance] = useState(false);
  const showFooter = pageProps?.showFooter ?? true;
  const showHeader = pageProps?.showHeader ?? true;
  const fullPage = pageProps?.fullPage ?? false;

  useEffect(() => {
    setPageHeight(window?.innerHeight);
  }, []);

  useEffect(() => {
    var _mtm = (window._mtm = window._mtm || []);
    _mtm.push({ "mtm.startTime": new Date().getTime(), event: "mtm.Start" });
    var d = document,
      g = d.createElement("script"),
      s = d.getElementsByTagName("script")[0];
    g.async = true;
    g.src = "/api/proxy/container_8YPThdSd.js";
    s.parentNode?.insertBefore(g, s);
  }, []);

  const footerVisible = showFooter && !fullPage;

  if (isMaintenance) {
    return (
      <FullPageBanner
        iconSize={40}
        title='Maintenance Mode'
        description='We are repairing things behind the scenes, be back soon!'
      />
    );
  }

  if (isIncognito) {
    return (
      <FullPageBanner description="You're in an incognito tab. Please copy this link into a non-incognito tab in order to take part in the experience!" />
    );
  }

  return (
    <StateMachineProvider>
      <QueryClientProvider client={queryClient}>
        <OnlyMobileLayout>
          <main
            className={`flex flex-col ${dmSans.variable} font-sans`}
            style={{
              height: `${pageHeight}px`,
            }}
          >
            <div className='flex flex-col grow'>
              {showHeader && !fullPage && (
                <AppHeader
                  isMenuOpen={isMenuOpen}
                  setIsMenuOpen={setIsMenuOpen}
                />
              )}
              <div
                className={`flex flex-col grow px-4 xs:px-4 ${
                  footerVisible ? 'mb-20' : ''
                }`}
              >
                <Component {...pageProps} />
                <Analytics />
              </div>
              <TransitionWrapper.Fade show={!isMenuOpen}>
                <>{footerVisible && <AppFooter />}</>
              </TransitionWrapper.Fade>
            </div>
          </main>
        </OnlyMobileLayout>
        <Toaster
          position='top-center'
          toastOptions={{
            duration: 5000,
            className: 'font-sans text-iron-950',
          }}
        />
      </QueryClientProvider>
    </StateMachineProvider>
  );
}
