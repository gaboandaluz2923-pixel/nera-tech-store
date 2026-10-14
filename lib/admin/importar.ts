import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { crearDesdeLineas, skuClave, todo, vincular } from "@/lib/admin/catalogo";
import { interpretar } from "@/lib/listas/normalizar";

export const esquemaImportacion = z.object({
  proveedorId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nombreArchivo: z.string().max(200).nullable(),
  mapeo: z.record(z.string(), z.unknown()),
  lineas: z
    .array(
      z.object({
        descripcion: z.string().min(1).max(300),
        precio: z.number().positive(),
        stock: z.number().int().nullable(),
        sku: z.string().max(80).nullable(),
        precioSugerido: z.number().nullable(),
      })
    )
    .min(1)
    .max(5000),
});
export type Importacion = z.infer<typeof esquemaImportacion>;

export async function importarListaEn(supabase: SupabaseClient, p: Importacion) {
  const { data: lista, error: e1 } = await supabase
    .from("listas_precios")
    .insert({
      proveedor_id: p.proveedorId,
      fecha: p.fecha,
      nombre_archivo: p.nombreArchivo,
      mapeo_columnas: p.mapeo,
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const [vinculos, ignorados] = await Promise.all([
    todo((a, b) =>
      supabase
        .from("producto_proveedor")
        .select("sku_proveedor, variante_id")
        .eq("proveedor_id", p.proveedorId)
        .order("id")
        .range(a, b)
    ),
    todo((a, b) =>
      supabase
        .from("skus_ignorados")
        .select("sku_proveedor")
        .eq("proveedor_id", p.proveedorId)
        .order("sku_proveedor")
        .range(a, b)
    ),
  ]);
  const variantePorSku = new Map(vinculos.map((v) => [v.sku_proveedor as string, v.variante_id as string]));
  const ignoradoSet = new Set(ignorados.map((i) => i.sku_proveedor as string));

  const filas = p.lineas.map((l) => {
    const i = interpretar(l.descripcion);
    const clave = skuClave(l.sku, l.descripcion);
    return {
      lista_id: lista.id as string,
      sku_proveedor: l.sku,
      sku_clave: clave,
      descripcion: l.descripcion,
      precio: l.precio,
      stock: l.stock,
      precio_sugerido: l.precioSugerido,
      variante_id: variantePorSku.get(clave) ?? null,
      clave: i.claveVariante,
      marca: i.marca,
      modelo: i.modelo,
      ram_gb: i.ramGb,
      almacenamiento_gb: i.almacenamientoGb,
      color: i.color,
      categoria_slug: i.categoria,
    };
  });
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await supabase.from("lineas_lista").insert(filas.slice(i, i + 500));
    if (error) throw error;
  }

  // Lo que no vino en esta lista ya no está disponible con este proveedor
  const { error: e2 } = await supabase
    .from("producto_proveedor")
    .update({ activo: false })
    .eq("proveedor_id", p.proveedorId);
  if (e2) throw e2;

  const vinculables = filas.filter((f) => f.variante_id);
  await vincular(
    supabase,
    vinculables.map((f) => ({
      varianteId: f.variante_id!,
      proveedorId: p.proveedorId,
      listaId: f.lista_id,
      skuClave: f.sku_clave,
      precio: f.precio,
      stock: f.stock,
      precioSugerido: f.precio_sugerido,
      fecha: p.fecha,
    }))
  );

  const ignoradas = filas.filter((f) => ignoradoSet.has(f.sku_clave)).length;
  return {
    listaId: lista.id as string,
    total: filas.length,
    vinculadas: vinculables.length,
    ignoradas,
    pendientes: filas.length - vinculables.length - ignoradas,
  };
}

type LineaBD = {
  id: string;
  lista_id: string;
  descripcion: string;
  sku_clave: string;
  precio: number;
  stock: number | null;
  precio_sugerido: number | null;
  listas_precios: { proveedor_id: string; fecha: string };
};

export async function leerLineas(supabase: SupabaseClient, ids: string[]) {
  const lineas: LineaBD[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("lineas_lista")
      .select(
        "id, lista_id, descripcion, sku_clave, precio, stock, precio_sugerido, listas_precios(proveedor_id, fecha)"
      )
      .in("id", ids.slice(i, i + 100));
    if (error) throw error;
    lineas.push(...((data ?? []) as unknown as LineaBD[]));
  }
  return lineas;
}

const aVinculo = (l: LineaBD, varianteId: string) => ({
  varianteId,
  proveedorId: l.listas_precios.proveedor_id,
  listaId: l.lista_id,
  skuClave: l.sku_clave,
  precio: Number(l.precio),
  stock: l.stock,
  precioSugerido: l.precio_sugerido === null ? null : Number(l.precio_sugerido),
  fecha: l.listas_precios.fecha,
});

export async function crearEnCatalogoEn(supabase: SupabaseClient, ids: string[]) {
  const lineas = await leerLineas(supabase, ids);
  if (lineas.length === 0) return 0;
  const varianteIds = await crearDesdeLineas(
    supabase,
    lineas.map((l) => l.descripcion)
  );
  await vincular(
    supabase,
    lineas.map((l, n) => aVinculo(l, varianteIds[n]))
  );
  return lineas.length;
}

export async function asociarLineaEn(supabase: SupabaseClient, lineaId: string, varianteId: string) {
  const [l] = await leerLineas(supabase, [lineaId]);
  if (!l) return;
  await vincular(supabase, [aVinculo(l, varianteId)]);
}

export async function ignorarLineasEn(supabase: SupabaseClient, ids: string[]) {
  const lineas = await leerLineas(supabase, ids);
  const filas = [
    ...new Map(
      lineas.map((l) => [
        `${l.listas_precios.proveedor_id}::${l.sku_clave}`,
        { proveedor_id: l.listas_precios.proveedor_id, sku_proveedor: l.sku_clave, descripcion: l.descripcion },
      ])
    ).values(),
  ];
  if (filas.length === 0) return;
  const { error } = await supabase
    .from("skus_ignorados")
    .upsert(filas, { onConflict: "proveedor_id,sku_proveedor" });
  if (error) throw error;
}
