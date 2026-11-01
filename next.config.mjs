/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served under the /meta base path (consistent locally and in production).
  basePath: '/meta',
  webpack: (config) => {
    // Import .glsl shader sources as strings (M6 shader pack).
    config.module.rules.push({ test: /\.glsl$/, type: 'asset/source' });
    return config;
  },
};

export default nextConfig;
