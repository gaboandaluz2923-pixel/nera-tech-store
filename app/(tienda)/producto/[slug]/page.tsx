import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { BarraConfianza } from "@/components/tienda/confianza";
import { mesesGarantia } from "@/lib/tienda/garantia";
import { CompraProducto } from "@/components/tienda/compra-producto";
import { Galeria } from "@/components/tienda/galeria";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import { catalogo, configTienda, productoPorSlug, type ProductoDetalle } from "@/lib/tienda/datos";
import { CLAVES_DECISIVAS, NOMBRE_CARACTERISTICA, TEXTO_CONDICION, dondeContraEntrega, usd } from "@/lib/tienda/formato";
import { SITE_URL } from "@/lib/url-sitio";

const RELLENO = "_"; // Cache Components exige al menos un parámetro al compilar

export async function generateStaticParams() {
  const productos = await catalogo();
  return productos.length ? productos.map((p) => ({ slug: p.slug })) : [{ slug: RELLENO }];
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await productoPorSlug(slug);
  if (!p) return { title: "Producto no encontrado", robots: { index: false } };
  const titulo = p.metaTitulo || `${p.nombre} precio en El Salvador`;
  const descripcion =
    p.metaDescripcion ||
    `${p.nombre} ${p.condicion === "nuevo" ? "nuevo y sellado" : TEXTO_CONDICION[p.condicion].largo.toLowerCase()} desde ${usd(p.precioDesde)}. ${p.resumen ? `${p.resumen}. ` : ""}Garantía de 12 meses y pago contra entrega.`;
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      title: titulo,
      description: descripcion,
      type: "website",
      images: p.imagen ? [{ url: p.imagen.url, alt: p.imagen.alt }] : undefined,
    },
  };
}

/** Datos estructurados para que Google muestre precio y disponibilidad en los resultados. */
function datosEstructurados(p: ProductoDetalle) {
  const url = `${SITE_URL}/producto/${p.slug}`;
  const disponibilidad = (d: string) =>
    d === "agotado" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  // Open Box y usado: para Google es "usado" (no es nuevo sellado)
  const condicion = p.condicion === "nuevo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition";
  const vencimiento = new Date(p.actualizado);
  vencimiento.setMonth(vencimiento.getMonth() + 1);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.resumen || p.descripcion?.slice(0, 300) || p.nombre,
    image: p.imagenes.map((i) => (i.url.startsWith("http") ? i.url : `${SITE_URL}${i.url}`)),
    brand: p.marca ? { "@type": "Brand", name: p.marca } : undefined,
    url,
    offers:
      p.variantes.length > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: p.precioDesde.toFixed(2),
            highPrice: p.precioHasta.toFixed(2),
            offerCount: p.variantes.length,
            availability: disponibilidad(p.disponibilidad),
            itemCondition: condicion,
            url,
          }
        : {
            "@type": "Offer",
            priceCurrency: "USD",
            price: p.variantes[0].precio.toFixed(2),
            priceValidUntil: vencimiento.toISOString().slice(0, 10),
            availability: disponibilidad(p.variantes[0].disponibilidad),
            itemCondition: condicion,
            seller: { "@type": "Organization", name: "Nera Tech" },
            url,
          },
  };
}

function Seccion({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="border-t pt-6">
      <h2 id={id} className="mb-3 text-lg font-bold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

async function Ficha({ params }: { params: PageProps<"/producto/[slug]">["params"] }) {
  const { slug } = await params;
  const [p, c, todos] = await Promise.all([productoPorSlug(slug), configTienda(), catalogo()]);
  if (!p) notFound();

  const caracteristicas = Object.entries(p.caracteristicas).filter(([, v]) => String(v ?? "").trim());
  const ordenadas = [
    ...CLAVES_DECISIVAS.flatMap((k) => caracteristicas.filter(([c]) => c === k)),
    ...caracteristicas.filter(([k]) => !CLAVES_DECISIVAS.includes(k)),
  ];
  const incluye = (p.incluye ?? "")
    .split(/\n|;/)
    .map((s) => s.replace(/^[-•·]\s*/, "").trim())
    .filter(Boolean);
  const g = c.garantia;
  const esCelular = p.categoria === "celulares" || p.categoria === "open-box";
  const abierto = p.condicion !== "nuevo";

  // "Completá tu equipo": a un celular le ofrecemos accesorios; a un accesorio, otros de su categoría.
  const disponibles = todos.filter((o) => o.id !== p.id && o.disponibilidad !== "agotado");
  const relacionados = (
    esCelular ? disponibles.filter((o) => o.categoria !== "celulares") : disponibles.filter((o) => o.categoria === p.categoria)
  ).slice(0, 4);
  const parecidos = esCelular
    ? disponibles
        .filter((o) => o.categoria === "celulares" || o.categoria === "open-box")
        .sort((a, b) => Math.abs(a.precioDesde - p.precioDesde) - Math.abs(b.precioDesde - p.precioDesde))
        .slice(0, 4)
    : [];

  const faq = [
    ...p.faq,
    {
      pregunta: "¿Puedo pagar al recibir?",
      respuesta: `Sí. Pagás en efectivo cuando lo recibís ${dondeContraEntrega(c.contraEntrega)}, con ${c.descuentoSinTarjeta}% de descuento. El mismo descuento aplica por transferencia. También aceptamos tarjeta y tasa 0%.`,
    },
    p.condicion === "open_box"
      ? {
          pregunta: "¿Qué significa Open Box?",
          respuesta:
            "Es un equipo original al que ya se le abrió la caja: no viene sellado de fábrica. Lo revisamos, verificamos el IMEI y te decimos en la ficha en qué estado viene. Por eso cuesta menos que el nuevo sellado.",
        }
      : p.condicion === "usado"
        ? {
            pregunta: "¿Es usado?",
            respuesta:
              "Sí. Es un equipo original usado; lo revisamos, verificamos el IMEI y te decimos en la ficha en qué estado viene.",
          }
        : {
            pregunta: "¿Es nuevo y original?",
            respuesta: "Sí. Todos nuestros equipos son nuevos, sellados de fábrica, y verificamos el IMEI antes de entregarlo.",
          },
  ].filter((f, i, arr) => arr.findIndex((o) => o.pregunta === f.pregunta) === i);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados(p)).replace(/</g, "\\u003c") }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>{" "}
        /{" "}
        <Link href={`/${p.categoria}`} className="hover:underline">
          {p.categoriaNombre}
        </Link>
      </nav>

      <div className="mt-3 grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="md:sticky md:top-28 md:self-start">
          <Galeria imagenes={p.imagenes} nombre={p.nombre} />
        </div>
        <div>
          {abierto ? (
            <p className="mb-2 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
              {TEXTO_CONDICION[p.condicion].largo}
            </p>
          ) : null}
          <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{p.nombre}</h1>
          {p.resumen ? <p className="mt-1 text-muted-foreground">{p.resumen}</p> : null}
          {abierto ? (
            <div className="mt-4 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              <p className="font-semibold">
                {p.condicion === "open_box" ? "Qué significa Open Box" : "Equipo usado"}
              </p>
              <p>
                {p.condicion === "open_box"
                  ? "Es original y la caja ya fue abierta: no viene sellado de fábrica. Lo revisamos y verificamos el IMEI antes de entregarlo."
                  : "Es original y ya fue usado. Lo revisamos y verificamos el IMEI antes de entregarlo."}
              </p>
              {p.condicionDetalle ? (
                <p>
                  <span className="font-semibold">Cómo viene este: </span>
                  {p.condicionDetalle}
                </p>
              ) : null}
              {p.productoBase ? (
                <p>
                  ¿Lo preferís sellado?{" "}
                  <Link href={`/producto/${p.productoBase.slug}`} className="font-medium text-primary underline">
                    Ver {p.productoBase.nombre} nuevo desde {usd(p.productoBase.precioDesde)}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5">
            <CompraProducto
              productoId={p.id}
              nombre={p.nombre}
              variantes={p.variantes}
              combos={p.combos}
              whatsapp={c.whatsapp}
              mesesTasaCero={c.tasaCero.meses}
              costoEnvio={c.envio.costo}
              envioGratisDesde={c.envio.gratis_desde}
              campana={p.campana ? { nombre: p.campana.nombre, fin: p.campana.fin } : null}
              descuentoSinTarjeta={c.descuentoSinTarjeta}
            />
          </div>

          <div className="mt-6 space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
            <p className="font-semibold">Formas de pago</p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { texto: "Efectivo al recibir", descuento: true },
                { texto: "Transferencia", descuento: true },
                { texto: "Tarjeta de crédito o débito", descuento: false },
                { texto: `Tasa 0% hasta ${c.tasaCero.meses} meses`, descuento: false },
              ].map((f) => (
                <li key={f.texto} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
                  <span>
                    {f.texto}
                    {f.descuento ? (
                      <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-800">
                        −{c.descuentoSinTarjeta}%
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Contra entrega {dondeContraEntrega(c.contraEntrega)}. En bodega: entrega en menos de 24 horas; del proveedor: en menos de 48 horas.{" "}
              <Link href="/envios-y-pagos" className="underline">
                Ver detalles
              </Link>
            </p>
          </div>

          {g ? (
            <div className="mt-3 flex items-start gap-3 rounded-xl border p-4 text-sm">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
              <p>
                <span className="font-semibold">Garantía de {mesesGarantia(g, p.categoria)} meses.</span>{" "}
                {g.cambio_inmediato_dias ? `Si falla en los primeros ${g.cambio_inmediato_dias} días, te lo cambiamos por uno nuevo. ` : ""}
                <Link href="/garantia" className="font-medium text-primary underline">
                  Qué cubre
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          {p.descripcion ? (
            <Seccion titulo="Cómo te ayuda" id="t-descripcion">
              <div className="space-y-3 leading-relaxed text-pretty">
                {p.descripcion
                  .split(/\n{2,}/)
                  .map((parrafo) => parrafo.trim())
                  .filter(Boolean)
                  .map((parrafo) => (
                    <p key={parrafo.slice(0, 40)}>{parrafo}</p>
                  ))}
              </div>
            </Seccion>
          ) : null}

          {ordenadas.length ? (
            <Seccion titulo="Características" id="t-caracteristicas">
              <dl className="divide-y rounded-xl border text-sm">
                {ordenadas.map(([clave, valor]) => (
                  <div key={clave} className="grid grid-cols-[minmax(7rem,2fr)_3fr] gap-3 px-4 py-2.5">
                    <dt className="text-muted-foreground">{NOMBRE_CARACTERISTICA[clave] ?? clave.replace(/_/g, " ")}</dt>
                    <dd className="font-medium">{String(valor)}</dd>
                  </div>
                ))}
              </dl>
            </Seccion>
          ) : null}

          <Seccion titulo="Preguntas frecuentes" id="t-faq">
            <div className="divide-y rounded-xl border">
              {faq.map((f) => (
                <details key={f.pregunta} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    {f.pregunta}
                    <span className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </Seccion>
        </div>

        <aside className="space-y-8">
          {incluye.length ? (
            <Seccion titulo="Qué trae la caja" id="t-incluye">
              <ul className="space-y-1.5 text-sm">
                {incluye.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </Seccion>
          ) : null}
          {g && g.no_cubre.length ? (
            <Seccion titulo="La garantía no cubre" id="t-no-cubre">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {g.no_cubre.slice(0, 3).map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <X className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {i}
                  </li>
                ))}
              </ul>
            </Seccion>
          ) : null}
        </aside>
      </div>

      {relacionados.length ? (
        <section aria-labelledby="t-completa" className="mt-12">
          <h2 id="t-completa" className="mb-4 text-xl font-bold">
            {esCelular ? "Completá tu equipo" : "También te puede interesar"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relacionados.map((o) => (
              <TarjetaProducto key={o.id} p={o} mesesTasaCero={c.tasaCero.meses} />
            ))}
          </div>
        </section>
      ) : null}

      {parecidos.length ? (
        <section aria-labelledby="t-parecidos" className="mt-12">
          <h2 id="t-parecidos" className="mb-4 text-xl font-bold">
            Celulares en un precio parecido
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {parecidos.map((o) => (
              <TarjetaProducto key={o.id} p={o} mesesTasaCero={c.tasaCero.meses} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-12">
        <BarraConfianza condicion={p.condicion} mesesGarantia={mesesGarantia(c.garantia, p.categoria)} />
      </div>
    </>
  );
}

function Esqueleto() {
  return (
    <div aria-hidden className="grid gap-6 md:grid-cols-2">
      <div className="aspect-square rounded-2xl bg-muted" />
      <div className="space-y-3">
        <div className="h-8 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-10 w-1/3 rounded bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function PaginaProducto({ params }: PageProps<"/producto/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:pb-12">
      <Suspense fallback={<Esqueleto />}>
        <Ficha params={params} />
      </Suspense>
    </div>
  );
}
