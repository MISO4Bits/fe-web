# Cambios de inicio y BFF local

Comparación con fe-web-BITS-93-BFF-contrato.zip.

La aplicación inicia en /cuenta (Entra a tu cuenta). El enlace Crear mi cuenta tiene texto blanco visible y conserva la navegación a /crear-cuenta. El logo Solventa dirige a /cuenta. La precotización sigue disponible en /precotizacion/resultado.

El BFF local queda configurado en http://localhost:8081, con useMocks: false. Se mantienen el contrato y las validaciones anteriores.

## Modificados

- src/app/app.routes.ts
- src/app/shared/components/site-shell/site-shell.html
- src/app/features/cuenta/pages/home/home.scss
- src/app/core/config/api.config.ts
- e2e/registro.spec.ts
- docs/BITS-93-frontend.md
- docs/BFF-integracion.md

## Añadidos

- docs/CAMBIOS-INICIO.md

## Eliminados

Ninguno.

## Verificación

Compilación y lint correctos. Las 12 pruebas E2E pasan, incluida la nueva prueba del inicio, color del enlace y navegación del logo. Las pruebas de registro simulan las respuestas HTTP; no verifican almacenamiento en el BFF local del usuario.

El ZIP excluye node_modules, .git y salidas de compilación y pruebas. Para actualizar un proyecto existente, copiar solo los archivos listados respetando las rutas.
