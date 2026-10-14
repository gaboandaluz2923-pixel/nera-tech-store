"use client";

import { useSyncExternalStore } from "react";

// Carrito guardado en el navegador del visitante: solo qué variantes y cuántas.
// Los precios se calculan siempre en el servidor (ver lib/tienda/calculo.ts).

export type LineaCarrito = { v: string; c: number };

const CLAVE = "nera-carrito";
const EVENTO = "nera-carrito-cambio";
const EVENTO_ABRIR = "nera-carrito-abrir";
const MAX = 3;

let cache: { raw: string | null; lista: LineaCarrito[] } = { raw: null, lista: [] };
const VACIO: LineaCarrito[] = [];

function leer(raw: string | null): LineaCarrito[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((l) => typeof l?.v === "string" && Number(l?.c) > 0) : [];
  } catch {
    return [];
  }
}

function instantanea(): LineaCarrito[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CLAVE);
  } catch {}
  if (raw !== cache.raw) cache = { raw, lista: leer(raw) };
  return cache.lista;
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

function guardar(lista: LineaCarrito[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

export function useCarrito() {
  return useSyncExternalStore(suscribir, instantanea, () => VACIO);
}

export function agregarAlCarrito(varianteId: string, cantidad = 1) {
  const lista = instantanea();
  const existe = lista.find((l) => l.v === varianteId);
  guardar(
    existe
      ? lista.map((l) => (l.v === varianteId ? { ...l, c: Math.min(MAX, l.c + cantidad) } : l))
      : [...lista, { v: varianteId, c: Math.min(MAX, cantidad) }]
  );
}

export function cambiarCantidad(varianteId: string, cantidad: number) {
  const lista = instantanea();
  guardar(
    cantidad <= 0
      ? lista.filter((l) => l.v !== varianteId)
      : lista.map((l) => (l.v === varianteId ? { ...l, c: Math.min(MAX, cantidad) } : l))
  );
}

export function quitarDelCarrito(varianteIds: string[]) {
  if (!varianteIds.length) return;
  guardar(instantanea().filter((l) => !varianteIds.includes(l.v)));
}

export function vaciarCarrito() {
  guardar([]);
}

export function abrirCarrito() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

export function alAbrirCarrito(cb: () => void) {
  window.addEventListener(EVENTO_ABRIR, cb);
  return () => window.removeEventListener(EVENTO_ABRIR, cb);
}

export const MAX_POR_PRODUCTO = MAX;
