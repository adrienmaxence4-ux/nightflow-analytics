/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the app to build & run even if Supabase env vars are not set yet
  // (demo mode). Connect your keys later — see .env.example.
  env: {
    NEXT_PUBLIC_APP_NAME: "Nightflow Analytics",
  },
};

export default nextConfig;
