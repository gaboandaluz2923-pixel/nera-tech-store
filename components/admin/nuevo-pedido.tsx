"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buscarCliente,
  cotizarPedidoManual,
  crearPedidoManual,
  type ClienteEncontrado,
} from "@/app/admin/(protegido)/pedidos/nuevo/actions";
import type { CotizacionManual, VarianteVendible } from "@/lib/admin/pedido-manual";
import { usd2 } from "@/lib/tienda/formato";

// Formulario "Nuevo pedido" del panel. Los totales los calcula el servidor con los precios de la base.

const CANALES = [
  { id: "whatsapp", texto: "WhatsApp" },
  { id: "instagram", texto: "Instagram" },
  { id: "facebook", texto: "Facebook / Marketplace" },
  { id: "tiktok", texto: "TikTok" },
  { id: "llamada", texto: "Llamada" },
  { id: "en_persona", texto: "En persona" },
  { id: "otro", texto: "Otro" },
];
const FORMAS = [
  { id: "contra_entrega", texto: "Efectivo al recibir" },
  { id: "transferencia", texto: "Transferencia" },
  { id: "wompi", texto: "Tarjeta (paga con el enlace de su pedido)" },
  { id: "tasa_cero", texto: "Tasa 0%" },
];
const ESTADOS = [
  { id: "pendiente_confirmar", texto: "Por confirmar", ayuda: "Todavía hay que confirmarlo con el cliente." },
  { id: "confirmado", texto: "Confirmado", ayuda: "Listo para preparar y entregar. Descuenta el stock en bodega." },
  { id: "entregado", texto: "Ya entregado", ayuda: "Venta en persona ya cerrada: queda entregado y pagado." },
] as const;

type Linea = { v: string; c: number; precio: number | null };

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function Opciones({
  nombre,
  valor,
  opciones,
  alCambiar,
}: {
  nombre: string;
  valor: string;
  opciones: { id: string; texto: string }[];
  alCambiar: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={nombre}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => alCambiar(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm ${valor === o.id ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function NuevoPedido({
  variantes,
  esAdmin,
  municipios,
  costoEnvio,
  telefonoInicial = "",
}: {
  variantes: VarianteVendible[];
  esAdmin: boolean;
  municipios: string[];
  costoEnvio: number;
  /** Desde la ficha del cliente: ya viene con su teléfono */
  telefonoInicial?: string;
}) {
  const router = useRouter();
  const [canal, setCanal] = useState("whatsapp");
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [alterno, setAlterno] = useState("");
  const [cliente, setCliente] = useState<ClienteEncontrado>(null);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [entrega, setEntrega] = useState<"domicilio" | "persona">("domicilio");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [formaPago, setFormaPago] = useState("contra_entrega");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]["id"]>("confirmado");
  const [pagado, setPagado] = useState(false);
  const [refPago, setRefPago] = useState("");
  const [nota, setNota] = useState("");
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [aceptaBajoCosto, setAceptaBajoCosto] = useState(false);
  const [cotServidor, setCot] = useState<CotizacionManual | null>(null);
  const [errorServidor, setErrorCot] = useState<string | null>(null);
  const [creando, empezar] = useTransition();
  const vez = useRef(0);

  // Sin productos no hay total (lo último que respondió el servidor ya no vale)
  const cot = lineas.length ? cotServidor : null;
  const errorCot = lineas.length ? errorServidor : null;

  const porId = useMemo(() => new Map(variantes.map((v) => [v.id, v])), [variantes]);
  const resultados = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return variantes.filter((v) => palabras.every((p) => normalizar(v.nombre).includes(p))).slice(0, 8);
  }, [busqueda, variantes]);

  // Venta en persona: sin envío. Ya entregado: ya pagó.
  const elegirCanal = (v: string) => {
    setCanal(v);
    if (v === "en_persona") setEntrega("persona");
  };
  const elegirEstado = (v: (typeof ESTADOS)[number]["id"]) => {
    setEstado(v);
    if (v === "entregado") setPagado(true);
  };

  // Totales del servidor cada vez que cambian productos, forma de pago o entrega
  useEffect(() => {
    if (!lineas.length) return;
    const n = ++vez.current;
    const t = setTimeout(async () => {
      const r = await cotizarPedidoManual({ lineas, formaPago, entrega });
      if (n !== vez.current) return;
      if (r.ok) {
        setCot(r.cotizacion);
        setErrorCot(null);
      } else {
        setCot(null);
        setErrorCot(r.mensaje);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [lineas, formaPago, entrega]);

  // Si viene de la ficha del cliente, se llenan sus datos al abrir
  useEffect(() => {
    if (telefonoInicial) void alBuscarCliente();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function alBuscarCliente() {
    const tel = telefono.replace(/\D/g, "").replace(/^503(?=\d{8}$)/, "");
    if (tel.length !== 8) return;
    setBuscando(true);
    const c = await buscarCliente(tel).catch(() => null);
    setBuscando(false);
    setCliente(c);
    if (c) {
      if (!nombre) setNombre(c.nombre);
      if (!correo && c.correo) setCorreo(c.correo);
      if (!alterno && c.telefonoAlterno) setAlterno(c.telefonoAlterno);
      if (!municipio && c.municipio) setMunicipio(c.municipio);
      if (!direccion && c.direccion) setDireccion(c.direccion);
      if (!referencia && c.referencia) setReferencia(c.referencia);
    }
  }

  function agregar(id: string) {
    setLineas((ls) => (ls.some((l) => l.v === id) ? ls.map((l) => (l.v === id ? { ...l, c: l.c + 1 } : l)) : [...ls, { v: id, c: 1, precio: null }]));
    setBusqueda("");
  }
  const cambiar = (id: string, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.v === id ? { ...l, ...cambio } : l)));
  const quitar = (id: string) => setLineas((ls) => ls.filter((l) => l.v !== id));

  function crear() {
    if (!cot) {
      toast.error(errorCot ?? "Agregá al menos un producto.");
      return;
    }
    empezar(async () => {
      const r = await crearPedidoManual({
        canal,
        nombre,
        telefono,
        telefonoAlterno: alterno,
        correo,
        lineas,
        entrega,
        municipio,
        direccion,
        referencia,
        formaPago,
        estado,
        pagado,
        referenciaPago: refPago,
        nota,
        enviarCorreo,
        totalVisto: cot.total,
        aceptaBajoCosto,
      });
      if (r.ok) {
        toast.success(`Pedido #${r.numero} creado`);
        router.push(`/admin/pedidos/${r.id}`);
      } else {
        toast.error(r.mensaje);
      }
    });
  }

  const seccion = "space-y-3 rounded-xl border p-4";

  return (
    <div className="space-y-5">
      <section className={seccion}>
        <h2 className="font-semibold">1. ¿Por dónde entró?</h2>
        <Opciones nombre="Canal" valor={canal} opciones={CANALES} alCambiar={elegirCanal} />
      </section>

      <section className={seccion}>
        <h2 className="font-semibold">2. Cliente</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="np-tel">Teléfono</Label>
            <div className="flex gap-2">
              <Input
                id="np-tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                onBlur={alBuscarCliente}
                placeholder="7123 4567"
              />
              <Button type="button" variant="outline" onClick={alBuscarCliente} disabled={buscando}>
                {buscando ? "Buscando…" : "Buscar"}
              </Button>
            </div>
            {cliente ? (
              <p className="text-xs text-green-800">
                Ya es cliente{cliente.pedidos ? ` · ${cliente.pedidos} ${cliente.pedidos === 1 ? "pedido" : "pedidos"}` : ""}. Llenamos sus datos.
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-nombre">Nombre</Label>
            <Input id="np-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-correo">Correo (opcional)</Label>
            <Input id="np-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Para mandarle la confirmación" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-alterno">Teléfono alterno (opcional)</Label>
            <Input id="np-alterno" inputMode="tel" value={alterno} onChange={(e) => setAlterno(e.target.value)} />
          </div>
        </div>
      </section>

      <section className={seccion}>
        <h2 className="font-semibold">3. Productos</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscá por nombre, memoria o color (ej. a27 256 negro)"
            className="pl-8"
            aria-label="Buscar producto"
          />
        </div>
        {resultados.length ? (
          <ul className="divide-y rounded-md border">
            {resultados.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => agregar(v.id)} className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-muted/60">
                  <span className="min-w-0 flex-1">
                    <span className="block">{v.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {v.stock > 0 ? `${v.stock} en bodega` : "Sin stock propio"}
                      {!v.publicado ? " · oculto en la tienda" : ""}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    {v.precioRegular ? <span className="block text-xs text-muted-foreground line-through">{usd2(v.precioRegular)}</span> : null}
                    {usd2(v.precio)}
                  </span>
                  <Plus className="size-4 text-marca" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : busqueda.trim() ? (
          <p className="text-sm text-muted-foreground">No hay productos con precio que coincidan.</p>
        ) : null}

        {lineas.length ? (
          <ul className="space-y-2">
            {lineas.map((l) => {
              const v = porId.get(l.v);
              if (!v) return null;
              return (
                <li key={l.v} className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{v.nombre}</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => quitar(l.v)} aria-label="Quitar">
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => cambiar(l.v, { c: Math.max(1, l.c - 1) })} aria-label="Menos">
                        <Minus className="size-4" aria-hidden />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={l.c}
                        onChange={(e) => cambiar(l.v, { c: Math.max(1, Math.min(50, Math.floor(Number(e.target.value) || 1))) })}
                        className="h-8 w-16 text-center"
                        aria-label="Cantidad"
                      />
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => cambiar(l.v, { c: Math.min(50, l.c + 1) })} aria-label="Más">
                        <Plus className="size-4" aria-hidden />
                      </Button>
                    </div>
                    {esAdmin ? (
                      <label className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Precio c/u</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={l.precio ?? v.precio}
                          onChange={(e) => cambiar(l.v, { precio: e.target.value === "" ? null : Number(e.target.value) })}
                          className="h-8 w-28"
                          aria-label="Precio especial"
                        />
                      </label>
                    ) : (
                      <span className="text-muted-foreground">{usd2(v.precio)} c/u</span>
                    )}
                    <span className="ml-auto font-medium tabular-nums">{usd2((l.precio ?? v.precio) * l.c)}</span>
                  </div>
                  {v.stock < l.c && estado !== "pendiente_confirmar" ? (
                    <p className="text-xs text-amber-800">
                      {v.stock > 0 ? `Solo hay ${v.stock} en bodega` : "No hay en bodega"}: confirmá que el proveedor lo tiene.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no agregaste productos.</p>
        )}
        {esAdmin ? <p className="text-xs text-muted-foreground">Como administrador podés poner un precio especial; queda anotado en el pedido.</p> : null}
      </section>

      <section className={seccion}>
        <h2 className="font-semibold">4. Entrega</h2>
        <Opciones
          nombre="Entrega"
          valor={entrega}
          opciones={[
            { id: "domicilio", texto: `A domicilio (${usd2(costoEnvio)})` },
            { id: "persona", texto: "En persona (sin envío)" },
          ]}
          alCambiar={(v) => setEntrega(v as "domicilio" | "persona")}
        />
        {entrega === "domicilio" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="np-mun">Municipio</Label>
              <Input id="np-mun" list="np-municipios" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
              <datalist id="np-municipios">
                {municipios.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-ref">Referencia (opcional)</Label>
              <Input id="np-ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. portón negro, frente a la tienda" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="np-dir">Dirección</Label>
              <Input id="np-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Colonia, calle, número de casa" />
            </div>
          </div>
        ) : null}
      </section>

      <section className={seccion}>
        <h2 className="font-semibold">5. Pago y estado</h2>
        <Opciones nombre="Forma de pago" valor={formaPago} opciones={FORMAS} alCambiar={setFormaPago} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} disabled={estado === "entregado"} className="size-4 accent-[var(--marca)]" />
          Ya pagó
        </label>
        {pagado && formaPago !== "contra_entrega" ? (
          <Input value={refPago} onChange={(e) => setRefPago(e.target.value)} placeholder="Referencia del pago (opcional)" aria-label="Referencia del pago" />
        ) : null}
        <div className="space-y-2 pt-1">
          <Opciones nombre="Estado" valor={estado} opciones={[...ESTADOS]} alCambiar={(v) => elegirEstado(v as (typeof ESTADOS)[number]["id"])} />
          <p className="text-xs text-muted-foreground">{ESTADOS.find((e) => e.id === estado)?.ayuda}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="np-nota">Nota del pedido (opcional)</Label>
          <Textarea id="np-nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. entregar después de las 3 pm" />
        </div>
        {correo ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enviarCorreo} onChange={(e) => setEnviarCorreo(e.target.checked)} className="size-4 accent-[var(--marca)]" />
            Mandarle el correo de confirmación con el enlace de su pedido
          </label>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl bg-muted/50 p-4">
        <h2 className="font-semibold">Resumen</h2>
        {cot ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Productos</dt>
              <dd className="tabular-nums">{usd2(cot.subtotal)}</dd>
            </div>
            {cot.descuento > 0 ? (
              <div className="flex justify-between text-green-700">
                <dt>Descuento {cot.porcentaje}% sin tarjeta</dt>
                <dd className="tabular-nums">−{usd2(cot.descuento)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd className="tabular-nums">{cot.envio ? usd2(cot.envio) : "Sin envío"}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{usd2(cot.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{errorCot ?? "Agregá productos para ver el total."}</p>
        )}
        {cot?.avisos?.length ? (
          <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
            {cot.avisos.map((a) => (
              <p key={a}>{a}</p>
            ))}
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={aceptaBajoCosto} onChange={(e) => setAceptaBajoCosto(e.target.checked)} className="size-4" />
              Sí, venderlo así
            </label>
          </div>
        ) : null}
        <Button type="button" size="lg" className="w-full sm:w-auto" onClick={crear} disabled={creando || !cot}>
          {creando ? "Creando…" : "Crear pedido"}
        </Button>
      </section>
    </div>
  );
}
