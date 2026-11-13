import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No Next.js dev badge on screen (it shows up in demo recordings).
  devIndicators: false,
  // dcap-qvl loads its .wasm from its own directory at runtime; bundling breaks that path.
  serverExternalPackages: ['@phala/dcap-qvl-node'],
};

export default nextConfig;
