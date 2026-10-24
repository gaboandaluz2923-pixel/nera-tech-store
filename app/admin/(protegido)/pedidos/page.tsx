import Link from "next/link";
import { Suspense } from "react";
import { CANAL, esperandoPago, porFacturar, type PedidoBase } from "@/lib/admin/pedidos";
import { createClient } from "@/lib/supabase/server";
import { estadoDinero } from "@/lib/admin/cierre-pedido";
import { ESTADO_PEDIDO, FORMA_PAGO, fechaHora, usd2 } from "@/lib/tienda/formato";

type Fila = PedidoBase & {
  id: string;
  numero: number;
  total: number;
  created_at: string;
  canal: string;
  entrega: { nombre: string; municipio: string; telefono: string };
  dinero_recibido_en: string | null;
};

const VISTAS = [
  { id: "activos", texto: "Activos", filtro: (p: Fila) => !["entregado", "cancelado", "devuelto"].includes(p.estado) },
  { id: "por-confirmar", texto: "Por confirmar", filtro: (p: Fila) => p.estado === "pendiente_confirmar" },
  { id: "esperando-pago", texto: "Esperando pago", filtro: (p: Fila) => esperandoPago(p) },
  { id: "por-facturar", texto: "Por facturar", filtro: (p: Fila) => porFacturar(p) },
  { id: "por-recibir", texto: "Dinero por recibir", filtro: (p: Fila) => estadoDinero(p) === "por_recibir" },
  { id: "entregados", texto: "Entregados", filtro: (p: Fila) => p.estado === "entregado" },
  { id: "cancelados", texto: "Cancelados", filtro: (p: Fila) => p.estado === "cancelado" || p.estado === "devuelto" },
  { id: "todos", texto: "Todos", filtro: () => true },
] as const;

async function Contenido({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const { ver = "activos", q = "" } = await searchParams;
  const supabase = await createClient();
  const columnas = "id, numero, estado, forma_pago, total, created_at, canal, entrega, pagado_en, confirmado_en, entregado_en, factura_estado";
  const leer = (extra: string) =>
    supabase
      .from("pedidos")
      .select(columnas + extra)
      .order("created_at", { ascending: false })
      .limit(500);
  // Sin la migración 0020 todavía no existe dinero_recibido_en: la lista sigue funcionando sin esa vista
  let { data, error } = await leer(", dinero_recibido_en");
  if (error) ({ data, error } = await leer(""));
  if (error) throw error;
  const todos = (data ?? []) as unknown as Fila[];
  const vista = VISTAS.find((v) => v.id === ver) ?? VISTAS[0];
  const busca = q.trim().toLowerCase();
  const lista = todos
    .filter(vista.filtro)
    .filter(
      (p) =>
        !busca ||
        String(p.numero).includes(busca) ||
        p.entrega?.nombre?.toLowerCase().includes(busca) ||
        p.entrega?.telefono?.includes(busca)
    );

  return (
    <div className="space-y-4">
      <nav className="-mx-1 flex flex-wrap gap-1" aria-label="Vistas">
        {VISTAS.map((v) => {
          const n = todos.filter(v.filtro).length;
          const activa = v.id === vista.id;
          return (
            <Link
              key={v.id}
              href={`/admin/pedidos?ver=${v.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm ${activa ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
            >
              {v.texto}
              {v.id !== "todos" && n ? <span className={`ml-1.5 font-semibold ${activa ? "" : "text-marca"}`}>{n}</span> : null}
            </Link>
          );
        })}
      </nav>
      <form action="/admin/pedidos" className="flex gap-2">
        <input type="hidden" name="ver" value={vista.id} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por número, nombre o teléfono"
          aria-label="Buscar pedido"
          className="h-9 w-72 rounded-md border px-3 text-sm"
        />
      </form>
      {vista.id === "por-facturar" ? (
        <p className="text-sm text-muted-foreground">
          Pagados por adelantado y confirmados, o contra entrega entregados antes de hoy. Emití la factura en tu sistema y
          subila en cada pedido.
        </p>
      ) : null}

      {lista.length ? (
        <ul className="divide-y rounded-lg border">
          {lista.map((p) => {
            const e = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.pendiente_confirmar;
            return (
              <li key={p.id}>
                <Link href={`/admin/pedidos/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50">
                  <span className="w-16 font-semibold">#{p.numero}</span>
                  <span className="min-w-40 flex-1">
                    <span className="block font-medium">{p.entrega?.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fechaHora(p.created_at)} · {p.entrega?.municipio} · {FORMA_PAGO[p.forma_pago]}
                      {p.canal && p.canal !== "web" ? ` · ${CANAL[p.canal] ?? p.canal}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.clase}`}>{e.texto}</span>
                    {p.pagado_en ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Pagado</span>
                    ) : esperandoPago(p) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Sin pagar</span>
                    ) : null}
                    {porFacturar(p) ? (
                      <span className="rounded-full bg-marca/15 px-2 py-0.5 text-xs font-medium text-marca-oscuro">Facturar</span>
                    ) : p.factura_estado === "emitida" ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Facturado</span>
                    ) : null}
                  </span>
                  <span className="w-24 text-right font-semibold">{usd2(Number(p.total))}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay pedidos en esta vista.</p>
      )}
    </div>
  );
}

export default function Pedidos(props: PageProps<"/admin/pedidos">) {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Todos los pedidos: de la tienda en línea y los que entran por WhatsApp, redes o en persona. Tocá uno para confirmarlo,
            cobrarlo, enviarlo y facturarlo.
          </p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo pedido
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido searchParams={props.searchParams as Promise<{ ver?: string; q?: string }>} />
      </Suspense>
    </div>
  );
}
