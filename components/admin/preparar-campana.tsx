"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OpcionProducto, TipoCampana } from "@/lib/admin/campanas";
import type { DatosCampana, ResultadoCampana } from "@/app/admin/(protegido)/promociones/campana/actions";

type Textos = { nombre: string; asunto: string; titulo: string; intro: string; cierre: string };
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MAX = 4;

/** Arma la campaña con productos reales, muestra cómo queda y la crea como borrador en Brevo */
export function PrepararCampana({
  tipos,
  opciones,
  sugeridos,
  previsualizar,
  crear,
}: {
  tipos: Record<TipoCampana, Textos>;
  opciones: OpcionProducto[];
  sugeridos: Record<TipoCampana, string[]>;
  previsualizar: (d: DatosCampana) => Promise<ResultadoCampana>;
  crear: (d: DatosCampana) => Promise<ResultadoCampana>;
}) {
  const [tipo, setTipo] = useState<TipoCampana>("quincena");
  const [ids, setIds] = useState<string[]>(sugeridos.quincena);
  const [asunto, setAsunto] = useState<string>(tipos.quincena.asunto);
  const [previa, setPrevia] = useState("Pagás al recibir · Garantía por escrito");
  const [titulo, setTitulo] = useState<string>(tipos.quincena.titulo);
  const [intro, setIntro] = useState<string>(tipos.quincena.intro);
  const [cierre, setCierre] = useState<string>(tipos.quincena.cierre);
  const [html, setHtml] = useState<string | null>(null);
  const [creada, setCreada] = useState<string | null>(null);
  const [trabajando, empezar] = useTransition();

  const elegirTipo = (t: TipoCampana) => {
    setTipo(t);
    setIds(sugeridos[t]);
    setAsunto(tipos[t].asunto);
    setTitulo(tipos[t].titulo);
    setIntro(tipos[t].intro);
    setCierre(tipos[t].cierre);
    setHtml(null);
    setCreada(null);
  };
  const alternar = (id: string) =>
    setIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= MAX ? xs : [...xs, id]));
  const datos = (): DatosCampana => ({ tipo, ids, asunto, previa, titulo, intro, cierre });

  const ver = () =>
    empezar(async () => {
      const r = await previsualizar(datos());
      if (r.ok) setHtml(r.html);
      else toast.error(r.mensaje);
    });
  const enviarABrevo = () =>
    empezar(async () => {
      const r = await crear(datos());
      if (r.ok) {
        setHtml(r.html);
        setCreada(r.mensaje ?? "Borrador creado en Brevo");
        toast.success("Borrador creado en Brevo");
      } else toast.error(r.mensaje);
    });

  const orden = [...opciones].sort(
    (a, b) => Number(ids.includes(b.id)) - Number(ids.includes(a.id)) || a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-semibold">1. Tipo de campaña</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(tipos) as TipoCampana[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => elegirTipo(t)}
              aria-pressed={tipo === t}
              className={`rounded-full border px-3 py-1.5 text-sm ${tipo === t ? "border-marca bg-marca text-white" : "hover:bg-muted"}`}
            >
              {tipos[t].nombre}
            </button>
          ))}
        </div>
        {tipo !== "libre" && !sugeridos[tipo].length ? (
          <p className="text-sm text-amber-700">
            No hay productos que encajen hoy con este tipo (por ejemplo, ninguna oferta activa o nada en bodega). Elegilos a mano abajo.
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">
          2. Productos ({ids.length} de {MAX})
        </h2>
        <p className="text-sm text-muted-foreground">Solo productos publicados y disponibles. Los precios salen de la tienda en el momento.</p>
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border text-sm">
          {orden.map((o) => {
            const elegido = ids.includes(o.id);
            return (
              <li key={o.id}>
                <label className={`flex cursor-pointer items-center gap-3 p-2.5 ${!elegido && ids.length >= MAX ? "opacity-50" : ""}`}>
                  <input type="checkbox" checked={elegido} onChange={() => alternar(o.id)} className="size-4" />
                  <span className="flex-1">
                    {o.nombre}
                    <span className="ml-2 text-xs text-muted-foreground">{o.categoria}</span>
                  </span>
                  <span className="flex flex-wrap justify-end gap-1 text-[11px]">
                    {o.disponibilidad === "bodega" ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">En bodega</span> : null}
                    {o.oferta ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-800">Oferta</span> : null}
                    {o.condicion !== "nuevo" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Open Box</span> : null}
                  </span>
                  <span className="w-20 text-right tabular-nums">{usd(o.precio)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">3. Textos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="c-asunto">Asunto (lo que ve en la bandeja)</Label>
            <Input id="c-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={150} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-previa">Texto de vista previa (sale al lado del asunto)</Label>
            <Input id="c-previa" value={previa} onChange={(e) => setPrevia(e.target.value)} maxLength={150} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-titulo">Titular</Label>
          <Input id="c-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-intro">Texto de arriba</Label>
          <Textarea id="c-intro" value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-cierre">Texto de cierre (debajo de los productos)</Label>
          <Textarea id="c-cierre" value={cierre} onChange={(e) => setCierre(e.target.value)} rows={2} />
        </div>
        <p className="text-xs text-muted-foreground">
          Escasez y urgencia solo si son ciertas: «En bodega» y «Oferta hasta…» se ponen solos con los datos reales.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={ver} disabled={trabajando}>
          Ver cómo queda
        </Button>
        <Button type="button" onClick={enviarABrevo} disabled={trabajando || Boolean(creada)}>
          {trabajando ? "Trabajando…" : creada ? "Borrador creado" : "Crear borrador en Brevo"}
        </Button>
      </div>
      {creada ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{creada}</p> : null}

      {html ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Así se ve</h2>
          <iframe
            title="Vista previa del correo"
            srcDoc={html}
            sandbox=""
            className="h-[900px] w-full max-w-[620px] rounded-lg border bg-white"
          />
        </section>
      ) : null}
    </div>
  );
}
