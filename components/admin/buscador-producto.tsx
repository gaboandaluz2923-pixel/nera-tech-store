"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// Buscador de productos del catálogo, como el de Google: escribís parte del nombre ("note 17 pro 256 negro")
// y aparecen sugerencias; con las flechas y Enter (o tocando) elegís. Guarda el id en un campo oculto `name`.

export type OpcionProducto = { id: string; texto: string; detalle?: string };

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[·+/|,()-]/g, " ")
    .replace(/\bgb\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const MAXIMO = 12;

export function BuscadorProducto({
  name,
  opciones,
  valor,
  id,
  placeholder = "Escribí el producto (ej. note 17 pro 256 negro)",
}: {
  name: string;
  opciones: OpcionProducto[];
  /** id elegido al abrir (por ejemplo, al editar una línea) */
  valor?: string | null;
  id?: string;
  placeholder?: string;
}) {
  const propio = useId();
  const idCampo = id ?? propio;
  const idLista = `${idCampo}-lista`;
  const indice = useMemo(() => opciones.map((o) => ({ ...o, n: normal(`${o.texto} ${o.detalle ?? ""}`) })), [opciones]);
  const [elegido, setElegido] = useState<string>(valor ?? "");
  const [texto, setTexto] = useState(() => opciones.find((o) => o.id === valor)?.texto ?? "");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  const sugerencias = useMemo(() => {
    const q = normal(texto);
    if (!q) return indice.slice(0, MAXIMO);
    const palabras = q.split(" ");
    return indice
      .filter((o) => palabras.every((p) => o.n.includes(p)))
      .sort((a, b) => Number(!a.n.startsWith(palabras[0])) - Number(!b.n.startsWith(palabras[0])) || a.n.length - b.n.length)
      .slice(0, MAXIMO);
  }, [texto, indice]);

  const elegir = (o: OpcionProducto) => {
    setElegido(o.id);
    setTexto(o.texto);
    setAbierto(false);
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={elegido} />
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={campo}
          id={idCampo}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          autoComplete="off"
          value={texto}
          placeholder={placeholder}
          className="pr-8 pl-8"
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onChange={(e) => {
            setTexto(e.target.value);
            setElegido("");
            setActivo(0);
            setAbierto(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
              setActivo((a) => Math.min(a + 1, sugerencias.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && abierto && sugerencias[activo]) {
              e.preventDefault(); // no enviar el formulario: Enter elige la sugerencia
              elegir(sugerencias[activo]);
            } else if (e.key === "Escape") {
              setAbierto(false);
            }
          }}
        />
        {texto ? (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Borrar"
            onClick={() => {
              setTexto("");
              setElegido("");
              setAbierto(true);
              campo.current?.focus();
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {abierto ? (
        <ul
          id={idLista}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {sugerencias.length ? (
            sugerencias.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === elegido}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ${i === activo ? "bg-accent text-accent-foreground" : ""}`}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // que el campo no pierda el foco antes de elegir
                  elegir(o);
                }}
              >
                <Check className={`size-3.5 shrink-0 ${o.id === elegido ? "opacity-100" : "opacity-0"}`} aria-hidden />
                <span className="min-w-0">
                  {o.texto}
                  {o.detalle ? <span className="text-muted-foreground"> · {o.detalle}</span> : null}
                </span>
              </li>
            ))
          ) : (
            <li className="px-2 py-1.5 text-muted-foreground">No hay productos con “{texto}”.</li>
          )}
        </ul>
      ) : null}
      {texto && !elegido && !abierto ? (
        <p className="mt-1 text-xs text-amber-700">Elegí una de las sugerencias para que quede guardado el producto.</p>
      ) : null}
    </div>
  );
}
