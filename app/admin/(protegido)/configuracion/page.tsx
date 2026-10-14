import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Fase 0: muestra qué variables de entorno están configuradas, sin revelar sus valores.
// En fases siguientes aquí se editan WhatsApp, envíos, municipios y cuentas bancarias.
const VARIABLES: { nombre: string; para: string; publica: boolean }[] = [
  { nombre: "NEXT_PUBLIC_SITE_URL", para: "Dirección pública del sitio", publica: true },
  { nombre: "NEXT_PUBLIC_WHATSAPP_NUMERO", para: "Botones de WhatsApp", publica: true },
  { nombre: "NEXT_PUBLIC_SUPABASE_URL", para: "Base de datos", publica: true },
  { nombre: "NEXT_PUBLIC_SUPABASE_ANON_KEY", para: "Base de datos (lectura pública)", publica: true },
  { nombre: "SUPABASE_SERVICE_ROLE_KEY", para: "Base de datos (escrituras del servidor)", publica: false },
  { nombre: "WOMPI_CLIENT_ID", para: "Pagos con tarjeta (fase 3)", publica: false },
  { nombre: "WOMPI_CLIENT_SECRET", para: "Pagos con tarjeta (fase 3)", publica: false },
  { nombre: "BREVO_API_KEY", para: "Correos (fase 4)", publica: false },
  { nombre: "NEXT_PUBLIC_GA4_ID", para: "Google Analytics (fase 5)", publica: true },
  { nombre: "NEXT_PUBLIC_META_PIXEL_ID", para: "Meta Pixel (fase 5)", publica: true },
  { nombre: "META_CONVERSIONS_TOKEN", para: "API de conversiones de Meta (fase 5)", publica: false },
];

export default function Configuracion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Estado de las conexiones. Los valores se cargan en Vercel (Settings →
          Environment Variables) y nunca se muestran aquí.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Variables de entorno</CardTitle>
          <CardDescription>
            Verde = configurada. Gris = falta (el sitio funciona sin ella hasta
            la fase indicada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {VARIABLES.map((v) => {
              const definida = Boolean(process.env[v.nombre]);
              return (
                <li key={v.nombre} className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${
                      definida ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <code className="font-mono text-xs">{v.nombre}</code>
                  <span className="ml-auto text-right text-muted-foreground">
                    {v.para}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
