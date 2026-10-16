import "server-only";

// Campañas de correo de Brevo (https://developers.brevo.com/reference/getemailcampaigns-1): las que están
// agendadas, los borradores y las últimas enviadas con sus resultados. Solo lectura.

export type CampanaBrevo = {
  id: number;
  nombre: string;
  asunto: string;
  estado: string;
  agendadaPara: string | null;
  enviadaEl: string | null;
  listas: number[];
  entregados: number | null;
  abiertos: number | null;
  clics: number | null;
};

type Respuesta = {
  campaigns?: {
    id: number;
    name: string;
    subject?: string;
    status: string;
    scheduledAt?: string | null;
    sentDate?: string | null;
    recipients?: { lists?: number[] };
    statistics?: { globalStats?: { delivered?: number; uniqueViews?: number; uniqueClicks?: number } };
  }[];
};

async function leer(estado: string, limite: number, conEstadisticas = false): Promise<CampanaBrevo[]> {
  const clave = process.env.BREVO_API_KEY?.trim();
  if (!clave) throw new Error("Falta BREVO_API_KEY en Vercel.");
  const params = new URLSearchParams({
    type: "classic",
    status: estado,
    limit: String(limite),
    offset: "0",
    sort: "desc",
    excludeHtmlContent: "true",
    ...(conEstadisticas ? { statistics: "globalStats" } : {}),
  });
  const r = await fetch(`https://api.brevo.com/v3/emailCampaigns?${params}`, {
    headers: { "api-key": clave, accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Brevo respondió ${r.status}`);
  const d = (await r.json()) as Respuesta;
  return (d.campaigns ?? []).map((c) => ({
    id: c.id,
    nombre: c.name,
    asunto: c.subject ?? "",
    estado: c.status,
    agendadaPara: c.scheduledAt ?? null,
    enviadaEl: c.sentDate ?? null,
    listas: c.recipients?.lists ?? [],
    entregados: c.statistics?.globalStats?.delivered ?? null,
    abiertos: c.statistics?.globalStats?.uniqueViews ?? null,
    clics: c.statistics?.globalStats?.uniqueClicks ?? null,
  }));
}

/** Agendadas (de la más próxima a la última), borradores y las 5 últimas enviadas */
export async function campanasBrevo() {
  const [agendadas, borradores, enviadas] = await Promise.all([leer("queued", 50), leer("draft", 20), leer("sent", 5, true)]);
  return {
    agendadas: agendadas.sort((a, b) => (a.agendadaPara ?? "").localeCompare(b.agendadaPara ?? "")),
    borradores,
    enviadas,
  };
}
