import type { Metadata } from "next";
import Link from "next/link";
import { configTienda } from "@/lib/tienda/datos";
import { enlaceWhatsAppA } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos pide Nera Tech, para qué los usa y cómo podés pedir que los corrijamos o borremos.",
  alternates: { canonical: "/privacidad" },
};

export default async function Privacidad() {
  const c = await configTienda();
  const negocio = c.negocio.nombre || "Nera Tech";
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-16 leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-2xl font-bold sm:text-3xl">Política de privacidad</h1>
      <p className="text-sm text-muted-foreground">Última actualización: 14 de octubre de 2026</p>
      <p>
        En {negocio} (El Salvador) usamos tus datos solo para venderte, entregarte y facturarte lo que comprás, y para
        atenderte. No vendemos ni alquilamos tus datos a nadie.
      </p>

      <h2>Qué datos pedimos</h2>
      <ul>
        <li>Al comprar: nombre, teléfono, correo, dirección de entrega y, si pedís crédito fiscal, NIT, NRC, razón social y giro.</li>
        <li>Lo que compraste, cuánto pagaste y la forma de pago.</li>
        <li>
          Si entrás con Google: tu nombre y tu correo de Google. No recibimos tu contraseña ni otros datos de tu cuenta.
        </li>
        <li>Si pedís que te avisemos cuando haya un producto: tu correo.</li>
        <li>Si lo guardás en Mi cuenta: tu cumpleaños (solo día y mes) y tus direcciones.</li>
      </ul>
      <p>
        <strong>No guardamos datos de tarjetas.</strong> Los pagos con tarjeta se hacen en Wompi (Banco Agrícola); nosotros
        solo recibimos si el pago se aprobó.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Confirmar, entregar y cobrar tu pedido, y escribirte por WhatsApp sobre él.</li>
        <li>Emitir y enviarte la factura electrónica, como exige la ley.</li>
        <li>Mostrarte tus pedidos y facturas en “Mis pedidos”.</li>
        <li>Atender garantías y reclamos.</li>
        <li>Llevar tus Puntos Nera y darte tu regalo de cumpleaños.</li>
        <li>
          Enviarte ofertas y novedades por correo o WhatsApp. <strong>Podés pedir no recibirlas</strong> en cualquier momento: al
          comprar (&quot;No quiero recibir publicidad&quot;), en Mi cuenta o con el enlace que va al final de cada correo de ofertas. Los
          avisos de tus pedidos y tus facturas te llegan siempre.
        </li>
      </ul>

      <h2>Con quién los compartimos</h2>
      <ul>
        <li>Wompi, para procesar pagos con tarjeta.</li>
        <li>Brevo, el servicio que envía nuestros correos (tu nombre y correo).</li>
        <li>La empresa o persona que entrega tu pedido (nombre, teléfono y dirección).</li>
        <li>Nuestro sistema de facturación electrónica y el Ministerio de Hacienda, para la factura.</li>
        <li>Los servicios donde funciona la tienda (alojamiento y base de datos), que guardan los datos por nosotros.</li>
      </ul>

      <h2>En tu navegador</h2>
      <p>
        La tienda guarda en tu navegador tu carrito y los productos que comparás, para que no se pierdan. Si entrás con
        Google, también guarda tu sesión. Podés borrarlos en cualquier momento desde la configuración de tu navegador.
      </p>
      <p>
        <strong>Medición.</strong> Para saber qué productos interesan y mejorar la tienda, registramos qué páginas y productos
        se ven, qué se agrega al carrito, qué se busca y las compras, con un identificador anónimo del navegador. Usamos
        también Google Analytics y el Pixel de Meta (Facebook e Instagram), que ponen sus propias cookies. Cuando un pago se
        confirma, le avisamos a Meta de la compra con tu correo y teléfono <strong>cifrados</strong> (Meta no los ve en texto),
        para medir qué anuncios funcionan. Podés bloquear estas cookies desde tu navegador.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Los datos de tus pedidos y facturas se guardan el tiempo que exige la ley tributaria. Lo demás (por ejemplo, avisos de
        productos) lo podés pedir borrar cuando quieras.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedirnos ver, corregir o borrar tus datos, o desenlazar tu cuenta de Google. Escribinos
        {c.negocio.correo ? (
          <>
            {" "}
            a <a href={`mailto:${c.negocio.correo}`} className="text-primary underline">{c.negocio.correo}</a> o
          </>
        ) : null}{" "}
        por{" "}
        <a
          href={enlaceWhatsAppA(c.whatsapp, "Hola, tengo una consulta sobre mis datos personales. [privacidad]")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          WhatsApp
        </a>{" "}
        y te respondemos en un máximo de 10 días hábiles.
      </p>

      <h2>Quiénes somos</h2>
      <p>
        {negocio}
        {c.negocio.nit ? ` · NIT ${c.negocio.nit}` : ""}
        {c.negocio.direccion ? ` · ${c.negocio.direccion}` : ""} · El Salvador.
      </p>
      <p>
        <Link href="/" className="text-primary underline">
          Volver a la tienda
        </Link>
      </p>
    </article>
  );
}
