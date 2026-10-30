/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served under papagedon.com/meta (and /meta on localhost in dev).
  basePath: '/meta',
  webpack: (config) => {
    // Import .glsl shader sources as strings (M6 shader pack).
    config.module.rules.push({ test: /\.glsl$/, type: 'asset/source' });
    return config;
  },
};

export default nextConfig;
