import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack's persistent disk cache (default-on since 16.1) corrupts
    // itself on this machine — writes duplicate hostname-suffixed cache
    // files it then fails to parse back ("invalid digit found in string").
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
