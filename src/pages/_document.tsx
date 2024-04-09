import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
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
