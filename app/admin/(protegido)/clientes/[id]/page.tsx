import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { Editable } from "@/components/admin/editable";
import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { ListaHistorial, type Entrada } from "@/components/admin/lista-historial";
import { Dato, Datos } from "@/components/admin/vista";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describir, nombresEquipo, quien, type FilaHistorial } from "@/lib/admin/historial";
import { CANAL } from "@/lib/admin/pedidos";
import { createClient } from "@/lib/supabase/server";
import { saldoPuntos } from "@/lib/tienda/beneficios";
import { ESTADO_PEDIDO, FORMA_PAGO, fechaCorta, fechaHora, usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import { agregarNotaCliente, guardarCliente, guardarEtiquetas } from "../actions";

// Ficha del cliente: lo que compró, sus datos, etiquetas y notas internas del equipo.

const SUGERIDAS = ["frecuente", "mayorista", "revendedor", "reclamo", "garantía", "vip", "no contestar"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type Cliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  telefono_alterno: string | null;
  correo: string | null;
  direccion: { municipio?: string | null; departamento?: string | null; direccion?: string | null; referencia?: string | null } | null;
  origen: string | null;
  etiquetas: string[];
  cumple_dia: number | null;
  cumple_mes: number | null;
  acepta_whatsapp: boolean;
  acepta_correo: boolean;
  auth_user_id: string | null;
  created_at: string;
};

type PedidoFila = {
  id: string;
  numero: number;
  estado: string;
  forma_pago: string;
  total: number;
  canal: string;
  created_at: string;
  lineas_pedido: { nombre: string; cantidad: number }[];
};

function Campo({ nombre, etiqueta, valor, tipo, ayuda }: { nombre: string; etiqueta: string; valor: string | number | null | undefined; tipo?: string; ayuda?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`cl-${nombre}`}>{etiqueta}</Label>
      <Input id={`cl-${nombre}`} name={nombre} type={tipo} defaultValue={valor ?? ""} />
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}

async function Ficha({ params }: { params: PageProps<"/admin/clientes/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data, error }, { data: pedidosData }, { data: notas }, historial, nombres, puntos] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre, telefono, telefono_alterno, correo, direccion, origen, etiquetas, cumple_dia, cumple_mes, acepta_whatsapp, acepta_correo, auth_user_id, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pedidos")
      .select("id, numero, estado, forma_pago, total, canal, created_at, lineas_pedido(nombre, cantidad)")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("cliente_notas").select("id, nota, usuario, created_at").eq("cliente_id", id).order("created_at", { ascending: false }).limit(100),
    supabase
      .from("historial")
      .select("id, tabla, registro_id, accion, campos, antes, despues, usuario, created_at")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then((r) => (r.error ? [] : ((r.data ?? []) as FilaHistorial[]))),
    nombresEquipo(supabase),
    saldoPuntos(id).catch(() => null),
  ]);
  if (error) throw error;
  if (!data) notFound();
  const c = data as Cliente;
  const pedidos = (pedidosData ?? []) as PedidoFila[];
  const validos = pedidos.filter((p) => p.estado !== "cancelado" && p.estado !== "devuelto");
  const total = validos.reduce((s, p) => s + Number(p.total), 0);
  const canales = [...new Set(pedidos.map((p) => p.canal))].map((x) => CANAL[x] ?? x);
  const d = c.direccion ?? {};

  const entradas: Entrada[] = historial
    .filter((h) => h.accion !== "creado" || h.usuario !== "tienda")
    .map((h) => ({ id: h.id, cuando: h.created_at, quien: quien(h.usuario, nombres), que: describir(h).replace("el registro", "el cliente") }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/clientes" className="text-sm text-muted-foreground hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-xl font-semibold">{c.nombre || "Sin nombre"}</h1>
          <p className="text-sm text-muted-foreground">
            Cliente desde {fechaCorta(c.created_at)}
            {c.auth_user_id ? " · tiene cuenta con Google" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.telefono ? (
            <a
              href={enlaceWhatsAppA(`503${c.telefono}`, `Hola ${(c.nombre ?? "").split(" ")[0]}, te escribimos de Nera Tech. `)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <IconoWhatsApp className="size-4 text-[#25D366]" /> WhatsApp
            </a>
          ) : null}
          <Link
            href={`/admin/pedidos/nuevo${c.telefono ? `?tel=${c.telefono}` : ""}`}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nuevo pedido
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total comprado</p>
            <p className="text-lg font-bold tabular-nums">{usd2(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="text-lg font-bold">{validos.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Compra promedio</p>
            <p className="text-lg font-bold tabular-nums">{validos.length ? usd2(total / validos.length) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última compra</p>
            <p className="text-lg font-bold">{validos[0] ? fechaCorta(validos[0].created_at) : "—"}</p>
          </div>
          <p className="col-span-full text-xs text-muted-foreground">
            {canales.length ? `Compra por: ${canales.join(", ")}` : "Todavía no ha comprado"}
            {puntos && puntos.saldo > 0 ? ` · ${puntos.saldo} Puntos Nera` : ""}
          </p>
        </CardContent>
      </Card>

      <Editable
        titulo="Etiquetas"
        accion={guardarEtiquetas}
        vista={
          c.etiquetas?.length ? (
            <div className="flex flex-wrap gap-1">
              {c.etiquetas.map((e) => (
                <span key={e} className="rounded-full bg-muted px-2.5 py-1 text-sm">
                  {e}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin etiquetas. Sirven para encontrar rápido a los mayoristas, a quien tiene un reclamo, etc.</p>
          )
        }
      >
        <input type="hidden" name="id" value={c.id} />
        <div className="flex flex-wrap gap-3">
          {[...new Set([...SUGERIDAS, ...(c.etiquetas ?? [])])].map((e) => (
            <label key={e} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="etiqueta" value={e} defaultChecked={c.etiquetas?.includes(e)} className="size-4 accent-[var(--marca)]" />
              {e}
            </label>
          ))}
        </div>
        <Campo nombre="otras" etiqueta="Otras (separadas por coma)" valor="" />
      </Editable>

      <Editable
        titulo="Datos"
        accion={guardarCliente}
        vista={
          <Datos>
            <Dato etiqueta="Nombre">{c.nombre}</Dato>
            <Dato etiqueta="Teléfono">{c.telefono}</Dato>
            <Dato etiqueta="Teléfono alterno">{c.telefono_alterno}</Dato>
            <Dato etiqueta="Correo">{c.correo}</Dato>
            <Dato etiqueta="Municipio">{d.municipio}</Dato>
            <Dato etiqueta="Dirección">{[d.direccion, d.referencia].filter(Boolean).join(" · ")}</Dato>
            <Dato etiqueta="Cumpleaños">{c.cumple_dia && c.cumple_mes ? `${c.cumple_dia} de ${MESES[c.cumple_mes - 1]}` : null}</Dato>
            <Dato etiqueta="Publicidad">
              {c.acepta_whatsapp && c.acepta_correo
                ? "Acepta WhatsApp y correo"
                : c.acepta_whatsapp || c.acepta_correo
                  ? `Solo por ${c.acepta_whatsapp ? "WhatsApp" : "correo"}`
                  : "No quiere publicidad"}
            </Dato>
          </Datos>
        }
      >
        <input type="hidden" name="id" value={c.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo nombre="nombre" etiqueta="Nombre" valor={c.nombre} />
          <Campo nombre="telefono" etiqueta="Teléfono" valor={c.telefono} tipo="tel" />
          <Campo nombre="telefono_alterno" etiqueta="Teléfono alterno" valor={c.telefono_alterno} tipo="tel" />
          <Campo
            nombre="correo"
            etiqueta="Correo"
            valor={c.correo}
            tipo="email"
            ayuda={c.auth_user_id ? "Tiene cuenta con Google: si cambiás el correo, sus pedidos nuevos dejan de enlazarse solos." : undefined}
          />
          <Campo nombre="municipio" etiqueta="Municipio" valor={d.municipio} />
          <Campo nombre="direccion" etiqueta="Dirección" valor={d.direccion} />
          <Campo nombre="referencia" etiqueta="Referencia" valor={d.referencia} />
          <div className="grid grid-cols-2 gap-2">
            <Campo nombre="cumple_dia" etiqueta="Cumple (día)" valor={c.cumple_dia} tipo="number" />
            <Campo nombre="cumple_mes" etiqueta="Cumple (mes)" valor={c.cumple_mes} tipo="number" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="acepta_whatsapp" defaultChecked={c.acepta_whatsapp} className="size-4 accent-[var(--marca)]" />
            Acepta ofertas por WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="acepta_correo" defaultChecked={c.acepta_correo} className="size-4 accent-[var(--marca)]" />
            Acepta ofertas por correo
          </label>
        </div>
      </Editable>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length ? (
            <ul className="divide-y text-sm">
              {pedidos.map((p) => {
                const e = ESTADO_PEDIDO[p.estado] ?? ESTADO_PEDIDO.pendiente_confirmar;
                return (
                  <li key={p.id}>
                    <Link href={`/admin/pedidos/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-muted/50">
                      <span className="w-14 font-medium">#{p.numero}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.lineas_pedido.map((l) => `${l.cantidad > 1 ? `${l.cantidad} × ` : ""}${l.nombre}`).join(", ")}</span>
                        <span className="block text-xs text-muted-foreground">
                          {fechaCorta(p.created_at)} · {CANAL[p.canal] ?? p.canal} · {FORMA_PAGO[p.forma_pago]}
                        </span>
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${e.clase}`}>{e.texto}</span>
                      <span className="w-20 text-right tabular-nums">{usd2(Number(p.total))}</span>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no tiene pedidos.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas internas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormularioAccion accion={agregarNotaCliente} className="space-y-2" limpiar>
            <input type="hidden" name="id" value={c.id} />
            <Textarea name="nota" rows={2} placeholder="Solo la ve el equipo. Ej. prefiere que le escriban después de las 5 pm" aria-label="Nueva nota" />
            <BotonGuardar variant="outline" size="sm">
              Agregar nota
            </BotonGuardar>
          </FormularioAccion>
          <ListaHistorial
            vacio="Sin notas."
            entradas={(notas ?? []).map((n) => ({ id: n.id, cuando: n.created_at, quien: quien(n.usuario, nombres), que: "escribió:", detalle: n.nota }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <ListaHistorial entradas={entradas} />
          <p className="mt-2 text-xs text-muted-foreground">{`Llegó por: ${CANAL[c.origen ?? ""] ?? c.origen ?? "—"} · ${fechaHora(c.created_at)}`}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FichaCliente({ params }: PageProps<"/admin/clientes/[id]">) {
  return (
    <div className="max-w-4xl">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <Ficha params={params} />
      </Suspense>
    </div>
  );
}
