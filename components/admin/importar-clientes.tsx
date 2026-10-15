"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agruparPersonas, leerOrdenes, type FilaOrden } from "@/lib/clientes/excel-ordenes";
import type { ResultadoImportacion } from "@/app/admin/(protegido)/clientes/importar/actions";

type Accion = (filas: unknown, soloRevisar: boolean) => Promise<ResultadoImportacion>;

/** Lee la pestaña ORDENES en el navegador, muestra cuántos clientes hay y los importa al CRM. */
export function ImportarClientes({ importar }: { importar: Accion }) {
  const [ordenes, setOrdenes] = useState<FilaOrden[] | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [revision, setRevision] = useState<ResultadoImportacion | null>(null);
  const [hecho, setHecho] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, empezar] = useTransition();

  const personas = ordenes ? agruparPersonas(ordenes) : [];

  async function leer(f: File) {
    setError(null);
    setRevision(null);
    setHecho(null);
    setArchivo(f.name);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      let tabla: unknown[][];
      try {
        tabla = (await readSheet(f, "ORDENES")) as unknown[][];
      } catch {
        tabla = (await readSheet(f)) as unknown[][];
      }
      const filas = leerOrdenes(tabla);
      setOrdenes(filas);
      const r = await importar(filas, true);
      setRevision(r);
      if (!r.ok) setError(r.mensaje);
    } catch (e) {
      setOrdenes(null);
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".xlsx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void leer(f);
        }}
      />
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {ordenes ? (
        <div className="space-y-2 rounded-lg border p-3 text-sm">
          <p>
            <b>{archivo}</b>: {ordenes.length} compras de {personas.length} clientes ({personas.filter((p) => p.correo).length} con correo,{" "}
            {personas.filter((p) => p.telefonos.length).length} con teléfono).
          </p>
          {revision?.ok ? <p className="text-muted-foreground">{revision.mensaje}</p> : null}
        </div>
      ) : null}
      {ordenes && revision?.ok && !hecho ? (
        <Button
          disabled={trabajando}
          onClick={() =>
            empezar(async () => {
              const r = await importar(ordenes, false);
              if (r.ok) {
                toast.success(r.mensaje);
                setHecho(r);
              } else toast.error(r.mensaje);
            })
          }
        >
          {trabajando ? "Importando…" : `Importar ${personas.length} clientes`}
        </Button>
      ) : null}
      {hecho ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900">{hecho.mensaje}</p> : null}
    </div>
  );
}

/** Botón que manda la lista a Brevo */
export function BotonBrevo({ sincronizar }: { sincronizar: () => Promise<ResultadoImportacion> }) {
  const [trabajando, empezar] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={trabajando}
        onClick={() =>
          empezar(async () => {
            const r = await sincronizar();
            if (r.ok) toast.success("Lista enviada a Brevo");
            else toast.error(r.mensaje);
            setResultado(r.mensaje);
          })
        }
      >
        {trabajando ? "Enviando…" : "Mandar clientes a Brevo"}
      </Button>
      {resultado ? <p className="text-sm text-muted-foreground">{resultado}</p> : null}
    </div>
  );
}
