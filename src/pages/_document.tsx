import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Script id="matomo-tracking" strategy="afterInteractive">
        {`
          var _paq = window._paq = window._paq || [];
          /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
          _paq.push(['trackPageView']);
          _paq.push(['enableLinkTracking']);
          (function() {
            var u="/api/proxy/"; 
            _paq.push(['setTrackerUrl', 'https://psedev.matomo.cloud/matomo.php']);
            _paq.push(['setSiteId', '12']);
            var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
            g.async = true; g.src = u + 'matomo.js'; 
            s.parentNode.insertBefore(g, s);
          })();
        `}
      </Script>
      <title>ZK Summit 11</title>
      <Head>
        <meta
          name="description"
          content="Tap NFC cards at ZK Summit 11 to verifiably digitize your in-person experience."
          key="desc"
        />
        <meta property="og:title" content="ZK Summit 11" />
        <meta
          property="og:description"
          content="Tap NFC cards at ZK Summit 11 to verifiably digitize your in-person experience."
        />
        <meta property="og:image" content="/cursive.jpg" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
