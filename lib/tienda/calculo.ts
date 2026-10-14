import "server-only";
import { clientePublico } from "@/lib/supabase/publico";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { configTienda, type Disponibilidad } from "@/lib/tienda/datos";

// Calcula el carrito con precios y disponibilidad LEÍDOS DE LA BASE en este momento.
// El navegador solo manda qué variantes y cuántas; nunca precios.

export const MAX_POR_LINEA = 3;
export const MAX_LINEAS = 15;
const CATEGORIAS_EQUIPO = new Set(["celulares", "tablets"]);

export type LineaEntrada = { v: string; c: number };

export type LineaCalculada = {
  varianteId: string;
  productoId: string;
  slug: string;
  nombre: string; // "Samsung Galaxy A27 5G 8 GB + 256 GB Negro"
  nombreProducto: string;
  detalle: string | null; // "8 GB + 256 GB · Negro"
  categoria: string;
  imagen: { url: string; alt: string } | null;
  precio: number;
  cantidad: number;
  total: number;
  disponibilidad: Disponibilidad;
};

export type ResumenCarrito = {
  lineas: LineaCalculada[];
  /** Variantes que ya no se pueden comprar (agotadas, ocultas o sin precio) */
  quitadas: string[];
  subtotal: number;
  envio: number;
  envioGratis: "monto" | "accesorio" | null;
  faltaParaEnvioGratis: number | null;
  total: number;
};

type Fila = {
  id: string;
  nombre: string;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
  activo: boolean;
  productos: {
    id: string;
    slug: string;
    nombre: string;
    estado: string;
    categorias: { slug: string } | null;
    imagenes: { url: string; alt: string | null; principal: boolean; orden: number }[];
  } | null;
};

const redondear = (n: number) => Math.round(n * 100) / 100;
const esUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Limpia lo que manda el navegador: ids válidos, sin repetir, cantidades entre 1 y 3. */
export function limpiarLineas(entrada: unknown): LineaEntrada[] {
  if (!Array.isArray(entrada)) return [];
  const vistas = new Map<string, number>();
  for (const l of entrada.slice(0, MAX_LINEAS * 2)) {
    const v = String((l as LineaEntrada)?.v ?? "");
    const c = Math.floor(Number((l as LineaEntrada)?.c));
    if (!esUuid(v) || !(c > 0)) continue;
    vistas.set(v, Math.min(MAX_POR_LINEA, (vistas.get(v) ?? 0) + c));
  }
  return [...vistas].slice(0, MAX_LINEAS).map(([v, c]) => ({ v, c }));
}

export async function calcularCarrito(entrada: unknown): Promise<ResumenCarrito> {
  const lineasEntrada = limpiarLineas(entrada);
  const ids = lineasEntrada.map((l) => l.v);
  const config = await configTienda();
  const vacio: ResumenCarrito = {
    lineas: [],
    quitadas: [],
    subtotal: 0,
    envio: 0,
    envioGratis: null,
    faltaParaEnvioGratis: null,
    total: 0,
  };
  if (!ids.length) return vacio;

  const sb = clientePublico();
  const [{ data, error }, { data: disp, error: e2 }] = await Promise.all([
    sb
      .from("variantes")
      .select(
        "id, nombre, color, ram_gb, almacenamiento_gb, precio, activo, productos(id, slug, nombre, estado, categorias(slug), imagenes(url, alt, principal, orden))"
      )
      .in("id", ids),
    sb.from("disponibilidad_publica").select("variante_id, en_bodega, con_proveedor").in("variante_id", ids),
  ]);
  if (error) throw error;
  if (e2) throw e2;

  const filas = new Map(((data ?? []) as unknown as Fila[]).map((f) => [f.id, f]));
  const dispo = new Map(
    (disp ?? []).map((d) => [
      d.variante_id as string,
      (d.en_bodega ? "bodega" : d.con_proveedor ? "proveedor" : "agotado") as Disponibilidad,
    ])
  );

  const lineas: LineaCalculada[] = [];
  const quitadas: string[] = [];
  for (const { v, c } of lineasEntrada) {
    const f = filas.get(v);
    const p = f?.productos;
    const disponibilidad = p?.estado === "agotado" ? "agotado" : (dispo.get(v) ?? "agotado");
    if (!f || !p || !f.activo || Number(f.precio) <= 0 || p.estado === "oculto" || disponibilidad === "agotado") {
      quitadas.push(v);
      continue;
    }
    const memoria =
      f.almacenamiento_gb == null
        ? null
        : f.ram_gb == null
          ? formatoAlmacenamiento(f.almacenamiento_gb)
          : `${f.ram_gb} GB + ${formatoAlmacenamiento(f.almacenamiento_gb)}`;
    const imagen = [...p.imagenes].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)[0];
    const precio = Number(f.precio);
    lineas.push({
      varianteId: f.id,
      productoId: p.id,
      slug: p.slug,
      nombre: [p.nombre, memoria, f.color].filter(Boolean).join(" "),
      nombreProducto: p.nombre,
      detalle: [memoria, f.color].filter(Boolean).join(" · ") || null,
      categoria: p.categorias?.slug ?? "otros",
      imagen: imagen ? { url: imagen.url, alt: imagen.alt || p.nombre } : null,
      precio,
      cantidad: c,
      total: redondear(precio * c),
      disponibilidad,
    });
  }

  const subtotal = redondear(lineas.reduce((s, l) => s + l.total, 0));
  const hayEquipo = lineas.some((l) => CATEGORIAS_EQUIPO.has(l.categoria));
  const hayAccesorio = lineas.some((l) => !CATEGORIAS_EQUIPO.has(l.categoria));
  const { costo, gratis_desde, gratis_con_accesorio } = config.envio;
  const envioGratis: ResumenCarrito["envioGratis"] =
    !lineas.length
      ? null
      : gratis_desde !== null && subtotal >= gratis_desde
        ? "monto"
        : gratis_con_accesorio && hayEquipo && hayAccesorio
          ? "accesorio"
          : null;
  const envio = !lineas.length || envioGratis ? 0 : Number(costo) || 0;

  return {
    lineas,
    quitadas,
    subtotal,
    envio,
    envioGratis,
    faltaParaEnvioGratis: gratis_desde !== null && !envioGratis && lineas.length ? redondear(gratis_desde - subtotal) : null,
    total: redondear(subtotal + envio),
  };
}
