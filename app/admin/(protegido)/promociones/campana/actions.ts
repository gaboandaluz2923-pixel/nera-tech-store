"use server";

import { revalidatePath } from "next/cache";
import { armarCampana, TIPOS_CAMPANA, type TipoCampana } from "@/lib/admin/campanas";
import { superAdmin } from "@/lib/admin/sesion";
import { crearBorradorBrevo } from "@/lib/brevo-campanas";
import { idDeLista } from "@/lib/brevo-contactos";

export type DatosCampana = {
  tipo: TipoCampana;
  ids: string[];
  asunto: string;
  previa: string;
  titulo: string;
  intro: string;
  cierre: string;
};

export type ResultadoCampana = { ok: true; html: string; mensaje?: string } | { ok: false; mensaje: string };

const corto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function revisar(d: DatosCampana) {
  const limpio = {
    tipo: (d.tipo in TIPOS_CAMPANA ? d.tipo : "libre") as TipoCampana,
    ids: Array.isArray(d.ids) ? d.ids.map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 4) : [],
    asunto: corto(d.asunto, 150),
    previa: corto(d.previa, 150),
    titulo: corto(d.titulo, 120),
    intro: corto(d.intro, 1500),
    cierre: corto(d.cierre, 500),
  };
  if (limpio.asunto.length < 5) return { error: "Escribí el asunto (lo primero que ve el cliente en su bandeja)." };
  if (limpio.titulo.length < 3) return { error: "Escribí el titular del correo." };
  if (!limpio.ids.length) return { error: "Elegí al menos un producto." };
  return { limpio };
}

export async function previsualizarCampana(d: DatosCampana): Promise<ResultadoCampana> {
  await superAdmin();
  const r = revisar(d);
  if (!r.limpio) return { ok: false, mensaje: r.error! };
  const { correo } = await armarCampana(r.limpio);
  return { ok: true, html: correo.html };
}

export async function crearCampana(d: DatosCampana): Promise<ResultadoCampana> {
  await superAdmin();
  const r = revisar(d);
  if (!r.limpio) return { ok: false, mensaje: r.error! };
  const { correo, remitente, responderA } = await armarCampana(r.limpio);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  try {
    const listaId = await idDeLista("Clientes Nera Tech");
    await crearBorradorBrevo({
      nombre: `${TIPOS_CAMPANA[r.limpio.tipo].nombre} · ${hoy}`,
      asunto: correo.asunto,
      previa: r.limpio.previa,
      html: correo.html,
      remitente,
      responderA: responderA || undefined,
      listaId,
      utm: `${r.limpio.tipo}-${hoy}`,
    });
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "Brevo no respondió." };
  }
  revalidatePath("/admin/promociones");
  return {
    ok: true,
    html: correo.html,
    mensaje: "Borrador creado en Brevo para la lista «Clientes Nera Tech». Revisalo en Brevo → Campañas y agendalo (o mandate una prueba primero).",
  };
}
