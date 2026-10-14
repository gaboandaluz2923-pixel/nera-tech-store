"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Lista de hasta 3 productos para comparar, guardada en el navegador del visitante.
const CLAVE = "nera-comparar";
const MAX = 3;
const EVENTO = "nera-comparar-cambio";

function leer(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(v) ? v.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

let cache: { raw: string | null; lista: string[] } = { raw: null, lista: [] };
function instantanea(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLAVE);
  } catch {}
  if (raw !== cache.raw) cache = { raw, lista: leer() };
  return cache.lista;
}
const VACIA: string[] = [];

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

function guardar(lista: string[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX)));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

export function useComparar() {
  return useSyncExternalStore(suscribir, instantanea, () => VACIA);
}

export function BotonComparar({ slug }: { slug: string }) {
  const lista = useComparar();
  const activo = lista.includes(slug);
  const lleno = !activo && lista.length >= MAX;
  return (
    <label
      className={`flex items-center gap-1.5 text-xs ${lleno ? "text-muted-foreground/60" : "text-muted-foreground"}`}
      title={lleno ? "Podés comparar hasta 3" : undefined}
    >
      <input
        type="checkbox"
        className="size-3.5 accent-[var(--marca)]"
        checked={activo}
        disabled={lleno}
        onChange={() => guardar(activo ? lista.filter((s) => s !== slug) : [...lista, slug])}
      />
      Comparar
    </label>
  );
}

export function BarraComparar() {
  const lista = useComparar();
  if (lista.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <span className="text-sm">
          {lista.length} de {MAX} para comparar
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="text-sm text-muted-foreground underline" onClick={() => guardar([])}>
            Quitar
          </button>
          <Link
            href={`/comparar?p=${lista.join(",")}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground ${lista.length < 2 ? "pointer-events-none bg-primary/40" : "bg-primary"}`}
            aria-disabled={lista.length < 2}
          >
            Comparar
          </Link>
        </div>
      </div>
    </div>
  );
}
