import type { MetadataRoute } from "next";
import { catalogo } from "@/lib/tienda/datos";
import { CATEGORIAS } from "@/lib/tienda/formato";
import { SITE_URL } from "@/lib/url-sitio";

// Mapa del sitio para Google: inicio, categorías con productos, fichas y páginas de confianza.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productos = await catalogo();
  const conProductos = new Set(productos.map((p) => p.categoria));
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...CATEGORIAS.filter((c) => conProductos.has(c.slug)).map((c) => ({
      url: `${SITE_URL}/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...productos.map((p) => ({
      url: `${SITE_URL}/producto/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: p.disponibilidad === "agotado" ? 0.4 : 0.8,
      images: p.imagen ? [p.imagen.url.startsWith("http") ? p.imagen.url : `${SITE_URL}${p.imagen.url}`] : undefined,
    })),
    { url: `${SITE_URL}/garantia`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/envios-y-pagos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
