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
  searchParams: Promise<{ volver?: string }>;
}) {
  const { volver } = await searchParams;
  return <FormularioLogin volver={volver ?? "/admin"} />;
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
