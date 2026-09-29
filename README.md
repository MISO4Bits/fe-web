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
