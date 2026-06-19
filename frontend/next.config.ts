import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['reactflow', '@xyflow/react'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
