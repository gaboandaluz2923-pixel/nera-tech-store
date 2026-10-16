// Datos de la tienda pública. Todo queda en caché (rápido, ideal para SEO) y se refresca
// en cuanto el panel cambia algo: las acciones del panel llaman updateTag("catalogo").
import { cacheLife, cacheTag } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import { formatoAlmacenamiento } from "@/lib/listas/normalizar";
import { leerPorcentajeSinTarjeta, type ReglaContraEntrega } from "@/lib/tienda/formato";

export const ETIQUETA_CATALOGO = "catalogo";

export type Disponibilidad = "bodega" | "proveedor" | "agotado";
export type Condicion = "nuevo" | "open_box" | "usado";

export type VarianteTienda = {
  id: string;
  nombre: string;
  memoria: string | null; // "6 GB + 128 GB"
  ramGb: number | null;
  almacenamientoGb: number | null;
  color: string | null;
  /** Precio a cobrar: el de oferta si hay una vigente */
  precio: number;
  /** Precio normal (tachado) cuando hay oferta */
  precioRegular: number | null;
  oferta: { nombre: string; fin: string | null } | null;
  disponibilidad: Disponibilidad;
};

/** Combo "Completá tu equipo": el producto + estos accesorios = ahorro */
export type ComboTienda = {
  id: string;
  nombre: string;
  ahorro: number;
  items: { varianteId: string; nombre: string; cantidad: number; precio: number; imagen: ImagenTienda | null }[];
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
  /** Precio normal de la opción más barata, cuando está en oferta */
  precioDesdeRegular: number | null;
  ofertaFin: string | null;
  memorias: string[];
  ramMax: number | null;
  almacenamientos: number[];
  es5g: boolean;
  disponibilidad: Disponibilidad;
  /** nuevo (sellado), open_box (caja abierta, no sellado de fábrica) o usado */
  condicion: Condicion;
  colecciones: string[];
  orden: number;
  publicadoEn: string | null;
  /** Variante que se agrega con un toque desde "Completá tu equipo" (la disponible más barata, en negro si hay) */
  varianteDestacada: string | null;
  /** Campaña vigente con envío gratis en la que está (ej. "Octubre Naranja") */
  campana: CampanaTienda | null;
  /** Unidades propias en bodega (suma de las variantes) */
  unidadesEnBodega: number;
};

export type CampanaTienda = { id: string; nombre: string; fin: string | null; envioGratis: true };

export type ProductoDetalle = ProductoResumen & {
  descripcion: string | null;
  caracteristicas: Record<string, string>;
  incluye: string | null;
  garantia: string | null;
  faq: { pregunta: string; respuesta: string }[];
  imagenes: ImagenTienda[];
  variantes: VarianteTienda[];
  combos: ComboTienda[];
  metaTitulo: string | null;
  metaDescripcion: string | null;
  actualizado: string;
  /** Open Box / usado: en qué estado viene (texto del panel) y el modelo nuevo del que sale */
  condicionDetalle: string | null;
  productoBase: { slug: string; nombre: string; precioDesde: number } | null;
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
  contraEntrega: ReglaContraEntrega;
  tasaCero: { meses: number; banco: string };
  negocio: { nombre: string; nit: string; direccion: string; correo: string };
  garantia: Garantia | null;
  /** % de descuento al pagar en efectivo o por transferencia (Configuración) */
  descuentoSinTarjeta: number;
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
  condicion?: Condicion | null;
  producto_base_id?: string | null;
  condicion_detalle?: string | null;
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
    stock: number | null;
  }[];
  coleccion_producto: { colecciones: { slug: string } | null }[];
};

const SELECT_PRODUCTO = `id, slug, nombre, marca, modelo, resumen, descripcion, caracteristicas, incluye, garantia, faq,
  estado, condicion, producto_base_id, condicion_detalle, orden, meta_titulo, meta_descripcion, publicado_en, updated_at,
  categorias(slug, nombre),
  imagenes(url, alt, orden, principal),
  variantes(id, nombre, color, ram_gb, almacenamiento_gb, precio, activo, stock),
  coleccion_producto(colecciones(slug))`;

/**
 * Lee el catálogo. Si la base no responde (o falta una migración), devuelve una lista vacía
 * en vez de romper el sitio, y ese resultado vacío solo se guarda unos minutos.
 */
type Leido = { ok: boolean; lista: ProductoDetalle[]; segundosHastaCambio: number | null; campanas: CampanaLeida[] };

/** Campaña vigente con sus productos en orden (para el banner del inicio) */
export type CampanaLeida = CampanaTienda & {
  texto: string | null;
  banner: boolean;
  destacado: string | null;
  /** Foto del banner con fondo transparente (si no, la foto principal del producto) */
  imagen: string | null;
  productos: string[];
};

async function leerCatalogo(): Promise<Leido> {
  try {
    return { ok: true, ...(await leerCatalogoODaError()) };
  } catch (e) {
    console.error("No se pudo leer el catálogo:", e);
    return { ok: false, lista: [], segundosHastaCambio: null, campanas: [] };
  }
}

/**
 * Cuánto dura el caché. Normalmente horas (el panel lo refresca al guardar), pero si una
 * oferta empieza o termina antes, se refresca a esa hora para que el precio cambie solo.
 */
const vida = ({ ok, segundosHastaCambio: s }: Leido) => {
  if (!ok) return cacheLife("minutes");
  if (s !== null && s < 3600) return cacheLife({ stale: 30, revalidate: Math.max(30, s), expire: 86400 });
  return cacheLife("hours");
};

type FilaOferta = { variante_id: string; precio: number; promociones: { nombre: string; fin: string | null } | null };
type FilaCampana = {
  producto_id: string;
  orden: number;
  promociones: {
    id: string;
    nombre: string;
    fin: string | null;
    tipo: string;
    config: { destacado?: string; banner?: boolean; texto?: string; imagen?: string } | null;
  } | null;
};
type FilaComboCat = {
  id: string;
  nombre: string;
  producto_principal_id: string;
  descuento: number;
  bundle_items: {
    variante_id: string;
    cantidad: number;
    variantes: {
      id: string;
      precio: number;
      activo: boolean;
      color: string | null;
      productos: { nombre: string; estado: string; imagenes: { url: string; alt: string | null; orden: number; principal: boolean }[] } | null;
    } | null;
  }[];
};

async function leerCatalogoODaError(): Promise<Omit<Leido, "ok">> {
  const sb = clientePublico();
  const [{ data: productos, error }, { data: disp, error: e2 }, ofertasR, proximaR, combosR, campanasR] = await Promise.all([
    sb.from("productos").select(SELECT_PRODUCTO).neq("estado", "oculto").limit(1000),
    sb.from("disponibilidad_publica").select("variante_id, en_bodega, con_proveedor").limit(5000),
    // Ofertas vigentes (la base solo deja ver las activas y dentro de sus fechas)
    sb.from("promocion_precios").select("variante_id, precio, promociones(nombre, fin)").limit(5000),
    sb.from("promociones_proximas").select("proximo_inicio").maybeSingle(),
    sb
      .from("bundles")
      .select(
        "id, nombre, producto_principal_id, descuento, bundle_items(variante_id, cantidad, variantes(id, precio, activo, color, productos(nombre, estado, imagenes(url, alt, orden, principal))))"
      )
      .gt("descuento", 0)
      .limit(500),
    // Campañas con envío gratis vigentes (la base solo deja ver las activas y dentro de sus fechas)
    sb.from("promocion_productos").select("producto_id, orden, promociones(id, nombre, fin, tipo, config)").limit(2000),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  // Si falta la migración de la fase 4, la tienda sigue funcionando sin ofertas ni combos
  if (ofertasR.error) console.error("Ofertas:", ofertasR.error.message);
  if (combosR.error) console.error("Combos:", combosR.error.message);
  if (campanasR.error) console.error("Campañas:", campanasR.error.message);

  const ahora = Date.now();
  const ofertaPorVariante = new Map<string, { precio: number; nombre: string; fin: string | null }>();
  let proximoCambio = proximaR.data?.proximo_inicio ? new Date(proximaR.data.proximo_inicio as string).getTime() : Infinity;
  for (const o of (ofertasR.data ?? []) as unknown as FilaOferta[]) {
    if (!o.promociones) continue;
    if (o.promociones.fin) proximoCambio = Math.min(proximoCambio, new Date(o.promociones.fin).getTime());
    const previa = ofertaPorVariante.get(o.variante_id);
    if (!previa || Number(o.precio) < previa.precio) {
      ofertaPorVariante.set(o.variante_id, { precio: Number(o.precio), nombre: o.promociones.nombre, fin: o.promociones.fin });
    }
  }
  // Campañas: una por producto (la que termina primero) y la lista completa para el banner
  const campanaPorProducto = new Map<string, CampanaTienda>();
  const campanas = new Map<string, CampanaLeida>();
  for (const f of ((campanasR.data ?? []) as unknown as FilaCampana[]).sort((a, b) => a.orden - b.orden)) {
    const c = f.promociones;
    if (!c || c.tipo !== "envio_gratis") continue;
    if (c.fin) proximoCambio = Math.min(proximoCambio, new Date(c.fin).getTime());
    const base: CampanaTienda = { id: c.id, nombre: c.nombre, fin: c.fin, envioGratis: true };
    const previa = campanaPorProducto.get(f.producto_id);
    if (!previa || (c.fin && (!previa.fin || c.fin < previa.fin))) campanaPorProducto.set(f.producto_id, base);
    const x =
      campanas.get(c.id) ??
      {
        ...base,
        texto: c.config?.texto?.trim() || null,
        banner: c.config?.banner !== false,
        destacado: c.config?.destacado ?? null,
        imagen: c.config?.imagen?.trim() || null,
        productos: [],
      };
    x.productos.push(f.producto_id);
    campanas.set(c.id, x);
  }
  const segundosHastaCambio = Number.isFinite(proximoCambio) ? Math.max(0, Math.ceil((proximoCambio - ahora) / 1000)) : null;

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
        ...conOferta(Number(v.precio), ofertaPorVariante.get(v.id)),
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
    // Se muestra primero lo que está en bodega (prioridad: mover el inventario propio)
    const enBodega = variantes.filter((v) => v.disponibilidad === "bodega");
    const paraDestacar = enBodega.length ? enBodega : base;
    const minDestacar = Math.min(...paraDestacar.map((v) => v.precio));
    const baratas = paraDestacar.filter((v) => v.precio === minDestacar && v.disponibilidad !== "agotado");
    const destacada = baratas.find((v) => /negro|black/i.test(v.color ?? "")) ?? baratas[0] ?? null;
    const masBarata = base.find((v) => v.precio === minimo) ?? null;

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
      precioDesdeRegular: masBarata?.precioRegular ?? null,
      ofertaFin: masBarata?.oferta?.fin ?? null,
      memorias: [...new Set(variantes.map((v) => v.memoria).filter((m): m is string => Boolean(m)))],
      ramMax: rams.length ? Math.max(...rams) : null,
      almacenamientos,
      es5g: /5g/i.test(red) || /5g/i.test(p.nombre),
      disponibilidad: variantes.map((v) => v.disponibilidad).reduce(mejor),
      condicion: p.condicion ?? "nuevo",
      colecciones: p.coleccion_producto.map((c) => c.colecciones?.slug).filter((s): s is string => Boolean(s)),
      orden: p.orden,
      publicadoEn: p.publicado_en,
      varianteDestacada: destacada?.id ?? null,
      campana: campanaPorProducto.get(p.id) ?? null,
      unidadesEnBodega: p.variantes.filter((v) => v.activo && Number(v.precio) > 0).reduce((s, v) => s + Math.max(0, Number(v.stock) || 0), 0),
      descripcion: p.descripcion,
      caracteristicas: p.caracteristicas ?? {},
      incluye: p.incluye,
      garantia: p.garantia,
      faq: p.faq ?? [],
      imagenes,
      variantes,
      combos: combosDe(p.id, (combosR.data ?? []) as unknown as FilaComboCat[], ofertaPorVariante, dispPorVariante),
      metaTitulo: p.meta_titulo,
      metaDescripcion: p.meta_descripcion,
      actualizado: p.updated_at,
      condicionDetalle: p.condicion_detalle ?? null,
      productoBase: null,
    });
  }
  // Open Box / usado: enlace al modelo nuevo y, si la ficha no tiene, sus características y fotos
  const filas = new Map(((productos ?? []) as unknown as FilaProducto[]).map((f) => [f.id, f]));
  const porId = new Map(lista.map((x) => [x.id, x]));
  for (const x of lista) {
    const baseId = filas.get(x.id)?.producto_base_id;
    if (x.condicion === "nuevo" || !baseId) continue;
    const base = porId.get(baseId);
    const fila = filas.get(baseId);
    if (base) x.productoBase = { slug: base.slug, nombre: base.nombre, precioDesde: base.precioDesde };
    if (!Object.keys(x.caracteristicas).length && fila?.caracteristicas) x.caracteristicas = fila.caracteristicas;
    if (!x.imagenes.length && fila?.imagenes.length) {
      x.imagenes = [...fila.imagenes]
        .sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)
        .map((i) => ({ url: i.url, alt: i.alt || x.nombre }));
      x.imagen = x.imagenes[0] ?? null;
    }
  }

  // Primero lo que está en bodega, luego lo del proveedor y al final lo agotado
  return {
    lista: lista.sort(
      (a, b) =>
        ORDEN_DISP[a.disponibilidad] - ORDEN_DISP[b.disponibilidad] || a.orden - b.orden || a.nombre.localeCompare(b.nombre)
    ),
    segundosHastaCambio,
    campanas: [...campanas.values()],
  };
}

function conOferta(normal: number, oferta: { precio: number; nombre: string; fin: string | null } | undefined) {
  return oferta && oferta.precio < normal
    ? { precio: oferta.precio, precioRegular: normal, oferta: { nombre: oferta.nombre, fin: oferta.fin } }
    : { precio: normal, precioRegular: null, oferta: null };
}

/** Combos del producto cuyos accesorios se pueden comprar hoy */
function combosDe(
  productoId: string,
  filas: FilaComboCat[],
  ofertas: Map<string, { precio: number; nombre: string; fin: string | null }>,
  disp: Map<string, Disponibilidad>
): ComboTienda[] {
  return filas
    .filter((b) => b.producto_principal_id === productoId && b.bundle_items.length)
    .filter((b) =>
      b.bundle_items.every(
        (i) =>
          i.variantes?.activo &&
          i.variantes.productos &&
          i.variantes.productos.estado !== "agotado" &&
          (disp.get(i.variante_id) ?? "agotado") !== "agotado"
      )
    )
    .map((b) => ({
      id: b.id,
      nombre: b.nombre,
      ahorro: Number(b.descuento),
      items: b.bundle_items.map((i) => {
        const v = i.variantes!;
        const img = [...(v.productos?.imagenes ?? [])].sort((a, c) => Number(c.principal) - Number(a.principal) || a.orden - c.orden)[0];
        return {
          varianteId: i.variante_id,
          nombre: [v.productos?.nombre, v.color].filter(Boolean).join(" "),
          cantidad: i.cantidad,
          precio: conOferta(Number(v.precio), ofertas.get(i.variante_id)).precio,
          imagen: img ? { url: img.url, alt: img.alt || v.productos?.nombre || "" } : null,
        };
      }),
    }))
    .sort((a, b) => b.ahorro - a.ahorro);
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
  precioDesdeRegular: p.precioDesdeRegular,
  ofertaFin: p.ofertaFin,
  memorias: p.memorias,
  ramMax: p.ramMax,
  almacenamientos: p.almacenamientos,
  es5g: p.es5g,
  disponibilidad: p.disponibilidad,
  condicion: p.condicion,
  colecciones: p.colecciones,
  orden: p.orden,
  publicadoEn: p.publicadoEn,
  varianteDestacada: p.varianteDestacada,
  campana: p.campana,
  unidadesEnBodega: p.unidadesEnBodega,
});

/**
 * Campaña para el banner del inicio: la vigente con banner, su producto destacado (con variantes, para el
 * precio en efectivo) y el resto de sus productos publicados. Null si no hay ninguna.
 */
export async function campanaDestacada(): Promise<{
  campana: CampanaLeida;
  destacado: ProductoDetalle;
  otros: ProductoResumen[];
} | null> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const leido = await leerCatalogo();
  vida(leido);
  const porId = new Map(leido.lista.map((p) => [p.id, p]));
  for (const c of leido.campanas.filter((x) => x.banner).sort((a, b) => (a.fin ?? "9").localeCompare(b.fin ?? "9"))) {
    const disponibles = c.productos.map((id) => porId.get(id)).filter((p): p is ProductoDetalle => Boolean(p) && p!.disponibilidad !== "agotado");
    const destacado = (c.destacado ? disponibles.find((p) => p.id === c.destacado) : null) ?? disponibles[0];
    if (!destacado) continue;
    return { campana: c, destacado, otros: disponibles.filter((p) => p.id !== destacado.id).map(aResumen) };
  }
  return null;
}

export async function catalogo(): Promise<ProductoResumen[]> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const leido = await leerCatalogo();
  vida(leido);
  return leido.lista.map(aResumen);
}

export async function productoPorSlug(slug: string): Promise<ProductoDetalle | null> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const leido = await leerCatalogo();
  vida(leido);
  return leido.lista.find((p) => p.slug === slug) ?? null;
}

export async function productosPorSlugs(slugs: string[]): Promise<ProductoDetalle[]> {
  "use cache";
  cacheTag(ETIQUETA_CATALOGO);
  const leido = await leerCatalogo();
  vida(leido);
  const todos = leido.lista;
  return slugs.map((s) => todos.find((p) => p.slug === s)).filter((p): p is ProductoDetalle => Boolean(p));
}

/** Acepta el formato viejo (lista de municipios) y el nuevo ({ municipios, todo_el_pais, maximo }). */
function leerContraEntrega(v: unknown): ReglaContraEntrega {
  if (Array.isArray(v)) return { municipios: v.map(String), todoElPais: false, maximo: null };
  const o = (v ?? {}) as { municipios?: unknown; todo_el_pais?: unknown; maximo?: unknown };
  const municipios = Array.isArray(o.municipios) && o.municipios.length ? o.municipios.map(String) : ["San Salvador"];
  const maximo = Number(o.maximo);
  return { municipios, todoElPais: o.todo_el_pais === true, maximo: o.maximo != null && maximo > 0 ? maximo : null };
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
  if (error) cacheLife("minutes");
  else cacheLife("hours");
  const c = new Map((data ?? []).map((r) => [r.clave as string, r.valor]));
  const garantia = c.get("garantia_texto") as Garantia | { texto: string } | undefined;
  const contraEntrega = leerContraEntrega(c.get("municipios_contra_entrega"));
  return {
    whatsapp: (c.get("whatsapp")?.numero as string) || process.env.NEXT_PUBLIC_WHATSAPP_NUMERO || "",
    envio: c.get("envio") ?? { costo: 5, gratis_desde: null, gratis_con_accesorio: false },
    municipiosContraEntrega: contraEntrega.municipios,
    contraEntrega,
    tasaCero: c.get("tasa_cero") ?? { meses: 12, banco: "" },
    negocio: c.get("negocio") ?? { nombre: "Nera Tech", nit: "", direccion: "", correo: "" },
    garantia: garantia && "plazo_meses" in garantia ? garantia : null,
    descuentoSinTarjeta: leerPorcentajeSinTarjeta(c.get("descuento_sin_tarjeta")),
  };
}
