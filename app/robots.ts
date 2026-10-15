import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/url-sitio";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/buscar", "/comparar", "/carrito", "/checkout", "/pedido/", "/mis-pedidos", "/mi-cuenta", "/cuenta/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
