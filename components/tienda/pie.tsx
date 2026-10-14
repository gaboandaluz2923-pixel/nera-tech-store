import Image from "next/image";
import Link from "next/link";
import { configTienda } from "@/lib/tienda/datos";
import { CATEGORIAS } from "@/lib/tienda/formato";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export async function Pie() {
  const c = await configTienda();
  return (
    <footer className="mt-16 bg-marca-oscuro text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="space-y-3 sm:col-span-2">
          <Image src="/marca/logo-oscuro.png" alt="Nera Tech" width={80} height={47} className="h-12 w-auto" />
          <p className="max-w-sm text-sm text-white/70">
            Celulares y accesorios nuevos y sellados, con garantía escrita y entrega en todo El Salvador.
            Pagás al recibir en San Salvador.
          </p>
          {c.negocio.direccion ? <p className="text-sm text-white/70">{c.negocio.direccion}</p> : null}
          {c.negocio.nit ? <p className="text-sm text-white/70">NIT {c.negocio.nit}</p> : null}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Productos</p>
          <ul className="space-y-1.5 text-sm text-white/70">
            {CATEGORIAS.slice(0, 5).map((cat) => (
              <li key={cat.slug}>
                <Link href={`/${cat.slug}`} className="hover:text-white">
                  {cat.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Ayuda</p>
          <ul className="space-y-1.5 text-sm text-white/70">
            <li>
              <Link href="/garantia" className="hover:text-white">
                Garantía
              </Link>
            </li>
            <li>
              <Link href="/envios-y-pagos" className="hover:text-white">
                Envíos y pagos
              </Link>
            </li>
            <li>
              <a
                href={enlaceWhatsAppA(c.whatsapp, "Hola, tengo una consulta. [pie]")}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                WhatsApp
              </a>
            </li>
            {c.negocio.correo ? (
              <li>
                <a href={`mailto:${c.negocio.correo}`} className="hover:text-white">
                  {c.negocio.correo}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © Nera Tech · El Salvador · Precios en dólares, IVA incluido
      </p>
    </footer>
  );
}
