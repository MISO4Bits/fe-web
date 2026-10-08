# Ajuste de mínimos al contrato BFF

El contrato del BFF tiene prioridad. Propuestas de UI y validación adicionales solo se aplican si son compatibles con él.

| Campo | Mínimo | Máximo de frontend |
|---|---|---|
| Cédula de ciudadanía | 4 dígitos | 10 dígitos |
| Cédula de extranjería | 4 alfanuméricos | 16 alfanuméricos |
| Pasaporte | 4 alfanuméricos | 16 alfanuméricos |
| Celular | 7 dígitos | 12 dígitos |

Los máximos de frontend son más restrictivos que los del contrato (documento 20, teléfono 15), por lo que los valores admitidos respetan sus límites. Se conserva la máscara de cédula y el envío sin puntos, el calendario, las cajas vacías, las validaciones de correo y la comunicación HTTP.

## Modificados respecto a fe-web-BITS-93-BFF-formulario.zip

- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.html`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.spec.ts`
- `src/app/features/registro/pages/crear-cuenta/crear-cuenta.ts`
- `docs/BFF-integracion.md`
- `docs/BITS-93-frontend.md`
- `docs/CAMBIOS-FORMULARIO.md`

## Agregado

- `docs/CAMBIOS-CONTRATO.md`

## Eliminados

Ninguno.

Copiar únicamente los archivos listados, conservar api.config.ts con tu URL, los tsconfig, .git y node_modules locales. No se agregan dependencias.

Validación de esta revisión: compilación y lint correctos; 42 pruebas unitarias aprobadas, incluidos límites de documentos y celular.
