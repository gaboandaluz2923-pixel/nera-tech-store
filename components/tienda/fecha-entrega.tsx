"use client";

import { useSyncExternalStore } from "react";
import { diasEntrega, fechaEntrega, textoFechaCorta, textoFechaLarga } from "@/lib/tienda/entrega";

// Fecha tentativa de entrega ("recibilo el lunes 26 de octubre"). Se calcula en el teléfono del cliente, con la
// fecha de hoy (las páginas están en caché y no saben qué día es). En el servidor no muestra nada.

// Hora actual redondeada a la hora (estable entre renders; cambia sola si la página queda abierta)
const ahoraPorHora = () => Math.floor(Date.now() / 3_600_000);
const sinSuscripcion = () => () => {};

export function FechaEntrega({
  disponibilidad,
  corta = false,
  prefijo,
  className,
}: {
  disponibilidad: string;
  /** "lun 26" en vez de "lunes 26 de octubre" */
  corta?: boolean;
  /** Texto antes de la fecha (por defecto "recibilo el" / "llega") */
  prefijo?: string;
  className?: string;
}) {
  const hora = useSyncExternalStore(sinSuscripcion, ahoraPorHora, () => null);
  const dias = diasEntrega(disponibilidad);
  if (hora === null || !dias) return null;
  const d = fechaEntrega(dias, new Date(hora * 3_600_000 + 60_000));
  const texto = corta ? textoFechaCorta(d) : textoFechaLarga(d);
  return (
    <span className={className} title="Fecha aproximada: depende de la empresa de envíos (ver Términos)">
      {" "}
      {prefijo ?? (corta ? "llega" : "recibilo el")} {texto}
      {corta ? "" : " (aprox.)"}
    </span>
  );
}
