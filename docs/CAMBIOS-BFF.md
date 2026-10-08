# Cambios respecto a fe-web-BITS-93.zip

## Agregados

- `src/app/features/registro/models/bff-registro.model.ts`
- `docs/BFF-integracion.md`
- `docs/bff-web-openapi.json`
- `docs/CAMBIOS-BFF.md`

## Modificados

- `src/app/core/config/api.config.ts`
- `src/app/core/services/session.service.ts`
- `src/app/features/registro/models/registro.model.ts`
- `src/app/features/registro/pages/confirmar-correo/confirmar-correo.ts`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.html`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts`
- `src/app/features/registro/services/registro-http.service.spec.ts`
- `src/app/features/registro/services/registro-http.service.ts`
- `e2e/registro.spec.ts`
- `docs/BITS-93-frontend.md`

## Copiar al repositorio local

1. Detener npm start y guardar cambios propios. Confirmar tu rama feature.
2. Extraer este ZIP en una carpeta aparte. Copiar únicamente los archivos listados arriba conservando las rutas. Si aún no copiaste el ZIP anterior, esta entrega incluye el proyecto completo y todos los archivos iniciales de BITS-93.
3. Conservar `.git`, `node_modules`, los tsconfig locales y cambios propios. No se modifican package.json/package-lock.json ni dependencias.
4. Ajustar URL y políticas en `src/app/core/config/api.config.ts`, ejecutar el BFF, luego `npm run build` y `npm start`.
5. Revisar `git diff`/`git status` antes de hacer commit.

La lista compara con el ZIP BITS-93 anterior, no con tu working copy actual ni con cambios posteriores de compañeros. No se modificaron infraestructura, nginx, Docker, configuración de CI, dependencias ni tsconfig.

## Resultado de esta revisión

Build, lint y formato: correctos. 37 pruebas unitarias y 8 E2E: aprobadas. Cobertura: statements 96,80 %, branches 95 %, functions 87,93 %, lines 98,83 %. Pruebas HTTP con respuestas controladas; aún no se probó contra el BFF local del equipo.
