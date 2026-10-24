"use client";

import Link from "next/link";
import { medir } from "@/lib/analytics";

/** Enlace a la ficha desde un combo del inicio; mide el clic (clic_bundle, origen inicio) */
export function EnlaceCombo({
  href,
  productoId,
  combo,
  nombre,
  className,
  children,
}: {
  href: string;
  productoId: string;
  combo: string;
  nombre: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => medir("clic_bundle", { productoId, combo, nombre, desde: "inicio" })}>
      {children}
    </Link>
  );
}
