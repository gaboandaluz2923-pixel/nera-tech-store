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

| 2026-10-13 | Miami fuera por ahora; proveedores iniciales: Total Link, Maverik, Idecom, Intcomex | Indicación de Gabriel |
| 2026-10-13 | Emparejar por clave normalizada (marca, modelo, RAM, almacenamiento, color) y recordar el código del proveedor | Cada proveedor describe distinto el mismo equipo; la RAM virtual "(6+6)" de Maverik se toma como 6 |
| 2026-10-13 | La comparación de proveedores es por configuración (modelo + memoria), no por color | El color casi nunca cambia el costo y simplifica la tabla |
| 2026-10-13 | Los PDF no se leen automáticamente; se pide Excel o se pega la tabla | Las tablas en PDF se extraen mal; pegar desde Excel es confiable |

## Fase actual
Fase 1 — Proveedores, listas y mejor precio: construida y probada con las listas reales; falta que Gabriel corra la migración 0002 e importe las listas en producción.
