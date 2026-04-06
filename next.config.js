/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para serverless functions na raiz
  experimental: {
    // Habilita serverless functions em /api/
    serverComponentsExternalPackages: []
  }
};

module.exports = nextConfig;
