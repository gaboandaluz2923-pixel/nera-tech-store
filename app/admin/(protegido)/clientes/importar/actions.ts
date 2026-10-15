"use server";

import { revalidatePath } from "next/cache";
import { superAdmin } from "@/lib/admin/sesion";
import { subirContactosBrevo } from "@/lib/brevo-contactos";
import { ETIQUETA_HISTORIAL, agruparPersonas, marcaNota, notaCompra, telefonosDe, type FilaOrden } from "@/lib/clientes/excel-ordenes";

// Importar al CRM a los clientes que compraron antes (Excel, pestaña ORDENES) y mandar la lista a Brevo.
// Se puede correr más de una vez: no repite clientes (mismo teléfono o correo) ni notas (cada una lleva su marca [Excel #N]).

export type ResultadoImportacion = {
  ok: boolean;
  mensaje: string;
  personas?: number;
  nuevos?: number;
  actualizados?: number;
  notas?: number;
  conCorreo?: number;
  conTelefono?: number;
};

const corto = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

/** Lo que llega del navegador se vuelve a limpiar: no se confía en el formato */
function sanear(filas: unknown): FilaOrden[] {
  if (!Array.isArray(filas)) return [];
  return filas.slice(0, 5000).map((f) => {
    const o = (f ?? {}) as Record<string, unknown>;
    const correo = corto(o.correo, 120)?.toLowerCase() ?? null;
    const total = Number(o.total);
    return {
      numero: Number.isInteger(Number(o.numero)) ? Number(o.numero) : null,
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(o.fecha ?? "")) ? String(o.fecha) : null,
      nombre: corto(o.nombre, 120) ?? "",
      direccion: corto(o.direccion, 300),
      telefonos: Array.isArray(o.telefonos) ? o.telefonos.flatMap((t) => telefonosDe(t)).slice(0, 3) : [],
      correo: correo && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) ? correo : null,
      pedido: corto(o.pedido, 120),
      bundle: corto(o.bundle, 120),
      capacidad: corto(o.capacidad, 40),
      formaPago: corto(o.formaPago, 40),
      total: Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : null,
      envio: corto(o.envio, 40),
      estado: corto(o.estado, 40),
      notas: corto(o.notas, 200),
    };
  });
}

type Existente = { id: string; telefono: string | null; telefono_alterno: string | null; correo: string | null; direccion: unknown; etiquetas: string[] };

export async function importarClientesExcel(filas: unknown, soloRevisar: boolean): Promise<ResultadoImportacion> {
  const { supabase, usuario } = await superAdmin();
  const personas = agruparPersonas(sanear(filas));
  if (!personas.length) return { ok: false, mensaje: "No hay clientes con teléfono o correo en el archivo." };

  // Todo el CRM (es chico): así se encuentran por teléfono, teléfono alterno o correo (sin importar mayúsculas)
  const existentes = new Map<string, Existente>();
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, telefono, telefono_alterno, correo, direccion, etiquetas")
      .order("created_at")
      .range(desde, desde + 999);
    if (error) return { ok: false, mensaje: `No se pudo leer el CRM: ${error.message}` };
    for (const x of (data ?? []) as Existente[]) existentes.set(x.id, x);
    if (!data || data.length < 1000) break;
  }
  const porClave = new Map<string, Existente>();
  for (const x of existentes.values()) {
    if (x.telefono) porClave.set(`t:${x.telefono}`, x);
    if (x.telefono_alterno && !porClave.has(`t:${x.telefono_alterno}`)) porClave.set(`t:${x.telefono_alterno}`, x);
    if (x.correo) porClave.set(`c:${x.correo.toLowerCase()}`, x);
  }
  const correosUsados = new Set([...existentes.values()].map((x) => x.correo?.toLowerCase()).filter(Boolean));

  const nuevos: { persona: (typeof personas)[number]; fila: Record<string, unknown> }[] = [];
  const cambios: { id: string; datos: Record<string, unknown> }[] = [];
  const clienteDe = new Map<string, string>(); // clave de la persona → id (de los que ya existen)
  for (const p of personas) {
    const x = [...p.telefonos.map((t) => porClave.get(`t:${t}`)), p.correo ? porClave.get(`c:${p.correo}`) : undefined].find(Boolean);
    const direccion = p.direccion ? { zona: null, departamento: null, municipio: null, direccion: p.direccion, referencia: null } : null;
    if (!x) {
      nuevos.push({
        persona: p,
        fila: {
          nombre: p.nombre,
          telefono: p.telefonos[0] ?? null,
          telefono_alterno: p.telefonos[1] ?? null,
          correo: p.correo,
          direccion,
          origen: "historial",
          etiquetas: [ETIQUETA_HISTORIAL],
        },
      });
      continue;
    }
    clienteDe.set(p.clave, x.id);
    // Solo se completa lo que falta; lo que ya está en el CRM no se pisa
    const datos: Record<string, unknown> = {};
    if (!x.telefono && p.telefonos[0]) datos.telefono = p.telefonos[0];
    const otro = p.telefonos.find((t) => t !== (x.telefono ?? datos.telefono));
    if (!x.telefono_alterno && otro) datos.telefono_alterno = otro;
    if (!x.correo && p.correo && !correosUsados.has(p.correo)) {
      datos.correo = p.correo;
      correosUsados.add(p.correo);
    }
    if (!x.direccion && direccion) datos.direccion = direccion;
    if (!(x.etiquetas ?? []).includes(ETIQUETA_HISTORIAL)) datos.etiquetas = [...(x.etiquetas ?? []), ETIQUETA_HISTORIAL];
    if (Object.keys(datos).length) cambios.push({ id: x.id, datos });
  }

  // Notas que ya están (por si se importa otra vez)
  const yaNotas = new Set<string>();
  const ids = [...new Set(clienteDe.values())];
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabase
      .from("cliente_notas")
      .select("cliente_id, nota")
      .in("cliente_id", ids.slice(i, i + 150))
      .like("nota", "%[Excel #%");
    for (const n of data ?? []) {
      const m = String(n.nota).match(/\[Excel #[^\]]*\]/);
      if (m) yaNotas.add(`${n.cliente_id}|${m[0]}`);
    }
  }
  const notasPendientes = (clienteId: string | undefined, p: (typeof personas)[number]) =>
    p.compras.filter((o) => !clienteId || !yaNotas.has(`${clienteId}|${marcaNota(o)}`));
  const totalNotas = personas.reduce((s, p) => s + notasPendientes(clienteDe.get(p.clave), p).length, 0);
  const resumen = {
    personas: personas.length,
    nuevos: nuevos.length,
    actualizados: cambios.length,
    notas: totalNotas,
    conCorreo: personas.filter((p) => p.correo).length,
    conTelefono: personas.filter((p) => p.telefonos.length).length,
  };
  if (soloRevisar) {
    return {
      ok: true,
      mensaje: `${resumen.personas} clientes en el archivo: ${resumen.nuevos} nuevos y ${resumen.personas - resumen.nuevos} que ya están en el CRM. Se agregarán ${resumen.notas} notas de compras.`,
      ...resumen,
    };
  }

  // Nuevos
  for (let i = 0; i < nuevos.length; i += 200) {
    const lote = nuevos.slice(i, i + 200);
    const { data, error } = await supabase.from("clientes").insert(lote.map((n) => n.fila)).select("id, telefono, correo");
    if (error) return { ok: false, mensaje: `Se detuvo al crear clientes (${i} creados): ${error.message}` };
    for (const c of data ?? []) {
      const p = lote.find((n) => (c.telefono && n.fila.telefono === c.telefono) || (c.correo && n.fila.correo === c.correo))?.persona;
      if (p) clienteDe.set(p.clave, c.id as string);
    }
  }
  // Datos que faltaban en los que ya existían
  for (const c of cambios) {
    const { error } = await supabase.from("clientes").update(c.datos).eq("id", c.id);
    if (error) console.error("importar cliente", c.id, error.message);
  }
  // Una nota por compra
  const notas = personas.flatMap((p) => {
    const id = clienteDe.get(p.clave);
    return id ? notasPendientes(id, p).map((o) => ({ cliente_id: id, nota: notaCompra(o), usuario })) : [];
  });
  for (let i = 0; i < notas.length; i += 300) {
    const { error } = await supabase.from("cliente_notas").insert(notas.slice(i, i + 300));
    if (error) return { ok: false, mensaje: `Los clientes quedaron, pero se detuvo al guardar notas: ${error.message}` };
  }
  revalidatePath("/admin/clientes");
  return {
    ok: true,
    mensaje: `Listo: ${resumen.nuevos} clientes nuevos, ${resumen.actualizados} completados y ${notas.length} notas de compras. Tienen la etiqueta «${ETIQUETA_HISTORIAL}».`,
    ...resumen,
    notas: notas.length,
  };
}

/** Lista "Clientes Nera Tech" en Brevo: todos los clientes con correo que aceptan publicidad */
export async function sincronizarBrevo(): Promise<ResultadoImportacion> {
  const { supabase } = await superAdmin();
  const contactos: { correo: string; nombre: string; telefono: string | null }[] = [];
  for (let desde = 0; desde < 20000; desde += 1000) {
    const { data, error } = await supabase
      .from("clientes")
      .select("nombre, correo, telefono")
      .not("correo", "is", null)
      .eq("acepta_correo", true)
      .order("created_at")
      .range(desde, desde + 999);
    if (error) return { ok: false, mensaje: `No se pudo leer el CRM: ${error.message}` };
    for (const c of data ?? []) {
      if (c.correo) contactos.push({ correo: String(c.correo).toLowerCase(), nombre: String(c.nombre ?? ""), telefono: (c.telefono as string | null) ?? null });
    }
    if (!data || data.length < 1000) break;
  }
  if (!contactos.length) return { ok: false, mensaje: "No hay clientes con correo que acepten publicidad." };
  // Un teléfono repetido hace que Brevo rechace el contacto: solo el primero lo lleva
  const vistos = new Set<string>();
  for (const c of contactos) {
    if (c.telefono && vistos.has(c.telefono)) c.telefono = null;
    else if (c.telefono) vistos.add(c.telefono);
  }
  try {
    const r = await subirContactosBrevo("Clientes Nera Tech", contactos);
    return {
      ok: true,
      mensaje: `Se mandaron ${r.enviados} contactos a la lista «Clientes Nera Tech» de Brevo. Aparecen en Brevo → Contactos → Listas en unos minutos.`,
    };
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "Brevo no respondió." };
  }
}
