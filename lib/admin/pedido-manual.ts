import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { preciosDeOferta } from "@/lib/tienda/calculo";
import { configTienda } from "@/lib/tienda/datos";
import { descuentoSinTarjeta } from "@/lib/tienda/formato";

// Pedidos que entran por WhatsApp, redes, llamada o en persona y el equipo crea en el panel.
// Los precios salen de la base (el de oferta si hay una vigente). Solo un super admin puede poner
// un precio especial por producto. El descuento sin tarjeta y el envío se calculan igual que en la tienda.

export const CANALES_MANUALES = ["whatsapp", "instagram", "facebook", "tiktok", "llamada", "en_persona", "otro"] as const;
export type CanalManual = (typeof CANALES_MANUALES)[number];
export const MAX_CANTIDAD_MANUAL = 50;

export type VarianteVendible = {
  id: string;
  nombre: string;
  precio: number;
  /** Precio normal si hay una oferta vigente más baja */
  precioRegular: number | null;
  stock: number;
  publicado: boolean;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

type FilaVar = {
  id: string;
  color: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  precio: number;
  stock: number;
  activo: boolean;
  productos: { nombre: string; estado: string } | null;
};

const nombreDe = (f: FilaVar) => {
  const memoria =
    f.almacenamiento_gb == null
      ? null
      : f.ram_gb == null
        ? formatoAlmacenamiento(f.almacenamiento_gb)
        : `${f.ram_gb} GB + ${formatoAlmacenamiento(f.almacenamiento_gb)}`;
  return [f.productos?.nombre, memoria, f.color].filter(Boolean).join(" ");
};

/** Todo lo que se puede vender a mano: variantes activas con precio (aunque el producto esté oculto). */
export async function variantesVendibles(): Promise<VarianteVendible[]> {
  const sb = createServiceClient();
  const filas: FilaVar[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await sb
      .from("variantes")
      .select("id, color, ram_gb, almacenamiento_gb, precio, stock, activo, productos(nombre, estado)")
      .eq("activo", true)
      .gt("precio", 0)
      .order("id")
      .range(desde, desde + 999);
    if (error) throw error;
    filas.push(...((data ?? []) as unknown as FilaVar[]));
    if (!data || data.length < 1000) break;
  }
  const ofertas = await preciosDeOferta(filas.map((f) => f.id));
  return filas
    .filter((f) => f.productos)
    .map((f) => {
      const normal = Number(f.precio);
      const o = ofertas.get(f.id);
      const precio = o && o.precio < normal ? o.precio : normal;
      return {
        id: f.id,
        nombre: nombreDe(f),
        precio,
        precioRegular: precio < normal ? normal : null,
        stock: f.stock,
        publicado: f.productos!.estado !== "oculto",
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export type LineaManual = { v: string; c: number; precio?: number | null };

export type CotizacionManual = {
  lineas: {
    varianteId: string;
    nombre: string;
    cantidad: number;
    precio: number;
    precioRegular: number | null;
    especial: boolean;
  }[];
  subtotal: number;
  porcentaje: number;
  descuento: number;
  envio: number;
  total: number;
  /** Precios especiales que quedan bajo el costo (hay que confirmarlos) */
  avisos?: string[];
};

/** Calcula el pedido manual con los precios de la base. Lanza un Error con el motivo si algo no cuadra. */
export async function cotizarManual(e: {
  lineas: LineaManual[];
  formaPago: string;
  conEnvio: boolean;
  puedePrecioEspecial: boolean;
}): Promise<CotizacionManual> {
  const pedidas = e.lineas.filter((l) => /^[0-9a-f-]{36}$/.test(l.v) && Number(l.c) > 0);
  if (!pedidas.length) throw new Error("Agregá al menos un producto.");
  if (pedidas.length > 30) throw new Error("Máximo 30 productos distintos por pedido.");
  const ids = [...new Set(pedidas.map((l) => l.v))];
  const sb = createServiceClient();
  const [{ data, error }, ofertas, config] = await Promise.all([
    sb.from("variantes").select("id, color, ram_gb, almacenamiento_gb, precio, stock, activo, productos(nombre, estado)").in("id", ids),
    preciosDeOferta(ids),
    configTienda(),
  ]);
  if (error) throw error;
  const filas = new Map(((data ?? []) as unknown as FilaVar[]).map((f) => [f.id, f]));

  const lineas: CotizacionManual["lineas"] = [];
  for (const l of pedidas) {
    const f = filas.get(l.v);
    if (!f || !f.activo || !(Number(f.precio) > 0) || !f.productos) throw new Error("Uno de los productos ya no está disponible o no tiene precio.");
    const cantidad = Math.floor(Number(l.c));
    if (!(cantidad >= 1 && cantidad <= MAX_CANTIDAD_MANUAL)) throw new Error(`La cantidad debe estar entre 1 y ${MAX_CANTIDAD_MANUAL}.`);
    const normal = Number(f.precio);
    const o = ofertas.get(f.id);
    const vigente = o && o.precio < normal ? o.precio : normal;
    let precio = vigente;
    let especial = false;
    if (l.precio !== null && l.precio !== undefined && Math.abs(Number(l.precio) - vigente) > 0.004) {
      if (!e.puedePrecioEspecial) throw new Error("Solo un administrador puede cambiar el precio de un producto.");
      if (!(Number(l.precio) > 0)) throw new Error("El precio especial debe ser mayor que cero.");
      precio = r2(Number(l.precio));
      especial = true;
    }
    const existente = lineas.find((x) => x.varianteId === f.id && x.precio === precio);
    if (existente) existente.cantidad = Math.min(MAX_CANTIDAD_MANUAL, existente.cantidad + cantidad);
    else lineas.push({ varianteId: f.id, nombre: nombreDe(f), cantidad, precio, precioRegular: precio < normal ? normal : null, especial });
  }

  const subtotal = r2(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0));
  const porcentaje = config.descuentoSinTarjeta;
  const descuento = descuentoSinTarjeta(subtotal, e.formaPago, porcentaje);
  const { costo, gratis_desde } = config.envio;
  const envio = !e.conEnvio || (gratis_desde !== null && subtotal >= gratis_desde) ? 0 : Number(costo) || 0;
  return { lineas, subtotal, porcentaje, descuento, envio, total: r2(subtotal - descuento + envio) };
}

/** 8 dígitos, sin 503 ni espacios */
export const limpiarTelefono = (t: string) => t.replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
export const telefonoValido = (t: string) => /^[267]\d{7}$/.test(t);
