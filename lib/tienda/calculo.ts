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
  /** Precio que se cobra (el de oferta si hay una vigente) */
  precio: number;
  /** Precio normal tachado cuando hay oferta; null si no hay */
  precioRegular: number | null;
  oferta: { nombre: string; fin: string | null } | null;
  cantidad: number;
  total: number;
  disponibilidad: Disponibilidad;
};

export type ComboAplicado = { id: string; nombre: string; veces: number; descuento: number };

/** Combo al que le faltan accesorios: se ofrece con un toque en el carrito */
export type ComboSugerido = {
  id: string;
  nombre: string;
  ahorro: number;
  faltan: { varianteId: string; nombre: string; cantidad: number; precio: number }[];
};

export type ResumenCarrito = {
  lineas: LineaCalculada[];
  /** Variantes que ya no se pueden comprar (agotadas, ocultas o sin precio) */
  quitadas: string[];
  /** Suma de las líneas (con precio de oferta) */
  subtotal: number;
  combos: ComboAplicado[];
  descuentoCombos: number;
  /** Lo que se paga por los productos: subtotal − combos (base del descuento sin tarjeta, cupones y envío gratis) */
  productos: number;
  combosSugeridos: ComboSugerido[];
  envio: number;
  /** Por qué no paga envío: monto mínimo, equipo + accesorio o una campaña (ej. Octubre Naranja) */
  envioGratis: "monto" | "accesorio" | "campana" | null;
  /** Nombre de la campaña que da el envío gratis */
  campanaEnvio: string | null;
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
    combos: [],
    descuentoCombos: 0,
    productos: 0,
    combosSugeridos: [],
    envio: 0,
    envioGratis: null,
    campanaEnvio: null,
    faltaParaEnvioGratis: null,
    total: 0,
  };
  if (!ids.length) return vacio;

  const sb = clientePublico();
  const [{ data, error }, { data: disp, error: e2 }, ofertas, campanas] = await Promise.all([
    sb
      .from("variantes")
      .select(
        "id, nombre, color, ram_gb, almacenamiento_gb, precio, activo, productos(id, slug, nombre, estado, categorias(slug), imagenes(url, alt, principal, orden))"
      )
      .in("id", ids),
    sb.from("disponibilidad_publica").select("variante_id, en_bodega, con_proveedor").in("variante_id", ids),
    preciosDeOferta(ids),
    campanasEnvioGratis(),
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
    const normal = Number(f.precio);
    const oferta = ofertas.get(f.id);
    const precio = oferta && oferta.precio < normal ? oferta.precio : normal;
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
      precioRegular: precio < normal ? normal : null,
      oferta: precio < normal && oferta ? { nombre: oferta.nombre, fin: oferta.fin } : null,
      cantidad: c,
      total: redondear(precio * c),
      disponibilidad,
    });
  }

  const subtotal = redondear(lineas.reduce((s, l) => s + l.total, 0));
  const { combos, sugeridos } = await aplicarCombos(lineas);
  const descuentoCombos = redondear(combos.reduce((s, c) => s + c.descuento, 0));
  const productos = redondear(subtotal - descuentoCombos);
  const hayEquipo = lineas.some((l) => CATEGORIAS_EQUIPO.has(l.categoria));
  const hayAccesorio = lineas.some((l) => !CATEGORIAS_EQUIPO.has(l.categoria));
  const { costo, gratis_desde, gratis_con_accesorio } = config.envio;
  // Campaña con envío gratis: basta un producto de la campaña en el pedido
  const campanaEnvio = lineas.map((l) => campanas.get(l.productoId)).find(Boolean) ?? null;
  const envioGratis: ResumenCarrito["envioGratis"] =
    !lineas.length
      ? null
      : campanaEnvio
        ? "campana"
        : gratis_desde !== null && productos >= gratis_desde
        ? "monto"
        : gratis_con_accesorio && hayEquipo && hayAccesorio
          ? "accesorio"
          : null;
  const envio = !lineas.length || envioGratis ? 0 : Number(costo) || 0;

  return {
    lineas,
    quitadas,
    subtotal,
    combos,
    descuentoCombos,
    productos,
    combosSugeridos: sugeridos,
    envio,
    envioGratis,
    campanaEnvio,
    faltaParaEnvioGratis: gratis_desde !== null && !envioGratis && lineas.length ? redondear(gratis_desde - productos) : null,
    total: redondear(productos + envio),
  };
}

/** Productos en campañas vigentes con envío gratis → nombre de la campaña. */
export async function campanasEnvioGratis(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  // La base solo deja ver las campañas activas y dentro de sus fechas
  const { data, error } = await clientePublico().from("promocion_productos").select("producto_id, promociones(nombre, tipo)").limit(2000);
  if (error) {
    console.error("No se pudieron leer las campañas:", error.message);
    return mapa;
  }
  for (const f of (data ?? []) as unknown as { producto_id: string; promociones: { nombre: string; tipo: string } | null }[]) {
    if (f.promociones?.tipo === "envio_gratis" && !mapa.has(f.producto_id)) mapa.set(f.producto_id, f.promociones.nombre);
  }
  return mapa;
}

/** Precio de oferta vigente por variante (el más bajo si hay varias ofertas). */
export async function preciosDeOferta(ids: string[]) {
  const mapa = new Map<string, { precio: number; nombre: string; fin: string | null }>();
  // La base solo deja ver precios de ofertas activas y dentro de sus fechas
  const { data, error } = await clientePublico()
    .from("promocion_precios")
    .select("variante_id, precio, promociones(nombre, fin)")
    .in("variante_id", ids);
  if (error) {
    console.error("No se pudieron leer las ofertas:", error.message);
    return mapa;
  }
  for (const f of (data ?? []) as unknown as { variante_id: string; precio: number; promociones: { nombre: string; fin: string | null } | null }[]) {
    if (!f.promociones) continue;
    const previo = mapa.get(f.variante_id);
    if (!previo || Number(f.precio) < previo.precio) {
      mapa.set(f.variante_id, { precio: Number(f.precio), nombre: f.promociones.nombre, fin: f.promociones.fin });
    }
  }
  return mapa;
}

type FilaCombo = {
  id: string;
  nombre: string;
  producto_principal_id: string;
  descuento: number;
  bundle_items: {
    variante_id: string;
    cantidad: number;
    variantes: { id: string; precio: number; activo: boolean; color: string | null; productos: { nombre: string; estado: string } | null } | null;
  }[];
};

/**
 * Combos: cada vez que el carrito lleva una unidad del producto principal (cualquier variante)
 * y todos los accesorios del combo, se descuenta el ahorro del combo. Los combos más
 * generosos se aplican primero y cada unidad cuenta para un solo combo.
 */
async function aplicarCombos(lineas: LineaCalculada[]): Promise<{ combos: ComboAplicado[]; sugeridos: ComboSugerido[] }> {
  const principales = [...new Set(lineas.map((l) => l.productoId))];
  if (!principales.length) return { combos: [], sugeridos: [] };
  const sb = clientePublico();
  const { data, error } = await sb
    .from("bundles")
    .select("id, nombre, producto_principal_id, descuento, bundle_items(variante_id, cantidad, variantes(id, precio, activo, color, productos(nombre, estado)))")
    .in("producto_principal_id", principales)
    .gt("descuento", 0);
  if (error) {
    console.error("No se pudieron leer los combos:", error.message);
    return { combos: [], sugeridos: [] };
  }
  const filas = ((data ?? []) as unknown as FilaCombo[]).filter((b) => b.bundle_items.length);
  if (!filas.length) return { combos: [], sugeridos: [] };

  // Unidades disponibles en el carrito
  const porVariante = new Map(lineas.map((l) => [l.varianteId, l.cantidad]));
  const porProducto = new Map<string, number>();
  for (const l of lineas) porProducto.set(l.productoId, (porProducto.get(l.productoId) ?? 0) + l.cantidad);
  const precioLinea = new Map(lineas.map((l) => [l.varianteId, l.precio]));

  const combos: ComboAplicado[] = [];
  const sugeridos: ComboSugerido[] = [];
  const faltantesIds = new Set<string>();
  for (const b of [...filas].sort((a, c) => Number(c.descuento) - Number(a.descuento))) {
    const principal = porProducto.get(b.producto_principal_id) ?? 0;
    // Si algún accesorio ya no se vende (oculto, inactivo o agotado), el combo no aplica
    const items = b.bundle_items.filter((i) => i.variantes?.activo && i.variantes.productos && i.variantes.productos.estado !== "agotado");
    if (!items.length || items.length !== b.bundle_items.length) continue;
    const veces = Math.min(principal, ...items.map((i) => Math.floor((porVariante.get(i.variante_id) ?? 0) / i.cantidad)));
    if (veces > 0) {
      // El ahorro nunca supera lo que cuestan los accesorios del combo
      const valorItems = items.reduce((s, i) => s + (precioLinea.get(i.variante_id) ?? 0) * i.cantidad, 0);
      const descuento = redondear(Math.min(Number(b.descuento), valorItems) * veces);
      combos.push({ id: b.id, nombre: b.nombre, veces, descuento });
      porProducto.set(b.producto_principal_id, principal - veces);
      for (const i of items) porVariante.set(i.variante_id, (porVariante.get(i.variante_id) ?? 0) - i.cantidad * veces);
    } else if (principal > 0) {
      const faltan = items
        .filter((i) => (porVariante.get(i.variante_id) ?? 0) < i.cantidad)
        .map((i) => ({
          varianteId: i.variante_id,
          nombre: [i.variantes?.productos?.nombre, i.variantes?.color].filter(Boolean).join(" "),
          cantidad: i.cantidad - (porVariante.get(i.variante_id) ?? 0),
          precio: Number(i.variantes?.precio ?? 0),
        }));
      faltan.forEach((f) => faltantesIds.add(f.varianteId));
      sugeridos.push({ id: b.id, nombre: b.nombre, ahorro: Number(b.descuento), faltan });
    }
  }

  // Solo se sugieren combos cuyos accesorios faltantes se pueden comprar hoy
  if (sugeridos.length) {
    const { data: disp } = await sb
      .from("disponibilidad_publica")
      .select("variante_id, en_bodega, con_proveedor")
      .in("variante_id", [...faltantesIds]);
    const hay = new Set((disp ?? []).filter((d) => d.en_bodega || d.con_proveedor).map((d) => d.variante_id as string));
    const ofertas = await preciosDeOferta([...faltantesIds]);
    return {
      combos,
      sugeridos: sugeridos
        .filter((s) => s.faltan.every((f) => hay.has(f.varianteId)))
        .map((s) => ({
          ...s,
          faltan: s.faltan.map((f) => ({ ...f, precio: Math.min(f.precio, ofertas.get(f.varianteId)?.precio ?? Infinity) })),
        })),
    };
  }
  return { combos, sugeridos };
}
