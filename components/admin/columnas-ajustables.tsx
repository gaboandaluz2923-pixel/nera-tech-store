"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Todas las tablas del panel: arrastrando el borde derecho del encabezado de una columna se hace más angosta o
// más ancha y el texto se acomoda en varias líneas. El ancho se recuerda en este navegador (por pantalla y tabla).
// Doble clic en el borde: vuelve al ancho automático.

const MINIMO = 56;
const clave = (ruta: string, n: number) => `nera:columnas:${ruta.replace(/[0-9a-f-]{36}/g, ":id")}:${n}`;

function leer(k: string): number[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "null");
    return Array.isArray(v) && v.every((x) => typeof x === "number") ? v : null;
  } catch {
    return null;
  }
}
function guardar(k: string, anchos: number[] | null) {
  try {
    if (anchos) localStorage.setItem(k, JSON.stringify(anchos));
    else localStorage.removeItem(k);
  } catch {
    /* sin almacenamiento: solo dura mientras la página está abierta */
  }
}

function encabezados(tabla: HTMLTableElement) {
  const fila = tabla.tHead?.rows[tabla.tHead.rows.length - 1];
  return fila ? ([...fila.cells] as HTMLTableCellElement[]) : [];
}

/** Fija el ancho de cada columna (tabla con anchos fijos: el texto se parte en líneas) */
function aplicar(tabla: HTMLTableElement, anchos: number[]) {
  const ths = encabezados(tabla);
  if (anchos.length !== ths.length) return;
  ths.forEach((th, i) => (th.style.width = `${anchos[i]}px`));
  tabla.style.tableLayout = "fixed";
  tabla.style.width = `${anchos.reduce((s, x) => s + x, 0)}px`;
  tabla.style.minWidth = "100%";
  tabla.classList.add("columnas-fijas");
}

function soltar(tabla: HTMLTableElement) {
  encabezados(tabla).forEach((th) => (th.style.width = ""));
  tabla.style.tableLayout = "";
  tabla.style.width = "";
  tabla.style.minWidth = "";
  tabla.classList.remove("columnas-fijas");
}

function preparar(tabla: HTMLTableElement, k: string) {
  if (tabla.dataset.ajustable) return;
  const ths = encabezados(tabla);
  if (ths.length < 2) return;
  tabla.dataset.ajustable = "1";
  const guardados = leer(k);
  if (guardados) aplicar(tabla, guardados);

  ths.forEach((th, i) => {
    if (i === ths.length - 1) return; // la última se estira con la tabla
    th.style.position = "relative";
    const asa = document.createElement("span");
    asa.className = "asa-columna";
    asa.setAttribute("role", "separator");
    asa.setAttribute("aria-orientation", "vertical");
    asa.title = "Arrastrá para cambiar el ancho · doble clic: automático";
    asa.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // La primera vez se congelan los anchos actuales para que nada salte
      const actuales = encabezados(tabla).map((x) => x.getBoundingClientRect().width);
      aplicar(tabla, actuales);
      const inicioX = e.clientX;
      const inicio = actuales[i];
      asa.setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      const mover = (ev: PointerEvent) => {
        const anchos = encabezados(tabla).map((x) => parseFloat(x.style.width) || x.getBoundingClientRect().width);
        anchos[i] = Math.max(MINIMO, Math.round(inicio + ev.clientX - inicioX));
        aplicar(tabla, anchos);
      };
      const fin = () => {
        asa.removeEventListener("pointermove", mover);
        asa.removeEventListener("pointerup", fin);
        asa.removeEventListener("pointercancel", fin);
        document.body.style.cursor = "";
        guardar(k, encabezados(tabla).map((x) => Math.round(parseFloat(x.style.width) || x.getBoundingClientRect().width)));
      };
      asa.addEventListener("pointermove", mover);
      asa.addEventListener("pointerup", fin);
      asa.addEventListener("pointercancel", fin);
    });
    asa.addEventListener("dblclick", (e) => {
      e.preventDefault();
      soltar(tabla);
      guardar(k, null);
    });
    asa.addEventListener("click", (e) => e.stopPropagation());
    th.appendChild(asa);
  });
}

export function ColumnasAjustables() {
  const ruta = usePathname();
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const revisar = () => main.querySelectorAll("table").forEach((t, n) => preparar(t as HTMLTableElement, clave(ruta, n)));
    revisar();
    // Las tablas que aparecen después (Editar, Cargando…, otra página) también
    const obs = new MutationObserver(() => revisar());
    obs.observe(main, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [ruta]);
  return null;
}
