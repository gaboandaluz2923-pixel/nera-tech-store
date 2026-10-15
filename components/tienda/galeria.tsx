"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { medir } from "@/lib/analytics";
import type { ImagenTienda } from "@/lib/tienda/datos";

// Galería: en el teléfono se desliza con el dedo; en escritorio se eligen las miniaturas.
export function Galeria({ imagenes, nombre }: { imagenes: ImagenTienda[]; nombre: string }) {
  const [actual, setActualBase] = useState(0);
  const [medido, setMedido] = useState(false);
  // La primera vez que mira otra foto, se cuenta como interés en el producto
  const setActual = (i: number) => {
    setActualBase(i);
    if (i > 0 && !medido) {
      setMedido(true);
      medir("clic_foto", { nombre, foto: i + 1 });
    }
  };
  const pista = useRef<HTMLDivElement>(null);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        Foto próximamente
      </div>
    );
  }

  const ir = (i: number) => {
    setActual(i);
    const el = pista.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={pista}
        className="flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-white [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== actual) setActual(i);
        }}
        aria-label={`Fotos de ${nombre}`}
        aria-roledescription="carrusel"
      >
        {imagenes.map((img, i) => (
          <div key={img.url} className="relative aspect-square w-full shrink-0 snap-center">
            <Image
              src={img.url}
              alt={i === 0 ? img.alt : `${img.alt} (foto ${i + 1})`}
              fill
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
              className="object-contain p-4"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      {imagenes.length > 1 ? (
        <>
          <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {imagenes.map((img, i) => (
              <span key={img.url} className={`size-1.5 rounded-full ${i === actual ? "bg-marca" : "bg-muted-foreground/30"}`} />
            ))}
          </div>
          <div className="mt-3 hidden gap-2 md:flex">
            {imagenes.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === actual}
                className={`relative size-16 overflow-hidden rounded-lg border-2 bg-white ${i === actual ? "border-marca" : "border-transparent"}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
