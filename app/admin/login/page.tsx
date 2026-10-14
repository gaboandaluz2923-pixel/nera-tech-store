import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

async function Formulario({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; aviso?: string }>;
}) {
  const { volver, aviso } = await searchParams;
  return (
    <>
      {aviso === "sin-acceso" ? (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Esa cuenta no tiene acceso al panel. Entrá con tu cuenta del equipo.
        </p>
      ) : null}
      <FormularioLogin volver={volver ?? "/admin"} />
    </>
  );
}

export default function PaginaLogin(props: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Panel de Nera Tech</CardTitle>
          <CardDescription>Solo para el equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <Formulario searchParams={props.searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
