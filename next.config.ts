import type { NextConfig } from "next";

// Fotos subidas desde el panel (Supabase Storage). Se acepta el host configurado
// y cualquier proyecto *.supabase.co.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

// Dominio propio: quien entra por la dirección vieja (nera-tech-store.vercel.app) pasa a
// www.neratechsv.com con la misma página. /api no se redirige (webhooks de Wompi y cron).
const sitio = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
const DIRECCION_VIEJA = "nera-tech-store.vercel.app";

const nextConfig: NextConfig = {
  async redirects() {
    if (!sitio || sitio.hostname === DIRECCION_VIEJA || sitio.hostname === "localhost") return [];
    return [
      {
        source: "/:ruta((?!api/).*)",
        has: [{ type: "host", value: DIRECCION_VIEJA }],
        destination: `${sitio.origin}/:ruta`,
        permanent: true,
      },
    ];
  },
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
