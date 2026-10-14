import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FASES = [
  { n: 0, nombre: "Cuentas y proyecto", estado: "Lista" },
  { n: 1, nombre: "Proveedores, listas y mejor precio", estado: "En prueba" },
  { n: 2, nombre: "Catálogo y fichas", estado: "Pendiente" },
  { n: 3, nombre: "Carrito, checkout y pagos", estado: "Pendiente" },
  { n: 4, nombre: "Promociones, bundles y correos", estado: "Pendiente" },
  { n: 5, nombre: "Analítica y sugerencia de precios", estado: "Pendiente" },
  { n: 6, nombre: "SEO, contenido y lanzamiento", estado: "Pendiente" },
];

export default function InicioAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inicio</h1>
        <p className="text-muted-foreground">
          El panel se construye por fases. Cada sección se activa cuando su fase
          termina.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Avance del proyecto</CardTitle>
          <CardDescription>Plan de construcción de la tienda</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {FASES.map((f) => (
              <li key={f.n} className="flex items-center justify-between py-2">
                <span>
                  <span className="mr-2 text-muted-foreground">Fase {f.n}</span>
                  {f.nombre}
                </span>
                <span className="text-muted-foreground">{f.estado}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
