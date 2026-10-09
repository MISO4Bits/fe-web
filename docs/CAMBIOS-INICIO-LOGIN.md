# Inicio en prototipo de login

Base: fe-web-BITS-93-contrato-confirmacion.zip.

- / y rutas desconocidas redirigen a /ingreso. /cuenta también redirige al login, incluso después del registro.
- Se reproduce el prototipo adjunto de login con campos vacíos y estilos responsivos. Crear cuenta nueva abre /crear-cuenta. El logo vuelve a /ingreso.
- Ingresar y ¿Olvidaste tu contraseña? se muestran deshabilitados. No se implementa autenticación, recuperación ni llamadas HTTP de login.
- Se elimina Ir a mi cuenta de /confirmar-correo. El registro sigue abriendo esa pantalla y conserva el correo para el aviso y reenvío.
- La confirmación pública con oobCode y el tema pendiente del token del reenvío se mantienen.
- No cambian dependencias ni contratos del BFF. Se conserva el Home en los archivos para integración posterior; actualmente /cuenta no lo muestra. Esto no implementa autenticación para toda la aplicación: las rutas privadas previas y su guard se mantienen.

Validación: build, lint, formato, 83 pruebas unitarias y 17 E2E aprobadas; comparación visual de escritorio y móvil. No se prueban credenciales reales ni entrega de correo.

## Añadidos

- design-qa.md
- docs/CAMBIOS-INICIO-LOGIN.md
- docs/previews/login-desktop.png
- docs/previews/login-mobile.png
- src/app/features/ingreso/pages/login/login.html
- src/app/features/ingreso/pages/login/login.scss
- src/app/features/ingreso/pages/login/login.ts

## Modificados

- e2e/integracion-base.spec.ts
- e2e/registro.spec.ts
- src/app/app.routes.ts
- src/app/features/registro/pages/confirmar-correo/confirmar-correo.html
- src/app/features/registro/pages/confirmar-correo/confirmar-correo.ts
- src/app/shared/components/site-shell/site-shell.html
- src/app/shared/components/site-shell/site-shell.scss

## Eliminados

Ninguno.

Copiar los archivos listados respetando sus rutas. No reemplazar .git ni node_modules. Reiniciar npm start.
