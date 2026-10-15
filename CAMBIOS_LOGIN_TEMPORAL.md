# Login temporal Solventa — basado en fe-web(8).zip

## Agregados
- `src/app/features/login/login.ts`: pantalla de login, validaciones y errores.
- `src/app/features/login/login.html`: estructura pantalla 05 Inicio de sesión.
- `src/app/features/login/login.scss`: estilos responsive basados en Figma.
- `src/app/features/login/login.service.ts`: POST /v1/sesiones y GET /v1/cuenta.
- `src/app/features/home/home.ts`: Home privado y estado local de bienvenida.
- `src/app/features/home/home.html`: popup de bienvenida y Home sin cotizaciones.
- `src/app/features/home/home.scss`: estilos Home.
- `CAMBIOS_LOGIN_TEMPORAL.md`: este documento.

## Modificados
- `src/app/app.routes.ts`: `/ingreso`, Home `/cuenta`, redirección raíz a login.
- `src/app/nucleo/rutas.ts`: constante RUTAS.login.
- `src/app/nucleo/sesion/guarda-sesion.ts`: ruta privada requiere usuario y refresh token; redirige al login.
- `src/app/core/services/session.service.ts`: gestión en memoria y renovación bajo demanda de tokens.
- `src/app/diseno/layout-privado/layout-privado.ts`: al salir redirige al login.
- `src/app/diseno/layout-privado/layout-privado.html`: logo privado enlaza al Home.
- `src/app/shared/components/site-shell/site-shell.html`: logo público enlaza al login.

## Eliminados
- Ninguno.

## Flujo
- POST /v1/sesiones con email/password -> guarda tokens solo en memoria.
- GET /v1/cuenta con Bearer accessToken -> muestra Home con popup.
- Cerrar popup -> Home sin cotizaciones. Se muestra nuevamente tras una nueva sesión o recarga de componente; no hay indicador de primer ingreso en contrato.
- Botón olvidé mi contraseña deshabilitado a propósito.
- POST /v1/sesiones/refresco se llama desde `SessionService.validAccessToken()` si se consume por funcionalidades futuras; no se programó renovación periódica automática.
- No se implementó interceptor global para no modificar las llamadas públicas del registro; integrar `validAccessToken()` en endpoints privados posteriores.
- Al recargar navegador, sesión en memoria se pierde y se requiere nuevo login.

## Importante
- El ZIP base `fe-web(8).zip` no incluye implementación de BITS-290 (pantallas 12-12C): `/cuenta/cotizaciones/nueva` sigue siendo `PantallaPendiente`.
- El Home y popup son implementación provisional; el enlace aportado contiene el nodo 01 Inicio de sesión, no el nodo exacto de 02 Home primera vez. No se ha verificado fidelidad visual del Home contra ese prototipo.
- No se ejecutó compilación Angular: npm ci no pudo completarse en este entorno.
