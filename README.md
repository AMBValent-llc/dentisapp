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

En producción usa PostgreSQL administrado y ejecuta `npm run db:deploy`. La base shadow solo se necesita para generar migraciones con `prisma migrate dev`, no para aplicar las existentes en producción.

## Usuario demostrativo

- Correo: `admin@docli.local`
- Contraseña: `DocliDemo2026!`
- Nombre: Andrés Torres
- Organización: Equipo Central

El seed es idempotente, crea la contraseña mediante Better Auth (queda hasheada), y carga procesos, pasos, tareas, referencias documentales, pacientes, historias, consentimientos, remisiones y exámenes.

## Despliegue en Cloudflare Workers

Docli usa OpenNext porque requiere renderizado dinámico, Route Handlers, Better Auth y PostgreSQL. El Worker `mediflow` sirve tanto la UI como el backend `/api/*`; PostgreSQL vive fuera del Worker. No debe desplegarse como sitio estático de Cloudflare Pages.

1. Configura las variables en **dos lugares distintos** del dashboard: **Settings → Variables and Secrets** para el runtime y **Settings → Build → Variables and secrets** para la compilación. Las variables de Build no se transfieren automáticamente al Worker.

   | Variable | Build | Runtime |
   | --- | --- | --- |
   | `DATABASE_URL` | Secreto PostgreSQL | Secreto PostgreSQL, con pool de conexiones |
   | `BETTER_AUTH_SECRET` | No necesario | Secreto de alta entropía |
   | `BETTER_AUTH_URL` | No necesario | Origen HTTPS de producción |
   | `NEXT_PUBLIC_APP_URL` | Opcional; si se define, debe coincidir con producción | El mismo origen HTTPS |

   Genera `BETTER_AUTH_SECRET` con `openssl rand -base64 32`; no lo guardes en Git. El origen actual es `https://mediflow.accounts-865.workers.dev`, también declarado en `wrangler.jsonc`. Si cambias de dominio, actualiza el archivo y cualquier variable de Build que hayas definido antes de recompilar. El cliente de autenticación usa el mismo origen que la página, sin apuntar a localhost en producción. Better Auth se inicializa al atender una petición, no al importar módulos durante el build; no es necesario entregar su secreto de runtime al compilador.
2. Ejecuta las migraciones desde un entorno confiable antes de publicar:
   ```bash
   DATABASE_URL="..." npm run db:deploy
   ```
   No ejecutes el seed demostrativo contra una base de producción con datos reales.
3. Verifica localmente el artefacto en el runtime de Workers:
   ```bash
   npm run cf:preview
   ```
4. Despliega:
   ```bash
   npm run cf:deploy
   ```

Para Cloudflare Workers Builds usa la raíz del repositorio, `npm run cf:build` como comando de build y `npx opennextjs-cloudflare deploy` como comando de deploy. En ramas de vista previa usa `npx opennextjs-cloudflare upload` después del build, con una base y secretos separados de producción. `.open-next/worker.js` y los demás artefactos no se versionan. No hay un `build.command` en Wrangler: se compila una sola vez, explícitamente, antes del deploy.

Prisma genera dos clientes: `generated/prisma` para Node.js y `generated/prisma-cloudflare` para Workers. `cf:build` establece `PRISMA_CLIENT_RUNTIME=cloudflare` y Next.js selecciona el segundo mediante un reemplazo de módulo de Webpack, también después de resolver los paths de TypeScript; así el compilador WebAssembly se importa como módulo, sin compilar WASM dinámicamente dentro del Worker. El desarrollo y el seed conservan el cliente Node.js. Usa los scripts `cf:*` para Workers; un cliente Node.js puede compilar correctamente y aun así fallar al consultar la base con `Wasm code generation disallowed by embedder`.

Después de publicar, verifica `/login` (200), `/api/auth/get-session` sin cookies (200 con `null`) y `/api/patients` sin cookies (401). Una portada que responde 200 no demuestra que la autenticación o PostgreSQL funcionen. Comprueba también un login real y una lectura autenticada; ante errores 500 revisa los logs del Worker y sus secretos de runtime.

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
