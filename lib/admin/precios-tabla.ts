import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todo } from "@/lib/admin/catalogo";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import {
  contribucion,
  costoPuesto,
  margen,
  precioConMargen,
  type CostosProveedor,
} from "@/lib/precios";
import { resumirMercado, sugerirPrecio, type Mercado, type Sugerencia } from "@/lib/pricing";
import { configTienda } from "@/lib/tienda/datos";

export type Oferta = {
  proveedor: string;
  precio: number; // precio de lista más bajo de ese proveedor para esta configuración
  costo: number; // costo puesto
  anterior: number | null;
  stock: number | null; // null = el proveedor no informa existencia
  disponible: boolean;
  sugerido: number | null;
};

export type FilaPrecio = {
  clave: string;
  productoId: string;
  producto: string;
  marca: string;
  categoria: string;
  categoriaSlug: string;
  ramGb: number | null;
  almacenamientoGb: number | null;
  memoria: string;
  colores: string[];
  ofertas: Oferta[];
  mejor: Oferta | null;
  precioVenta: number | null;
  precioVaria: boolean;
  margen: number | null;
  contribucion: number | null;
  margenObjetivoPct: number;
  precioObjetivo: number | null;
  cambio: number | null; // diferencia del mejor costo vs su precio anterior
  /** Precios de mercado anotados a mano en los últimos 30 días */
  mercado: Mercado | null;
  observados: { precio: number; fuente: string; fecha: string }[];
  unidades30: number;
  sugerencia: Sugerencia | null;
};

type Vinculo = {
  variante_id: string;
  proveedor_id: string;
  ultimo_precio: number;
  precio_anterior: number | null;
  ultimo_stock: number | null;
  precio_sugerido: number | null;
};
type Variante = {
  id: string;
  producto_id: string;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
};
type Producto = {
  id: string;
  nombre: string;
  marca: string;
  categorias: { nombre: string; slug: string; margen_objetivo_pct: number } | null;
};
type Proveedor = CostosProveedor & { id: string; nombre: string; plazo_credito_dias: number };

type Observado = { producto_id: string; ram_gb: number | null; almacenamiento_gb: number | null; precio: number; fuente: string; fecha: string };

export async function tablaPrecios(supabase: SupabaseClient): Promise<FilaPrecio[]> {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);
  const pct = (await configTienda()).descuentoSinTarjeta;
  const [vinculos, variantes, productos, proveedores, observadosR, ventasR] = await Promise.all([
    todo<Vinculo>((a, b) =>
      supabase
        .from("producto_proveedor")
        .select("variante_id, proveedor_id, ultimo_precio, precio_anterior, ultimo_stock, precio_sugerido")
        .eq("activo", true)
        .order("id")
        .range(a, b)
    ),
    todo<Variante>((a, b) =>
      supabase
        .from("variantes")
        .select("id, producto_id, color, ram_gb, almacenamiento_gb, precio")
        .order("id")
        .range(a, b)
    ),
    todo<Producto>((a, b) =>
      supabase
        .from("productos")
        .select("id, nombre, marca, categorias(nombre, slug, margen_objetivo_pct)")
        .order("id")
        .range(a, b)
    ),
    todo<Proveedor>((a, b) => supabase.from("proveedores").select("*").range(a, b)),
    supabase
      .from("precios_observados")
      .select("producto_id, ram_gb, almacenamiento_gb, precio, fuente, fecha")
      .eq("nuevo_sellado", true)
      .gte("fecha", hace30.toISOString().slice(0, 10))
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase.rpc("ventas_por_configuracion", { desde: hace30.toISOString() }),
  ]);
  // Sin la migración 0007 la tabla sigue funcionando, solo sin mercado ni rotación
  const observados = (observadosR.error ? [] : (observadosR.data ?? [])) as Observado[];
  const ventas = new Map(
    ((ventasR.error ? [] : (ventasR.data ?? [])) as { producto_id: string; ram_gb: number | null; almacenamiento_gb: number | null; unidades: number }[]).map((v) => [
      `${v.producto_id}|${v.ram_gb ?? "-"}|${v.almacenamiento_gb ?? "-"}`,
      Number(v.unidades),
    ])
  );

  const varPorId = new Map(variantes.map((v) => [v.id, v]));
  const prodPorId = new Map(productos.map((p) => [p.id, p]));
  const provPorId = new Map(proveedores.map((p) => [p.id, p]));

  // Agrupar por configuración: producto + RAM + almacenamiento (el color no cambia el costo)
  const grupos = new Map<string, { variantes: Map<string, Variante>; vinculos: Vinculo[] }>();
  const claveDe = (v: Variante) => `${v.producto_id}|${v.ram_gb ?? "-"}|${v.almacenamiento_gb ?? "-"}`;
  for (const v of variantes) {
    const k = claveDe(v);
    const g = grupos.get(k) ?? { variantes: new Map(), vinculos: [] };
    g.variantes.set(v.id, v);
    grupos.set(k, g);
  }
  for (const l of vinculos) {
    const v = varPorId.get(l.variante_id);
    if (v) grupos.get(claveDe(v))?.vinculos.push(l);
  }

  const filas: FilaPrecio[] = [];
  for (const [clave, g] of grupos) {
    if (g.vinculos.length === 0) continue; // sin proveedor vigente: no se puede comprar
    const v0 = [...g.variantes.values()][0];
    const prod = prodPorId.get(v0.producto_id);
    if (!prod) continue;

    // Una oferta por proveedor: su precio más bajo entre los colores con existencia
    const vinculosPorProveedor = new Map<string, Vinculo[]>();
    for (const l of g.vinculos) {
      const lista = vinculosPorProveedor.get(l.proveedor_id) ?? [];
      lista.push(l);
      vinculosPorProveedor.set(l.proveedor_id, lista);
    }
    const porProveedor = new Map<string, Oferta>();
    for (const [provId, ls] of vinculosPorProveedor) {
      const prov = provPorId.get(provId);
      if (!prov) continue;
      const conExistencia = ls.filter((l) => l.ultimo_stock === null || l.ultimo_stock > 0);
      const base = (conExistencia.length ? conExistencia : ls).reduce((min, l) =>
        Number(l.ultimo_precio) < Number(min.ultimo_precio) ? l : min
      );
      const informados = ls.filter((l) => l.ultimo_stock !== null);
      const precio = Number(base.ultimo_precio);
      porProveedor.set(provId, {
        proveedor: prov.nombre,
        precio,
        costo: costoPuesto(precio, prov),
        anterior: base.precio_anterior === null ? null : Number(base.precio_anterior),
        stock: informados.length ? informados.reduce((s, l) => s + (l.ultimo_stock ?? 0), 0) : null,
        disponible: conExistencia.length > 0,
        sugerido: base.precio_sugerido === null ? null : Number(base.precio_sugerido),
      });
    }
    // Orden: menor costo puesto; a igual costo, el de más días de crédito
    const plazo = (id: string) => provPorId.get(id)?.plazo_credito_dias ?? 0;
    const ofertas = [...porProveedor.entries()]
      .sort(([ia, a], [ib, b]) => a.costo - b.costo || plazo(ib) - plazo(ia))
      .map(([, o]) => o);
    const mejor = ofertas.find((o) => o.disponible) ?? null;

    const precios = [...g.variantes.values()].map((v) => Number(v.precio)).filter((p) => p > 0);
    // Mercado: lo anotado para esta memoria, o para el producto sin memoria (ej. accesorios)
    const obs = observados.filter(
      (o) =>
        o.producto_id === v0.producto_id &&
        ((o.ram_gb === null && o.almacenamiento_gb === null) || (o.ram_gb === v0.ram_gb && o.almacenamiento_gb === v0.almacenamiento_gb))
    );
    const mercado = resumirMercado(obs.map((o) => Number(o.precio)));
    const unidades30 = ventas.get(clave) ?? 0;
    const precioVenta = precios.length ? Math.max(...precios) : null;
    const margenObjetivoPct = Number(prod.categorias?.margen_objetivo_pct ?? 10);

    filas.push({
      clave,
      productoId: prod.id,
      producto: prod.nombre,
      marca: prod.marca,
      categoria: prod.categorias?.nombre ?? "—",
      categoriaSlug: prod.categorias?.slug ?? "otros",
      ramGb: v0.ram_gb,
      almacenamientoGb: v0.almacenamiento_gb,
      memoria:
        v0.almacenamiento_gb === null
          ? ""
          : v0.ram_gb === null
            ? formatoAlmacenamiento(v0.almacenamiento_gb)
            : `${v0.ram_gb} + ${formatoAlmacenamiento(v0.almacenamiento_gb)}`,
      colores: [...new Set([...g.variantes.values()].map((v) => v.color).filter(Boolean) as string[])],
      ofertas,
      mejor,
      precioVenta,
      precioVaria: new Set(precios).size > 1,
      margen: mejor && precioVenta ? margen(precioVenta, mejor.costo) : null,
      contribucion: mejor && precioVenta ? contribucion(precioVenta, mejor.costo) : null,
      margenObjetivoPct,
      precioObjetivo: mejor ? precioConMargen(mejor.costo, margenObjetivoPct) : null,
      cambio:
        mejor && mejor.anterior !== null ? Math.round((mejor.precio - mejor.anterior) * 100) / 100 : null,
      mercado,
      observados: obs.slice(0, 6).map((o) => ({ precio: Number(o.precio), fuente: o.fuente, fecha: o.fecha })),
      unidades30,
      sugerencia: mejor
        ? sugerirPrecio({ costo: mejor.costo, margenObjetivoPct: Number(prod.categorias?.margen_objetivo_pct ?? 10), mercado, unidades30, descuentoSinTarjetaPct: pct })
        : null,
    });
  }

  return filas.sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria) ||
      a.producto.localeCompare(b.producto) ||
      (a.almacenamientoGb ?? 0) - (b.almacenamientoGb ?? 0) ||
      (a.ramGb ?? 0) - (b.ramGb ?? 0)
  );
}
