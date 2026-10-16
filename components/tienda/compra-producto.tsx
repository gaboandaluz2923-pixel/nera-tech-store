"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Banknote, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  avisarStock,
  type EstadoAviso,
} from "@/app/(tienda)/producto/[slug]/actions";
import type { ComboTienda, VarianteTienda } from "@/lib/tienda/datos";
import {
  TEXTO_DISPONIBILIDAD,
  cuota,
  finDeOferta,
  precioConDescuento,
  textoDescuento,
  usd,
  usd2,
} from "@/lib/tienda/formato";
import { enlaceWhatsAppA, mensajeProducto } from "@/lib/whatsapp";
import { IconoWhatsApp } from "./icono-whatsapp";
import { abrirCarrito, agregarAlCarrito } from "@/lib/tienda/carrito";
import { medir } from "@/lib/analytics";

// Caja de compra de la ficha: elegir memoria y color, ver precio, cuota, disponibilidad y comprar.
// En el teléfono, una barra fija abajo mantiene precio y botón siempre a la vista.

type Props = {
  productoId: string;
  nombre: string;
  variantes: VarianteTienda[];
  combos: ComboTienda[];
  whatsapp: string;
  mesesTasaCero: number;
  costoEnvio: number;
  envioGratisDesde: number | null;
  /** Campaña vigente con envío gratis para este producto (ej. Octubre Naranja) */
  campana?: { nombre: string; fin: string | null } | null;
  /** % de descuento al pagar en efectivo o transferencia (Configuración) */
  descuentoSinTarjeta: number;
};

const PUNTO_DISP = {
  bodega: "bg-green-600",
  proveedor: "bg-green-600",
  agotado: "bg-muted-foreground",
} as const;

function Opcion({
  activa,
  agotada,
  onClick,
  children,
}: {
  activa: boolean;
  agotada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
        activa
          ? "border-marca bg-marca/5"
          : "border-border hover:border-foreground/30"
      } ${agotada ? "text-muted-foreground line-through decoration-1" : ""}`}
    >
      {children}
    </button>
  );
}

// Minuto actual en el navegador (0 en el servidor): si una oferta ya terminó y la página
// quedó guardada, se muestra el precio normal sin esperar a que se refresque.
const sinCambios = () => () => {};
const minutoActual = () => Math.floor(Date.now() / 60_000) * 60_000;
function vigente(v: VarianteTienda, ahora: number): VarianteTienda {
  if (!ahora || !v.oferta?.fin || !v.precioRegular) return v;
  return new Date(v.oferta.fin).getTime() < ahora ? { ...v, precio: v.precioRegular, precioRegular: null, oferta: null } : v;
}

export function CompraProducto(props: Props) {
  const ahora = useSyncExternalStore(sinCambios, minutoActual, () => 0);
  const p = {
    ...props,
    variantes: props.variantes.map((v) => vigente(v, ahora)),
    // La campaña deja de mostrarse al terminar aunque la página siga abierta
    campana: props.campana && (!props.campana.fin || !ahora || new Date(props.campana.fin).getTime() > ahora) ? props.campana : null,
  };
  // Arranca en la opción más barata que está en bodega (si no hay, la disponible más barata),
  // en negro si existe (es el color de las fotos).
  const [elegidaBase, setElegida] = useState<VarianteTienda>(() => {
    const enBodega = p.variantes.filter((v) => v.disponibilidad === "bodega");
    const disponibles = p.variantes.filter(
      (v) => v.disponibilidad !== "agotado",
    );
    const base = enBodega.length ? enBodega : disponibles.length ? disponibles : p.variantes;
    const minimo = Math.min(...base.map((v) => v.precio));
    const baratas = base.filter((v) => v.precio === minimo);
    return (
      baratas.find((v) => /negro|black/i.test(v.color ?? "")) ?? baratas[0]
    );
  });

  // Con el precio vigente (si la oferta terminó, el normal)
  const elegida = p.variantes.find((v) => v.id === elegidaBase.id) ?? elegidaBase;

  // Vista del producto (una vez por ficha)
  useEffect(() => {
    medir("vista_producto", { productoId: props.productoId, nombre: props.nombre, valor: Math.min(...props.variantes.map((v) => v.precio)) });
  }, [props.productoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // La barra fija de abajo aparece cuando el botón principal no está en pantalla
  // (todavía no llegaste o ya lo pasaste): siempre hay un solo botón de compra a la vista.
  const acciones = useRef<HTMLDivElement>(null);
  const [verBarra, setVerBarra] = useState(false);
  useEffect(() => {
    const el = acciones.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setVerBarra(!e.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const memorias = useMemo(
    () => [
      ...new Set(
        p.variantes
          .map((v) => v.memoria)
          .filter((m): m is string => Boolean(m)),
      ),
    ],
    [p.variantes],
  );
  const colores = useMemo(
    () => [
      ...new Set(
        p.variantes.map((v) => v.color).filter((c): c is string => Boolean(c)),
      ),
    ],
    [p.variantes],
  );

  // Al cambiar una opción, buscar la combinación exacta; si no existe, la primera disponible con esa opción.
  const elegir = (cambio: { memoria?: string; color?: string }) => {
    const memoria = cambio.memoria ?? elegida.memoria;
    const color = cambio.color ?? elegida.color;
    const candidatas = p.variantes.filter((v) =>
      cambio.memoria !== undefined
        ? v.memoria === cambio.memoria
        : v.color === cambio.color,
    );
    const exacta = p.variantes.find(
      (v) => v.memoria === memoria && v.color === color,
    );
    const siguiente =
      exacta ??
      candidatas.find((v) => v.disponibilidad !== "agotado") ??
      candidatas[0] ??
      elegida;
    setElegida(siguiente);
  };

  const agotada = elegida.disponibilidad === "agotado";
  const nombreCompleto = [p.nombre, elegida.memoria, elegida.color]
    .filter(Boolean)
    .join(" ");
  const mensualidad = cuota(elegida.precio, p.mesesTasaCero);
  const conCuotas = elegida.precio >= 100 && p.mesesTasaCero > 1;
  const enlaceComprar = enlaceWhatsAppA(
    p.whatsapp,
    mensajeProducto({
      intencion: "comprar",
      nombre: nombreCompleto,
      precio: elegida.precio,
      codigoPagina: "ficha",
    }),
  );
  const enlaceTasaCero = enlaceWhatsAppA(
    p.whatsapp,
    mensajeProducto({
      intencion: "tasa_cero",
      nombre: nombreCompleto,
      precio: elegida.precio,
      cuota: { meses: p.mesesTasaCero, monto: mensualidad },
      codigoPagina: "ficha",
    }),
  );
  const enlacePregunta = enlaceWhatsAppA(
    p.whatsapp,
    mensajeProducto({
      intencion: "pregunta",
      nombre: nombreCompleto,
      precio: elegida.precio,
      codigoPagina: "ficha",
    }),
  );
  const comprar = () => {
    agregarAlCarrito(elegida.id);
    medir("agregar_carrito", { productoId: p.productoId, varianteId: elegida.id, nombre: nombreCompleto, valor: elegida.precio });
    abrirCarrito();
  };
  const comprarCombo = (c: ComboTienda) => {
    agregarAlCarrito(elegida.id);
    medir("clic_bundle", { productoId: p.productoId, varianteId: elegida.id, nombre: c.nombre, combo: c.id });
    c.items.forEach((i) => agregarAlCarrito(i.varianteId, i.cantidad));
    abrirCarrito();
  };
  const envioGratis =
    Boolean(p.campana) || (p.envioGratisDesde !== null && elegida.precio >= p.envioGratisDesde);

  return (
    <div className="space-y-5">
      {/* Precio */}
      <div>
        {elegida.precioRegular ? (
          <p className="mb-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md bg-marca px-2 py-0.5 font-semibold text-white">
              Oferta · ahorrás {usd2(elegida.precioRegular - elegida.precio)}
            </span>
            {elegida.oferta?.fin ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                {finDeOferta(elegida.oferta.fin, ahora ? new Date(ahora) : null)}
              </span>
            ) : null}
          </p>
        ) : null}
        <p className="text-3xl font-bold tracking-tight">
          {usd(elegida.precio)}
          {elegida.precioRegular ? (
            <span className="ml-2 text-lg font-normal text-muted-foreground line-through">
              {usd(elegida.precioRegular)}
            </span>
          ) : null}
        </p>
        {conCuotas ? (
          <p className="mt-0.5 text-sm">
            o{" "}
            <strong>
              {p.mesesTasaCero} cuotas de {usd2(mensualidad)}
            </strong>{" "}
            sin intereses (tasa 0%)
          </p>
        ) : null}
        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-800">
          <Banknote className="size-4 shrink-0" aria-hidden />
          <span>
            {textoDescuento(p.descuentoSinTarjeta)}:{" "}
            <strong>{usd2(precioConDescuento(elegida.precio, p.descuentoSinTarjeta))}</strong>
          </span>
        </p>
        {p.campana ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="rounded-md bg-marca px-2 py-0.5 font-semibold text-white">Envío gratis · {p.campana.nombre}</span>
            {p.campana.fin ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                {finDeOferta(p.campana.fin, ahora ? new Date(ahora) : null)}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{envioGratis ? "Envío gratis" : `Envío ${usd(p.costoEnvio)}`}</p>
        )}
      </div>

      {/* Opciones */}
      {memorias.length > 1 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Memoria</legend>
          <div className="flex flex-wrap gap-2">
            {memorias.map((m) => {
              const deEsta = p.variantes.filter((v) => v.memoria === m);
              return (
                <Opcion
                  key={m}
                  activa={elegida.memoria === m}
                  agotada={deEsta.every((v) => v.disponibilidad === "agotado")}
                  onClick={() => elegir({ memoria: m })}
                >
                  {m}
                  <span className="block text-xs font-normal text-muted-foreground no-underline">
                    {usd(Math.min(...deEsta.map((v) => v.precio)))}
                  </span>
                </Opcion>
              );
            })}
          </div>
        </fieldset>
      ) : elegida.memoria ? (
        <p className="text-sm">
          <span className="font-semibold">Memoria:</span> {elegida.memoria}
        </p>
      ) : null}

      {colores.length > 1 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Color: <span className="font-normal">{elegida.color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colores.map((c) => {
              const deEste = p.variantes.filter(
                (v) =>
                  v.color === c &&
                  (memorias.length < 2 || v.memoria === elegida.memoria),
              );
              return (
                <Opcion
                  key={c}
                  activa={elegida.color === c}
                  agotada={
                    deEste.length === 0 ||
                    deEste.every((v) => v.disponibilidad === "agotado")
                  }
                  onClick={() => elegir({ color: c })}
                >
                  {c}
                </Opcion>
              );
            })}
          </div>
        </fieldset>
      ) : elegida.color ? (
        <p className="text-sm">
          <span className="font-semibold">Color:</span> {elegida.color}
        </p>
      ) : null}

      {/* Disponibilidad */}
      <p className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`size-2.5 rounded-full ${PUNTO_DISP[elegida.disponibilidad]}`}
          aria-hidden
        />
        {TEXTO_DISPONIBILIDAD[elegida.disponibilidad].largo}
      </p>

      {/* Acciones */}
      <div ref={acciones}>
        {agotada ? (
          <AvisoStock
            productoId={p.productoId}
            nombre={p.nombre}
            enlacePregunta={enlacePregunta}
          />
        ) : (
          <div className="space-y-2">
            <Button size="lg" className="h-12 w-full text-base" onClick={comprar}>
              Comprar
            </Button>
            {conCuotas ? (
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full text-base"
                nativeButton={false}
                render={
                  <a
                    href={enlaceTasaCero}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Quiero tasa 0% en {p.mesesTasaCero} cuotas
              </Button>
            ) : null}
            <a
              href={enlaceComprar}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <IconoWhatsApp className="size-4" />
              ¿Preferís comprar por WhatsApp?
            </a>
          </div>
        )}
      </div>

      {/* Combos "Completá tu equipo" */}
      {!agotada && p.combos.length ? (
        <section aria-labelledby="t-combos" className="space-y-2">
          <h2 id="t-combos" className="text-sm font-semibold">
            Completá tu equipo y ahorrá
          </h2>
          {p.combos.slice(0, 2).map((c) => {
            const normal = elegida.precio + c.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
            const ahorro = Math.min(c.ahorro, c.items.reduce((s, i) => s + i.precio * i.cantidad, 0));
            return (
              <div key={c.id} className="rounded-xl border-2 border-dashed border-marca/50 bg-marca/5 p-3">
                <div className="flex items-center gap-1.5">
                  {c.items.map((i) => (
                    <span key={i.varianteId} className="flex items-center gap-1.5">
                      <Plus className="size-3.5 text-muted-foreground" aria-hidden />
                      <span className="relative size-12 overflow-hidden rounded-md border bg-white">
                        {i.imagen ? <Image src={i.imagen.url} alt={i.imagen.alt} fill sizes="48px" className="object-contain p-0.5" /> : null}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {c.items.map((i) => `${i.cantidad > 1 ? `${i.cantidad} × ` : ""}${i.nombre}`).join(" + ")}
                </p>
                <p className="mt-1 text-sm">
                  <strong>{usd2(normal - ahorro)}</strong>{" "}
                  <span className="text-muted-foreground line-through">{usd2(normal)}</span>{" "}
                  <span className="font-semibold text-green-700">ahorrás {usd2(ahorro)}</span>
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => comprarCombo(c)}>
                  Agregar combo
                </Button>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Barra fija en el teléfono */}
      <div
        inert={!verBarra}
        className={`fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur transition-transform md:hidden ${verBarra ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {[elegida.memoria, elegida.color].filter(Boolean).join(" · ") ||
                p.nombre}
            </p>
            <p className="text-lg leading-tight font-bold">
              {usd(elegida.precio)}
            </p>
          </div>
          {agotada ? (
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              nativeButton={false}
              render={<a href="#avisame" />}
            >
              Avisame
            </Button>
          ) : (
            <Button size="lg" className="h-11 px-5" onClick={comprar}>
              Comprar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AvisoStock({
  productoId,
  nombre,
  enlacePregunta,
}: {
  productoId: string;
  nombre: string;
  enlacePregunta: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoAviso, FormData>(
    avisarStock,
    null,
  );
  useEffect(() => {
    if (estado?.ok) medir("correo_capturado", { productoId, nombre, motivo: "aviso_stock" });
  }, [estado, productoId, nombre]);
  if (estado?.ok) {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
        {estado.mensaje}
      </p>
    );
  }
  return (
    <div id="avisame" className="scroll-mt-24 space-y-3 rounded-xl border p-4">
      <form action={accion} className="space-y-2">
        <label htmlFor="correo-aviso" className="block text-sm font-semibold">
          Avisame cuando haya
        </label>
        <input type="hidden" name="productoId" value={productoId} />
        <input
          type="text"
          name="sitio"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden
        />
        <div className="flex gap-2">
          <input
            id="correo-aviso"
            name="correo"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="tu@correo.com"
            className="h-11 min-w-0 flex-1 rounded-lg border px-3 text-base outline-none focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-marca/30"
          />
          <Button type="submit" size="lg" className="h-11" disabled={enviando}>
            {enviando ? "Guardando…" : "Avisame"}
          </Button>
        </div>
        {estado && !estado.ok ? (
          <p className="text-sm text-destructive">{estado.mensaje}</p>
        ) : null}
      </form>
      <a
        href={enlacePregunta}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <IconoWhatsApp className="size-4" />
        Preguntar por WhatsApp si llega pronto
      </a>
    </div>
  );
}
