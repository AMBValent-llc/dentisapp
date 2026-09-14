# Docli

Docli es una aplicación Next.js 15 / React 19 para procesos operativos y gestión clínica. Usa PostgreSQL mediante Prisma 7 y sesiones reales de Better Auth.

## Arquitectura

- **UI:** App Router, Server Components, Tailwind CSS 4.
- **Datos:** PostgreSQL, Prisma Client generado en `generated/prisma`.
- **Auth:** Better Auth (correo/contraseña) con adaptador Prisma y cookies HTTP.
- **Aislamiento:** todo dato de dominio tiene `organizationId`; los handlers lo obtienen de la membresía de la sesión, nunca del cliente.
- **Autorización:** membresías `OWNER`, `ADMIN`, `MEMBER`; eliminaciones sensibles requieren administración.

## Configuración

Requiere Node.js 22. Copia `.env.example` a `.env`, genera `BETTER_AUTH_SECRET` con al menos 32 bytes aleatorios y configura las dos bases. `.env*` está ignorado salvo el ejemplo.

Para una base local oficial de Prisma:

```bash
npm install
npm run db:dev
# copia DATABASE_URL y la URL shadow que informa Prisma Dev a .env
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

En producción usa PostgreSQL administrado, una base shadow separada para migraciones y ejecuta `prisma migrate deploy`.

## Usuario demostrativo

- Correo: `admin@docli.local`
- Contraseña: `DocliDemo2026!`
- Nombre: Andrés Torres
- Organización: Equipo Central

El seed es idempotente, crea la contraseña mediante Better Auth (queda hasheada), y carga procesos, pasos, tareas, referencias documentales, pacientes, historias, consentimientos, remisiones y exámenes.

## Despliegue en Cloudflare Workers

Docli usa OpenNext porque requiere renderizado dinámico, Route Handlers, Better Auth y PostgreSQL. No debe desplegarse como sitio estático de Cloudflare Pages.

1. Configura en Cloudflare una URL PostgreSQL con pool de conexiones y las variables de producción:
   - `DATABASE_URL` como secreto del Worker.
   - `BETTER_AUTH_SECRET` como secreto de al menos 32 caracteres aleatorios.
   - `BETTER_AUTH_URL` con el origen HTTPS final.
   - `NEXT_PUBLIC_APP_URL` con el mismo origen HTTPS, disponible durante el build.
2. Ejecuta las migraciones desde un entorno confiable antes de publicar:
   ```bash
   DATABASE_URL="..." npm exec -- prisma migrate deploy
   ```
3. Verifica localmente el artefacto en el runtime de Workers:
   ```bash
   npm run cf:preview
   ```
4. Despliega:
   ```bash
   npm run cf:deploy
   ```

Para Cloudflare Workers Builds usa `npm run cf:build` como comando de build y `npx wrangler deploy` como comando de deploy. `wrangler.jsonc` también ejecuta el build automáticamente antes de desplegar, por lo que el Worker generado en `.open-next/worker.js` no necesita versionarse.

## API

Auth: `/api/auth/*`. Espacio/perfil: `/api/workspaces`, `/api/profile`. CRUD protegido: `/api/processes`, `/api/tasks`, `/api/documents`, `/api/patients` y sus rutas `/:id`. Clínico: `/api/clinical-histories`, `/api/consents`, `/api/referrals`, `/api/exams` (estos tres últimos admiten `PATCH/DELETE` por `/:id`). Contacto público: `POST /api/contact`, validado y limitado a 5 solicitudes/hora por IP en cada instancia.

## Validación

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run db:status
npm run test:api
```

## Limitaciones

Los documentos son únicamente metadata y enlaces externos; no existe almacenamiento de archivos. No se envían correos reales (verificación/restablecimiento requieren configurar un proveedor). El rate limit de contacto vive en memoria por instancia; producción distribuida debe usar Redis u otro almacén compartido.
