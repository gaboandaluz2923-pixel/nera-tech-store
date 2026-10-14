# Nera Tech Store

Tienda en línea y panel de administración de Nera Tech (El Salvador).
Next.js 16 · Supabase · Vercel. El contexto completo del proyecto está en `CLAUDE.md`;
el modelo de datos en `docs/modelo-datos.md`; el manual para el equipo en `docs/manual-panel.md`.

## Correr en tu computadora
1. Instalá Node.js (LTS) y Git.
2. `npm install`
3. Copiá `.env.example` a `.env.local` y llená las variables (al menos las de Supabase y WhatsApp).
4. `npm run dev` y abrí http://localhost:3000

## Base de datos
Las migraciones están en `supabase/migrations/`, numeradas. Se ejecutan en orden en
Supabase → SQL Editor. La 0001 crea todo el esquema y la seguridad.

## Publicar
Cada `git push` a `main` publica en Vercel automáticamente. Las variables de entorno se
cargan en Vercel → Settings → Environment Variables (mismos nombres que `.env.example`).
