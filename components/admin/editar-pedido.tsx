"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CotizacionEdicion, EntradaEdicion } from "@/lib/admin/editar-pedido";
import type { VarianteVendible } from "@/lib/admin/pedido-manual";
import { usd2 } from "@/lib/tienda/formato";
import { cotizarEdicionPedido, guardarEdicionPedido } from "@/app/admin/(protegido)/pedidos/editar-actions";

// Recuadro "Productos" del pedido: se ve como texto (lo que arma el servidor) y "Editar pedido" abre el editor.
// Cada cambio pide el total al servidor (mismas reglas que al guardar).

type LineaActual = { id: string; varianteId: string | null; nombre: string; cantidad: number; precio: number };
type Linea = { key: string; id: string | null; v: string; nombre: string; c: number; precio: string };

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function ProductosPedido({
  pedidoId,
  vista,
  puedeEditar,
  bloqueo,
  puedeProductos,
  lineasActuales,
  variantes,
  envio,
  costoEnvio,
  descuentoExtra,
  descuentoCombos,
  correoCliente,
}: {
  pedidoId: string;
  vista: React.ReactNode;
  /** Solo administradores */
  puedeEditar: boolean;
  /** Por qué no se puede editar (entregado, facturado…) */
  bloqueo: string | null;
  /** Se pueden cambiar productos (no salió hacia el cliente) o solo montos */
  puedeProductos: boolean;
  lineasActuales: LineaActual[];
  variantes: VarianteVendible[];
  envio: { monto: number; motivo: string | null };
  costoEnvio: number;
  descuentoExtra: { monto: number; motivo: string | null };
  descuentoCombos: number;
  correoCliente: string | null;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <CardTitle>Productos</CardTitle>
        {puedeEditar && !editando ? (
          bloqueo ? (
            <span className="max-w-64 text-right text-xs text-muted-foreground">{bloqueo}</span>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditando(true)}>
              <Pencil className="size-3.5" aria-hidden />
              Editar pedido
            </Button>
          )
        ) : null}
      </CardHeader>
      <CardContent>
        {editando ? (
          <Editor
            pedidoId={pedidoId}
            puedeProductos={puedeProductos}
            lineasActuales={lineasActuales}
            variantes={variantes}
            envio={envio}
            costoEnvio={costoEnvio}
            descuentoExtra={descuentoExtra}
            descuentoCombos={descuentoCombos}
            correoCliente={correoCliente}
            cerrar={() => setEditando(false)}
          />
        ) : (
          vista
        )}
      </CardContent>
    </Card>
  );
}

function Editor({
  pedidoId,
  puedeProductos,
  lineasActuales,
  variantes,
  envio,
  costoEnvio,
  descuentoExtra,
  descuentoCombos,
  correoCliente,
  cerrar,
}: {
  pedidoId: string;
  puedeProductos: boolean;
  lineasActuales: LineaActual[];
  variantes: VarianteVendible[];
  envio: { monto: number; motivo: string | null };
  costoEnvio: number;
  descuentoExtra: { monto: number; motivo: string | null };
  descuentoCombos: number;
  correoCliente: string | null;
  cerrar: () => void;
}) {
  const router = useRouter();
  const [lineas, setLineas] = useState<Linea[]>(() =>
    lineasActuales.map((l) => ({ key: l.id, id: l.id, v: l.varianteId ?? "", nombre: l.nombre, c: l.cantidad, precio: l.precio.toFixed(2) }))
  );
  const modoInicial: EntradaEdicion["envio"]["modo"] =
    envio.monto === 0 && envio.motivo ? "gratis" : Math.abs(envio.monto - costoEnvio) < 0.005 && !envio.motivo ? "normal" : envio.monto === 0 ? "gratis" : "monto";
  const [modoEnvio, setModoEnvio] = useState(modoInicial);
  const [montoEnvio, setMontoEnvio] = useState(envio.monto.toFixed(2));
  const [motivoEnvio, setMotivoEnvio] = useState(envio.motivo ?? "");
  const [tipoExtra, setTipoExtra] = useState<"monto" | "pct">("monto");
  const [valorExtra, setValorExtra] = useState(descuentoExtra.monto ? descuentoExtra.monto.toFixed(2) : "");
  const [motivoExtra, setMotivoExtra] = useState(descuentoExtra.motivo ?? "");
  const [quitarCombos, setQuitarCombos] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [avisar, setAvisar] = useState(Boolean(correoCliente));
  const [aceptaBajoCosto, setAceptaBajoCosto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [cot, setCot] = useState<CotizacionEdicion | null>(null);
  const [errorCot, setErrorCot] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const vez = useRef(0);

  const entrada: EntradaEdicion = useMemo(
    () => ({
      pedidoId,
      lineas: lineas.map((l) => ({ id: l.id, v: l.v, c: l.c, precio: l.precio === "" ? null : Number(l.precio) })),
      envio: { modo: modoEnvio, monto: modoEnvio === "monto" ? Number(montoEnvio) : null, motivo: motivoEnvio },
      extra: { tipo: tipoExtra, valor: Number(valorExtra) || 0, motivo: motivoExtra },
      quitarCombos,
    }),
    [pedidoId, lineas, modoEnvio, montoEnvio, motivoEnvio, tipoExtra, valorExtra, motivoExtra, quitarCombos]
  );

  // El total lo calcula el servidor cada vez que algo cambia
  useEffect(() => {
    const n = ++vez.current;
    const t = setTimeout(async () => {
      const r = await cotizarEdicionPedido(entrada);
      if (n !== vez.current) return;
      if (r.ok) {
        setCot(r.cotizacion);
        setErrorCot(null);
      } else {
        setCot(null);
        setErrorCot(r.mensaje);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [entrada]);

  // Si un producto del pedido está en una campaña con envío gratis, se sugiere
  const sugerirCampana = cot?.campana && !(modoEnvio === "gratis" && motivoEnvio);

  const resultados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return variantes.filter((v) => palabras.every((p) => normalizar(v.nombre).includes(p))).slice(0, 8);
  }, [busqueda, variantes]);

  function agregar(v: VarianteVendible) {
    setLineas((ls) => {
      const nueva = ls.find((l) => !l.id && l.v === v.id);
      if (nueva) return ls.map((l) => (l === nueva ? { ...l, c: Math.min(50, l.c + 1) } : l));
      return [...ls, { key: `n-${v.id}-${Date.now()}`, id: null, v: v.id, nombre: v.nombre, c: 1, precio: v.precio.toFixed(2) }];
    });
    setBusqueda("");
  }
  const cambiar = (key: string, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambio } : l)));
  const quitar = (key: string) => setLineas((ls) => ls.filter((l) => l.key !== key));

  function guardar() {
    if (!cot) {
      toast.error(errorCot ?? "Esperá el total.");
      return;
    }
    if (!motivo.trim()) {
      toast.error("Escribí el motivo del cambio.");
      return;
    }
    empezar(async () => {
      const r = await guardarEdicionPedido({ ...entrada, motivo, mensaje, avisar, aceptaBajoCosto, totalVisto: cot.total });
      if (r?.ok) {
        toast.success(r.mensaje);
        cerrar();
        router.refresh();
      } else if (r) toast.error(r.mensaje);
    });
  }

  const fila = "flex justify-between gap-3 text-sm";
  return (
    <div className="space-y-5">
      {/* Productos */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Lo que lleva</h3>
        {!puedeProductos ? (
          <p className="text-xs text-muted-foreground">El pedido ya va en camino: solo se pueden cambiar precios, envío y descuento.</p>
        ) : null}
        <ul className="space-y-2">
          {lineas.map((l) => (
            <li key={l.key} className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  {l.nombre}
                  {!l.id ? <span className="ml-1 rounded bg-green-100 px-1.5 text-xs text-green-800">nuevo</span> : null}
                </span>
                {puedeProductos ? (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => quitar(l.key)} aria-label={`Quitar ${l.nombre}`}>
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!puedeProductos}
                    onClick={() => cambiar(l.key, { c: Math.max(1, l.c - 1) })}
                    aria-label="Menos"
                  >
                    <Minus className="size-4" aria-hidden />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={l.c}
                    disabled={!puedeProductos}
                    onChange={(e) => cambiar(l.key, { c: Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))) })}
                    className="h-8 w-16 text-center"
                    aria-label={`Cantidad de ${l.nombre}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!puedeProductos}
                    onClick={() => cambiar(l.key, { c: Math.min(50, l.c + 1) })}
                    aria-label="Más"
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Precio c/u $
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.precio}
                    onChange={(e) => cambiar(l.key, { precio: e.target.value })}
                    className="h-8 w-24 tabular-nums"
                    aria-label={`Precio de ${l.nombre}`}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
        {puedeProductos ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Agregar producto: buscá por nombre, memoria o color"
                className="pl-8"
                aria-label="Buscar producto para agregar"
              />
            </div>
            {resultados.length ? (
              <ul className="divide-y rounded-md border">
                {resultados.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => agregar(v)} className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block">{v.nombre}</span>
                        <span className="block text-xs text-muted-foreground">
                          {v.stock > 0 ? `${v.stock} en bodega` : "Sin stock propio"}
                          {!v.publicado ? " · oculto en la tienda" : ""}
                        </span>
                      </span>
                      <span className="tabular-nums">{usd2(v.precio)}</span>
                      <Plus className="size-4 text-marca" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : busqueda.trim() ? (
              <p className="text-sm text-muted-foreground">No hay productos con precio que coincidan.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Envío */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Envío</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {(
            [
              ["normal", `Cobrar ${usd2(costoEnvio)}`],
              ["gratis", "Gratis"],
              ["monto", "Otro monto"],
            ] as const
          ).map(([v, t]) => (
            <label key={v} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="modo-envio"
                checked={modoEnvio === v}
                onChange={() => {
                  setModoEnvio(v);
                  if (v === "gratis" && !motivoEnvio) setMotivoEnvio(cot?.campana ?? "Cortesía");
                }}
                className="size-4"
              />
              {t}
            </label>
          ))}
        </div>
        {sugerirCampana ? (
          <button
            type="button"
            onClick={() => {
              setModoEnvio("gratis");
              setMotivoEnvio(cot!.campana!);
            }}
            className="rounded-md border border-dashed border-marca px-2 py-1 text-left text-xs text-marca hover:bg-marca/5"
          >
            Un producto de este pedido está en <strong>{cot!.campana}</strong> (envío gratis). Tocá para aplicarlo.
          </button>
        ) : null}
        {modoEnvio !== "normal" ? (
          <div className="flex flex-wrap gap-2">
            {modoEnvio === "monto" ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                value={montoEnvio}
                onChange={(e) => setMontoEnvio(e.target.value)}
                className="h-9 w-28"
                aria-label="Monto del envío"
              />
            ) : null}
            <Input
              value={motivoEnvio}
              onChange={(e) => setMotivoEnvio(e.target.value)}
              maxLength={60}
              placeholder={modoEnvio === "gratis" ? "Por qué (lo ve el cliente): Octubre Naranja, Cortesía…" : "Motivo (opcional)"}
              className="h-9 min-w-56 flex-1"
              aria-label="Motivo del envío"
            />
          </div>
        ) : null}
      </section>

      {/* Descuento extra */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Descuento extra (opcional)</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={valorExtra}
            onChange={(e) => setValorExtra(e.target.value)}
            placeholder="0"
            className="h-9 w-24"
            aria-label="Descuento extra"
          />
          <select
            value={tipoExtra}
            onChange={(e) => setTipoExtra(e.target.value as "monto" | "pct")}
            className="h-9 rounded-md border bg-background px-2 text-sm"
            aria-label="Tipo de descuento"
          >
            <option value="monto">$</option>
            <option value="pct">% de los productos</option>
          </select>
          <Input
            value={motivoExtra}
            onChange={(e) => setMotivoExtra(e.target.value)}
            maxLength={80}
            placeholder="Motivo (lo ve el cliente): Promoción olvidada, Cliente frecuente…"
            className="h-9 min-w-56 flex-1"
            aria-label="Motivo del descuento"
          />
        </div>
        {descuentoCombos > 0 ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quitarCombos} onChange={(e) => setQuitarCombos(e.target.checked)} className="size-4" />
            Quitar el descuento de combos ({usd2(descuentoCombos)}) si ya no aplica
          </label>
        ) : null}
      </section>

      {/* Resumen del servidor */}
      <section className="space-y-1 rounded-lg border p-3" aria-live="polite">
        {errorCot ? (
          <p className="text-sm text-destructive">{errorCot}</p>
        ) : !cot ? (
          <p className="text-sm text-muted-foreground">Calculando…</p>
        ) : (
          <>
            <div className={fila}>
              <span className="text-muted-foreground">Productos</span>
              <span className="tabular-nums">{usd2(cot.subtotal)}</span>
            </div>
            <div className={fila}>
              <span className="text-muted-foreground">Envío{cot.envioMotivo ? ` · ${cot.envioMotivo}` : ""}</span>
              <span className="tabular-nums">{cot.envio ? usd2(cot.envio) : "Gratis"}</span>
            </div>
            {(
              [
                ["Descuento por efectivo o transferencia", cot.descuentoPago],
                ["Combos", cot.descuentoCombos],
                ["Cupón", cot.descuentoCupon],
                ["Puntos Nera", cot.descuentoPuntos],
                [cot.descuentoExtraMotivo ? `Descuento: ${cot.descuentoExtraMotivo}` : "Descuento extra", cot.descuentoExtra],
              ] as const
            )
              .filter(([, m]) => m > 0)
              .map(([t, m]) => (
                <div key={t} className={`${fila} text-green-700`}>
                  <span>{t}</span>
                  <span className="tabular-nums">−{usd2(m)}</span>
                </div>
              ))}
            <div className={`${fila} border-t pt-1 font-semibold`}>
              <span>Total</span>
              <span className="tabular-nums">
                {Math.abs(cot.total - cot.totalAnterior) > 0.004 ? (
                  <span className="mr-2 font-normal text-muted-foreground line-through">{usd2(cot.totalAnterior)}</span>
                ) : null}
                {usd2(cot.total)}
              </span>
            </div>
            {cot.pagado > 0 ? (
              <div className={`${fila} ${cot.saldo > 0.004 ? "text-amber-700" : cot.saldo < -0.004 ? "text-blue-700" : "text-green-700"}`}>
                <span>Ya pagó {usd2(cot.pagado)}</span>
                <span className="font-medium">
                  {cot.saldo > 0.004 ? `Saldo pendiente ${usd2(cot.saldo)}` : cot.saldo < -0.004 ? `A favor del cliente ${usd2(-cot.saldo)}` : "Al día"}
                </span>
              </div>
            ) : null}
            <div className={`${fila} text-xs text-muted-foreground`}>
              <span>Costo {usd2(cot.costo)}</span>
              <span className={cot.bajoCosto ? "font-medium text-red-600" : ""}>Te deja {usd2(cot.contribucion)}</span>
            </div>
            {cot.bajoCosto ? (
              <label className="flex items-start gap-2 rounded-md bg-red-50 p-2 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100">
                <input type="checkbox" checked={aceptaBajoCosto} onChange={(e) => setAceptaBajoCosto(e.target.checked)} className="mt-0.5 size-4" />
                Así el pedido pierde dinero. Sí, dejarlo así.
              </label>
            ) : null}
            {cot.cambios.length ? (
              <ul className="list-disc pt-1 pl-5 text-xs text-muted-foreground">
                {cot.cambios.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="pt-1 text-xs text-muted-foreground">Todavía no cambiaste nada.</p>
            )}
          </>
        )}
      </section>

      {/* Motivo, mensaje y correo */}
      <section className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ed-motivo">Motivo del cambio (obligatorio; queda en el historial)</Label>
          <Input id="ed-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ej. Olvidamos aplicar el envío gratis de la promo" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ed-mensaje">Mensaje para el cliente (opcional; sale en el correo)</Label>
          <Textarea id="ed-mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={500} rows={2} placeholder="Ej. Te aplicamos el envío gratis de Octubre Naranja. ¡Gracias por tu compra!" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={avisar} disabled={!correoCliente} onChange={(e) => setAvisar(e.target.checked)} className="size-4" />
          {correoCliente ? `Avisar al cliente por correo (${correoCliente})` : "El cliente no tiene correo: avisale por WhatsApp"}
        </label>
      </section>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button type="button" onClick={guardar} disabled={guardando || !cot || !cot.cambios.length}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" onClick={cerrar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
