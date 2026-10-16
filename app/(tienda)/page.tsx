import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BannerCampana } from "@/components/tienda/banner-campana";
import { BarraConfianza } from "@/components/tienda/confianza";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import { IconoWhatsApp } from "@/components/tienda/whatsapp-flotante";
import { campanaDestacada, catalogo, configTienda } from "@/lib/tienda/datos";
import { CATEGORIAS, dondeContraEntrega } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/url-sitio";

// Perfiles oficiales de Nera Tech (se agregan a los datos para Google)
const REDES = [
  "https://www.instagram.com/neratech.sv/",
  "https://www.tiktok.com/@neratech.sv",
];

export default async function Inicio() {
  const [productos, c, campana] = await Promise.all([
    catalogo(),
    configTienda(),
    campanaDestacada(),
  ]);
  const meses = c.tasaCero.meses;
  const disponibles = productos.filter((p) => p.disponibilidad !== "agotado");

  const masPedidos = (() => {
    const marcados = disponibles.filter((p) =>
      p.colecciones.includes("mas-pedidos"),
    );
    return (marcados.length ? marcados : disponibles).slice(0, 8);
  })();
  const recientes = disponibles
    .filter((p) => p.colecciones.includes("recien-llegado"))
    .slice(0, 4);

  const categorias = CATEGORIAS.map((cat) => {
    const deCat = productos.filter((p) => p.categoria === cat.slug);
    return {
      ...cat,
      cantidad: deCat.length,
      imagen: deCat.find((p) => p.imagen)?.imagen ?? null,
    };
  }).filter((cat) => cat.cantidad > 0);

  const precioMinCel = Math.min(
    ...productos
      .filter((p) => p.categoria === "celulares")
      .map((p) => p.precioDesde),
    Number.POSITIVE_INFINITY,
  );

  // Datos de la empresa para Google: une el sitio con Instagram, TikTok y Facebook (búsquedas por "Nera Tech")
  const empresaLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Nera Tech",
    legalName: "Nera Tech SV, S.A.S. de C.V.",
    url: SITE_URL,
    logo: `${SITE_URL}/marca/logo-claro.png`,
    description:
      "Tienda en línea de celulares y accesorios nuevos y sellados en El Salvador.",
    telephone: c.whatsapp ? `+${c.whatsapp}` : undefined,
    taxID: c.negocio.nit || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Salvador",
      addressCountry: "SV",
    },
    areaServed: "SV",
    sameAs: REDES,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(empresaLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* 1. Campaña vigente (ej. Octubre Naranja) o, si no hay, qué vendemos y qué hacer (StoryBrand) */}
      {campana ? (
        <>
          <BannerCampana
            campana={campana.campana}
            p={campana.destacado}
            descuentoSinTarjeta={c.descuentoSinTarjeta}
            mesesTasaCero={meses}
            mesesGarantia={c.garantia?.plazo_meses ?? 12}
            whatsapp={c.whatsapp}
          />
          {campana.otros.length ? (
            <section aria-labelledby="t-campana-mas">
              <h2 id="t-campana-mas" className="mb-1 text-xl font-bold">
                Más de {campana.campana.nombre}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Todos con envío gratis a todo el país.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {campana.otros.map((p) => (
                  <TarjetaProducto key={p.id} p={p} mesesTasaCero={meses} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-marca-oscuro px-6 py-10 text-white sm:px-10 sm:py-14">
          <p className="text-sm font-semibold tracking-wide text-marca uppercase">
            Nera Tech · El Salvador
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-bold sm:text-5xl">
            Celulares nuevos al mejor precio, entregados en tu puerta.
          </h1>
          <p className="mt-4 max-w-xl text-white/75 sm:text-lg">
            Equipos sellados con garantía de {c.garantia?.plazo_meses ?? 12}{" "}
            meses. Pagás al recibir {dondeContraEntrega(c.contraEntrega)};
            también con tarjeta, transferencia o tasa 0%.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-12 px-6 text-base"
              nativeButton={false}
              render={<Link href="/celulares" />}
            >
              {Number.isFinite(precioMinCel)
                ? `Ver celulares desde $${Math.floor(precioMinCel)}`
                : "Ver celulares"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              nativeButton={false}
              render={
                <a
                  href={enlaceWhatsAppA(
                    c.whatsapp,
                    "Hola, quiero que me ayuden a elegir un celular. [inicio]",
                  )}
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
      )}

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
                      <Image
                        src={cat.imagen.url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </span>
                  <span>
                    <span className="block font-semibold">{cat.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {cat.cantidad} productos
                    </span>
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
            <Link
              href="/celulares"
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {masPedidos.map((p, i) => (
              <TarjetaProducto
                key={p.id}
                p={p}
                mesesTasaCero={meses}
                prioridad={i < 2}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. Cómo comprar: el plan de 3 pasos */}
      <section
        aria-labelledby="t-como"
        className="rounded-2xl bg-muted/50 p-6 sm:p-8"
      >
        <h2 id="t-como" className="text-xl font-bold">
          Comprar es así de fácil
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            [
              "Elegí tu equipo",
              "Compará modelos y precios con calma. Si tenés dudas, escribinos.",
            ],
            [
              "Confirmamos tu pedido",
              "Te escribimos por WhatsApp para confirmar dirección y forma de pago.",
            ],
            [
              "Lo recibís y pagás",
              `Te lo entregamos en menos de 48 horas (menos de 24 si está en bodega) y pagás al recibir ${dondeContraEntrega(c.contraEntrega)}.`,
            ],
          ].map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{titulo}</span>
                <span className="block text-sm text-muted-foreground">
                  {texto}
                </span>
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
