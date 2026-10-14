// Datos de la tienda pública. Todo queda en caché (rápido, ideal para SEO) y se refresca
// en cuanto el panel cambia algo: las acciones del panel llaman updateTag("catalogo").
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";

export const ETIQUETA_CATALOGO = "catalogo";

export type Disponibilidad = "bodega" | "proveedor" | "agotado";

export type VarianteTienda = {
  id: string;
  nombre: string;
  memoria: string | null; // "6 GB + 128 GB"
  ramGb: number | null;
  almacenamientoGb: number | null;
  color: string | null;
  precio: number;
  disponibilidad: Disponibilidad;
};

export type ImagenTienda = { url: string; alt: string };

export type ProductoResumen = {
  id: string;
  slug: string;
  nombre: string;
  marca: string | null;
  resumen: string | null;
  categoria: string; // slug
  categoriaNombre: string;
  imagen: ImagenTienda | null;
  precioDesde: number;
  precioHasta: number;
  memorias: string[];
  ramMax: number | null;
  almacenamientos: number[];
  es5g: boolean;
  disponibilidad: Disponibilidad;
  colecciones: string[];
  orden: number;
  publicadoEn: string | null;
  /** Variante que se agrega con un toque desde "Completá tu equipo" (la disponible más barata, en negro si hay) */
  varianteDestacada: string | null;
};

export type ProductoDetalle = ProductoResumen & {
  descripcion: string | null;
  caracteristicas: Record<string, string>;
  incluye: string | null;
  garantia: string | null;
  faq: { pregunta: string; respuesta: string }[];
  imagenes: ImagenTienda[];
  variantes: VarianteTienda[];
  metaTitulo: string | null;
  metaDescripcion: string | null;
  actualizado: string;
};

export type Garantia = {
  plazo_meses: number;
  resumen: string;
  cambio_inmediato_dias?: number;
  cubre: string[];
  no_cubre: string[];
  como_reclamar: string[];
  nota?: string;
};

export type ConfigTienda = {
  whatsapp: string;
  envio: { costo: number; gratis_desde: number | null; gratis_con_accesorio: boolean };
  municipiosContraEntrega: string[];
  tasaCero: { meses: number; banco: string };
  negocio: { nombre: string; nit: string; direccion: string; correo: string };
  garantia: Garantia | null;
};

const ORDEN_DISP: Record<Disponibilidad, number> = { bodega: 0, proveedor: 1, agotado: 2 };
const mejor = (a: Disponibilidad, b: Disponibilidad) => (ORDEN_DISP[a] <= ORDEN_DISP[b] ? a : b);

function etiquetaMemoria(ram: number | null, alm: number | null) {
  if (alm === null) return null;
  return ram === null ? formatoAlmacenamiento(alm) : `${ram} GB + ${formatoAlmacenamiento(alm)}`;
}

type FilaProducto = {
  id: string;
  slug: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  resumen: string | null;
  descripcion: string | null;
  caracteristicas: Record<string, string> | null;
  incluye: string | null;
  garantia: string | null;
  faq: { pregunta: string; respuesta: string }[] | null;
  estado: string;
  orden: number;
  meta_titulo: string | null;
  meta_descripcion: string | null;
  publicado_en: string | null;
  updated_at: string;
  categorias: { slug: string; nombre: string } | null;
  imagenes: { url: string; alt: string | null; orden: number; principal: boolean }[];
  variantes: {
    id: string;
    nombre: string;
    color: string | null;
    ram_gb: number | null;
    almacenamiento_gb: number | null;
    precio: number;
    activo: boolean;
  }[];
  coleccion_producto: { colecciones: { slug: string } | null }[];
};

const SELECT_PRODUCTO = `id, slug, nombre, marca, modelo, resumen, descripcion, caracteristicas, incluye, garantia, faq,
  estado, orden, meta_titulo, meta_descripcion, publicado_en, updated_at,
  categorias(slug, nombre),
  imagenes(url, alt, orden, principal),
  variantes(id, nombre, color, ram_gb, almacenamiento_gb, precio, activo),
  coleccion_producto(colecciones(slug))`;

/**
 * Lee el catálogo. Si la base no responde (o falta una migración), devuelve una lista vacía
 * en vez de romper el sitio, y ese resultado vacío solo se guarda unos minutos.
 */
async function leerCatalogo(): Promise<{ ok: boolean; lista: ProductoDetalle[] }> {
  try {
    return { ok: true, lista: await leerCatalogoODaError() };
  } catch (e) {
    console.error("No se pudo leer el catálogo:", e);
    return { ok: false, lista: [] };
  }
}

const vida = (ok: boolean) => (ok ? cacheLife("hours") : cacheLife("minutes"));

async function leerCatalogoODaError(): Promise<ProductoDetalle[]> {
  const sb = clientePublico();
  const [{ data: productos, error }, { data: disp, error: e2 }] = await Promise.all([
    sb.from("productos").select(SELECT_PRODUCTO).neq("estado", "oculto").limit(1000),
    sb.from("disponibilidad_publica").select("variante_id, en_bodega, con_proveedor").limit(5000),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const dispPorVariante = new Map(
    (disp ?? []).map((d) => [
      d.variante_id as string,
      (d.en_bodega ? "bodega" : d.con_proveedor ? "proveedor" : "agotado") as Disponibilidad,
    ])
  );

  const lista: ProductoDetalle[] = [];
  for (const p of (productos ?? []) as unknown as FilaProducto[]) {
    const variantes: VarianteTienda[] = p.variantes
      .filter((v) => v.activo && Number(v.precio) > 0)
      .map((v) => ({
        id: v.id,
        nombre: v.nombre,
        memoria: etiquetaMemoria(v.ram_gb, v.almacenamiento_gb),
        ramGb: v.ram_gb,
        almacenamientoGb: v.almacenamiento_gb,
        color: v.color,
        precio: Number(v.precio),
        disponibilidad: p.estado === "agotado" ? "agotado" : (dispPorVariante.get(v.id) ?? "agotado"),
      }))
      .sort(
        (a, b) =>
          (a.almacenamientoGb ?? 0) - (b.almacenamientoGb ?? 0) ||
          (a.ramGb ?? 0) - (b.ramGb ?? 0) ||
          (a.color ?? "").localeCompare(b.color ?? "")
      );
    // Sin precio de venta no se muestra en la tienda
    if (variantes.length === 0) continue;

    const imagenes = [...p.imagenes]
      .sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)
      .map((i) => ({ url: i.url, alt: i.alt || p.nombre }));
    const precios = variantes.map((v) => v.precio);
    const disponibles = variantes.filter((v) => v.disponibilidad !== "agotado");
    const base = disponibles.length ? disponibles : variantes;
    const almacenamientos = [...new Set(variantes.map((v) => v.almacenamientoGb).filter((n): n is number => n !== null))];
    const rams = variantes.map((v) => v.ramGb).filter((n): n is number => n !== null);
    const red = String(p.caracteristicas?.red ?? "");
    const minimo = Math.min(...base.map((v) => v.precio));
    const baratas = base.filter((v) => v.precio === minimo && v.disponibilidad !== "agotado");
    const destacada = baratas.find((v) => /negro|black/i.test(v.color ?? "")) ?? baratas[0] ?? null;

    lista.push({
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      marca: p.marca,
      resumen: p.resumen,
      categoria: p.categorias?.slug ?? "otros",
      categoriaNombre: p.categorias?.nombre ?? "Otros",
      imagen: imagenes[0] ?? null,
      precioDesde: Math.min(...base.map((v) => v.precio)),
      precioHasta: Math.max(...precios),
      memorias: [...new Set(variantes.map((v) => v.memoria).filter((m): m is string => Boolean(m)))],
      ramMax: rams.length ? Math.max(...rams) : null,
      almacenamientos,
      es5g: /5g/i.test(red) || /5g/i.test(p.nombre),
      disponibilidad: variantes.map((v) => v.disponibilidad).reduce(mejor),
      colecciones: p.coleccion_producto.map((c) => c.colecciones?.slug).filter((s): s is string => Boolean(s)),
      orden: p.orden,
      publicadoEn: p.publicado_en,
      varianteDestacada: destacada?.id ?? null,
      descripcion: p.descripcion,
      caracteristicas: p.caracteristicas ?? {},
      incluye: p.incluye,
      garantia: p.garantia,
      faq: p.faq ?? [],
      imagenes,
      variantes,
      metaTitulo: p.meta_titulo,
      metaDescripcion: p.meta_descripcion,
      actualizado: p.updated_at,
    });
  }
  return lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

const aResumen = (p: ProductoDetalle): ProductoResumen => ({
  id: p.id,
  slug: p.slug,
  nombre: p.nombre,
  marca: p.marca,
  resumen: p.resumen,
  categoria: p.categoria,
  categoriaNombre: p.categoriaNombre,
  imagen: p.imagen,
  precioDesde: p.precioDesde,
  precioHasta: p.precioHasta,
  memorias: p.memorias,
  ramMax: p.ramMax,
  almacenamientos: p.almacenamientos,
  es5g: p.es5g,
  disponibilidad: p.disponibilidad,
  colecciones: p.colecciones,
  orden: p.orden,
  publicadoEn: p.publicadoEn,
  varianteDestacada: p.varianteDestacada,
});

export async function catalogo(): Promise<ProductoResumen[]> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const { ok, lista } = await leerCatalogo();
  vida(ok);
  return lista.map(aResumen);
}

export async function productoPorSlug(slug: string): Promise<ProductoDetalle | null> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const { ok, lista } = await leerCatalogo();
  vida(ok);
  return lista.find((p) => p.slug === slug) ?? null;
}

export async function productosPorSlugs(slugs: string[]): Promise<ProductoDetalle[]> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const { ok, lista: todos } = await leerCatalogo();
  vida(ok);
  return slugs.map((s) => todos.find((p) => p.slug === s)).filter((p): p is ProductoDetalle => Boolean(p));
}

export async function configTienda(): Promise<ConfigTienda> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const { data, error } = await clientePublico()
    .from("configuracion_publica")
    .select("clave, valor")
    .then(
      (r) => r,
      (e: unknown) => ({ data: null, error: e })
    );
  if (error) console.error("No se pudo leer la configuración:", error);
  vida(!error);
  const c = new Map((data ?? []).map((r) => [r.clave as string, r.valor]));
  const garantia = c.get("garantia_texto") as Garantia | { texto: string } | undefined;
  return {
    whatsapp: (c.get("whatsapp")?.numero as string) || process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "",
    envio: c.get("envio") ?? { costo: 5, gratis_desde: null, gratis_con_accesorio: false },
    municipiosContraEntrega: c.get("municipios_contra_entrega") ?? ["San Salvador"],
    tasaCero: c.get("tasa_cero") ?? { meses: 12, banco: "" },
    negocio: c.get("negocio") ?? { nombre: "Nera Tech", nit: "", direccion: "", correo: "" },
    garantia: garantia && "plazo_meses" in garantia ? garantia : null,
  };
}
