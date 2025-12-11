import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Server Actions from dev tunnels
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "d147w5t9-3000.inc1.devtunnels.ms"],
    },
  },
};

export default nextConfig;
