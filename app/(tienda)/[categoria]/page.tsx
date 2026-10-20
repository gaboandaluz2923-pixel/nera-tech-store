import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListadoFiltrable } from "@/components/tienda/listado-filtrable";
import { BarraConfianza } from "@/components/tienda/confianza";
import { catalogo, configTienda } from "@/lib/tienda/datos";
import { CATEGORIAS } from "@/lib/tienda/formato";

const INTRO: Record<string, { titulo: string; texto: string }> = {
  celulares: {
    titulo: "Celulares nuevos en El Salvador",
    texto: "Samsung, Xiaomi, Infinix y más, sellados y con garantía de 12 meses. Podés pagar al recibir.",
  },
  "open-box": {
    titulo: "Open Box: originales a menor precio",
    texto:
      "Equipos originales con la caja ya abierta (no sellados de fábrica). Revisados, con IMEI verificado y la condición de cada uno por escrito.",
  },
  audifonos: {
    titulo: "Audífonos inalámbricos",
    texto: "Audífonos Bluetooth originales para llamadas, música y ejercicio.",
  },
  relojes: { titulo: "Relojes inteligentes", texto: "Medí tu actividad y recibí notificaciones sin sacar el teléfono." },
  tablets: { titulo: "Tablets", texto: "Pantalla grande para estudiar, trabajar o ver series." },
  bocinas: { titulo: "Bocinas Bluetooth", texto: "Sonido potente para llevar a todos lados." },
  cargadores: {
    titulo: "Powerbanks, cargadores y cables",
    texto: "Powerbanks, cargadores de carga rápida y cables originales para tu celular.",
  },
  camaras: {
    titulo: "Cámaras de acción y seguridad",
    texto: "Insta360 para grabar tus aventuras en 360° y cámaras para cuidar tu casa.",
  },
  energia: {
    titulo: "Estaciones de energía y paneles solares",
    texto: "Energía de respaldo para apagones, trabajo y camping, con carga solar.",
  },
  proteccion: { titulo: "Protección para tu celular", texto: "Cases y protectores de pantalla para que tu equipo dure más." },
};

const categoriaDe = (slug: string) => CATEGORIAS.find((c) => c.slug === slug);

export function generateStaticParams() {
  return CATEGORIAS.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[categoria]">): Promise<Metadata> {
  const { categoria } = await params;
  const cat = categoriaDe(categoria);
  if (!cat) return {};
  const intro = INTRO[cat.slug];
  return {
    title: intro?.titulo ?? cat.nombre,
    description: intro?.texto,
    alternates: { canonical: `/${cat.slug}` },
  };
}

async function Listado({ params }: { params: PageProps<"/[categoria]">["params"] }) {
  const { categoria } = await params;
  const cat = categoriaDe(categoria);
  if (!cat) notFound();
  const [todos, c] = await Promise.all([catalogo(), configTienda()]);
  const productos = todos.filter((p) => p.categoria === cat.slug);
  const intro = INTRO[cat.slug];

  return (
    <>
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>{" "}
        / <span className="text-foreground">{cat.nombre}</span>
      </nav>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{intro?.titulo ?? cat.nombre}</h1>
      {intro ? <p className="mt-1 text-muted-foreground">{intro.texto}</p> : null}

      <div className="mt-5">
        {productos.length ? (
          <ListadoFiltrable
            productos={productos}
            mesesTasaCero={c.tasaCero.meses}
            conMemoria={cat.slug === "celulares" || cat.slug === "tablets"}
          />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">Pronto vas a encontrar {cat.nombre.toLowerCase()} aquí.</p>
            <Link href="/celulares" className="mt-2 inline-block text-sm font-medium text-primary underline">
              Ver celulares
            </Link>
          </div>
        )}
      </div>
      <div className="mt-12">
        <BarraConfianza condicion={cat.slug === "open-box" ? "open_box" : "nuevo"} />
      </div>
    </>
  );
}

function Esqueleto() {
  return (
    <div aria-hidden>
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-3 h-8 w-64 rounded bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function PaginaCategoria({ params }: PageProps<"/[categoria]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-12">
      <Suspense fallback={<Esqueleto />}>
        <Listado params={params} />
      </Suspense>
    </div>
  );
}
