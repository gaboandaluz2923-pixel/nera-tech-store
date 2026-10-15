import "server-only";

// Contactos de Brevo (https://developers.brevo.com/reference/importcontacts-1): una lista con los clientes
// que aceptan correos, para mandarles campañas desde Brevo. La clave es la misma BREVO_API_KEY de Vercel.

const API = "https://api.brevo.com/v3";

export type ContactoBrevo = { correo: string; nombre: string; telefono: string | null };

async function brevo<T>(ruta: string, init?: RequestInit): Promise<T> {
  const clave = process.env.BREVO_API_KEY?.trim();
  if (!clave) throw new Error("Falta BREVO_API_KEY en Vercel.");
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { "api-key": clave, "content-type": "application/json", accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${texto.slice(0, 200)}`);
  return (texto ? JSON.parse(texto) : {}) as T;
}

/** Id de la lista con ese nombre; si no existe, la crea (en la primera carpeta, o en una nueva "Nera Tech") */
async function idDeLista(nombre: string): Promise<number> {
  for (let offset = 0; offset < 1000; offset += 50) {
    const r = await brevo<{ lists?: { id: number; name: string }[]; count?: number }>(`/contacts/lists?limit=50&offset=${offset}`);
    const lista = r.lists?.find((l) => l.name.trim().toLowerCase() === nombre.toLowerCase());
    if (lista) return lista.id;
    if (!r.lists?.length || r.lists.length < 50) break;
  }
  const carpetas = await brevo<{ folders?: { id: number }[] }>("/contacts/folders?limit=10&offset=0");
  const carpeta =
    carpetas.folders?.[0]?.id ?? (await brevo<{ id: number }>("/contacts/folders", { method: "POST", body: JSON.stringify({ name: "Nera Tech" }) })).id;
  const nueva = await brevo<{ id: number }>("/contacts/lists", { method: "POST", body: JSON.stringify({ name: nombre, folderId: carpeta }) });
  return nueva.id;
}

/**
 * Sube (o actualiza) los contactos a la lista. Brevo los procesa en segundo plano: en unos minutos
 * aparecen en Contactos → Listas. El teléfono va en SMS con +503 (Brevo lo usa para SMS y WhatsApp).
 */
export async function subirContactosBrevo(nombreLista: string, contactos: ContactoBrevo[]) {
  const listaId = await idDeLista(nombreLista);
  const lotes: ContactoBrevo[][] = [];
  for (let i = 0; i < contactos.length; i += 2000) lotes.push(contactos.slice(i, i + 2000));
  for (const lote of lotes) {
    await brevo("/contacts/import", {
      method: "POST",
      body: JSON.stringify({
        listIds: [listaId],
        updateExistingContacts: true,
        emptyContactsAttributes: false,
        jsonBody: lote.map((c) => {
          const [nombre, ...resto] = c.nombre.trim().split(/\s+/);
          return {
            email: c.correo,
            attributes: {
              FIRSTNAME: nombre ?? "",
              LASTNAME: resto.join(" "),
              ...(c.telefono ? { SMS: `+503${c.telefono}` } : {}),
            },
          };
        }),
      }),
    });
  }
  return { listaId, enviados: contactos.length };
}
