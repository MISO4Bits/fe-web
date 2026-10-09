# BITS-93: contrato actualizado y confirmación pública de correo

Base: fe-web-BITS-93-merge-develop-resuelto.zip. Contrato: OpenAPI adjunto más reciente (incluido en docs/bff-web-openapi.json).

## Comportamiento

- El registro sigue abriendo /confirmar-correo. El correo se muestra en el texto y el envío corresponde al backend; la web no dispara un envío adicional.
- El enlace del correo abre /verificar-correo?oobCode=XXXX, una ruta pública que funciona sin sesión y desde otro dispositivo.
- Se captura el código y elimina de la URL antes de iniciar Angular. Solo permanece en memoria durante esta operación; no se guarda en almacenamiento ni se escribe en logs de la aplicación.
- Valida 10–512 caracteres A–Z, a–z, 0–9, guion o guion bajo. Un parámetro ausente, repetido o inválido no llama al BFF.
- POST /v1/registro/confirmacion con { "oobCode": "XXXX" }, sin Authorization. El éxito exige correoConfirmado: true y muestra el correo devuelto por el BFF, sin botón de entrar. No crea una sesión; solo actualiza el estado de una cuenta existente si coincide su correo.
- 400 muestra enlace inválido; 422 muestra enlace usado o vencido; un fallo temporal permite reintentar. No se muestran detalles internos del servidor. Se impiden solicitudes simultáneas y posteriores al éxito. Al recargar, el código retirado de la URL ya no está disponible.
- telefono es obligatorio en el DTO y ya lo era en el formulario. Se conservan 7–12 dígitos, dentro del patrón de 7–15 del contrato y de la propuesta del usuario.
- Cada intento de registro envía Idempotency-Key (UUID). Un reintento con los mismos datos mantiene la clave; cambiar datos o completar el registro genera una nueva para el siguiente intento. Clave y comparación de datos solo en memoria, sin persistencia. Recargar inicia otra operación; no hay reintentos automáticos.
- nginx.conf sirve /verificar-correo con Referrer-Policy: no-referrer, Cache-Control: no-store y sin access_log. index.html tiene además la política de referrer y usa las fuentes locales, sin Google Fonts ni scripts de terceros.

## Pendientes y despliegue

- Se mantiene exactamente el mecanismo de reenvío con sesion.accessToken; la discrepancia con Identity Platform sigue pendiente, por indicación del usuario.
- El OpenAPI solo documenta 200/422 para confirmación. Los estados 400, 422 usado/vencido y 503 se manejan según la indicación escrita del backend; falta completar sus esquemas application/problem+json y códigos definitivos.
- El 409 con errores por campo aún no está definido en este OpenAPI. Se conserva la consulta de disponibilidad al perder foco y antes del registro, además de los códigos de negocio previamente reconocidos; falta acordar el nuevo esquema para integrarlo.
- No hay endpoint contratado para cambiar el correo de una cuenta ya registrada.
- El servidor de nube debe servir la ruta pública y aplicar nginx.conf o reglas equivalentes. Gateways/CDN/proxies externos también deben evitar registrar el código y evitar analítica en esta ruta; el frontend no puede configurar sus logs.
- Un GET al HTML no confirma por sí mismo; la confirmación usa POST desde JavaScript. Un escáner de correo que ejecute JavaScript podría consumir el código: esta implementación no garantiza impedirlo.
- Se mantiene /web como base del BFF y el proxy local a localhost:8081. No cambia la configuración de CORS del BFF.

## Validación

Build de producción, lint y formato correctos. 83 pruebas unitarias y 17 pruebas E2E aprobadas (16 del conjunto más el caso corregido vuelto a ejecutar). Las respuestas del BFF son controladas en pruebas; no se verifica envío real de correos, almacenamiento del backend ni las cabeceras del servidor desplegado.

## Archivos añadidos

- docs/CAMBIOS-CONTRATO-OOB-CODE.md
- src/app/core/services/verification-code.ts
- src/app/features/registro/pages/verificar-correo/verificar-correo.html
- src/app/features/registro/pages/verificar-correo/verificar-correo.spec.ts
- src/app/features/registro/pages/verificar-correo/verificar-correo.ts

## Archivos modificados

- docs/bff-web-openapi.json
- e2e/registro.spec.ts
- nginx.conf
- src/app/app.routes.ts
- src/app/features/registro/models/bff-registro.model.ts
- src/app/features/registro/pages/confirmar-correo/confirmar-correo.html
- src/app/features/registro/pages/confirmar-correo/confirmar-correo.ts
- src/app/features/registro/services/registro-http.service.spec.ts
- src/app/features/registro/services/registro-http.service.ts
- src/app/features/registro/services/registro-mock.service.spec.ts
- src/app/features/registro/services/registro-mock.service.ts
- src/app/features/registro/services/registro.gateway.ts
- src/index.html
- src/main.ts

## Archivos eliminados

Ninguno.

## Aplicación al proyecto local

Copiar los archivos listados respetando sus rutas sobre la rama feature/BITS-93_registro_cuenta. No reemplazar .git ni node_modules. No cambian package.json ni package-lock.json. Reiniciar npm start y probar con el BFF actualizado.
