import { configTienda } from "@/lib/tienda/datos";
import { enlaceWhatsAppA } from "@/lib/whatsapp";
import { IconoWhatsApp } from "./icono-whatsapp";


export async function WhatsAppFlotante() {
  const c = await configTienda();
  return (
    <a
      href={enlaceWhatsAppA(c.whatsapp, "Hola, quiero información. [flotante]")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 sm:bottom-6"
    >
      <IconoWhatsApp className="size-8" />
    </a>
  );
}

export { IconoWhatsApp };
