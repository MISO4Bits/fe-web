# Ajustes del formulario BITS-93

Comparación con fe-web-BITS-93-BFF.zip.

## Agregados

- `docs/CAMBIOS-FORMULARIO.md`

## Modificados

- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.html`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.scss`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts`
- `e2e/registro.spec.ts`
- `docs/BFF-integracion.md`
- `docs/BITS-93-frontend.md`

## Eliminados

Ninguno.

## Comportamiento

- Todas las cajas de texto inicialmente vacías, sin ejemplos ni placeholders.
- Tipo de documento con nombres completos; códigos CC/CE/PA conservados para el BFF.
- Cédula: 4–10 dígitos, puntos solo visuales, petición HTTP sin puntos.
- Cédula de extranjería y pasaporte: 4–16 letras/números, sin máscara ni caracteres especiales. Cambiar de tipo vacía el número para evitar reinterpretarlo.
- Filtro de caracteres al digitar/pegar en documento y celular, más validación antes del envío.
- Fecha digitada dd/mm/aaaa o elegida en calendario nativo. Envío YYYY-MM-DD. Fechas válidas desde 1900, no futuras.
- Celular: obligatorio, 7–12 dígitos.
- Correo: alfanuméricos y puntos, una arroba, dominio con punto; no se aceptan segmentos vacíos, puntos consecutivos, +, guiones ni guiones bajos.
- Nombres/apellidos: letras (incluidos acentos) y espacios, máximo 60, no solo espacios. Contraseña conserva 10–128 caracteres.
- Mensajes de error debajo de cada campo, sin invadir columnas vecinas.

## Integración y seguridad

El contrato BFF tiene prioridad: documentos de mínimo 4 caracteres y teléfono de mínimo 7 dígitos. Esta revisión ya aplica esos mínimos, conservando los máximos solicitados dentro de los límites del contrato. OpenAPI se conserva tal como fue entregado.

La validación del navegador no protege por sí sola la base de datos. El backend debe repetir las validaciones y usar consultas parametrizadas.

La comunicación HTTP permanece activa. Conservar tu api.config.ts si ya ajustaste URL/puerto o políticas.

## Copiar y probar

Extraer en otra carpeta y reemplazar solo los archivos listados. No reemplazar .git, node_modules, tsconfig ni configuraciones locales. No se agregaron dependencias. Ejecutar npm run build y npm start.

Validado: build, lint, formato; 42 pruebas unitarias y 11 E2E aprobadas. Cobertura: statements 94,60 %, branches 89,04 %, functions 80,88 %, lines 97,38 %. Las pruebas HTTP usan respuestas controladas; falta probar contra el BFF del equipo.
