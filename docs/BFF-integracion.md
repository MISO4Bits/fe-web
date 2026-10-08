# BITS-93: integración HTTP con BFF Web

## Configuración en un solo archivo

Editar `src/app/core/config/api.config.ts`:

```typescript
useMocks: false,
baseUrl: '/web',
```

La URL base es relativa al mismo origen: `/web`. No agregar `/v1`: el adaptador lo agrega. En local, `proxy.conf.cjs` reenvía `/web/**` a `http://localhost:8081` y elimina el prefijo `/web`. Para cambiar el puerto local, editar `target` en ese archivo y reiniciar `npm start`. Esta configuración no contiene secretos.

`useMocks: false` usa el BFF externo aunque este devuelva datos de ejemplo. `true` usa el mock interno de Angular y no llama al BFF. Ajustar `timeoutMs` si se acuerda otro límite. `legalMarket` y `legalLanguage` configuran CO y es-CO. Las versiones se obtienen del BFF junto con cada documento, sin valores fijos en configuración.

Ejecutar el BFF por separado en el puerto 8081 y luego `npm ci` y `npm start` desde fe-web. `angular.json` activa el proxy del servidor de desarrollo. El navegador llama a `http://localhost:4200/web/v1/...`; el proxy llama al BFF a `http://localhost:8081/v1/...`, conservando método, cuerpo y Authorization. No se requiere CORS para este recorrido.

En nube, el gateway o proxy del despliegue debe servir el frontend y enrutar `/web/**` al BFF, eliminando `/web`, bajo el mismo protocolo, dominio y puerto. El proxy de Angular solo funciona con `ng serve`; no forma parte del build. Este cambio no modifica nginx ni infraestructura de nube y no corrige la incompatibilidad de tokens del BFF.

## Llamadas implementadas

1. Al perder foco en correo o documento válido: GET `/v1/registro/disponibilidad` consulta solo el dato correspondiente (documento junto con su tipo). Marca duplicados junto al campo, cancela consultas al editar y evita repetir valores sin cambios. Errores permiten reintentar; no se interpretan como disponibilidad. Antes de registrar: GET `/v1/registro/disponibilidad` con `correo`, `tipoDocumento` y `numeroDocumento`. Un false marca el campo duplicado y detiene el registro; null/ausencia no se interpreta como duplicado. Esta comprobación no sustituye la unicidad del backend: aún puede haber una carrera entre consulta y registro.
2. POST `/v1/registro` con el DTO plano del contrato. No envía `identity`, `consents` ni `reference`. El saldo de precotización permanece como referencia visual; no crea cotizaciones.
3. Traduce `cuenta` al modelo de presentación y conserva `sesion` en memoria. Solo una cuenta ACTIVO lleva al Home. No persiste tokens, contraseñas o datos personales en localStorage/sessionStorage. Al recargar se pierde la sesión; inicio de sesión/refresh automático quedan fuera de BITS-93.
4. POST `/v1/registro/reenvio-confirmacion`, sin body y con `Authorization: Bearer <accessToken>`. No realiza la llamada si no hay sesión vigente.
5. POST `/v1/registro/confirmacion`, sin body. **Convención provisional**: la pantalla `/confirmar-correo?token=...` manda ese token en Authorization Bearer. El contrato no especifica si espera un token del enlace o de sesión ni el formato del enlace: confirmar esta convención con el BFF. Solo muestra éxito si la respuesta contiene `correoConfirmado: true`.

No se implementan endpoints ajenos al registro (login, refresh, cotización, gestión posterior de consentimientos). GET `/v1/cuenta` tampoco es necesario en este recorrido: POST registro ya devuelve la cuenta.

## Correspondencia y reglas

Nombres y apellidos del prototipo se envían completos como `primerNombre` y `primerApellido`; no se inventa una separación de nombres. Se omiten segundos nombres/apellidos opcionales. Si el equipo requiere separación, habrá que ajustar los campos del diseño.

Documento: CC solo números (4–10 dígitos), CE/PA alfanuméricos (4–16 caracteres). La máscara de puntos solo existe en pantalla para CC; disponibilidad y registro reciben el valor limpio. Contraseña: 10–128 caracteres. Fecha: calendario nativo o texto dd/mm/aaaa; envío YYYY-MM-DD. Nombres/apellidos: letras Unicode, espacios, máximo 60 por campo; no se aceptan entradas compuestas solo de espacios. Teléfono: obligatorio, 7–12 dígitos. Correo: segmentos alfanuméricos separados por puntos, una arroba y dominio con al menos un punto; no acepta +, guiones ni guiones bajos por la regla solicitada. Tratamiento personal permanece obligatorio por la HU, autorización financiera opcional.

**Prioridad de reglas:** el contrato del BFF tiene prioridad sobre las propuestas del frontend. Todos los documentos requieren al menos 4 caracteres y el celular al menos 7 dígitos. Se conservan los máximos más restrictivos solicitados: CC 10, CE/PA 16, celular 12. Estos rangos están dentro de los máximos del contrato (documento 20, teléfono 15).

Las listas de caracteres y validaciones del frontend ayudan a la entrada de datos, pero pueden eludirse. El backend debe repetir las validaciones y usar consultas parametrizadas para proteger la BD; la máscara no es una protección frente a inyección. Las versiones de autorizaciones se mandan como null cuando no se autoriza.

422 produce un mensaje de validación controlado, sin mostrar el cuerpo de error (puede contener entradas sensibles). 401 indica sesión requerida; errores de red, timeout y respuestas no reconocidas producen un mensaje genérico. Se reconocen los códigos anteriores EMAIL_EXISTS, DOCUMENT_EXISTS, DISPOSABLE_EMAIL, INVALID_TOKEN y EXPIRED_TOKEN si el BFF los devuelve, pero esos códigos aún no están especificados en OpenAPI. No se deduce un duplicado a partir de un 409 sin código.

## Pendientes del BFF

- Enrutamiento `/web` en nube y disponibilidad efectiva de cada endpoint.
- Formato/token del enlace de confirmación y códigos de negocio.
- Aclarar obligatoriedad de tratamiento personal y estructura de nombres.
- La precotización inicial permanece ilustrativa: no hay endpoint público en el contrato recibido.

## Verificación

Las pruebas unitarias verifican el DTO exacto, disponibilidad, sesión, Authorization, respuestas de confirmación y errores. Las pruebas E2E interceptan HTTP con ejemplos controlados; no requieren un BFF externo. Esto valida el adaptador y el flujo del navegador, no la implementación interna de tu compañero.

Ejecutar `npm run build`, `npm run lint`, `npm test -- --watch=false`, `npx playwright install chromium`, `npm run e2e`.

Consultar `CAMBIOS-BFF.md` para los archivos agregados y modificados respecto al ZIP BITS-93 anterior.

## Resultado de esta revisión

Build, lint y formato: correctos. 37 pruebas unitarias y 8 E2E: aprobadas. Cobertura: statements 96,80 %, branches 95 %, functions 87,93 %, lines 98,83 %. Pruebas HTTP con respuestas controladas; aún no se probó contra el BFF local del equipo.

## Documentos legales

Al iniciar el registro se consulta GET /v1/documentos-legales?mercado=CO&idioma=es-CO. Se conservan los tres documentos durante la sesión de la aplicación. Los modales muestran título, subtítulo, base legal, HTML y nota al pie. Angular sanitiza el HTML con innerHTML, sin bypassSecurityTrustHtml.

El registro usa version de terminos como politicaVersion, open-data como politicaVersionTratamientoDatos y open-finance como politicaVersionDatosFinancieros. Las autorizaciones no otorgadas envían su versión como null. Si la carga falla o devuelve documentos incompletos, el registro queda bloqueado y ofrece reintento. No se sustituyen por textos locales en modo BFF. Los textos demo quedan solo para useMocks: true y pruebas.
