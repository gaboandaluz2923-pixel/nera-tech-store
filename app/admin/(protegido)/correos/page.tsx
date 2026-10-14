import { Suspense } from "react";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { fechaHora, usd2 } from "@/lib/tienda/formato";
import { mesSV } from "@/lib/tienda/regalos";
import { revisarAhora } from "./actions";

// Correos automáticos de la fase 4: "ya hay stock", regalo de cumpleaños y quién no quiere publicidad.

type Aviso = { id: string; correo: string; avisado_en: string | null; created_at: string; productos: { nombre: string } | null };
type Regalo = {
  id: string;
  codigo: string;
  valor: number;
  descripcion: string | null;
  inicio: string;
  clientes: { nombre: string; correo: string | null } | null;
};

async function Contenido() {
  const supabase = await createClient();
  const m = mesSV();
  const [avisosR, regalosR, usadosR, totalR, sinCorreoR, sinWaR] = await Promise.all([
    supabase
      .from("suscriptores")
      .select("id, correo, avisado_en, created_at, productos(nombre)")
      .eq("origen", "aviso_stock")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("cupones")
      .select("id, codigo, valor, descripcion, inicio, clientes(nombre, correo)")
      .eq("origen", "cumple")
      .gte("inicio", m.inicio)
      .order("created_at", { ascending: false }),
    supabase.from("pedidos").select("cupon_id").not("cupon_id", "is", null).not("estado", "in", "(cancelado,devuelto)").limit(5000),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("acepta_correo", false),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("acepta_whatsapp", false),
  ]);
  if (avisosR.error) throw avisosR.error;
  const avisos = (avisosR.data ?? []) as unknown as Aviso[];
  const pendientes = avisos.filter((a) => !a.avisado_en);
  const porProducto = new Map<string, number>();
  for (const a of pendientes) porProducto.set(a.productos?.nombre ?? "—", (porProducto.get(a.productos?.nombre ?? "—") ?? 0) + 1);
  const avisados = avisos.filter((a) => a.avisado_en).slice(0, 15);
  const regalos = (regalosR.data ?? []) as unknown as Regalo[];
  const usados = new Set((usadosR.data ?? []).map((u) => u.cupon_id as string));
  const cronListo = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Revisión diaria</CardTitle>
          <CardDescription>
            Todos los días a las 7:00 a. m. la tienda revisa sola los cumpleaños del mes y los productos que volvieron a tener stock. Con este botón
            la corrés ya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!cronListo ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Falta la variable <strong>CRON_SECRET</strong> en Vercel: sin ella la revisión automática no corre (el botón sí funciona).
            </p>
          ) : null}
          <FormularioAccion accion={revisarAhora}>
            <BotonGuardar>Revisar ahora</BotonGuardar>
          </FormularioAccion>
          <p className="text-xs text-muted-foreground">
            Al guardar cambios en Catálogo o importar una lista de precios, los avisos de stock salen solos al momento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>&quot;Avisame cuando haya&quot;</CardTitle>
          <CardDescription>
            {pendientes.length} {pendientes.length === 1 ? "persona espera" : "personas esperan"} aviso. Cuando el producto vuelve a estar
            disponible, les llega el correo una sola vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {porProducto.size ? (
            <ul className="divide-y rounded-lg border">
              {[...porProducto.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([nombre, n]) => (
                  <li key={nombre} className="flex justify-between p-2.5">
                    <span>{nombre}</span>
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nadie está esperando aviso.</p>
          )}
          {avisados.length ? (
            <details>
              <summary className="cursor-pointer font-medium">Últimos avisos enviados</summary>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {avisados.map((a) => (
                  <li key={a.id}>
                    {a.correo} · {a.productos?.nombre} · {fechaHora(a.avisado_en!)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regalos de cumpleaños de este mes</CardTitle>
          <CardDescription>
            Cupón personal (se ajusta en Configuración → Regalo de cumpleaños). Vale todo el mes y el cliente también lo ve en Mi cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {regalos.length ? (
            <ul className="divide-y rounded-lg border">
              {regalos.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                  <span>
                    {r.clientes?.nombre} <span className="text-muted-foreground">· {r.clientes?.correo}</span>
                    <span className="block text-xs text-muted-foreground">{r.descripcion}</span>
                  </span>
                  <span className="font-mono">
                    {r.codigo} · {usd2(Number(r.valor))}{" "}
                    {usados.has(r.id) ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 font-sans text-xs text-green-800">usado</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Todavía no hay regalos este mes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publicidad</CardTitle>
          <CardDescription>
            Todos reciben ofertas salvo que marquen &quot;No quiero recibir publicidad&quot; (en el checkout, en Mi cuenta o con el enlace de
            los correos). Los correos de pedidos y facturas les llegan siempre.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p className="rounded-lg border p-3">
            <span className="block text-2xl font-bold">{totalR.count ?? 0}</span>clientes
          </p>
          <p className="rounded-lg border p-3">
            <span className="block text-2xl font-bold">{sinCorreoR.count ?? 0}</span>no quieren publicidad por correo
          </p>
          <p className="rounded-lg border p-3">
            <span className="block text-2xl font-bold">{sinWaR.count ?? 0}</span>no quieren publicidad por WhatsApp
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Correos() {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Correos</h1>
        <p className="text-sm text-muted-foreground">
          Avisos automáticos de la tienda. Los correos de cada pedido se ven en su Historial; remitente y respuestas, en Configuración → Correos.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
