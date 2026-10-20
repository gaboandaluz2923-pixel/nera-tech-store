import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claveSinMarcaRepetida, conNombre, interpretar, sinAcentos, slugDe, formatoAlmacenamiento } from "@/lib/listas/normalizar";


/** Trae todas las filas de una consulta, de 1000 en 1000 (límite de Supabase por consulta). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- filas de Supabase sin tipos generados
export async function todo<T = Record<string, any>>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw error;
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return filas;
  }
}

/** Código con que se recuerda una línea: el SKU del proveedor o, si no trae, su descripción normalizada. */
export function skuClave(sku: string | null, descripcion: string) {
  if (sku && sku.trim()) return `sku:${sku.trim()}`;
  return (
    "desc:" +
    sinAcentos(descripcion.toLowerCase())
      .replace(/new!+/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export type LineaPendiente = {
  id: string;
  lista_id: string;
  proveedor_id: string;
  proveedor: string;
  descripcion: string;
  sku_clave: string;
  precio: number;
  stock: number | null;
  precio_sugerido: number | null;
  clave: string;
  categoria_slug: string;
};

/**
 * Listas vigentes: por proveedor, todas las de su fecha más reciente.
 * (Un proveedor puede mandar su lista en varias partes el mismo día: Idecom manda 3.)
 * Devuelve id de lista → id de proveedor.
 */
export async function ultimasListas(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("listas_precios")
    .select("id, proveedor_id, fecha")
    .order("fecha", { ascending: false });
  if (error) throw error;
  const fechaVigente = new Map<string, string>();
  const vigentes = new Map<string, string>();
  for (const l of data ?? []) {
    if (!fechaVigente.has(l.proveedor_id)) fechaVigente.set(l.proveedor_id, l.fecha);
    if (fechaVigente.get(l.proveedor_id) === l.fecha) vigentes.set(l.id, l.proveedor_id);
  }
  return vigentes;
}

/** Líneas de las últimas listas que todavía no están vinculadas a una variante ni ignoradas. */
export async function lineasPendientes(supabase: SupabaseClient): Promise<LineaPendiente[]> {
  const ultimas = await ultimasListas(supabase);
  if (ultimas.size === 0) return [];
  const [lineas, vinculos, ignorados, proveedores] = await Promise.all([
    todo((a, b) =>
      supabase
        .from("lineas_lista")
        .select("id, lista_id, descripcion, sku_clave, precio, stock, precio_sugerido, clave, categoria_slug")
        .in("lista_id", [...ultimas.keys()])
        .order("id")
        .range(a, b)
    ),
    todo((a, b) => supabase.from("producto_proveedor").select("proveedor_id, sku_proveedor").order("id").range(a, b)),
    todo((a, b) =>
      supabase.from("skus_ignorados").select("proveedor_id, sku_proveedor").order("sku_proveedor").range(a, b)
    ),
    todo((a, b) => supabase.from("proveedores").select("id, nombre").range(a, b)),
  ]);

  const listaAProveedor = ultimas;
  const nombres = new Map(proveedores.map((p) => [p.id, p.nombre as string]));
  const resueltos = new Set(
    [...vinculos, ...ignorados].map((v) => `${v.proveedor_id}::${v.sku_proveedor}`)
  );

  return lineas
    .map((l) => {
      const proveedor_id = listaAProveedor.get(l.lista_id)!;
      return { ...l, proveedor_id, proveedor: nombres.get(proveedor_id) ?? "" } as LineaPendiente;
    })
    .filter((l) => !resueltos.has(`${l.proveedor_id}::${l.sku_clave}`));
}

/**
 * Vincula líneas de lista a variantes (crea o actualiza producto_proveedor).
 * El precio anterior se conserva para mostrar cambios en la pantalla de Precios.
 */
export async function vincular(
  supabase: SupabaseClient,
  items: {
    varianteId: string;
    proveedorId: string;
    listaId: string;
    skuClave: string;
    precio: number;
    stock: number | null;
    precioSugerido: number | null;
    fecha: string;
  }[]
) {
  if (items.length === 0) return;
  const existentes = await todo((a, b) =>
    supabase
      .from("producto_proveedor")
      .select("proveedor_id, sku_proveedor, ultimo_precio")
      .in("proveedor_id", [...new Set(items.map((i) => i.proveedorId))])
      .order("id")
      .range(a, b)
  );
  const anterior = new Map(
    existentes.map((e) => [`${e.proveedor_id}::${e.sku_proveedor}`, e.ultimo_precio as number | null])
  );
  // Un mismo código no puede ir dos veces en el mismo upsert
  const unicos = new Map(items.map((i) => [`${i.proveedorId}::${i.skuClave}`, i]));
  const filas = [...unicos.values()].map((i) => {
    const prev = anterior.get(`${i.proveedorId}::${i.skuClave}`);
    return {
      variante_id: i.varianteId,
      proveedor_id: i.proveedorId,
      sku_proveedor: i.skuClave,
      precio_anterior: prev !== undefined && prev !== null && Number(prev) !== i.precio ? prev : null,
      ultimo_precio: i.precio,
      ultimo_stock: i.stock,
      ultima_fecha: i.fecha,
      precio_sugerido: i.precioSugerido,
      lista_id: i.listaId,
      activo: true,
    };
  });
  for (let i = 0; i < filas.length; i += 500) {
    const { error: e } = await supabase
      .from("producto_proveedor")
      .upsert(filas.slice(i, i + 500), { onConflict: "proveedor_id,sku_proveedor" });
    if (e) throw e;
  }
}

/** Crea (si no existen) los productos y variantes que describen las líneas, y devuelve la variante de cada línea. */
export async function crearDesdeLineas(supabase: SupabaseClient, descripciones: string[], nombres?: (string | null)[]) {
  const interps = descripciones.map((d, n) => conNombre(interpretar(d), nombres?.[n]));
  const [cats, prods, vars] = await Promise.all([
    todo((a, b) => supabase.from("categorias").select("id, slug").range(a, b)),
    todo((a, b) => supabase.from("productos").select("id, clave, slug").order("id").range(a, b)),
    todo((a, b) => supabase.from("variantes").select("id, clave").order("id").range(a, b)),
  ]);
  const catPorSlug = new Map(cats.map((c) => [c.slug, c.id]));
  // Los productos viejos de marcas desconocidas tienen la marca repetida en la clave: se buscan también así
  const prodPorClave = new Map<string, string>();
  for (const p of prods) {
    prodPorClave.set(claveSinMarcaRepetida(p.clave), p.id as string);
    prodPorClave.set(p.clave, p.id as string);
  }
  const slugsUsados = new Set(prods.map((p) => p.slug as string));
  const varPorClave = new Map<string, string>();
  for (const v of vars) {
    varPorClave.set(claveSinMarcaRepetida(v.clave), v.id as string);
    varPorClave.set(v.clave, v.id as string);
  }

  // 1) Productos nuevos
  const nuevosProd = new Map<string, Record<string, unknown>>();
  for (const i of interps) {
    if (prodPorClave.has(i.claveProducto) || nuevosProd.has(i.claveProducto)) continue;
    let slug = slugDe(i.nombreProducto);
    for (let n = 2; slugsUsados.has(slug); n++) slug = `${slugDe(i.nombreProducto)}-${n}`;
    slugsUsados.add(slug);
    nuevosProd.set(i.claveProducto, {
      clave: i.claveProducto,
      slug,
      nombre: i.nombreProducto,
      marca: i.marca,
      modelo: i.modelo,
      categoria_id: catPorSlug.get(i.categoria) ?? catPorSlug.get("otros") ?? null,
      estado: "oculto",
    });
  }
  if (nuevosProd.size) {
    const { data, error } = await supabase
      .from("productos")
      .insert([...nuevosProd.values()])
      .select("id, clave");
    if (error) throw error;
    for (const p of data ?? []) prodPorClave.set(p.clave, p.id);
  }

  // 2) Variantes nuevas
  const nuevasVar = new Map<string, Record<string, unknown>>();
  for (const i of interps) {
    if (varPorClave.has(i.claveVariante) || nuevasVar.has(i.claveVariante)) continue;
    nuevasVar.set(i.claveVariante, {
      producto_id: prodPorClave.get(i.claveProducto),
      clave: i.claveVariante,
      nombre: i.nombreVariante,
      memoria:
        i.almacenamientoGb === null
          ? null
          : i.ramGb === null
            ? formatoAlmacenamiento(i.almacenamientoGb)
            : `${i.ramGb}+${formatoAlmacenamiento(i.almacenamientoGb).replace(" ", "")}`,
      color: i.color,
      ram_gb: i.ramGb,
      almacenamiento_gb: i.almacenamientoGb,
      stock: 0,
      precio: 0,
    });
  }
  if (nuevasVar.size) {
    const { data, error } = await supabase
      .from("variantes")
      .insert([...nuevasVar.values()])
      .select("id, clave");
    if (error) throw error;
    for (const v of data ?? []) varPorClave.set(v.clave, v.id);
  }

  return interps.map((i) => varPorClave.get(i.claveVariante)!);
}
