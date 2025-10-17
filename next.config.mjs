/** @type {import('next').NextConfig} */
const nextConfig = {
     // 👇 tells Next.js to build a fully static site in /out
// ✅ build fully static site

  // 👇 only if you’re using <Image>; skip if you don’t
  images: { unoptimized: true },

  };
  
  export default nextConfig;
  