import "server-only";
import { randomInt } from "node:crypto";
import { after } from "next/server";
import { sitioActual } from "@/lib/sitio";
import { enviarCorreo } from "@/lib/correo";
import { correoRegaloCumple, correoStockDisponible, type Marco } from "@/lib/correos/plantillas";
import { createServiceClient } from "@/lib/supabase/server";
import { reglasBeneficios } from "@/lib/tienda/beneficios";
import { configTienda } from "@/lib/tienda/datos";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

// Revisión diaria (cron de Vercel y botón "Revisar ahora" del panel):
// 1) regalo de cumpleaños: cupón personal para el mes del cumpleaños;
// 2) "ya hay stock": avisa a quienes pidieron "Avisame cuando haya".

const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const codigoNuevo = () => `CUMPLE-${Array.from({ length: 5 }, () => LETRAS[randomInt(LETRAS.length)]).join("")}`;

/** Mes actual en El Salvador (UTC−6) con su primer y último instante */
export function mesSV(ahora = new Date()) {
  const sv = new Date(ahora.getTime() - 6 * 3_600_000);
  const anio = sv.getUTCFullYear();
  const mes = sv.getUTCMonth(); // 0-11
  return {
    anio,
    mes: mes + 1,
    inicio: new Date(Date.UTC(anio, mes, 1, 6)).toISOString(),
    fin: new Date(Date.UTC(anio, mes + 1, 1, 6) - 1000).toISOString(),
  };
}

async function marcoCorreo(sitio: string): Promise<Marco> {
  const c = await configTienda();
  return {
    sitio,
    whatsapp: enlaceWhatsAppA(c.whatsapp, "Hola, les escribo desde un correo de Nera Tech. [correo]"),
    negocio: { nombre: c.negocio.nombre || "Nera Tech", nit: c.negocio.nit, direccion: c.negocio.direccion },
  };
}

/** Cupones de cumpleaños que el cliente todavía puede usar (para Mi cuenta) */
export async function regalosVigentes(clienteId: string) {
  const sb = createServiceClient();
  const { data } = await sb
    .from("cupones")
    .select("id, codigo, valor, min_pedido, fin")
    .eq("cliente_id", clienteId)
    .eq("origen", "cumple")
    .eq("activo", true)
    .gte("fin", new Date().toISOString());
  const lista = [];
  for (const c of data ?? []) {
    const { count } = await sb
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("cupon_id", c.id)
      .not("estado", "in", "(cancelado,devuelto)");
    if (!count) lista.push({ codigo: c.codigo as string, monto: Number(c.valor), minimo: Number(c.min_pedido), fin: c.fin as string });
  }
  return lista;
}

export type ResultadoRevision = {
  cumple: { creados: number; correos: number; sinPublicidad: number; errores: string[] };
  stock: { avisados: number; errores: string[] };
};

export async function regalosDeCumple(sitio: string, ahora = new Date()): Promise<ResultadoRevision["cumple"]> {
  const r: ResultadoRevision["cumple"] = { creados: 0, correos: 0, sinPublicidad: 0, errores: [] };
  const reglas = (await reglasBeneficios()).regalo;
  if (!reglas.activo) return r;
  const sb = createServiceClient();
  const m = mesSV(ahora);
  const { data: clientes, error } = await sb
    .from("clientes")
    .select("id, nombre, correo, acepta_correo, baja_token")
    .eq("cumple_mes", m.mes)
    .not("correo", "is", null)
    .limit(2000);
  if (error) {
    r.errores.push(error.message);
    return r;
  }
  if (!clientes?.length) return r;
  const { data: yaTienen, error: e0 } = await sb.from("cupones").select("cliente_id").eq("origen", "cumple").eq("inicio", m.inicio).limit(20000);
  if (e0) {
    r.errores.push(e0.message);
    return r;
  }
  const tienen = new Set((yaTienen ?? []).map((c) => c.cliente_id as string));
  const base = await marcoCorreo(sitio);

  for (const c of clientes) {
    if (tienen.has(c.id)) continue;
    // Código único (reintenta si choca con otro)
    let codigo = "";
    for (let i = 0; i < 5 && !codigo; i++) {
      const intento = codigoNuevo();
      const { error: e } = await sb.from("cupones").insert({
        codigo: intento,
        tipo: "monto",
        valor: reglas.monto,
        min_pedido: reglas.minimo,
        usos_max: 1,
        por_cliente: 1,
        inicio: m.inicio,
        fin: m.fin,
        cliente_id: c.id,
        origen: "cumple",
        descripcion: `Regalo de cumpleaños ${m.mes}/${m.anio}`,
        activo: true,
      });
      if (!e) codigo = intento;
      else if (e.code === "23505" && e.message.includes("cupones_cumple_unico")) break; // ya lo tenía (otra revisión al mismo tiempo)
      else if (e.code !== "23505") {
        r.errores.push(`Cliente ${c.correo}: ${e.message}`);
        break;
      }
    }
    if (!codigo) continue;
    r.creados++;
    const anotar = (estado: string) =>
      sb.from("cupones").update({ descripcion: `Regalo de cumpleaños ${m.mes}/${m.anio} · ${estado}` }).eq("codigo", codigo);
    if (!c.acepta_correo) {
      r.sinPublicidad++;
      await anotar("sin correo (no quiere publicidad; lo ve en Mi cuenta)");
      continue;
    }
    const baja = `${sitio}/baja/${c.baja_token}`;
    const correo = correoRegaloCumple(
      { ...base, baja, motivo: "Recibís este correo porque sos cliente de Nera Tech." },
      { nombre: c.nombre ?? "", codigo, monto: reglas.monto, minimo: reglas.minimo, fin: m.fin }
    );
    const env = await enviarCorreo({
      para: c.correo as string,
      nombrePara: c.nombre ?? undefined,
      asunto: correo.asunto,
      html: correo.html,
      texto: correo.texto,
      etiqueta: "regalo-cumple",
      encabezados: { "List-Unsubscribe": `<${sitio}/api/baja/${c.baja_token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (env.enviado) {
      r.correos++;
      await anotar("correo enviado");
    } else {
      r.errores.push(`${c.correo}: ${env.motivo}`);
      await anotar(`el correo no salió: ${env.motivo}`);
    }
  }
  return r;
}

type FilaProducto = {
  id: string;
  slug: string;
  nombre: string;
  estado: string;
  imagenes: { url: string; principal: boolean; orden: number }[];
  variantes: { id: string; precio: number; activo: boolean }[];
};

export async function avisosDeStock(sitio: string): Promise<ResultadoRevision["stock"]> {
  const r: ResultadoRevision["stock"] = { avisados: 0, errores: [] };
  const sb = createServiceClient();
  const { data: subs, error } = await sb
    .from("suscriptores")
    .select("id, correo, producto_id")
    .eq("origen", "aviso_stock")
    .eq("activo", true)
    .is("avisado_en", null)
    .not("producto_id", "is", null)
    .limit(2000);
  if (error) {
    r.errores.push(error.message);
    return r;
  }
  if (!subs?.length) return r;
  const ids = [...new Set(subs.map((s) => s.producto_id as string))];
  const { data: productos } = await sb
    .from("productos")
    .select("id, slug, nombre, estado, imagenes(url, principal, orden), variantes(id, precio, activo)")
    .in("id", ids);
  const variantes = (productos ?? []).flatMap((p) => (p as unknown as FilaProducto).variantes.map((v) => v.id));
  const { data: disp } = variantes.length
    ? await sb.from("disponibilidad_publica").select("variante_id, en_bodega, con_proveedor").in("variante_id", variantes)
    : { data: [] };
  const hay = new Set((disp ?? []).filter((d) => d.en_bodega || d.con_proveedor).map((d) => d.variante_id as string));
  const base = await marcoCorreo(sitio);

  for (const p of (productos ?? []) as unknown as FilaProducto[]) {
    if (p.estado === "agotado" || p.estado === "oculto") continue;
    const vendibles = p.variantes.filter((v) => v.activo && Number(v.precio) > 0 && hay.has(v.id));
    if (!vendibles.length) continue;
    const img = [...p.imagenes].sort((a, b) => Number(b.principal) - Number(a.principal) || a.orden - b.orden)[0];
    const correo = correoStockDisponible(base, {
      producto: p.nombre,
      enlace: `${sitio}/producto/${p.slug}`,
      precio: Math.min(...vendibles.map((v) => Number(v.precio))),
      imagen: img ? (img.url.startsWith("http") ? img.url : `${sitio}${img.url}`) : null,
    });
    for (const s of subs.filter((x) => x.producto_id === p.id)) {
      const env = await enviarCorreo({ para: s.correo as string, asunto: correo.asunto, html: correo.html, texto: correo.texto, etiqueta: "ya-hay-stock" });
      if (env.enviado) {
        r.avisados++;
        await sb.from("suscriptores").update({ avisado_en: new Date().toISOString(), activo: false }).eq("id", s.id);
      } else r.errores.push(`${s.correo}: ${env.motivo}`);
    }
  }
  return r;
}

export async function revisionDiaria(sitio: string): Promise<ResultadoRevision> {
  const [cumple, stock] = await Promise.all([regalosDeCumple(sitio), avisosDeStock(sitio)]);
  return { cumple, stock };
}

/** Desde una acción del panel: revisa los avisos de stock después de responder */
export async function avisarStockDespues() {
  try {
    const sitio = await sitioActual();
    after(() => avisosDeStock(sitio).catch((e) => console.error("avisosDeStock", e)));
  } catch (e) {
    console.error("avisarStockDespues", e);
  }
}
