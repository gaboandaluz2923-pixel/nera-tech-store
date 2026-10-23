import type { Metadata } from "next";
import { Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconoWhatsApp } from "@/components/tienda/icono-whatsapp";
import { configTienda } from "@/lib/tienda/datos";
import { mesesAccesorio, mesesCelular } from "@/lib/tienda/garantia";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Garantía",
  description: "Garantía Nera Tech por escrito: 12 meses en celulares y equipos, 6 en accesorios. Qué cubre, qué no cubre y cómo reclamarla.",
  alternates: { canonical: "/garantia" },
};

export default async function PaginaGarantia() {
  const c = await configTienda();
  const g = c.garantia;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-9 text-marca" aria-hidden />
        <h1 className="text-2xl font-bold sm:text-3xl">Garantía Nera Tech</h1>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-4">
          <dt className="text-sm text-muted-foreground">Celulares, tablets, TV, consolas y energía</dt>
          <dd className="text-2xl font-bold">{mesesCelular(g)} meses</dd>
        </div>
        <div className="rounded-xl border p-4">
          <dt className="text-sm text-muted-foreground">Accesorios: audífonos, cargadores, cases, bocinas, relojes y cámaras</dt>
          <dd className="text-2xl font-bold">{mesesAccesorio(g)} meses</dd>
        </div>
      </dl>
      <p className="mt-3 text-lg text-muted-foreground">
        {g?.resumen ?? "Todos nuestros equipos tienen garantía Nera Tech por defectos de fábrica."}
      </p>

      {g?.nota ? <p className="mt-6 rounded-xl border-l-4 border-marca bg-marca/5 p-4">{g.nota}</p> : null}

      {g ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <section aria-labelledby="t-cubre" className="rounded-xl border p-5">
            <h2 id="t-cubre" className="mb-3 font-bold">
              Qué cubre
            </h2>
            <ul className="space-y-2 text-sm">
              {g.cubre.map((i) => (
                <li key={i} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="t-no-cubre" className="rounded-xl border p-5">
            <h2 id="t-no-cubre" className="mb-3 font-bold">
              Qué no cubre
            </h2>
            <ul className="space-y-2 text-sm">
              {g.no_cubre.map((i) => (
                <li key={i} className="flex gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {g?.como_reclamar.length ? (
        <section aria-labelledby="t-reclamar" className="mt-8">
          <h2 id="t-reclamar" className="mb-4 text-xl font-bold">
            Cómo reclamarla
          </h2>
          <ol className="space-y-4">
            {g.como_reclamar.map((paso, i) => (
              <li key={paso} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1">{paso}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-10">
        <Button
          size="lg"
          className="h-12 w-full text-base sm:w-auto"
          nativeButton={false}
          render={
            <a
              href={enlaceWhatsAppA(c.whatsapp, "Hola, necesito ayuda con la garantía de mi equipo. Mi número de pedido es: [garantia]")}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <IconoWhatsApp className="size-5" />
          Reclamar por WhatsApp
        </Button>
      </div>
    </div>
  );
}
