import webpack from 'webpack';
import withWorkers from '@zeit/next-workers';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Needed to make snarkJs work client side
    config.resolve.fallback = { fs: false, readline: false };
    // https://github.com/dmpierre/zkconnect4/blob/main/apps/web/next.config.js#L9-L11
    config.plugins.push(
      new webpack.ContextReplacementPlugin(/web-worker/)
    );
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  headers: async () => {
    // needed to allow calls by wasm to remote resources
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          }
        ]
      }
    ]
  }
};

export default withWorkers(nextConfig);
