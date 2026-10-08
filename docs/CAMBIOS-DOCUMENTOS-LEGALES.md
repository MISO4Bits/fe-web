# Documentos legales desde BFF

Comparación con fe-web-BITS-93-BFF-confirmacion-correo.zip.

Se consulta una vez por sesión GET /v1/documentos-legales?mercado=CO&idioma=es-CO y se conservan los tres documentos completos. Los modales muestran HTML sanitizado por Angular, título, subtítulo, base legal, versión y nota al pie. El registro envía la versión de cada documento cargado. No se usa bypassSecurityTrustHtml.

Si falla la carga o falta alguno de los tres documentos, no se permite enviar el registro y se ofrece reintento. useMocks sigue en false y baseUrl en http://localhost:8081. Los textos demo se conservan solo para modo mock y pruebas. Los checkboxes y botones de aceptación siguen siendo elementos de interfaz del frontend.

## Añadidos

- src/app/core/services/documentos-legales.fixture.ts
- src/app/core/services/documentos-legales.service.spec.ts
- src/app/core/services/documentos-legales.service.ts
- docs/CAMBIOS-DOCUMENTOS-LEGALES.md

## Modificados

- docs/BFF-integracion.md
- docs/BITS-93-frontend.md
- docs/bff-web-openapi.json
- e2e/registro.spec.ts
- src/app/core/config/api.config.ts
- src/app/features/registro/models/registro.model.ts
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.html
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts
- src/app/features/registro/services/registro-http.service.spec.ts
- src/app/features/registro/services/registro-http.service.ts
- src/app/features/registro/services/registro.fixture.ts
- src/app/shared/components/permission-dialog/permission-dialog.html
- src/app/shared/components/permission-dialog/permission-dialog.spec.ts
- src/app/shared/components/permission-dialog/permission-dialog.ts
- src/app/shared/components/permission-dialog/policies.ts
- src/styles.scss

## Eliminados

Ninguno.

## Verificación

Compilación, lint, formato, 48 pruebas unitarias y 14 pruebas E2E correctas. Las respuestas HTTP se simulan durante las pruebas; no se verifica tu BFF local.

Para actualizar, copiar los archivos listados respetando las carpetas. No se modificaron dependencias.
