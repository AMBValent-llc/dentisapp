# Docli

Docli es una aplicación Next.js 15 / React 19 para procesos operativos y gestión clínica. Usa PostgreSQL en Neon mediante Drizzle y sesiones reales de Better Auth.

## Arquitectura

- **UI:** App Router, Server Components, Tailwind CSS 4.
- **Datos:** Neon PostgreSQL, esquema Drizzle en `lib/db/schema.ts` y consultas HTTP sin conexiones persistentes ni compilador WASM.
- **Auth:** Better Auth (correo/contraseña) con adaptador Drizzle y cookies HTTP.
- **Aislamiento:** todo dato de dominio tiene `organizationId`; los handlers lo obtienen de la membresía de la sesión, nunca del cliente.
- **Autorización:** membresías `OWNER`, `ADMIN`, `MEMBER`; eliminaciones sensibles requieren administración.

## Configuración

Requiere Node.js 22. Copia `.env.example` a `.env`, genera `BETTER_AUTH_SECRET` con al menos 32 bytes aleatorios y configura `DATABASE_URL` con una rama de desarrollo de Neon. `.env*` está ignorado salvo el ejemplo. No se necesita base shadow ni generación de un cliente ORM.

El cliente de autenticación siempre usa `/api/auth` en el mismo origen que la página. En desarrollo, el servidor deriva el origen del request, por lo que `localhost` funciona en cualquier puerto aunque `.env` conserve otra URL local. En producción exige `BETTER_AUTH_URL` y confía únicamente en ese origen HTTPS. Una página local nunca debe llamar directamente al Worker. No configures `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` ni otras variables públicas de Better Auth para apuntar al Worker. Después de cambiar variables públicas, reinicia el servidor de desarrollo para recompilar el cliente.

Para una base nueva de desarrollo:

```bash
npm ci
# DATABASE_TARGET_HOST debe coincidir exactamente con el host de DATABASE_URL.
ALLOW_DATABASE_MIGRATIONS=true DATABASE_TARGET_HOST="host-de-tu-rama.neon.tech" npm run db:deploy
npm run dev
```

`npm run db:status` inspecciona el estado sin escribir. Después de cambiar el esquema, `npm run db:generate` genera migraciones SQL; revísalas antes de aplicarlas con `db:deploy`. El driver HTTP requiere Neon, no una instancia PostgreSQL local conectada directamente por TCP.

### Adoptar una base existente de Prisma

La migración inicial conserva las tablas, columnas, enumeraciones, índices y relaciones existentes. No ejecutes de nuevo sus sentencias `CREATE TABLE` contra una base que ya las tiene. Prueba primero la adopción en una rama aislada:

```bash
npm run db:status
ALLOW_DATABASE_MIGRATIONS=true DATABASE_TARGET_HOST="host-de-la-rama.neon.tech" npm run db:adopt
npm run db:status
```

La adopción verifica el esquema y el historial anterior antes de registrar el baseline de Drizzle; conserva `_prisma_migrations` y los datos. Una base incompatible debe rechazarse, no marcarse como migrada a ciegas. Consulta también `drizzle/` para el historial SQL. El SQL inicial de `prisma/migrations/` se conserva únicamente como referencia histórica; el esquema activo y las herramientas de migración ya son de Drizzle.

## Usuario demostrativo

- Correo: `admin@docli.local`
- Contraseña: `DocliDemo2026!`
- Nombre: Andrés Torres
- Organización: Equipo Central

El seed es idempotente, crea la contraseña mediante Better Auth (queda hasheada), y carga procesos, pasos, tareas, referencias documentales, pacientes, historias, consentimientos, remisiones y exámenes.

Solo se permite en desarrollo/pruebas, con autorización explícita y confirmación del host de una base aislada:

```bash
NODE_ENV=test ALLOW_DEMO_SEED=true DATABASE_TARGET_HOST="host-de-la-rama.neon.tech" npm run db:seed
NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true NEXT_PUBLIC_DEMO_EMAIL="admin@docli.local" NEXT_PUBLIC_DEMO_PASSWORD="DocliDemo2026!" npm run dev
```

El botón para completar esta cuenta solo aparece cuando se habilita y se proporcionan ambas credenciales públicas de demostración. No actives estas opciones en el Worker ni ejecutes el seed contra producción.

## Despliegue en Cloudflare Workers

Docli usa OpenNext porque requiere renderizado dinámico, Route Handlers, Better Auth y PostgreSQL. El Worker `mediflow` sirve tanto la UI como el backend `/api/*`; PostgreSQL vive fuera del Worker. No debe desplegarse como sitio estático de Cloudflare Pages.

1. Configura las variables en **dos lugares distintos** del dashboard: **Settings → Variables and Secrets** para el runtime y **Settings → Build → Variables and secrets** para la compilación. Las variables de Build no se transfieren automáticamente al Worker.

   | Variable | Build | Runtime |
   | --- | --- | --- |
   | `DATABASE_URL` | No necesario para las rutas dinámicas | Secreto de conexión Neon PostgreSQL |
   | `BETTER_AUTH_SECRET` | No necesario | Secreto de alta entropía |
   | `BETTER_AUTH_URL` | No necesario | Origen HTTPS de producción |
   | `NEXT_PUBLIC_APP_URL` | Opcional; si se define, debe coincidir con producción | El mismo origen HTTPS |

   Genera `BETTER_AUTH_SECRET` con `openssl rand -base64 32`; no lo guardes en Git. El origen actual es `https://mediflow.accounts-865.workers.dev`, también declarado en `wrangler.jsonc`. Si cambias de dominio, actualiza el archivo y cualquier variable de Build que hayas definido antes de recompilar. El cliente de autenticación usa el mismo origen que la página, sin apuntar a localhost en producción. Better Auth se inicializa al atender una petición, no al importar módulos durante el build; no es necesario entregar su secreto de runtime al compilador.
2. Ejecuta las migraciones desde un entorno confiable antes de publicar:
   ```bash
   ALLOW_DATABASE_MIGRATIONS=true DATABASE_TARGET_HOST="host-verificado.neon.tech" npm run db:deploy
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

Node.js y Workers usan el mismo driver Neon HTTP y el mismo esquema Drizzle. La conexión y Better Auth se inicializan de forma diferida; importar sus módulos durante el build no necesita secretos. No se generan clientes Prisma ni se aplican reemplazos Webpack para WASM.

Las operaciones de dominio con varias escrituras (workspace y membresía, proceso y pasos, perfil) usan `db.batch`, que es atómico. No uses callbacks de `db.transaction` con Neon HTTP. El adaptador de Better Auth mantiene las transacciones interactivas desactivadas; no habilites `transaction: true` sin cambiar a un driver compatible.

Después de publicar, verifica `/login` (200), `/api/auth/get-session` sin cookies (200 con `null`) y `/api/patients` sin cookies (401). Una portada que responde 200 no demuestra que la autenticación o PostgreSQL funcionen. Comprueba también un login real y una lectura autenticada; ante errores 500 revisa los logs del Worker y sus secretos de runtime.

`POST /api/auth/sign-in/email` responde `401 INVALID_EMAIL_OR_PASSWORD` cuando el correo no existe o la contraseña no coincide. Es un rechazo esperado y la UI muestra el mismo mensaje en ambos casos para no revelar cuentas registradas. Una petición iniciada en `localhost` no debe ir directamente al Worker: además de romper el contrato de cookies del mismo origen, el Worker la rechaza por origen no confiable.

Si `/login` o `/api/auth/get-session` responden `500` con `DATABASE_URL is required`, la instancia local no tiene backend de autenticación configurado: copia `.env.example` a `.env`, completa una URL de una rama Neon de desarrollo y reinicia `npm run dev`. No uses la base de producción para resolver este error.

## API

Auth: `/api/auth/*`. Espacio/perfil: `/api/workspaces`, `/api/profile`. CRUD protegido: `/api/processes`, `/api/tasks`, `/api/documents`, `/api/patients` y sus rutas `/:id`. Clínico: `/api/clinical-histories`, `/api/consents`, `/api/referrals`, `/api/exams` (estos tres últimos admiten `PATCH/DELETE` por `/:id`). Contacto público: `POST /api/contact`, validado y limitado a 5 solicitudes/hora por IP en cada instancia.

## Validación

```bash
npm run lint
npx tsc --noEmit
npm test
npm run db:status
# Solo contra una rama Neon aislada, nunca producción:
ALLOW_DATABASE_TESTS=1 TEST_DATABASE_HOST="host-de-la-rama.neon.tech" npm run test:db
# Servidor local configurado con esa misma rama:
ALLOW_API_TESTS=1 ALLOW_DATABASE_TESTS=1 TEST_DATABASE_HOST="host-de-la-rama.neon.tech" NEXT_PUBLIC_APP_URL="http://localhost:3000" npm run test:api:isolated
ALLOW_API_TESTS=1 ALLOW_DATABASE_TESTS=1 TEST_DATABASE_HOST="host-de-la-rama.neon.tech" NEXT_PUBLIC_APP_URL="http://localhost:3000" npm run test:roles
npm run cf:build
```

`test:db` compara columnas, valores por defecto, enumeraciones, claves e índices con PostgreSQL y verifica el rollback de una escritura atómica fallida. Una compilación o una portada 200 no sustituyen las pruebas de autenticación y CRUD contra la base.

`test:api:isolated` crea una membresía `MEMBER` sintética y ejecuta la suite HTTP completa sin imprimir sus credenciales. El servidor local debe usar la misma rama Neon. Los usuarios y workspaces sintéticos permanecen en esa rama; elimínala al terminar. Para usar `test:api` directamente, configura `API_TEST_MEMBER_EMAIL` y `API_TEST_MEMBER_PASSWORD` de un fixture aislado existente en tu entorno privado, nunca en los bindings del Worker.

## Limitaciones

Los documentos son únicamente metadata y enlaces externos; no existe almacenamiento de archivos. No se envían correos reales (verificación/restablecimiento requieren configurar un proveedor). El rate limit de contacto vive en memoria por instancia; producción distribuida debe usar Redis u otro almacén compartido.
