import { Editable } from "@/components/admin/editable";
import { Dato, Datos } from "@/components/admin/vista";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COLUMNAS_CIERRE,
  ESTADO_DINERO,
  RETIRO,
  cierrePedido,
  costosCobro,
  quienTieneElDinero,
  type PedidoCierre,
} from "@/lib/admin/cierre-pedido";
import { createServiceClient } from "@/lib/supabase/server";
import { fechaCorta, fechaHora, usd2 } from "@/lib/tienda/formato";
import { guardarCierre } from "@/app/admin/(protegido)/pedidos/editar-actions";

// Cierre del pedido (solo administradores): quién lo entregó, cuánto debía entrar al banco, cuánto entró y el margen
// neto real. Se muestra solo a super_admin (la página lo decide).

const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const COLOR = {
  por_cobrar: "bg-muted text-foreground",
  por_recibir: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  conciliado: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  no_aplica: "bg-muted text-muted-foreground",
} as const;
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

export async function CierrePedido({ pedidoId }: { pedidoId: string }) {
  const sb = createServiceClient();
  const [{ data }, cobro] = await Promise.all([
    sb.from("pedidos").select(COLUMNAS_CIERRE).eq("id", pedidoId).single(),
    costosCobro(),
  ]);
  if (!data) return null;
  const p = data as unknown as PedidoCierre;
  const c = await cierrePedido(p);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
  const opciones = [...cobro.repartidores.map((r) => r.nombre), RETIRO];
  if (p.entrega_servicio && !opciones.includes(p.entrega_servicio)) opciones.unshift(p.entrega_servicio);
  const conciliado = c.estado === "conciliado";

  return (
    <Editable
      titulo="Cierre y margen neto"
      descripcion="Solo administradores. Quién lo entregó, cuánto debe entrar al banco y cuánto te deja de verdad."
      accion={guardarCierre}
      vista={
        <div className="space-y-4">
          <p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLOR[c.estado]}`}>{ESTADO_DINERO[c.estado]}</span>
            {c.estado === "por_recibir" ? (
              <span className="ml-2 text-sm text-muted-foreground">lo tiene: {quienTieneElDinero(p)}</span>
            ) : null}
          </p>
          <Datos columnas={3}>
            <Dato etiqueta="Entregó">
              {p.entrega_servicio ?? <span className="text-muted-foreground">Sin anotar (se asume la paquetera)</span>}
            </Dato>
            <Dato etiqueta="Costo de la entrega">
              {usd2(c.costoEntrega)}
              {c.costoEntregaEstimado ? <span className="text-muted-foreground"> (estimado)</span> : null}
              {c.descontadoEnDeposito ? <span className="text-muted-foreground"> · la paquetera lo descuenta</span> : null}
            </Dato>
            {p.forma_pago === "tasa_cero" ? (
              <Dato etiqueta="Tasa 0%">
                {[p.tasa_cero_banco ?? "Banco sin anotar", p.tasa_cero_plazo ? `${p.tasa_cero_plazo} meses` : null].filter(Boolean).join(" · ")}
              </Dato>
            ) : null}
            <Dato etiqueta="Debe entrar al banco">
              {usd2(c.esperado)}
              <span className="block text-xs text-muted-foreground">
                cobrado {usd2(c.cobrado)}
                {c.comision ? ` − comisión ${c.comisionPct}% ${usd2(c.comision)}` : ""}
                {c.descontadoEnDeposito ? ` − envío ${usd2(c.costoEntrega)}` : ""}
              </span>
            </Dato>
            <Dato etiqueta="Entró al banco">
              {conciliado ? (
                <>
                  <span className="font-medium">{usd2(Number(p.dinero_recibido))}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.dinero_recibido_en ? fechaCorta(`${p.dinero_recibido_en}T12:00:00`) : ""}
                    {p.dinero_referencia ? ` · ref. ${p.dinero_referencia}` : ""}
                    {p.conciliado_en ? ` · anotado ${fechaHora(p.conciliado_en)}` : ""}
                  </span>
                  {c.diferencia ? (
                    <span className={`block text-xs font-medium ${c.diferencia < 0 ? "text-red-600 dark:text-red-400" : "text-blue-700"}`}>
                      {c.diferencia < 0 ? `Entró ${usd2(-c.diferencia)} menos de lo esperado` : `Entró ${usd2(c.diferencia)} más de lo esperado`}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Dato>
          </Datos>
          <div className="rounded-lg border p-3 text-sm">
            <p className="mb-1 font-medium">
              Margen neto {conciliado ? "real" : "estimado"}: {usd2(c.neto)} ({pct(c.netoPct)})
            </p>
            <table className="w-full text-xs tabular-nums">
              <tbody>
                <tr>
                  <td className="text-muted-foreground">{conciliado ? "Entró al banco" : "Debe entrar al banco"}</td>
                  <td className="text-right">{usd2(c.ingreso)}</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">
                    Costo de los productos con IVA{c.costoProductosEstimado ? " (en parte estimado)" : ""}
                  </td>
                  <td className="text-right">−{usd2(c.costoProductos)}</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Paquetería</td>
                  <td className="text-right">−{usd2(c.paqueteria)}</td>
                </tr>
                {!c.descontadoEnDeposito && c.costoEntrega ? (
                  <tr>
                    <td className="text-muted-foreground">Entrega ({p.entrega_servicio ?? "paquetera"})</td>
                    <td className="text-right">−{usd2(c.costoEntrega)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      }
    >
      <input type="hidden" name="id" value={p.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="c-servicio">Quién lo entregó</Label>
          <select id="c-servicio" name="entrega_servicio" defaultValue={p.entrega_servicio ?? ""} className={SELECT}>
            <option value="">— Sin anotar —</option>
            {opciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-costo">Cuánto costó la entrega (USD)</Label>
          <Input
            id="c-costo"
            name="entrega_costo"
            inputMode="decimal"
            defaultValue={p.entrega_costo ?? ""}
            placeholder={`Vacío = tarifa (${usd2(cobro.envio_paquetera)} la paquetera)`}
          />
          <p className="text-xs text-muted-foreground">Motorista: lo que le pagaste por este viaje.</p>
        </div>
        {p.forma_pago === "tasa_cero" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="c-banco">Banco de la tasa 0%</Label>
              <select id="c-banco" name="tasa_cero_banco" defaultValue={p.tasa_cero_banco ?? ""} className={SELECT}>
                <option value="">— Elegí —</option>
                {cobro.tasa_cero_bancos.map((b) => (
                  <option key={b.banco} value={b.banco}>
                    {b.banco}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-plazo">Plazo</Label>
              <select id="c-plazo" name="tasa_cero_plazo" defaultValue={p.tasa_cero_plazo ? String(p.tasa_cero_plazo) : ""} className={SELECT}>
                <option value="">— Elegí —</option>
                {["3", "6", "12"].map((m) => (
                  <option key={m} value={m}>
                    {m} meses
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Dinero recibido en el banco</p>
        <p className="text-xs text-muted-foreground">
          Debería entrar {usd2(c.esperado)}. Escribí lo que entró exacto; si todavía no entró, dejalo vacío.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="c-recibido">Monto que entró (USD)</Label>
            <Input id="c-recibido" name="dinero_recibido" inputMode="decimal" defaultValue={p.dinero_recibido ?? ""} placeholder={c.esperado.toFixed(2)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-fecha">Fecha</Label>
            <Input id="c-fecha" name="dinero_recibido_en" type="date" defaultValue={p.dinero_recibido_en ?? hoy} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-ref">Referencia (opcional)</Label>
            <Input id="c-ref" name="dinero_referencia" defaultValue={p.dinero_referencia ?? ""} placeholder="Núm. de depósito" />
          </div>
        </div>
      </div>
    </Editable>
  );
}
