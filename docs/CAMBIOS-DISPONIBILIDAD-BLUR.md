# Cambios respecto a fe-web-BITS-93-BFF-proxy-local.zip

Añadido: docs/CAMBIOS-DISPONIBILIDAD-BLUR.md.

Modificados:
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.html
- src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts
- src/app/features/registro/services/registro.gateway.ts
- src/app/features/registro/services/registro-http.service.ts
- src/app/features/registro/services/registro-mock.service.ts
- docs/BFF-integracion.md

Eliminados: ninguno.

Al perder foco, se consulta GET /v1/registro/disponibilidad para el correo válido o el documento válido con su tipo. Se envía el documento limpio sin puntos. Duplicados invalidan el campo y bloquean el envío. Editar cancela la consulta anterior y permite corregir. No se repite la consulta de un valor sin cambios; los errores y resultados no concluyentes permiten reintentar al salir del campo. Se conserva la consulta conjunta al registrar y el backend debe garantizar unicidad. El proxy local /web se mantiene.
