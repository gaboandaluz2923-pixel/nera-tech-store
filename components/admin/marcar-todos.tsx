"use client";

import { useEffect, useRef, useState } from "react";

// Casilla "marcar todas" para una tabla con casillas name="ids" dentro de un formulario, y el contador
// "12 de 97 marcadas". Se sincronizan escuchando los cambios del formulario.

function casillas(formId: string, nombre = "ids") {
  const form = document.getElementById(formId);
  return form ? [...form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${nombre}"]`)] : [];
}

function useMarcadas(formId: string, nombre = "ids") {
  const [estado, setEstado] = useState({ marcadas: 0, total: 0 });
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const actualizar = () => {
      const cs = casillas(formId, nombre);
      setEstado({ marcadas: cs.filter((c) => c.checked).length, total: cs.length });
    };
    actualizar();
    form.addEventListener("change", actualizar);
    return () => form.removeEventListener("change", actualizar);
  }, [formId, nombre]);
  return estado;
}

export function MarcarTodos({ formId, nombre = "ids" }: { formId: string; nombre?: string }) {
  const { marcadas, total } = useMarcadas(formId, nombre);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = marcadas > 0 && marcadas < total;
  }, [marcadas, total]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Marcar todas"
      title="Marcar o desmarcar todas"
      className="size-4"
      checked={total > 0 && marcadas === total}
      onChange={(e) => {
        const valor = e.target.checked;
        for (const c of casillas(formId, nombre)) c.checked = valor;
        document.getElementById(formId)?.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    />
  );
}

export function ContadorMarcadas({ formId, nombre = "ids" }: { formId: string; nombre?: string }) {
  const { marcadas, total } = useMarcadas(formId, nombre);
  return (
    <span className="self-center text-sm font-medium tabular-nums">
      {marcadas} de {total} marcadas
    </span>
  );
}
