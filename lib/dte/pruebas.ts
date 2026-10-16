import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { armarCreditoFiscal, armarFactura, type Emisor, type LineaVenta, type Pago, type ReceptorFactura, type ReceptorFiscal } from "./armar";
import { UNIDAD } from "./catalogos";
import { configDte, crearDocumentoPrueba, emitirNotaCredito, ErrorDte, faltantesEmisor, invalidar, procesarContingencias, transmitir } from "./emitir";
import { ambienteActual } from "./mh";
import { r2 } from "./montos";

// Pruebas mínimas que pide Hacienda antes de autorizar el paso a producción (Manual funcional XXIV):
// Factura 90, Crédito fiscal 75, Nota de crédito 50, Invalidación 5 y Contingencia 5, todas con sello.
// Solo funcionan con las claves del ambiente de pruebas (DTE_AMBIENTE=00). Los documentos quedan
// marcados como "prueba" y no tocan pedidos reales.

export const META_PRUEBAS = { "01": 90, "03": 75, "05": 50, invalidacion: 5, contingencia: 5 } as const;
export type Avance = Record<keyof typeof META_PRUEBAS, number>;

export async function avancePruebas(): Promise<Avance> {
  const sb = createServiceClient();
  const contar = async (tipo: string) =>
    (
      await sb
        .from("dte_documentos")
        .select("id", { count: "exact", head: true })
        .eq("ambiente", "00")
        .eq("prueba", true)
        .eq("tipo_dte", tipo)
        .in("estado", ["procesado", "invalidado"])
    ).count ?? 0;
  const eventos = async (tipo: string) =>
    (
      await sb
        .from("dte_eventos")
        .select("id", { count: "exact", head: true })
        .eq("ambiente", "00")
        .eq("prueba", true)
        .eq("tipo", tipo)
        .eq("estado", "procesado")
    ).count ?? 0;
  const [f, c, n, i, k] = await Promise.all([contar("01"), contar("03"), contar("05"), eventos("invalidacion"), eventos("contingencia")]);
  return { "01": f, "03": c, "05": n, invalidacion: i, contingencia: k };
}

const azar = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];

async function productosDePrueba(): Promise<{ codigo: string | null; nombre: string; precio: number }[]> {
  const { data } = await createServiceClient()
    .from("variantes")
    .select("sku, nombre, precio, productos(nombre)")
    .not("precio", "is", null)
    .gt("precio", 0)
    .limit(80);
  const lista = (data ?? []).map((v) => ({
    codigo: (v.sku as string | null) ?? null,
    nombre: `${(v.productos as unknown as { nombre: string } | null)?.nombre ?? "Producto"}${v.nombre ? ` ${v.nombre}` : ""}`.trim(),
    precio: Number(v.precio),
  }));
  return lista.length ? lista : [{ codigo: "PRUEBA", nombre: "Accesorio de prueba", precio: 12.5 }];
}

function lineasAlAzar(productos: { codigo: string | null; nombre: string; precio: number }[]): LineaVenta[] {
  const n = 1 + Math.floor(Math.random() * 3);
  const lineas: LineaVenta[] = Array.from({ length: n }, () => {
    const p = azar(productos);
    const cantidad = Math.random() < 0.8 ? 1 : 2;
    const conDescuento = Math.random() < 0.3;
    return {
      codigo: p.codigo,
      descripcion: p.nombre,
      cantidad,
      precio: p.precio,
      descuento: conDescuento ? r2(p.precio * cantidad * 0.06) : 0,
      tipoItem: 1,
      uniMedida: UNIDAD.unidad,
    };
  });
  if (Math.random() < 0.6) lineas.push({ codigo: "ENVIO", descripcion: "Envío a domicilio", cantidad: 1, precio: 5, descuento: 0, tipoItem: 2, uniMedida: UNIDAD.otra });
  return lineas;
}

const totalCon = (l: LineaVenta[]) => r2(l.reduce((s, x) => s + x.precio * x.cantidad - x.descuento, 0));
const pagoAlAzar = (total: number): Pago[] => [{ codigo: azar(["01", "03", "05"]), monto: total, referencia: Math.random() < 0.5 ? `PRUEBA-${Date.now() % 100000}` : null }];

const NOMBRES = ["María López", "José Hernández", "Ana Martínez", "Carlos Rivas", "Sofía Méndez", null];

/** Cliente de prueba para créditos fiscales: el configurado, o los datos del propio emisor. */
function receptorPrueba(emisor: Emisor, cfg: Awaited<ReturnType<typeof configDte>>): ReceptorFiscal {
  const r = cfg.receptorPrueba;
  return {
    nit: r?.nit || emisor.nit,
    nrc: r?.nrc || emisor.nrc,
    nombre: r?.nombre || emisor.nombre,
    nombreComercial: null,
    codActividad: r?.codActividad || emisor.codActividad,
    descActividad: r?.descActividad || emisor.descActividad,
    direccion: r?.direccion || emisor.direccion,
    telefono: emisor.telefono,
    correo: emisor.correo,
  };
}

/**
 * Hace una tanda de pruebas (unas 8 operaciones, para no pasar el tiempo de una petición) y devuelve
 * el avance. Se llama varias veces desde el panel hasta completar todo.
 */
export async function tandaDePruebas(usuario: string, tamano = 8) {
  if (ambienteActual() !== "00") throw new ErrorDte("Las pruebas solo se hacen con las claves del ambiente de pruebas (DTE_AMBIENTE=00).");
  const cfg = await configDte();
  const faltan = faltantesEmisor(cfg.emisor);
  if (faltan.length) throw new ErrorDte("Faltan datos del emisor en Panel → Facturación.", faltan);
  const emisor = cfg.emisor as Emisor;
  const sb = createServiceClient();
  const productos = await productosDePrueba();
  const registro: string[] = [];
  let avance = await avancePruebas();
  const creditoFiscal = async () => {
    const lineas = lineasAlAzar(productos);
    const receptor = receptorPrueba(emisor, cfg);
    const id = await crearDocumentoPrueba("03", (ident) => armarCreditoFiscal({ id: ident, emisor, receptor, lineas, pagos: pagoAlAzar(totalCon(lineas)), observaciones: "Documento de prueba" }), emisor, usuario, receptor.nombre);
    const r = await transmitir(id, usuario);
    registro.push(`Crédito fiscal ${r.numeroControl}: ${r.mensaje}`);
  };

  for (let i = 0; i < tamano; i++) {
    try {
      if (avance["01"] < META_PRUEBAS["01"]) {
        const lineas = lineasAlAzar(productos);
        const nombre = azar(NOMBRES);
        const receptor: ReceptorFactura = {
          nombre,
          tipoDocumento: null,
          numDocumento: null,
          telefono: nombre ? "70000000" : null,
          correo: nombre ? emisor.correo : null,
          direccion: null,
        };
        const id = await crearDocumentoPrueba("01", (ident) => armarFactura({ id: ident, emisor, receptor, lineas, pagos: pagoAlAzar(totalCon(lineas)), observaciones: "Documento de prueba" }), emisor, usuario, receptor.nombre);
        const r = await transmitir(id, usuario);
        registro.push(`Factura ${r.numeroControl}: ${r.mensaje}`);
      } else if (avance["03"] < META_PRUEBAS["03"]) {
        await creditoFiscal();
      } else if (avance["05"] < META_PRUEBAS["05"]) {
        // Un crédito fiscal de prueba recibido y sin notas: se devuelve una unidad de su primera línea
        const { data: ccfs } = await sb
          .from("dte_documentos")
          .select("id, json")
          .eq("ambiente", "00")
          .eq("prueba", true)
          .eq("tipo_dte", "03")
          .eq("estado", "procesado")
          .order("created_at", { ascending: false })
          .limit(80);
        const { data: conNota } = await sb.from("dte_documentos").select("relacionado_id").eq("tipo_dte", "05").eq("prueba", true).not("relacionado_id", "is", null);
        const usados = new Set((conNota ?? []).map((x) => x.relacionado_id));
        const libre = (ccfs ?? []).find((x) => !usados.has(x.id));
        if (!libre) {
          // Hace falta un crédito fiscal sin notas: se emite uno más (también cuenta para Hacienda)
          await creditoFiscal();
          avance = await avancePruebas();
          continue;
        }
        const r = await emitirNotaCredito({ ccfId: libre.id, cantidades: { 1: 1 }, motivo: "Prueba: devolución de una unidad", usuario, prueba: true });
        registro.push(`Nota de crédito ${r.numeroControl}: ${r.mensaje}`);
      } else if (avance.invalidacion < META_PRUEBAS.invalidacion) {
        const { data: fe } = await sb
          .from("dte_documentos")
          .select("id, numero_control")
          .eq("ambiente", "00")
          .eq("prueba", true)
          .eq("tipo_dte", "01")
          .eq("estado", "procesado")
          .order("created_at")
          .limit(1)
          .maybeSingle();
        if (!fe) {
          registro.push("No hay facturas de prueba recibidas para anular.");
          break;
        }
        const r = await invalidar({ documentoId: fe.id, tipo: 2, motivo: "Prueba de anulación: operación rescindida", usuario });
        registro.push(`Anulación de ${fe.numero_control}: ${r.mensaje}`);
      } else if (avance.contingencia < META_PRUEBAS.contingencia) {
        const lineas = lineasAlAzar(productos);
        const receptor: ReceptorFactura = { nombre: azar(NOMBRES), tipoDocumento: null, numDocumento: null, telefono: null, correo: null, direccion: null };
        await crearDocumentoPrueba(
          "01",
          (ident) => armarFactura({ id: ident, emisor, receptor, lineas, pagos: pagoAlAzar(totalCon(lineas)), observaciones: "Documento de prueba en contingencia" }),
          emisor,
          usuario,
          receptor.nombre,
          { tipo: 5, motivo: "Prueba del proceso de contingencia del sistema de facturación" }
        );
        const r = await procesarContingencias("00", usuario, true);
        registro.push(`Contingencia: ${r.eventos} evento(s), ${r.enviados} documento(s) recibido(s)${r.mensaje ? ` · ${r.mensaje}` : ""}`);
      } else {
        break;
      }
    } catch (e) {
      registro.push(`Error: ${e instanceof Error ? e.message : String(e)}${e instanceof ErrorDte && e.detalles.length ? ` (${e.detalles.join("; ")})` : ""}`);
      break;
    }
    avance = await avancePruebas();
  }
  const completo = (Object.keys(META_PRUEBAS) as (keyof typeof META_PRUEBAS)[]).every((k) => avance[k] >= META_PRUEBAS[k]);
  return { avance, registro, completo };
}
