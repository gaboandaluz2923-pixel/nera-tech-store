"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Botón de las pruebas mínimas de Hacienda: repite tandas pequeñas hasta completar las cantidades
// (o hasta que algo falle), mostrando el avance. Se puede detener y seguir otro día.

type Avance = Record<"01" | "03" | "05" | "invalidacion" | "contingencia", number>;
type Respuesta =
  | { ok: true; avance: Avance; registro: string[]; completo: boolean }
  | { ok: false; mensaje: string };

const NOMBRES: [keyof Avance, string][] = [
  ["01", "Facturas"],
  ["03", "Créditos fiscales"],
  ["05", "Notas de crédito"],
  ["invalidacion", "Anulaciones"],
  ["contingencia", "Contingencias"],
];

export function PruebasHacienda({
  accion,
  inicial,
  metas,
  habilitado,
}: {
  accion: () => Promise<Respuesta>;
  inicial: Avance;
  metas: Avance;
  habilitado: boolean;
}) {
  const router = useRouter();
  const [avance, setAvance] = useState(inicial);
  const [registro, setRegistro] = useState<string[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  const parar = useRef(false);

  async function correr() {
    setCorriendo(true);
    parar.current = false;
    try {
      for (let vuelta = 0; vuelta < 60 && !parar.current; vuelta++) {
        const r = await accion();
        if (!r.ok) {
          setRegistro((x) => [`Error: ${r.mensaje}`, ...x].slice(0, 60));
          break;
        }
        setAvance(r.avance);
        setRegistro((x) => [...r.registro.slice().reverse(), ...x].slice(0, 60));
        if (r.completo || r.registro.some((l) => l.startsWith("Error") || /rechaz/i.test(l))) break;
      }
    } finally {
      setCorriendo(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-5">
        {NOMBRES.map(([k, nombre]) => {
          const pct = Math.min(100, Math.round((avance[k] / metas[k]) * 100));
          return (
            <li key={k} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{nombre}</p>
              <p className="text-lg font-semibold tabular-nums">
                {avance[k]} <span className="text-sm font-normal text-muted-foreground">/ {metas[k]}</span>
              </p>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-600" : "bg-[var(--marca)]"}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={correr} disabled={!habilitado || corriendo}>
          {corriendo ? "Enviando pruebas…" : "Hacer las pruebas"}
        </Button>
        {corriendo ? (
          <Button type="button" variant="outline" onClick={() => (parar.current = true)}>
            Detener
          </Button>
        ) : null}
      </div>
      {registro.length ? (
        <ol className="max-h-64 space-y-1 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
          {registro.map((l, i) => (
            <li key={i} className={l.startsWith("Error") || /rechaz/i.test(l) ? "text-red-700" : ""}>
              {l}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
