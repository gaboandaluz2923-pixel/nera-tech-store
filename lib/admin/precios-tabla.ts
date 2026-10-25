import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productosConEnvioGratis } from "@/lib/admin/envio-gratis";
import { todo } from "@/lib/admin/catalogo";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import {
  contribucion,
  costoBodegaConIva,
  costoPuesto,
  margen,
  margenEfectivo,
  precioConMargen,
  type CostosProveedor,
} from "@/lib/precios";
import { resumirMercado, sugerirPrecio, type Mercado, type Sugerencia } from "@/lib/pricing";
import { configTienda } from "@/lib/tienda/datos";
import { leerCostosCobro, margenNeto, type CostosCobro, type FormaCobro, type Neto } from "@/lib/costos-cobro";

export type Oferta = {
  proveedor: string;
  precio: number; // precio de lista más bajo de ese proveedor para esta configuración
  costo: number; // costo puesto
  anterior: number | null;
  stock: number | null; // null = el proveedor no informa existencia
  disponible: boolean;
  sugerido: number | null;
  /** Bodega con crédito fiscal: costo de la factura sin IVA (al costo mostrado ya se le sumó el 13%) */
  sinIva?: number | null;
};

export type FilaPrecio = {
  clave: string;
  productoId: string;
  producto: string;
  /** Foto principal del producto (miniatura en la tabla), o null si todavía no tiene */
  foto: string | null;
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
  /** Margen si paga sin tarjeta (precio − descuento sin tarjeta) */
  margenEfectivo: number | null;
  /** % de descuento por pagar sin tarjeta (Configuración) */
  descuentoSinTarjetaPct: number;
  contribucion: number | null;
  margenObjetivoPct: number;
  precioObjetivo: number | null;
  cambio: number | null; // diferencia del mejor costo vs su precio anterior
  /** Precios de mercado anotados a mano en los últimos 30 días */
  mercado: Mercado | null;
  observados: { precio: number; fuente: string; fecha: string }[];
  unidades30: number;
  sugerencia: Sugerencia | null;
  /** Si se ve en la tienda: producto publicado y alguna variante de esta memoria visible y con precio */
  enTienda: "si" | "producto_oculto" | "variantes_ocultas" | "sin_precio";
  /** Margen neto a tu precio con cada forma de cobro (resta costo con IVA, envío, paquetería y comisión) */
  netos: Record<FormaCobro, Neto> | null;
  /** Margen neto en efectivo al precio sugerido */
  netoSugerido: Neto | null;
  envioCobrado: number;
  cobro: CostosCobro;
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
  activo: boolean;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
};
type Producto = {
  id: string;
  nombre: string;
  marca: string;
  estado: string;
  categorias: { nombre: string; slug: string; margen_objetivo_pct: number } | null;
  imagenes: { url: string; principal: boolean; orden: number }[];
};
type Proveedor = CostosProveedor & { id: string; nombre: string; plazo_credito_dias: number };

type Lote = {
  variante_id: string;
  cantidad: number;
  costo_unitario: number | null;
  fecha: string;
  created_at: string;
  compra_lineas: { compras: { documento: string } | null } | null;
};

type Observado = { producto_id: string; ram_gb: number | null; almacenamiento_gb: number | null; precio: number; fuente: string; fecha: string };

export async function tablaPrecios(supabase: SupabaseClient): Promise<FilaPrecio[]> {
  const hace30 = new Date(Date.now() - 30 * 86_400_000);
  const config = await configTienda();
  const pct = config.descuentoSinTarjeta;
  const envioCobrado = Number(config.envio?.costo ?? 5);
  const { data: cfgCobro } = await supabase.from("configuracion").select("valor").eq("clave", "costos_cobro").maybeSingle();
  const cobro = leerCostosCobro(cfgCobro?.valor);
  const netosDe = (precio: number, costo: number) =>
    Object.fromEntries(
      (["efectivo", "transferencia", "tarjeta", "tasa_cero"] as FormaCobro[]).map((f) => [
        f,
        margenNeto(f, { precio, costo, envioCobrado, descuentoPct: pct }, cobro),
      ])
    ) as Record<FormaCobro, Neto>;
  const envioGratis = await productosConEnvioGratis(supabase);
  const [vinculos, variantes, productos, proveedores, observadosR, ventasR, conProveedorR, lotesR] = await Promise.all([
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
        .select("id, producto_id, color, ram_gb, almacenamiento_gb, precio, activo")
        .order("id")
        .range(a, b)
    ),
    todo<Producto>((a, b) =>
      supabase
        .from("productos")
        .select("id, nombre, marca, estado, categorias(nombre, slug, margen_objetivo_pct), imagenes(url, principal, orden)")
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
    // Variantes que alguna vez tuvieron proveedor (aunque ya no): las que nunca tuvieron son productos creados a mano
    todo<{ variante_id: string }>((a, b) => supabase.from("producto_proveedor").select("variante_id").order("id").range(a, b)),
    // Lo que hay en bodega: lo más viejo sale primero, así que ese es el costo de la próxima venta
    todo<Lote>((a, b) =>
      supabase
        .from("lotes")
        .select("variante_id, cantidad, costo_unitario, fecha, created_at, compra_lineas(compras(documento))")
        .gt("cantidad", 0)
        .order("fecha")
        .order("created_at")
        .range(a, b)
    ).catch(() => [] as Lote[]),
  ]);
  const conProveedor = new Set(conProveedorR.map((l) => l.variante_id));
  const lotes = lotesR;
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

  const lotesPorVariante = new Map<string, Lote[]>();
  for (const l of lotes) lotesPorVariante.set(l.variante_id, [...(lotesPorVariante.get(l.variante_id) ?? []), l]);

  const filas: FilaPrecio[] = [];
  for (const [clave, g] of grupos) {
    const enBodega = [...g.variantes.keys()].flatMap((id) => lotesPorVariante.get(id) ?? []);
    const creadoAMano = [...g.variantes.keys()].every((id) => !conProveedor.has(id));
    // Se muestra si se le puede comprar a alguien, si hay en bodega o si es un producto nuevo creado en Catálogo
    if (g.vinculos.length === 0 && enBodega.length === 0 && !creadoAMano) continue;
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
    // Bodega: el costo real del lote más viejo (con IVA si la compra no da crédito fiscal). Si hay, manda.
    const primerLote = enBodega
      .filter((l) => l.costo_unitario !== null)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at))[0];
    if (primerLote) {
      // Con IVA incluido, igual que las listas de los proveedores y el precio de venta
      const costo = costoBodegaConIva(Number(primerLote.costo_unitario), primerLote.compra_lineas?.compras?.documento);
      ofertas.unshift({
        proveedor: "En bodega",
        precio: costo,
        costo,
        anterior: null,
        stock: enBodega.reduce((s, l) => s + l.cantidad, 0),
        disponible: true,
        sugerido: null,
        sinIva:
          primerLote.compra_lineas?.compras?.documento === "ccf"
            ? Math.round(Number(primerLote.costo_unitario) * 100) / 100
            : null,
      });
    }
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

    const visibles = [...g.variantes.values()].filter((v) => v.activo !== false);
    const enTienda: FilaPrecio["enTienda"] =
      prod.estado === "oculto"
        ? "producto_oculto"
        : !visibles.length
          ? "variantes_ocultas"
          : !visibles.some((v) => Number(v.precio) > 0)
            ? "sin_precio"
            : "si";
    const sugerencia = mejor
      ? sugerirPrecio({ costo: mejor.costo, margenObjetivoPct: Number(prod.categorias?.margen_objetivo_pct ?? 10), mercado, unidades30, descuentoSinTarjetaPct: pct, envioCobrado: envioGratis.has(prod.id) ? 0 : envioCobrado })
      : null;
    filas.push({
      clave,
      productoId: prod.id,
      producto: prod.nombre,
      foto:
        [...(prod.imagenes ?? [])].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)[0]?.url ??
        null,
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
      margenEfectivo: mejor && precioVenta ? margenEfectivo(precioVenta, mejor.costo, pct) : null,
      descuentoSinTarjetaPct: pct,
      contribucion: mejor && precioVenta ? contribucion(precioVenta, mejor.costo) : null,
      margenObjetivoPct,
      precioObjetivo: mejor ? precioConMargen(mejor.costo, margenObjetivoPct) : null,
      cambio:
        mejor && mejor.anterior !== null ? Math.round((mejor.precio - mejor.anterior) * 100) / 100 : null,
      mercado,
      observados: obs.slice(0, 6).map((o) => ({ precio: Number(o.precio), fuente: o.fuente, fecha: o.fecha })),
      unidades30,
      sugerencia,
      enTienda,
      netos: mejor && precioVenta ? netosDe(precioVenta, mejor.costo) : null,
      netoSugerido:
        mejor && sugerencia
          ? margenNeto("efectivo", { precio: sugerencia.precio, costo: mejor.costo, envioCobrado, descuentoPct: pct }, cobro)
          : null,
      envioCobrado,
      cobro,
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
