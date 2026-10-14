import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarraConfianza } from "@/components/tienda/confianza";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import { IconoWhatsApp } from "@/components/tienda/whatsapp-flotante";
import { catalogo, configTienda } from "@/lib/tienda/datos";
import { CATEGORIAS } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export default async function Inicio() {
  const [productos, c] = await Promise.all([catalogo(), configTienda()]);
  const meses = c.tasaCero.meses;
  const disponibles = productos.filter((p) => p.disponibilidad !== "agotado");

  const masPedidos = (() => {
    const marcados = disponibles.filter((p) => p.colecciones.includes("mas-pedidos"));
    return (marcados.length ? marcados : disponibles).slice(0, 8);
  })();
  const recientes = disponibles
    .filter((p) => p.colecciones.includes("recien-llegado"))
    .slice(0, 4);

  const categorias = CATEGORIAS.map((cat) => {
    const deCat = productos.filter((p) => p.categoria === cat.slug);
    return { ...cat, cantidad: deCat.length, imagen: deCat.find((p) => p.imagen)?.imagen ?? null };
  }).filter((cat) => cat.cantidad > 0);

  const precioMinCel = Math.min(
    ...productos.filter((p) => p.categoria === "celulares").map((p) => p.precioDesde),
    Number.POSITIVE_INFINITY
  );

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 pt-6">
      {/* 1. Qué vendemos, cómo te ayuda y qué hacer (StoryBrand, prueba de 5 segundos) */}
      <section className="overflow-hidden rounded-2xl bg-marca-oscuro px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-semibold tracking-wide text-marca uppercase">Nera Tech · El Salvador</p>
        <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-bold sm:text-5xl">
          Celulares nuevos al mejor precio, entregados en tu puerta.
        </h1>
        <p className="mt-4 max-w-xl text-white/75 sm:text-lg">
          Equipos sellados con garantía de {c.garantia?.plazo_meses ?? 12} meses. En San Salvador pagás al recibir;
          también con tarjeta, transferencia o tasa 0%.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<Link href="/celulares" />}>
            {Number.isFinite(precioMinCel) ? `Ver celulares desde $${Math.floor(precioMinCel)}` : "Ver celulares"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
            nativeButton={false}
            render={
              <a
                href={enlaceWhatsAppA(c.whatsapp, "Hola, quiero que me ayuden a elegir un celular. [inicio]")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <IconoWhatsApp className="size-5" />
            Te ayudamos a elegir
          </Button>
        </div>
      </section>

      <BarraConfianza mesesGarantia={c.garantia?.plazo_meses ?? 12} />

      {/* 2. Categorías */}
      {categorias.length > 1 ? (
        <section aria-labelledby="t-categorias">
          <h2 id="t-categorias" className="mb-4 text-xl font-bold">
            Categorías
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categorias.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/${cat.slug}`}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-md"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-white">
                    {cat.imagen ? (
                      <Image src={cat.imagen.url} alt="" fill sizes="56px" className="object-contain p-1" />
                    ) : null}
                  </span>
                  <span>
                    <span className="block font-semibold">{cat.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{cat.cantidad} productos</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 3. Lo más pedido */}
      {masPedidos.length ? (
        <section aria-labelledby="t-mas-pedidos">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="t-mas-pedidos" className="text-xl font-bold">
              Los más pedidos
            </h2>
            <Link href="/celulares" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {masPedidos.map((p, i) => (
              <TarjetaProducto key={p.id} p={p} mesesTasaCero={meses} prioridad={i < 2} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. Cómo comprar: el plan de 3 pasos */}
      <section aria-labelledby="t-como" className="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="t-como" className="text-xl font-bold">
          Comprar es así de fácil
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ["Elegí tu equipo", "Compará modelos y precios con calma. Si tenés dudas, escribinos."],
            ["Confirmamos tu pedido", "Te escribimos por WhatsApp para confirmar dirección y forma de pago."],
            ["Lo recibís y pagás", "En San Salvador pagás al recibir. Al resto del país te lo enviamos en 24 a 48 horas."],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{titulo}</span>
                <span className="block text-sm text-muted-foreground">{texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {recientes.length ? (
        <section aria-labelledby="t-recientes">
          <h2 id="t-recientes" className="mb-4 text-xl font-bold">
            Recién llegados
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recientes.map((p) => (
              <TarjetaProducto key={p.id} p={p} mesesTasaCero={meses} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
