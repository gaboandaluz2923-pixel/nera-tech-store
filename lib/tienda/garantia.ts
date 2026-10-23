// Plazo de garantía según el tipo de producto (pedido de Gabriel, 23 oct 2026):
// celulares y equipos (tablets, TV, consolas, energía) 12 meses; accesorios (audífonos, cargadores, cases, bocinas,
// relojes, cámaras y lo demás) 6 meses. Los dos números se editan en Panel → Configuración → Garantía
// ("plazo_meses" = celulares y equipos, "plazo_meses_accesorios" = accesorios). La base de datos usa la misma regla en
// public.garantia_meses() (migración 0019): si cambiás las categorías de celular aquí, cambialas allá también.
import type { Garantia } from "@/lib/tienda/datos";

/** Categorías con la garantía larga (celulares y equipos). Open Box también: ahí solo hay celulares abiertos. */
export const CATEGORIAS_CELULAR = ["celulares", "celulares-basicos", "open-box", "tablets", "televisores", "consolas", "energia"];

export const MESES_CELULAR = 12;
export const MESES_ACCESORIO = 6;

export const esCategoriaCelular = (slug: string | null | undefined) => CATEGORIAS_CELULAR.includes(slug ?? "");

export function mesesCelular(g: Garantia | null | undefined): number {
  return g?.plazo_meses ?? MESES_CELULAR;
}

export function mesesAccesorio(g: Garantia | null | undefined): number {
  return g?.plazo_meses_accesorios ?? MESES_ACCESORIO;
}

/** Meses de garantía de un producto según su categoría */
export function mesesGarantia(g: Garantia | null | undefined, categoriaSlug: string | null | undefined): number {
  return esCategoriaCelular(categoriaSlug) ? mesesCelular(g) : mesesAccesorio(g);
}

/** "12 meses en celulares y equipos, 6 en accesorios" */
export function textoPlazos(g: Garantia | null | undefined): string {
  return `${mesesCelular(g)} meses en celulares y equipos, ${mesesAccesorio(g)} en accesorios`;
}
