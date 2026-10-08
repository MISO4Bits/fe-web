# Confirmación de correo después del registro

Comparación con fe-web-BITS-93-BFF-inicio-cuenta.zip.

Tras un registro exitoso, la aplicación guarda la cuenta y sesión recibidas y abre /confirmar-correo. La pantalla muestra el correo registrado y permite solicitar el reenvío. El enlace Ir a mi cuenta abre /cuenta sin exigir confirmación previa.

El inicio y logo siguen dirigiendo a /cuenta. El BFF sigue en http://localhost:8081, con useMocks: false. No se modifica el contrato ni las validaciones.

## Modificados

- src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts
- e2e/registro.spec.ts
- docs/BITS-93-frontend.md

## Añadidos

- docs/CAMBIOS-CONFIRMACION-CORREO.md

## Eliminados

Ninguno.

## Verificación

Compilación, lint y 12 pruebas E2E correctas. Las pruebas de registro simulan las respuestas del BFF; no verifican entrega real de correos ni almacenamiento en el backend local del usuario.

Copiar solo los archivos listados respetando sus carpetas para actualizar un proyecto existente.
