import type { NextConfig } from "next";

// Fotos subidas desde el panel (Supabase Storage). Se acepta el host configurado
// y cualquier proyecto *.supabase.co.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabase && !supabase.hostname.endsWith(".supabase.co")
        ? [
            {
              protocol: supabase.protocol.replace(":", "") as "http" | "https",
              hostname: supabase.hostname,
              port: supabase.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    // En local, Supabase corre en localhost: Next no optimiza imágenes de IPs privadas sin esto
    dangerouslyAllowLocalIP: supabase?.hostname === "localhost",
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Las fotos del panel llegan ya achicadas (~100-300 KB); 4 MB deja margen sin pasar el límite de Vercel
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
