import Image from "next/image";
import Link from "next/link";
import { Clock, PackageCheck, ShieldCheck, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconoWhatsApp } from "@/components/tienda/whatsapp-flotante";
import type { CampanaLeida, ProductoDetalle } from "@/lib/tienda/datos";
import { cuota, finDeOferta, precioConDescuento, usd2 } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

// Banner del inicio para una campaña con envío gratis (ej. "Octubre Naranja"): el producto destacado con
// su precio real en efectivo y con tarjeta, lo que hay en bodega, cuándo termina y los dos llamados
// (Comprar y WhatsApp). Todo sale de la base: al terminar la campaña vuelve el encabezado normal.

export function BannerCampana({
  campana,
  p,
  descuentoSinTarjeta,
  mesesTasaCero,
  mesesGarantia,
  whatsapp,
}: {
  campana: CampanaLeida;
  p: ProductoDetalle;
  descuentoSinTarjeta: number;
  mesesTasaCero: number;
  mesesGarantia: number;
  whatsapp: string;
}) {
  // Precio que se anuncia: la opción más barata de las que están en bodega (si no hay, de las disponibles)
  const disponibles = p.variantes.filter((v) => v.disponibilidad !== "agotado");
  const enBodega = disponibles.filter((v) => v.disponibilidad === "bodega");
  const base = enBodega.length ? enBodega : disponibles;
  const v = [...base].sort((a, b) => a.precio - b.precio)[0] ?? p.variantes[0];
  const efectivo = precioConDescuento(v.precio, descuentoSinTarjeta);
  const [entero, centavos] = efectivo.toFixed(2).split(".");
  const variasMemorias = new Set(base.map((x) => x.memoria)).size > 1;
  const etiqueta = [p.marca, variasMemorias ? null : v.memoria].filter(Boolean).join(" · ");
  const nombre = p.marca && p.nombre.toLowerCase().startsWith(p.marca.toLowerCase()) ? p.nombre.slice(p.marca.length).trim() : p.nombre;
  const mensaje = `Hola, quiero el ${p.nombre}${v.memoria ? ` ${v.memoria}` : ""} de ${campana.nombre} con envío gratis. [banner]`;

  const chips = [
    { icono: Truck, texto: "Envío gratis a todo el país" },
    enBodega.length && p.unidadesEnBodega > 0
      ? { icono: PackageCheck, texto: `${p.unidadesEnBodega} en bodega · te llega en menos de 24 h` }
      : { icono: PackageCheck, texto: "Te llega en menos de 48 h" },
    { icono: ShieldCheck, texto: `Garantía de ${mesesGarantia} meses` },
    { icono: Wallet, texto: "Pagás al recibir" },
  ];

  return (
    <section aria-labelledby="t-campana" className="relative overflow-hidden rounded-2xl bg-marca-oscuro text-white">
      {/* Rayas suaves del arte de la campaña */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 2px, transparent 2px 14px)" }}
      />
      <div className="relative grid items-center gap-6 px-6 pt-8 pb-6 sm:px-10 md:grid-cols-[1.15fr_1fr] md:gap-4 md:py-12">
        <div className="order-2 md:order-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-marca px-3 py-1 text-xs font-bold tracking-wider uppercase">{campana.nombre}</span>
            {campana.fin ? (
              <span className="inline-flex items-center gap-1 text-xs text-white/70">
                <Clock className="size-3.5" aria-hidden />
                {finDeOferta(campana.fin, null)}
              </span>
            ) : null}
          </p>
          {etiqueta ? <p className="mt-4 text-sm font-bold tracking-wider text-marca uppercase">{etiqueta}</p> : null}
          <h1 id="t-campana" className="mt-1 text-4xl leading-none font-extrabold tracking-tight sm:text-6xl">
            {nombre}
          </h1>
          {campana.texto ? <p className="mt-3 max-w-md text-white/75">{campana.texto}</p> : null}

          <div className="mt-5 flex items-end gap-3">
            <p className="text-6xl leading-none font-black tracking-tight text-marca sm:text-7xl" aria-label={`${usd2(efectivo)} pagando en efectivo o transferencia`}>
              ${entero}
              {centavos !== "00" ? <span className="align-top text-3xl sm:text-4xl">.{centavos}</span> : null}
              <span className="align-top text-3xl">*</span>
            </p>
          </div>
          <p className="mt-2 text-sm text-white/75">
            *Pagando en efectivo o transferencia. Con tarjeta {usd2(v.precio)}
            {v.precio >= 100 ? ` o ${mesesTasaCero} cuotas de ${usd2(cuota(v.precio, mesesTasaCero))} tasa 0%` : ""}.
          </p>

          <ul className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {chips.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-2">
                <Icono className="mt-0.5 size-4 shrink-0 text-marca" aria-hidden />
                <span>{texto}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<Link href={`/producto/${p.slug}`} />}>
              Comprar ahora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              nativeButton={false}
              render={<a href={enlaceWhatsAppA(whatsapp, mensaje)} target="_blank" rel="noopener noreferrer" />}
            >
              <IconoWhatsApp className="size-5" />
              Pedilo por WhatsApp
            </Button>
          </div>
        </div>

        {/* Producto sobre el arco naranja */}
        <Link href={`/producto/${p.slug}`} className="relative order-1 mx-auto block w-full max-w-[15rem] sm:max-w-[18rem] md:order-2 md:max-w-sm" aria-label={`Ver ${p.nombre}`}>
          <div className="relative aspect-[5/6]">
            {/* Arco naranja del arte de la campaña, con un brillo detrás del producto */}
            <div aria-hidden className="absolute inset-x-0 top-0 bottom-0 rounded-t-full border-x-[18px] border-t-[18px] border-marca sm:border-x-[26px] sm:border-t-[26px]" />
            <div aria-hidden className="absolute inset-x-[18%] top-[25%] bottom-[10%] rounded-full bg-marca/30 blur-3xl" />
            {campana.imagen ? (
              <Image
                src={campana.imagen}
                alt={p.imagen?.alt ?? p.nombre}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 768px) 24rem, 19rem"
                className="object-contain object-bottom px-[13%] pt-[16%] drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
              />
            ) : p.imagen ? (
              // Foto del catálogo (fondo blanco): sobre una tarjeta blanca dentro del arco
              <span className="absolute inset-x-[16%] top-[18%] bottom-[4%] overflow-hidden rounded-3xl bg-white shadow-2xl">
                <Image src={p.imagen.url} alt={p.imagen.alt} fill priority fetchPriority="high" sizes="(min-width: 768px) 17rem, 13rem" className="object-contain p-3" />
              </span>
            ) : null}
          </div>
        </Link>
      </div>
    </section>
  );
}
