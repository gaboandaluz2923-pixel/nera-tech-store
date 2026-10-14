"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  Banknote,
  CreditCard,
  Landmark,
  Lock,
  Percent,
  ShieldCheck,
} from "lucide-react";
import {
  confirmarPedido,
  datosCuentaParaCheckout,
  type DatosCuenta,
} from "@/app/(tienda)/checkout/actions";
import type { Direccion } from "@/lib/tienda/cuentas";
import { Button } from "@/components/ui/button";
import { vaciarCarrito } from "@/lib/tienda/carrito";
import {
  DESCUENTO_SIN_TARJETA,
  cuota,
  descuentoSinTarjeta,
  tieneDescuentoSinTarjeta,
  usd2,
} from "@/lib/tienda/formato";
import { useResumenCarrito } from "./carrito-hoja";

// Una sola página de pago, sin cuenta (Krug): datos, entrega, forma de pago y factura.

type FormaPago = "contra_entrega" | "wompi" | "transferencia" | "tasa_cero";

type Props = {
  zonasContraEntrega: string[];
  departamentos: readonly string[];
  otraZona: string;
  mesesTasaCero: number;
  minimoTasaCero: number;
};

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  );
}

const claseEntrada = (error?: string) =>
  `h-12 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-marca/30 ${
    error ? "border-destructive" : ""
  }`;

export function CheckoutFormulario(p: Props) {
  const { lineas, resumen, cargando } = useResumenCarrito();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [zona, setZona] = useState(p.zonasContraEntrega[0] ?? p.otraZona);
  const [forma, setForma] = useState<FormaPago>(
    p.zonasContraEntrega.length ? "contra_entrega" : "wompi",
  );
  const [creditoFiscal, setCreditoFiscal] = useState(false);
  // Con sesión de Google: datos y direcciones guardadas para llenar el formulario solo
  const [cuenta, setCuenta] = useState<DatosCuenta>(null);
  const [dirSel, setDirSel] = useState<Direccion | null>(null);
  const [guardarDir, setGuardarDir] = useState(true);
  useEffect(() => {
    let vigente = true;
    datosCuentaParaCheckout()
      .then((c) => {
        if (!vigente || !c) return;
        setCuenta(c);
        const d = c.direcciones.find((x) => x.principal) ?? c.direcciones[0];
        if (d) usarDireccion(d);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function usarDireccion(d: Direccion | null) {
    setDirSel(d);
    if (d)
      setZona(
        p.zonasContraEntrega.includes(d.zona) || d.zona === p.otraZona
          ? d.zona
          : p.otraZona,
      );
  }

  const contraEntrega = zona !== p.otraZona;
  const total = resumen?.total ?? 0;
  const tasaCero = total >= p.minimoTasaCero;
  const formaValida: FormaPago =
    forma === "contra_entrega" && !contraEntrega
      ? "wompi"
      : forma === "tasa_cero" && !tasaCero
        ? "wompi"
        : forma;
  // Efectivo y transferencia tienen 6% de descuento sobre los productos; el servidor lo recalcula igual.
  const descuento = descuentoSinTarjeta(resumen?.subtotal ?? 0, formaValida);
  const totalAPagar = Math.round((total - descuento) * 100) / 100;

  // En el servidor no hay carrito: hasta que el navegador lo lea, mostrar un esqueleto
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!montado)
    return (
      <div className="h-96 animate-pulse rounded-2xl bg-muted" aria-hidden />
    );

  if (!lineas.length && !enviando) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium">Tu carrito está vacío.</p>
        <Button
          className="mt-4"
          size="lg"
          nativeButton={false}
          render={<Link href="/celulares" />}
        >
          Ver celulares
        </Button>
      </div>
    );
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resumen) return;
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    const datos = {
      sitio: g("sitio"),
      nombre: g("nombre"),
      telefono: g("telefono"),
      telefonoAlterno: g("telefonoAlterno"),
      guardarDireccion: Boolean(cuenta && !dirSel && guardarDir),
      correo: g("correo"),
      zona,
      departamento: g("departamento"),
      municipio: g("municipio"),
      direccion: g("direccion"),
      referencia: g("referencia"),
      formaPago: formaValida,
      creditoFiscal,
      nit: g("nit"),
      nrc: g("nrc"),
      razonSocial: g("razonSocial"),
      giro: g("giro"),
      notas: g("notas"),
      totalVisto: totalAPagar,
      lineas,
    };
    setMensaje(null);
    iniciar(async () => {
      const r = await confirmarPedido(datos);
      if (r.ok) {
        vaciarCarrito();
        if (r.externa) window.location.href = r.url;
        else router.push(r.url);
        return;
      }
      setErrores(r.campos ?? {});
      setMensaje(r.mensaje);
      const primero = Object.keys(r.campos ?? {})[0];
      const el = primero
        ? document.getElementById(`co-${primero}`)
        : document.getElementById("co-mensaje");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (primero)
        (el as HTMLInputElement | null)?.focus({ preventScroll: true });
    });
  }

  const etiquetaDescuento = `${DESCUENTO_SIN_TARJETA.porcentaje}% de descuento`;
  const opciones: {
    id: FormaPago;
    titulo: string;
    texto: string;
    icono: typeof Banknote;
    activa: boolean;
    nota?: string;
    insignia?: string;
  }[] = [
    {
      id: "contra_entrega",
      titulo: "Efectivo al recibir",
      texto: "Pagás cuando te lo entregamos.",
      icono: Banknote,
      activa: contraEntrega,
      nota: contraEntrega
        ? undefined
        : `Solo en ${p.zonasContraEntrega.join(", ")}.`,
      insignia: etiquetaDescuento,
    },
    {
      id: "wompi",
      titulo: "Tarjeta de crédito o débito",
      texto: "Pago seguro con Wompi. Visa y Mastercard.",
      icono: CreditCard,
      activa: true,
    },
    {
      id: "transferencia",
      titulo: "Transferencia bancaria",
      texto: "Te mostramos las cuentas al confirmar.",
      icono: Landmark,
      activa: true,
      insignia: etiquetaDescuento,
    },
    {
      id: "tasa_cero",
      titulo: `Tasa 0% hasta ${p.mesesTasaCero} meses`,
      texto: tasaCero
        ? `${p.mesesTasaCero} cuotas de ${usd2(cuota(total, p.mesesTasaCero))}. Lo procesamos por WhatsApp.`
        : "",
      icono: Percent,
      activa: tasaCero,
      nota: tasaCero ? undefined : `Para compras desde $${p.minimoTasaCero}.`,
    },
  ];

  const textoBoton =
    formaValida === "wompi"
      ? `Pagar ${usd2(totalAPagar)} con tarjeta`
      : `Confirmar pedido · ${usd2(totalAPagar)}`;

  return (
    <form
      onSubmit={enviar}
      onInput={(e) => {
        // Al corregir un campo, su aviso rojo desaparece
        const nombre =
          (e.target as HTMLInputElement).name ||
          (e.target as HTMLElement).id.replace(/^co-/, "");
        if (nombre && errores[nombre]) {
          setErrores((previos) => {
            const resto = { ...previos };
            delete resto[nombre];
            return resto;
          });
        }
      }}
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
    >
      <input
        type="text"
        name="sitio"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <div className="space-y-8">
        <section
          key={cuenta ? "cuenta" : "visita"}
          aria-labelledby="t-datos"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="t-datos" className="text-lg font-bold">
              1. Tus datos
            </h2>
            {!cuenta ? (
              <Link
                href="/cuenta/entrar?volver=/checkout"
                className="text-sm text-muted-foreground underline"
              >
                ¿Tenés cuenta? Entrá y se llena solo
              </Link>
            ) : null}
          </div>
          <Campo
            id="co-nombre"
            etiqueta="Nombre y apellido"
            error={errores.nombre}
          >
            <input
              id="co-nombre"
              name="nombre"
              autoComplete="name"
              defaultValue={cuenta?.nombre}
              className={claseEntrada(errores.nombre)}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="co-telefono"
              etiqueta="Teléfono (WhatsApp)"
              error={errores.telefono}
            >
              <input
                id="co-telefono"
                name="telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="7123 4567"
                defaultValue={cuenta?.telefono}
                className={claseEntrada(errores.telefono)}
              />
            </Campo>
            <Campo
              id="co-correo"
              etiqueta="Correo"
              error={errores.correo}
              ayuda="Ahí te llega la factura."
            >
              <input
                id="co-correo"
                name="correo"
                type="email"
                inputMode="email"
                autoComplete="email"
                defaultValue={cuenta?.correo}
                className={claseEntrada(errores.correo)}
              />
            </Campo>
          </div>
          <Campo
            id="co-telefonoAlterno"
            etiqueta="Teléfono alterno (opcional)"
            error={errores.telefonoAlterno}
            ayuda="Por si no te encontramos en el primero."
          >
            <input
              id="co-telefonoAlterno"
              name="telefonoAlterno"
              type="tel"
              inputMode="tel"
              defaultValue={cuenta?.telefonoAlterno}
              className={claseEntrada(errores.telefonoAlterno)}
            />
          </Campo>
        </section>

        <section aria-labelledby="t-entrega" className="space-y-4">
          <h2 id="t-entrega" className="text-lg font-bold">
            2. ¿Dónde lo recibís?
          </h2>
          {cuenta?.direcciones.length ? (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Tus direcciones"
            >
              {cuenta.direcciones.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => usarDireccion(d)}
                  aria-pressed={dirSel?.id === d.id}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${dirSel?.id === d.id ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
                >
                  {d.nombre}
                </button>
              ))}
              <button
                type="button"
                onClick={() => usarDireccion(null)}
                aria-pressed={!dirSel}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${!dirSel ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
              >
                Otra dirección
              </button>
            </div>
          ) : null}
          <div key={dirSel?.id ?? "nueva"} className="space-y-4">
            <Campo id="co-zona" etiqueta="Municipio" error={errores.zona}>
              <select
                id="co-zona"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className={claseEntrada(errores.zona)}
              >
                {p.zonasContraEntrega.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
                <option value={p.otraZona}>{p.otraZona} del país</option>
              </select>
            </Campo>
            {!contraEntrega ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  id="co-departamento"
                  etiqueta="Departamento"
                  error={errores.departamento}
                >
                  <select
                    id="co-departamento"
                    name="departamento"
                    defaultValue={dirSel?.departamento ?? ""}
                    className={claseEntrada(errores.departamento)}
                  >
                    <option value="" disabled>
                      Elegí uno
                    </option>
                    {p.departamentos.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo
                  id="co-municipio"
                  etiqueta="Municipio o distrito"
                  error={errores.municipio}
                >
                  <input
                    id="co-municipio"
                    name="municipio"
                    defaultValue={
                      dirSel?.zona === p.otraZona
                        ? (dirSel?.municipio ?? "")
                        : ""
                    }
                    className={claseEntrada(errores.municipio)}
                  />
                </Campo>
              </div>
            ) : null}
            <Campo
              id="co-direccion"
              etiqueta="Dirección"
              error={errores.direccion}
              ayuda="Colonia, calle o pasaje y número de casa."
            >
              <input
                id="co-direccion"
                name="direccion"
                autoComplete="street-address"
                defaultValue={dirSel?.direccion}
                className={claseEntrada(errores.direccion)}
              />
            </Campo>
            <Campo
              id="co-referencia"
              etiqueta="Punto de referencia (opcional)"
              error={errores.referencia}
            >
              <input
                id="co-referencia"
                name="referencia"
                placeholder="Ej. frente al parque, portón negro"
                defaultValue={dirSel?.referencia ?? ""}
                className={claseEntrada()}
              />
            </Campo>
          </div>
          {cuenta && !dirSel ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={guardarDir}
                onChange={(e) => setGuardarDir(e.target.checked)}
                className="size-4 accent-[var(--marca)]"
              />
              Guardar esta dirección en mi cuenta
            </label>
          ) : null}
        </section>

        <section aria-labelledby="t-pago" className="space-y-3">
          <h2 id="t-pago" className="text-lg font-bold">
            3. ¿Cómo pagás?
          </h2>
          <p className="text-sm text-muted-foreground">
            {DESCUENTO_SIN_TARJETA.texto}.
          </p>
          <div
            className="grid gap-2"
            role="radiogroup"
            aria-labelledby="t-pago"
          >
            {opciones.map(
              ({ id, titulo, texto, icono: Icono, activa, nota, insignia }) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                    !activa
                      ? "cursor-not-allowed opacity-50"
                      : formaValida === id
                        ? "border-marca bg-marca/5"
                        : "hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="formaPago"
                    value={id}
                    checked={formaValida === id}
                    disabled={!activa}
                    onChange={() => setForma(id)}
                    className="mt-1 size-4 accent-[var(--marca)]"
                  />
                  <Icono
                    className="mt-0.5 size-5 shrink-0 text-marca"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                      {titulo}
                      {insignia ? (
                        <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">
                          {insignia}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {activa ? texto : nota}
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>
        </section>

        <section aria-labelledby="t-factura" className="space-y-3">
          <h2 id="t-factura" className="text-lg font-bold">
            4. Factura
          </h2>
          <p className="text-sm text-muted-foreground">
            Te enviamos factura electrónica de consumidor final a tu correo.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={creditoFiscal}
              onChange={(e) => setCreditoFiscal(e.target.checked)}
              className="size-4 accent-[var(--marca)]"
            />
            Necesito comprobante de crédito fiscal
          </label>
          {creditoFiscal ? (
            <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <Campo
                id="co-razonSocial"
                etiqueta="Nombre o razón social"
                error={errores.razonSocial}
              >
                <input
                  id="co-razonSocial"
                  name="razonSocial"
                  className={claseEntrada(errores.razonSocial)}
                />
              </Campo>
              <Campo
                id="co-giro"
                etiqueta="Giro o actividad"
                error={errores.giro}
              >
                <input
                  id="co-giro"
                  name="giro"
                  className={claseEntrada(errores.giro)}
                />
              </Campo>
              <Campo id="co-nit" etiqueta="NIT" error={errores.nit}>
                <input
                  id="co-nit"
                  name="nit"
                  inputMode="numeric"
                  className={claseEntrada(errores.nit)}
                />
              </Campo>
              <Campo id="co-nrc" etiqueta="NRC" error={errores.nrc}>
                <input
                  id="co-nrc"
                  name="nrc"
                  inputMode="numeric"
                  className={claseEntrada(errores.nrc)}
                />
              </Campo>
            </div>
          ) : null}
          <Campo id="co-notas" etiqueta="Nota para tu pedido (opcional)">
            <textarea
              id="co-notas"
              name="notas"
              rows={2}
              className={`${claseEntrada()} h-auto py-2`}
            />
          </Campo>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="space-y-4 rounded-2xl border p-4">
          <h2 className="font-bold">Tu pedido</h2>
          <ul className="space-y-3" aria-busy={cargando}>
            {(resumen?.lineas ?? []).map((l) => (
              <li
                key={l.varianteId}
                className="flex items-center gap-3 text-sm"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-white">
                  {l.imagen ? (
                    <Image
                      src={l.imagen.url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  ) : null}
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {l.cantidad}
                  </span>
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  {l.nombreProducto}
                  {l.detalle ? (
                    <span className="block text-xs text-muted-foreground">
                      {l.detalle}
                    </span>
                  ) : null}
                </span>
                <span className="font-medium">{usd2(l.total)}</span>
              </li>
            ))}
          </ul>
          {resumen ? (
            <dl className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{usd2(resumen.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Envío</dt>
                <dd>
                  {resumen.envio === 0 ? (
                    <span className="font-medium text-green-700">Gratis</span>
                  ) : (
                    usd2(resumen.envio)
                  )}
                </dd>
              </div>
              {descuento > 0 ? (
                <div className="flex justify-between text-green-700">
                  <dt>
                    Descuento {DESCUENTO_SIN_TARJETA.porcentaje}% ·{" "}
                    {formaValida === "contra_entrega" ? "efectivo" : "transferencia"}
                  </dt>
                  <dd className="font-medium">−{usd2(descuento)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between pt-1 text-lg font-bold">
                <dt>Total</dt>
                <dd>{usd2(totalAPagar)}</dd>
              </div>
            </dl>
          ) : null}
          {resumen && !tieneDescuentoSinTarjeta(formaValida) && resumen.subtotal > 0 ? (
            <p className="text-xs text-muted-foreground">
              Con efectivo o transferencia pagás{" "}
              <strong className="text-green-700">
                {usd2(
                  Math.round(
                    (resumen.total -
                      descuentoSinTarjeta(resumen.subtotal, "transferencia")) *
                      100,
                  ) / 100,
                )}
              </strong>
              .
            </p>
          ) : null}

          {mensaje ? (
            <p
              id="co-mensaje"
              role="alert"
              className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {mensaje}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full text-base"
            disabled={enviando || !resumen || cargando}
          >
            {formaValida === "wompi" ? (
              <Lock className="size-4" aria-hidden />
            ) : null}
            {enviando ? "Enviando…" : textoBoton}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-marca" aria-hidden />
            Garantía Nera Tech por escrito. Usamos tus datos solo para tu pedido
            y tu factura.
          </p>
        </div>
      </aside>
    </form>
  );
}
