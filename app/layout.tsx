import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { SITE_URL } from "@/lib/url-sitio";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nera Tech — Celulares y accesorios en El Salvador",
    template: "%s | Nera Tech",
  },
  description:
    "Celulares nuevos sellados al mejor precio de El Salvador, verificados y entregados en tu puerta. Pagás al recibir.",
  openGraph: {
    type: "website",
    locale: "es_SV",
    siteName: "Nera Tech",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-SV" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
