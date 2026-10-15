import { BotonGuardar, FormularioAccion } from "@/components/admin/formulario-accion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarContrasena } from "./actions";

export default function MiContrasena() {
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Mi contraseña</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAccion accion={cambiarContrasena} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="nueva">Contraseña nueva</Label>
              <Input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={10} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="repetida">Repetila</Label>
              <Input id="repetida" name="repetida" type="password" autoComplete="new-password" minLength={10} required />
            </div>
            <p className="text-xs text-muted-foreground">Al menos 10 letras o números. No la compartas con nadie.</p>
            <BotonGuardar>Cambiar contraseña</BotonGuardar>
          </FormularioAccion>
        </CardContent>
      </Card>
    </div>
  );
}
