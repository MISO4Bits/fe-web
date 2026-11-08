# fe-web

Cliente web de Solventa (Angular, standalone components). Consume la API expuesta
por `bff-web`.

## Correr en local

Requiere Node 22+.

```bash
npm ci
npm start
```

- App: <http://localhost:4200>

## Pruebas

```bash
npm test                          # unitarias (Jasmine/Karma), una vez, con cobertura (gate 80%)
npm run e2e                       # E2E (Playwright); primero: npx playwright install --with-deps chromium
npm run lint                      # ESLint
npm run format:check              # Prettier
```

## Build de producción

```bash
npm run build
```

Genera el bundle estático en `dist/fe-web/browser`, servido por nginx en la imagen
Docker (puerto 8080, `/health` para healthcheck).

## Estado

Fase A (esqueleto). Solo el shell de routing de Angular, sin pantallas de negocio
todavía.

## Enlace al Backoffice (E00, BITS-363)

El encabezado publico muestra Backoffice desde el inicio, sin depender del correo
ni de un intento de ingreso. Es un enlace entre aplicaciones, en la misma pestana.

| Ejecucion                               | Destino del enlace                             |
| --------------------------------------- | ---------------------------------------------- |
| `npm start` (configuration development) | `http://localhost:4201/ingreso`                |
| `npm run build` (production)            | `https://backoffice.solventa4bits.com/ingreso` |
| `npm run build:dev` (production,dev)    | `https://backoffice.solventa4bits.com/ingreso` |

Angular reemplaza `src/app/core/config/backoffice-url.ts` por
`backoffice-url.local.ts` solo en configuration development. Si el Backoffice
local usa otro puerto, cambia la constante del archivo local y reinicia ng serve.
El puerto de fe-web puede cambiar sin alterar el destino del enlace.

No se transmite ninguna credencial ni token al seguir el enlace. La pantalla
E02B sigue mostrando el mensaje de portal equivocado si una cuenta interna
intenta ingresar por el formulario del cliente.
