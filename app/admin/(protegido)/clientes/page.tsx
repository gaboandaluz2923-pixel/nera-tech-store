import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { CANAL } from "@/lib/admin/pedidos";
import { rolActual } from "@/lib/admin/sesion";
import { createClient } from "@/lib/supabase/server";
import { fechaCorta, usd2 } from "@/lib/tienda/formato";
import { POR_PAGINA, Paginacion, leerPagina } from "@/components/admin/paginacion";

// Clientes (CRM): todos los que compraron por la tienda o por WhatsApp, redes y en persona.

type Fila = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  correo: string | null;
  etiquetas: string[];
  con_cuenta: boolean;
  pedidos: number;
  total_comprado: number;
  ultima_compra: string | null;
  canales: string[];
};

const ORDENES = [
  { id: "recientes", texto: "Compra más reciente", columna: "ultima_compra" },
  { id: "mas-compran", texto: "Más compran", columna: "total_comprado" },
  { id: "nuevos", texto: "Recién agregados", columna: "created_at" },
  { id: "nombre", texto: "Nombre (A–Z)", columna: "nombre" },
] as const;

const CONTACTO = {
  "": "Cualquier contacto",
  "con-correo": "Con correo",
  "sin-correo": "Sin correo",
  "con-telefono": "Con teléfono",
} as const;

const COMPRAS = {
  "": "Con o sin pedidos",
  "con-pedidos": "Con pedidos en el sistema",
  "sin-pedidos": "Sin pedidos en el sistema",
  "2-o-mas": "2 pedidos o más",
} as const;

const ORIGEN = {
  "": "Cualquier origen",
  web: "Compró en la tienda",
  panel: "Creado en el panel",
  historial: "Excel (cliente anterior)",
  google: "Entró con Google",
} as const;

type Filtros = { q?: string; orden?: string; etiqueta?: string; contacto?: string; compras?: string; origen?: string; canal?: string; pagina?: string };

const SELECT = "h-9 rounded-md border bg-background px-2 text-sm";

async function Lista({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const { q = "", etiqueta = "" } = f;
  const o = ORDENES.find((x) => x.id === f.orden) ?? ORDENES[0];
  const contacto = (f.contacto ?? "") in CONTACTO ? (f.contacto ?? "") : "";
  const compras = (f.compras ?? "") in COMPRAS ? (f.compras ?? "") : "";
  const origen = (f.origen ?? "") in ORIGEN ? (f.origen ?? "") : "";
  const canal = f.canal && f.canal in CANAL ? f.canal : "";
  const pagina = leerPagina(f.pagina);
  const supabase = await createClient();

  let consulta = supabase
    .from("clientes_resumen")
    .select("id, nombre, telefono, correo, etiquetas, con_cuenta, pedidos, total_comprado, ultima_compra, canales", { count: "exact" })
    .order(o.columna, { ascending: o.id === "nombre", nullsFirst: false })
    .order("id")
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  // Sin comas ni paréntesis: no rompen el filtro
  const busca = q.replace(/[^\p{L}\p{N}@.\s-]/gu, "").trim();
  if (busca) {
    const tel = busca.replace(/\D/g, "");
    consulta = consulta.or(
      [`nombre.ilike.%${busca}%`, `correo.ilike.%${busca}%`, tel.length >= 4 ? `telefono.ilike.%${tel}%` : ""].filter(Boolean).join(",")
    );
  }
  if (etiqueta) consulta = consulta.contains("etiquetas", [etiqueta]);
  if (contacto === "con-correo") consulta = consulta.not("correo", "is", null);
  if (contacto === "sin-correo") consulta = consulta.is("correo", null);
  if (contacto === "con-telefono") consulta = consulta.not("telefono", "is", null);
  if (compras === "con-pedidos") consulta = consulta.gt("pedidos", 0);
  if (compras === "sin-pedidos") consulta = consulta.eq("pedidos", 0);
  if (compras === "2-o-mas") consulta = consulta.gte("pedidos", 2);
  if (origen) consulta = consulta.eq("origen", origen);
  if (canal) consulta = consulta.contains("canales", [canal]);

  const [{ data, error, count }, { data: todas }] = await Promise.all([
    consulta,
    supabase.from("clientes").select("etiquetas").neq("etiquetas", "{}").limit(5000),
  ]);
  if (error) throw error;
  const clientes = (data ?? []) as Fila[];
  const etiquetas = [...new Set((todas ?? []).flatMap((c) => (c.etiquetas ?? []) as string[]))].sort();
  const actuales: Record<string, string> = { q, orden: o.id, etiqueta, contacto, compras, origen, canal };
  const enlace = (cambio: Record<string, string>) => {
    const p = new URLSearchParams({ ...actuales, ...cambio });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/clientes?${p}`;
  };
  const hayFiltros = Boolean(busca || etiqueta || contacto || compras || origen || canal);

  return (
    <div className="space-y-4">
      {/* Buscar y filtrar: se aplica con el botón (o Enter en el buscador) */}
      <form action="/admin/clientes" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="orden" value={o.id} />
        {etiqueta ? <input type="hidden" name="etiqueta" value={etiqueta} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, teléfono o correo"
          aria-label="Buscar cliente"
          className="h-9 w-72 max-w-full rounded-md border px-3 text-sm"
        />
        <select name="contacto" defaultValue={contacto} aria-label="Contacto" className={SELECT}>
          {Object.entries(CONTACTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="compras" defaultValue={compras} aria-label="Pedidos" className={SELECT}>
          {Object.entries(COMPRAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="origen" defaultValue={origen} aria-label="Origen" className={SELECT}>
          {Object.entries(ORIGEN).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="canal" defaultValue={canal} aria-label="Canal" className={SELECT}>
          <option value="">Cualquier canal</option>
          {Object.entries(CANAL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Buscar
        </button>
        {hayFiltros ? (
          <Link href={`/admin/clientes?orden=${o.id}`} className="text-sm text-muted-foreground underline">
            Quitar filtros
          </Link>
        ) : null}
      </form>
      <nav className="flex flex-wrap gap-1" aria-label="Orden">
        {ORDENES.map((x) => (
          <Link
            key={x.id}
            href={enlace({ orden: x.id })}
            className={`rounded-full border px-3 py-1.5 text-sm ${x.id === o.id ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
          >
            {x.texto}
          </Link>
        ))}
      </nav>
      {etiquetas.length ? (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-1 text-muted-foreground">Etiquetas:</span>
          {etiquetas.map((e) => (
            <Link
              key={e}
              href={enlace({ etiqueta: e === etiqueta ? "" : e })}
              className={`rounded-full px-2 py-0.5 text-xs ${e === etiqueta ? "bg-marca text-white" : "bg-muted hover:bg-muted/70"}`}
            >
              {e}
            </Link>
          ))}
        </div>
      ) : null}

      {clientes.length ? (
        <ul className="divide-y rounded-lg border">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/clientes/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50">
                <span className="min-w-48 flex-1">
                  <span className="block font-medium">{c.nombre || "Sin nombre"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[c.telefono, c.correo].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </span>
                  {c.etiquetas?.length ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {c.etiquetas.map((e) => (
                        <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          {e}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.canales?.length ? c.canales.map((x) => CANAL[x] ?? x).join(", ") : ""}
                  {c.ultima_compra ? <span className="block">Última: {fechaCorta(c.ultima_compra)}</span> : null}
                </span>
                <span className="w-28 text-right">
                  <span className="block font-semibold tabular-nums">{usd2(Number(c.total_comprado))}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.pedidos} {Number(c.pedidos) === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay clientes con esa búsqueda.</p>
      )}
      <Paginacion pagina={pagina} total={count ?? 0} enlace={(n) => enlace({ pagina: String(n) })} />
    </div>
  );
}

async function EnlaceImportar() {
  const { rol } = await rolActual();
  if (rol !== "super_admin") return null;
  return (
    <Link href="/admin/clientes/importar" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
      Importar del Excel · Brevo
    </Link>
  );
}

export default function Clientes(props: PageProps<"/admin/clientes">) {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Todos los que compraron, por la tienda o por WhatsApp, redes y en persona. Tocá uno para ver su historial, sus datos y
            sus notas.
          </p>
        </div>
        <Suspense fallback={null}>
          <EnlaceImportar />
        </Suspense>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Lista searchParams={props.searchParams as Promise<Filtros>} />
      </Suspense>
    </div>
  );
}
