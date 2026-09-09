/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Next.js application lives in app/ (App Router) at the repository root.
  // Server-rendered pages query PostgreSQL directly through lib/db.ts.
  experimental: {
    // Keep typed routes opt-in; not used yet.
    typedRoutes: false,
  },
  poweredByHeader: false,
};

export default nextConfig;