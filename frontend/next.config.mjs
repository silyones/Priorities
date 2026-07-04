/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:3001";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // fallback (not afterFiles) so App Router route handlers under
    // app/api/issues/... win first and can attach X-MP-API-Key server-side.
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
