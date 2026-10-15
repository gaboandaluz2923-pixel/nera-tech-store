import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rolActual } from "@/lib/admin/sesion";
import { inicioDeHoySV } from "@/lib/admin/pedidos";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_PEDIDO, fechaHora, usd2 } from "@/lib/tienda/formato";

// Inicio del panel: cuántos pedidos y ventas llevamos (lo ve todo el equipo; no incluye costos ni ganancia)
// y lo que hay que atender.

const FASES = [
  { n: 0, nombre: "Cuentas y proyecto" },
  { n: 1, nombre: "Proveedores, listas y mejor precio" },
  { n: 2, nombre: "Catálogo y fichas" },
  { n: 3, nombre: "Carrito, checkout y pagos" },
  { n: 4, nombre: "Promociones, bundles y correos" },
  { n: 5, nombre: "Analítica y sugerencia de precios" },
  { n: 6, nombre: "Dominio, Google, Meta, velocidad y lanzamiento" },
  { n: 7, nombre: "Equipo, pedidos manuales y clientes" },
];

type Fila = { id: string; numero: number; total: number; estado: string; canal: string | null; created_at: string; entrega: { nombre?: string } | null };

const CUENTA = (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`;

function Cifra({ titulo, pedidos, ventas, antes }: { titulo: string; pedidos: number; ventas: number; antes?: { pedidos: number; ventas: number; texto: string } }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="text-xl font-bold tabular-nums">{usd2(ventas)}</p>
      <p className="text-sm">{CUENTA(pedidos)}</p>
      {antes ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {antes.texto}: {usd2(antes.ventas)} · {CUENTA(antes.pedidos)}
        </p>
      ) : null}
    </div>
  );
}

async function Resumen() {
  const supabase = await createClient();
  const ahora = new Date();
  const hoy = inicioDeHoySV(ahora);
  // Lunes de esta semana y día 1 del mes, en hora de El Salvador (UTC−6)
  const sv = new Date(hoy.getTime() - 6 * 3_600_000);
  const lunes = new Date(hoy.getTime() - ((sv.getUTCDay() + 6) % 7) * 86_400_000);
  const mes = new Date(Date.UTC(sv.getUTCFullYear(), sv.getUTCMonth(), 1) + 6 * 3_600_000);
  const mesPasado = new Date(Date.UTC(sv.getUTCFullYear(), sv.getUTCMonth() - 1, 1) + 6 * 3_600_000);
  const ayer = new Date(hoy.getTime() - 86_400_000);
  const desde = new Date(Math.min(mesPasado.getTime(), lunes.getTime() - 7 * 86_400_000));

  const [{ data, error }, { data: abiertos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, numero, total, estado, canal, created_at, entrega")
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("pedidos")
      .select("id, numero, total, estado, canal, created_at, entrega")
      .in("estado", ["pendiente_confirmar", "confirmado", "pagado", "en_camino"])
      .order("created_at")
      .limit(200),
  ]);
  if (error) throw error;
  const validos = ((data ?? []) as Fila[]).filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
  const entre = (a: Date, b?: Date) => {
    const lista = validos.filter((p) => new Date(p.created_at) >= a && (!b || new Date(p.created_at) < b));
    return { pedidos: lista.length, ventas: Math.round(lista.reduce((s, p) => s + Number(p.total), 0) * 100) / 100 };
  };
  // Semana pasada hasta el mismo día y hora, para comparar parejo
  const semanaPasadaHastaHoy = new Date(ahora.getTime() - 7 * 86_400_000);
  const mesPasadoHastaHoy = new Date(mesPasado.getTime() + (ahora.getTime() - mes.getTime()));

  const lista = (abiertos ?? []) as Fila[];
  const porConfirmar = lista.filter((p) => p.estado === "pendiente_confirmar");
  const porEntregar = lista.filter((p) => p.estado !== "pendiente_confirmar");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pedidos y ventas</CardTitle>
          <CardDescription>Total cobrado de los pedidos (sin cancelados ni devueltos), con envío. De la tienda y manuales.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cifra titulo="Hoy" {...entre(hoy)} antes={{ ...entre(ayer, hoy), texto: "Ayer" }} />
          <Cifra titulo="Esta semana" {...entre(lunes)} antes={{ ...entre(new Date(lunes.getTime() - 7 * 86_400_000), semanaPasadaHastaHoy), texto: "Semana pasada a esta hora" }} />
          <Cifra titulo="Este mes" {...entre(mes)} antes={{ ...entre(mesPasado, mesPasadoHastaHoy), texto: "Mes pasado a esta fecha" }} />
          <Cifra titulo="Mes pasado completo" {...entre(mesPasado, mes)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListaPedidos titulo="Por confirmar" vacio="No hay pedidos esperando confirmación." pedidos={porConfirmar} />
        <ListaPedidos titulo="Por entregar" vacio="No hay pedidos en preparación ni en camino." pedidos={porEntregar} />
      </div>
    </div>
  );
}

function ListaPedidos({ titulo, vacio, pedidos }: { titulo: string; vacio: string; pedidos: Fila[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {titulo} {pedidos.length ? <span className="text-muted-foreground">({pedidos.length})</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pedidos.length ? (
          <ul className="divide-y text-sm">
            {pedidos.slice(0, 8).map((p) => {
              const e = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.pendiente_confirmar;
              return (
                <li key={p.id}>
                  <Link href={`/admin/pedidos/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-muted/50">
                    <span className="font-medium">#{p.numero}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {p.entrega?.nombre ?? "—"}
                      <span className="block text-xs text-muted-foreground">{fechaHora(p.created_at)}</span>
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${e.clase}`}>{e.texto}</span>
                    <span className="tabular-nums">{usd2(Number(p.total))}</span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{vacio}</p>
        )}
        {pedidos.length > 8 ? (
          <Link href="/admin/pedidos" className="mt-2 inline-block text-sm text-primary underline">
            Ver todos en Pedidos
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function Encabezado({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const [{ correo }, sp] = await Promise.all([rolActual(), searchParams]);
  const supabase = await createClient();
  const { data: yo } = correo
    ? await supabase.from("equipo").select("nombre").eq("correo", correo.toLowerCase()).maybeSingle()
    : { data: null };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hola{yo?.nombre ? `, ${yo.nombre}` : ""}</h1>
        <Link
          href="/admin/pedidos/nuevo"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo pedido
        </Link>
      </div>
      {sp.aviso === "solo-admin" ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Esa sección es solo para administradores.</p>
      ) : null}
    </div>
  );
}

async function Avance() {
  const { rol } = await rolActual();
  if (rol !== "super_admin") return null;
  return (
    <details className="rounded-xl border p-4 text-sm">
      <summary className="cursor-pointer font-medium">Avance del proyecto</summary>
      <ul className="mt-3 divide-y">
        {FASES.map((f) => (
          <li key={f.n} className="flex items-center justify-between py-2">
            <span>
              <span className="mr-2 text-muted-foreground">Fase {f.n}</span>
              {f.nombre}
            </span>
            <span className="text-muted-foreground">Lista</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function InicioAdmin({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="max-w-5xl space-y-6">
      <Suspense fallback={<div className="h-10" />}>
        <Encabezado searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Resumen />
      </Suspense>
      <Suspense fallback={null}>
        <Avance />
      </Suspense>
    </div>
  );
}
