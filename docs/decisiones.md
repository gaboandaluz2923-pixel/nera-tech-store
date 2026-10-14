# Decisiones del proyecto

Registro corto de decisiones técnicas y de negocio, con fecha, para no volver a discutirlas.

| Fecha | Decisión | Por qué |
| --- | --- | --- |
| 2026-10-13 | Desarrollo propio con Next.js + Supabase + Vercel, no WordPress ni Shopify | Comparación de proveedores, sugerencia de precios y analítica propia no existen en los otros dos sin plugins |
| 2026-10-13 | Next.js 16 en vez de 15 | La 15 arrastra una dependencia con vulnerabilidad conocida; el proyecto es nuevo y no hay nada que migrar |
| 2026-10-13 | Escrituras públicas solo por el servidor (service role) | Más simple y seguro que dar permisos de escritura al navegador con RLS |
| 2026-10-13 | Migraciones por SQL Editor de Supabase | No hace falta instalar la CLI de Supabase en la computadora de Gabriel |
| 2026-10-13 | Nadie necesita cuenta para comprar; Google opcional después de la compra | Krug: pedir cuenta antes de comprar es la fricción que más carritos mata |
| 2026-10-13 | Tasa 0% por WhatsApp (pendiente: si es con Banco Agrícola, evaluar cuotas por Wompi) | Restricción operativa actual de Nera Tech |

## Fase actual
Fase 0 — Cuentas y proyecto. Pendiente: conectar Supabase, GitHub y Vercel con las cuentas de Gabriel.
