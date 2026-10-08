# Cambios respecto a fe-web-BITS-93-BFF-documentos-legales.zip

## Añadidos
- `proxy.conf.cjs`: proxy local al BFF en localhost:8081, elimina /web.
- `docs/CAMBIOS-PROXY-LOCAL.md`: relación de cambios e instrucciones.

## Modificados
- `angular.json`: activa proxyConfig en serve.
- `src/app/core/config/api.config.ts`: baseUrl relativa /web, useMocks sigue false.
- `docs/BFF-integracion.md`: instrucciones de proxy local y gateway en nube.

## Eliminados
Ninguno.

## Ejecución
BFF: uvicorn app.main:app --reload --port 8081
Frontend: npm ci y npm start. Reiniciar npm start tras modificar el proxy.
El gateway en nube debe enrutar /web al BFF y eliminar ese prefijo.
No se cambian contratos, pantallas, validaciones ni autenticación.
