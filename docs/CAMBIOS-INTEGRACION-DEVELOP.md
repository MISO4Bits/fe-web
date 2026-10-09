# Integración de develop con BITS-93

Base: fe-web(2).zip entregado con conflictos.

## Resolución
- app.config.ts combina proveedores de BFF con iconos, withFetch y component input binding.
- app.routes.ts conserva inicio /cuenta, registro y confirmación funcionales. Añade alias /registro, /registro/confirma-tu-correo y /precotizacion. Mantiene /muestra, /ingreso y cotizaciones pendientes con sus layouts. Cada pantalla tiene un solo shell.
- styles.scss incorpora tema y retícula Material; acota estilos heredados a app-site-shell. Conserva estilos de HTML legal.
- Sesion reconoce la cuenta creada por SessionService; cerrar sesión limpia ambos estados.
- Pruebas de navegador reflejan mensajes de duplicado al perder foco y prefijo /web.

## Modificados con cambios de contenido
- `e2e/registro.spec.ts`
- `src/app/app.config.ts`
- `src/app/app.routes.ts`
- `src/app/nucleo/sesion/sesion.spec.ts`
- `src/app/nucleo/sesion/sesion.ts`
- `src/styles.scss`

## Modificados solo por normalización CRLF a LF
- `src/app/core/config/api.config.ts`
- `src/app/core/services/documentos-legales.fixture.ts`
- `src/app/core/services/documentos-legales.service.spec.ts`
- `src/app/core/services/documentos-legales.service.ts`
- `src/app/core/services/session.service.ts`
- `src/app/features/cuenta/pages/home/home.html`
- `src/app/features/cuenta/pages/home/home.scss`
- `src/app/features/cuenta/pages/home/home.ts`
- `src/app/features/precotizacion/pages/resultado/resultado.html`
- `src/app/features/precotizacion/pages/resultado/resultado.scss`
- `src/app/features/precotizacion/pages/resultado/resultado.ts`
- `src/app/features/registro/models/bff-registro.model.ts`
- `src/app/features/registro/models/registro.model.ts`
- `src/app/features/registro/pages/confirmar-correo/confirmar-correo.html`
- `src/app/features/registro/pages/confirmar-correo/confirmar-correo.scss`
- `src/app/features/registro/pages/confirmar-correo/confirmar-correo.ts`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.html`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.scss`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts`
- `src/app/features/registro/services/registro-http.service.spec.ts`
- `src/app/features/registro/services/registro-http.service.ts`
- `src/app/features/registro/services/registro-mock.service.spec.ts`
- `src/app/features/registro/services/registro-mock.service.ts`
- `src/app/features/registro/services/registro.fixture.ts`
- `src/app/features/registro/services/registro.gateway.ts`
- `src/app/shared/components/permission-dialog/permission-dialog.html`
- `src/app/shared/components/permission-dialog/permission-dialog.scss`
- `src/app/shared/components/permission-dialog/permission-dialog.spec.ts`
- `src/app/shared/components/permission-dialog/permission-dialog.ts`
- `src/app/shared/components/permission-dialog/policies.ts`
- `src/app/shared/components/site-shell/site-shell.html`
- `src/app/shared/components/site-shell/site-shell.scss`
- `src/app/shared/components/site-shell/site-shell.ts`

## Añadidos
- e2e/integracion-base.spec.ts
- docs/CAMBIOS-INTEGRACION-DEVELOP.md

## Eliminados
Ninguno.

## Qué llegó desde develop
Tema Material 3 y tokens de Figma, generadores de tokens e iconos, componentes de diseño (layouts, estados, diálogos y pantallas pendientes), muestra de tema, rutas centrales y sesión del shell; dependencias Material e iconos y normalización de finales de línea. Se conservaron los archivos incorporados por el merge.

## Aplicar al merge local
Copiar los archivos modificados desde este ZIP al proyecto, sin reemplazar .git. Ejecutar npm ci, npm run build y npm test -- --watch=false. Revisar git status. Marcar los tres conflictos resueltos con git add src/app/app.config.ts src/app/app.routes.ts src/styles.scss; añadir también los ajustes de sesión, pruebas y normalización que quieras incluir, y ejecutar git commit para concluir el merge.

El frontend conserva proxy /web hacia localhost:8081. La incompatibilidad de tokens del BFF sigue pendiente; no se modifica su contrato ni se simula una confirmación exitosa.
