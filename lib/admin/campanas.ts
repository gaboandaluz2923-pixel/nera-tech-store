import "server-only";
import { configCorreo } from "@/lib/correo";
import { correoCampana, type ProductoCampana } from "@/lib/correos/plantillas";
import { catalogo, configTienda, type ProductoResumen } from "@/lib/tienda/datos";
import { precioConDescuento } from "@/lib/tienda/formato";
import { SITE_URL } from "@/lib/url-sitio";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

// "Preparar campaña": arma el correo con lo que hay hoy (bodega, ofertas con fecha, Open Box) y precios reales.
// Escasez y urgencia solo con datos reales: "En bodega" sale del inventario y "Oferta hasta…" de la fecha de la oferta.

export const TIPOS_CAMPANA = {
  quincena: {
    nombre: "Oferta de quincena",
    asunto: "Llegó la quincena: tu próximo celular a mejor precio",
    titulo: "Llegó la quincena 🎉",
    intro: "Estos son los precios de esta quincena. Pagás al recibir, con garantía por escrito (12 meses en celulares y equipos, 6 en accesorios).",
    cierre: "Si tenés dudas sobre cuál te conviene, escribinos por WhatsApp y te ayudamos a elegir.",
  },
  bodega: {
    nombre: "Ya llegó a bodega",
    asunto: "Listos para entregarte en menos de 24 horas",
    titulo: "Recién llegados a nuestra bodega",
    intro: "Estos equipos ya están con nosotros: te los entregamos en menos de 24 horas y pagás al recibir.",
    cierre: "Las unidades en bodega son pocas: si te gusta uno, apartalo hoy por WhatsApp.",
  },
  open_box: {
    nombre: "Open Box",
    asunto: "Open Box: originales a menor precio",
    titulo: "Open Box: el mismo equipo, menos precio",
    intro:
      "Son equipos originales con la caja ya abierta (no vienen sellados de fábrica). Los revisamos, verificamos el IMEI y te decimos por escrito cómo viene cada uno.",
    cierre: "Hay una sola unidad de cada uno.",
  },
  libre: {
    nombre: "Campaña libre",
    asunto: "",
    titulo: "",
    intro: "",
    cierre: "",
  },
} as const;
export type TipoCampana = keyof typeof TIPOS_CAMPANA;

export type OpcionProducto = {
  id: string;
  nombre: string;
  precio: number;
  disponibilidad: ProductoResumen["disponibilidad"];
  oferta: boolean;
  condicion: ProductoResumen["condicion"];
  categoria: string;
};

/** Productos que se pueden poner en la campaña (publicados y disponibles) y cuáles sugerimos por tipo */
export async function opcionesCampana() {
  const todos = (await catalogo()).filter((p) => p.disponibilidad !== "agotado");
  const opciones: OpcionProducto[] = todos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precioDesde,
    disponibilidad: p.disponibilidad,
    oferta: Boolean(p.precioDesdeRegular),
    condicion: p.condicion,
    categoria: p.categoriaNombre,
  }));
  const top = (lista: ProductoResumen[]) => lista.slice(0, 4).map((p) => p.id);
  const masPedidos = todos.filter((p) => p.colecciones.includes("mas-pedidos"));
  const sugeridos: Record<TipoCampana, string[]> = {
    quincena: top([...todos.filter((p) => p.precioDesdeRegular), ...masPedidos.filter((p) => !p.precioDesdeRegular)]),
    bodega: top(todos.filter((p) => p.disponibilidad === "bodega")),
    open_box: top(todos.filter((p) => p.condicion !== "nuevo")),
    libre: [],
  };
  return { opciones, sugeridos };
}

const fechaCortaSV = (iso: string) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", timeZone: "America/El_Salvador" });

export async function armarCampana(d: { ids: string[]; asunto: string; previa: string; titulo: string; intro: string; cierre: string }) {
  const [todos, config, cfgCorreo] = await Promise.all([catalogo(), configTienda(), configCorreo()]);
  const sitio = SITE_URL;
  const pct = config.descuentoSinTarjeta;
  const porId = new Map(todos.map((p) => [p.id, p]));
  const productos: ProductoCampana[] = d.ids
    .map((id) => porId.get(id))
    .filter((p): p is ProductoResumen => Boolean(p))
    .slice(0, 4)
    .map((p) => ({
      nombre: p.nombre,
      enlace: `${sitio}/producto/${p.slug}`,
      imagen: p.imagen ? (p.imagen.url.startsWith("http") ? p.imagen.url : `${sitio}${p.imagen.url}`) : null,
      precio: p.precioDesde,
      desde: p.precioHasta > p.precioDesde,
      precioRegular: p.precioDesdeRegular,
      precioEfectivo: precioConDescuento(p.precioDesde, pct),
      etiquetas: [
        p.condicion === "open_box" ? "Open Box" : p.condicion === "usado" ? "Usado" : "",
        p.disponibilidad === "bodega" ? "En bodega: entrega en menos de 24 h" : "",
        p.precioDesdeRegular && p.ofertaFin ? `Oferta hasta el ${fechaCortaSV(p.ofertaFin)}` : p.precioDesdeRegular ? "En oferta" : "",
      ].filter(Boolean),
    }));
  const correo = correoCampana(
    { sitio, whatsapp: enlaceWhatsAppA(config.whatsapp, "Hola, vi el correo de Nera Tech y quiero información"), negocio: config.negocio },
    {
      asunto: d.asunto,
      previa: d.previa,
      titulo: d.titulo,
      intro: d.intro,
      cierre: d.cierre,
      productos,
      pctEfectivo: pct,
      enlaceTienda: sitio,
    }
  );
  return { correo, productos: productos.length, remitente: { nombre: cfgCorreo.nombre, correo: cfgCorreo.remitente }, responderA: cfgCorreo.responder_a };
}
