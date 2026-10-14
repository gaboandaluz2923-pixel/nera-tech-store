import { Button } from "@/components/ui/button";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { MessageCircle, ShieldCheck, Truck, Wallet } from "lucide-react";

// Página provisional (fase 0). Se reemplaza en la fase 2 por el inicio completo.
export default function PaginaProvisional() {
  const whatsapp = enlaceWhatsApp(
    "Hola, vi la página de Nera Tech y quiero información. [inicio]"
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Nera Tech
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
        Celulares nuevos al mejor precio de El Salvador, entregados en tu puerta.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        La tienda en línea está en construcción. Mientras tanto, escribinos y te
        atendemos por WhatsApp.
      </p>

      <Button
        size="lg"
        className="mt-8"
        nativeButton={false}
        render={<a href={whatsapp} target="_blank" rel="noopener noreferrer" />}
      >
        <MessageCircle className="size-5" />
        Escribir por WhatsApp
      </Button>

      <ul className="mt-12 grid w-full max-w-lg grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <li className="flex flex-col items-center gap-2 rounded-lg border p-4">
          <Wallet className="size-5" />
          Pagás al recibir
        </li>
        <li className="flex flex-col items-center gap-2 rounded-lg border p-4">
          <ShieldCheck className="size-5" />
          Garantía escrita
        </li>
        <li className="flex flex-col items-center gap-2 rounded-lg border p-4">
          <Truck className="size-5" />
          Entrega en todo el país
        </li>
      </ul>
    </main>
  );
}
