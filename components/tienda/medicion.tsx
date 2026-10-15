"use client";

import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { medir, origen } from "@/lib/analytics";

// Scripts de Google Analytics 4 y Meta Pixel (cargan cuando la página ya está lista, para no
// demorarla), vista de página en cada navegación, clics a WhatsApp de toda la tienda y el aviso
// sencillo de cookies. Si las variables no están en Vercel, no se carga nada de terceros.

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const CLAVE_AVISO = "nera-cookies";

const sinCambios = () => () => {};

export function Medicion() {
  const ruta = usePathname();

  // Vista de página en cada navegación. GA4 las cuenta solo (Medición mejorada: cambios del historial),
  // así que aquí van solo a la tabla propia y a Meta (la primera la cuenta el Pixel al cargar).
  useEffect(() => {
    origen();
    medir("vista_pagina");
    window.fbq?.("track", "PageView");
  }, [ruta]);

  // Cualquier enlace a WhatsApp de la tienda
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href*='wa.me']") as HTMLAnchorElement | null;
      if (!a) return;
      const texto = decodeURIComponent(a.href.split("text=")[1] ?? "");
      const codigo = texto.match(/\[([^\]]+)\]\s*$/)?.[1];
      medir("clic_whatsapp", { boton: (a.textContent ?? "").trim().slice(0, 60) || "ícono", codigo });
    };
    document.addEventListener("click", alClic, { capture: true });
    return () => document.removeEventListener("click", alClic, { capture: true });
  }, []);

  return (
    <>
      {GA4_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      ) : null}
      {PIXEL_ID ? (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {GA4_ID || PIXEL_ID ? <AvisoCookies /> : null}
    </>
  );
}

function AvisoCookies() {
  const visto = useSyncExternalStore(
    sinCambios,
    () => {
      try {
        return localStorage.getItem(CLAVE_AVISO) === "ok";
      } catch {
        return true;
      }
    },
    () => true
  );
  const [cerrado, setCerrado] = useState(false);
  if (visto || cerrado) return null;
  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-xl border bg-background/95 p-3 text-xs shadow-lg backdrop-blur md:bottom-4 md:left-4 md:right-auto md:max-w-sm"
    >
      <p className="flex-1">
        Usamos cookies para medir y mejorar la tienda.{" "}
        <Link href="/privacidad" className="underline">
          Más información
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(CLAVE_AVISO, "ok");
          } catch {}
          setCerrado(true);
        }}
        className="rounded-lg bg-foreground px-3 py-1.5 font-semibold text-background"
      >
        Entendido
      </button>
    </div>
  );
}
