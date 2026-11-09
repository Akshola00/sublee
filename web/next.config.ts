import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // dcap-qvl loads its .wasm from its own directory at runtime; bundling breaks that path.
  serverExternalPackages: ['@phala/dcap-qvl-node'],
};

export default nextConfig;
