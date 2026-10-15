// Dirección pública del sitio para SEO (canónicas, sitemap, robots, datos estructurados).
// 1) NEXT_PUBLIC_SITE_URL si está en Vercel (ej. https://neratechsv.com);
// 2) si no, el dominio de producción que Vercel asigna (cambia solo al conectar el dominio propio);
// 3) en la computadora, localhost.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
