import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { SELECT_COMPRA, diasParaVencer, textoVencimiento, type CompraResumen } from "@/lib/admin/inventario";
import { superAdmin } from "@/lib/admin/sesion";
import { fechaCorta, usd2 } from "@/lib/tienda/formato";

// Compras al proveedor: todas las facturas, con filtro de las que faltan pagar o recibir.

const FILTROS = [
  { id: "todas", texto: "Todas" },
  { id: "por-pagar", texto: "Por pagar" },
  { id: "sin-recibir", texto: "Sin recibir" },
] as const;

const ESTADO = { borrador: "Sin recibir", recibida: "Recibida", anulada: "Anulada" } as const;

async function Lista({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const { filtro = "todas" } = await searchParams;
  const f = FILTROS.find((x) => x.id === filtro) ?? FILTROS[0];
  const { supabase } = await superAdmin();
  let consulta = supabase.from("compras").select(SELECT_COMPRA).order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (f.id === "por-pagar") consulta = consulta.neq("estado", "anulada").is("pagada_en", null);
  if (f.id === "sin-recibir") consulta = consulta.eq("estado", "borrador");
  const { data, error } = await consulta;
  if (error) throw error;
  const compras = (data ?? []) as unknown as CompraResumen[];
  const total = compras.filter((c) => c.estado !== "anulada").reduce((s, c) => s + Number(c.total), 0);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1" aria-label="Filtro">
        {FILTROS.map((x) => (
          <Link
            key={x.id}
            href={`/admin/inventario/compras?filtro=${x.id}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${x.id === f.id ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
          >
            {x.texto}
          </Link>
        ))}
      </nav>
      {compras.length ? (
        <>
          <ul className="divide-y rounded-lg border text-sm">
            {compras.map((c) => {
              const d = diasParaVencer(c.vence_en);
              const pendiente = c.estado !== "anulada" && !c.pagada_en;
              return (
                <li key={c.id}>
                  <Link href={`/admin/inventario/compras/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-muted/50">
                    <span className="min-w-44 flex-1">
                      <span className="block font-medium">{c.proveedores?.nombre ?? "Sin proveedor"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.numero || "Sin número"} · {fechaCorta(`${c.fecha}T12:00:00`)} ·{" "}
                        {c.condicion === "credito" ? `crédito ${c.dias_credito} días` : "contado"}
                      </span>
                    </span>
                    <span className="text-xs">
                      <span className={`block ${c.estado === "borrador" ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                        {ESTADO[c.estado]}
                      </span>
                      <span className={`block ${pendiente && d < 0 ? "font-medium text-red-700" : pendiente && d <= 3 ? "text-amber-700" : "text-muted-foreground"}`}>
                        {textoVencimiento(c)}
                      </span>
                    </span>
                    <span className={`w-24 text-right font-semibold tabular-nums ${c.estado === "anulada" ? "text-muted-foreground line-through" : ""}`}>
                      {usd2(Number(c.total))}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-right text-sm">
            Total {f.id === "por-pagar" ? "por pagar" : "de la lista"}: <b className="tabular-nums">{usd2(total)}</b>
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No hay compras en esta lista.</p>
      )}
    </div>
  );
}

export default function Compras(props: PageProps<"/admin/inventario/compras">) {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/inventario" className="text-sm text-muted-foreground hover:underline">
            ← Inventario
          </Link>
          <h1 className="text-xl font-semibold">Compras al proveedor</h1>
          <p className="text-sm text-muted-foreground">Cada factura: qué entró, cuánto costó, cuándo vence y si ya se pagó.</p>
        </div>
        <Link href="/admin/inventario/compras/nueva" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          + Nueva compra
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Lista searchParams={props.searchParams as Promise<{ filtro?: string }>} />
      </Suspense>
    </div>
  );
}
