/** @type {import('next').NextConfig} */
const nextConfig = {
     // 👇 tells Next.js to build a fully static site in /out
// ✅ build fully static site

  // 👇 only if you’re using <Image>; skip if you don’t
  images: { unoptimized: true },

  webpack: (config) => {

    // Prevent Next from trying to use node-only modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      stream: false,
    };

    // Allow .wasm files (for pdfjs)
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },

  };

  
  export default nextConfig;
  