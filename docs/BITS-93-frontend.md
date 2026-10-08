# BITS-93 · Frontend web de Solventa

Implementado sobre el ZIP original de `fe-web` (Angular 21, componentes standalone, SCSS).
La aplicación comienza en **Cuenta**, ruta `/cuenta`; sin sesión muestra «Entra a tu cuenta» y el enlace «Crear mi cuenta». La precotización sigue disponible en `/precotizacion/resultado`.
La referencia principal es la HU adjunta «Registrar la cuenta con identidad y consentimientos en un solo paso».

## Ejecutar en Windows

Usar una versión de Node compatible con Angular 21; esta entrega se comprobó con Node 24.
Abrir una terminal en la carpeta `fe-web` y ejecutar:

```powershell
npm ci
npm start
```

Abrir http://localhost:4200. La raíz redirige a `/cuenta`; el logo vuelve a `/cuenta`.

Si ya tienes el repositorio en tu equipo, crea o utiliza tu rama feature y copia los archivos nuevos de `src/app/core`, `src/app/features`, `src/app/shared`, `public/assets`, `e2e/registro.spec.ts` y `docs`. Reemplaza los cuatro archivos de configuración funcional existentes `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/index.html` y `src/styles.scss`. Los archivos base `app.html`, `app.ts`, `app.spec.ts`, `main.ts` y `e2e/app.spec.ts` solo se normalizaron con Prettier para que pase el control de formato; pueden copiarse también. No copies una carpeta `.git` entre repositorios. El ZIP de entrega no incluye `.git`, `node_modules` ni `dist`.

## Recorrido disponible

1. Resultado de precotización con el saldo de referencia de 320.000.000 COP y el precio ilustrativo de 57.100 COP del prototipo.
2. «Crear mi cuenta» abre el formulario único de identidad y permisos.
3. Las validaciones marcan campos inválidos y permiten corregir sin perder lo ingresado.
4. Términos y tratamiento de datos personales son obligatorios. La consulta financiera es opcional. Los permisos empiezan desmarcados; las cajas de texto empiezan vacías y no contienen placeholders.
5. Cada enlace de permiso abre su modal original, con Escape, cierre, foco y aceptación explícita. Los enlaces del footer solo muestran información; no otorgan permisos.
6. Un registro exitoso muestra «Confirma tu correo»; «Ir a mi cuenta» permite acceder al Home sin cotizaciones. No llama al servicio de cotización.
7. Desde el Home puede consultarse la información de confirmación de correo. La confirmación no bloquea el Home ni la acción de cotizar.
8. El menú del Home muestra accesos a la cuenta y al correo.

Los botones de cotización muestran el límite de esta implementación: BITS-95/BITS-219 se implementarán por separado. No se simula una cotización definitiva ni se implementa el backend.

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Redirige a cuenta |
| `/precotizacion/resultado` | 02 · Precotización resultado |
| `/crear-cuenta` | Registro BITS-93 |
| `/cuenta` | Home sin seguros ni cotizaciones |
| `/confirmar-correo` | Información del correo y solicitud de reenvío |
| `/confirmar-correo?token=demo-valid` | Confirmación mock válida |
| `/confirmar-correo?token=expired` | Enlace mock expirado |
| `/confirmar-correo?token=incorrect` | Enlace mock inválido |

## Archivos y responsabilidades

| Carpeta o archivo | Responsabilidad |
|---|---|
| `src/app/core/config/api.config.ts` | Selección mock/HTTP y URL base del BFF |
| `src/app/core/services/session.service.ts` | Estado de presentación de la cuenta y saldo referencial, en memoria |
| `src/app/features/precotizacion/pages/resultado/` | Página inicial; TS, HTML y SCSS separados |
| `src/app/features/registro/models/registro.model.ts` | Modelo de presentación y códigos de error |
| `src/app/features/registro/services/registro.gateway.ts` | Interfaz que consume el formulario |
| `src/app/features/registro/services/registro-mock.service.ts` | Respuestas locales para desarrollar sin backend |
| `src/app/features/registro/services/registro-http.service.ts` | Adaptador HttpClient para bff-web |
| `src/app/features/registro/pages/crear-cuenta/` | Formulario, permisos, validaciones, envío y errores |
| `src/app/features/registro/pages/confirmar-correo/` | Confirmación y reenvío vía gateway |
| `src/app/features/cuenta/pages/home/` | Home accesible desde «Ir a mi cuenta» |
| `src/app/shared/components/site-shell/` | Encabezado, navegación, accesibilidad y footer |
| `src/app/shared/components/permission-dialog/` | Modal reutilizable y textos extraídos del prototipo |
| `public/assets/fonts/` | Tipografías locales Plus Jakarta Sans y Dancing Script |
| `public/assets/icons/` | Exportaciones SVG originales de Figma |
| `e2e/registro.spec.ts` | Pruebas Playwright del recorrido y escenarios negativos |
| Archivos `.spec.ts` del registro | Pruebas del formulario, adaptadores y permisos |

No se modificaron Docker, nginx, CI/CD, Sonar, dependencias ni configuraciones base de pruebas.

## Comunicación con el BFF

Esta revisión usa HTTP por defecto (`useMocks: false`). Ver `BFF-integracion.md` para URL, políticas, DTO, sesión y límites de confirmación. El contrato recibido se incluye en `bff-web-openapi.json`. El mock dentro de Angular sigue disponible con `useMocks: true`; no es el BFF local. Los tokens se conservan solo en memoria.

## Casos mock para probar

Activar `useMocks: true` en `api.config.ts`. Completar los demás campos válidos, aceptar los dos permisos obligatorios y usar estos datos:

| Caso | Correo / documento |
|---|---|
| Éxito | `martin@example.com` y documento `123456789` |
| Correo ya registrado | `sofia.pedraza@correo.com` |
| Documento ya registrado | `1018456723` con un correo nuevo |
| Correo desechable | `test@mailinator.com` |
| Servicio no disponible | `error@solventa.test` |

Fecha de nacimiento: `02/08/1985`; celular: `3001234567`; contraseña demo: `ClaveDemo123`.
El documento se ingresa sin puntos y el celular sin espacios; no hay ejemplos ni instrucciones como placeholders en las cajas de texto. Se admite fecha válida en `dd/mm/aaaa`, no futura, desde 1900. CC: 4–10 dígitos con puntos visuales; CE/PA: 4–16 alfanuméricos sin separadores. Celular: 7–12 dígitos. Contraseña: 10–128 caracteres. Hay calendario y entrada manual de fecha. Reglas compatibles con OpenAPI; ver BFF-integracion.md.
El mock detecta registros repetidos durante la misma sesión de la aplicación. No persiste identidad ni contraseñas. Al recargar se reinicia el estado demo.
El mock no envía emails, no crea clientes reales, no publica eventos ni aplica cifrado o tokenización.

## Correspondencia con criterios de aceptación

| Criterio | Parte frontend disponible | Dependencia real |
|---|---|---|
| AC-1 | Formulario único; saldo como referencia; Aviso de correo tras éxito y acceso al Home | Creación activa y sesión en BFF/Core/IdP |
| AC-2 | Home sin cotizaciones; email no bloquea acceso | Email asíncrono y sesión real |
| AC-3 | Consume confirmación; pantalla de éxito | Validación del token en IdP; inicio de sesión y bloqueo de formalización en su historia |
| AC-4 | Error de expiración y solicitud de reenvío cuando hay cuenta en memoria | Recuperación sin sesión y TTL de 24 h en IdP; no hay generación local de tokens |
| AC-5 | Señala campo en conflicto y conserva formulario | Unicidad en servidor |
| AC-6 | No persiste PII en almacenamiento del navegador | Cifrado y tokenización en servidor |
| AC-7 | Presenta error de correo desechable; mock de dominios ilustrativos | Validación autoritativa y catálogo en servidor |
| AC-8 | Envía permisos sin esperar perfil de riesgo | Registro auditable del consentimiento y publicación de evento en Core |
| AC-9 | Permite registro sin consulta financiera y comunica el efecto | Cotización con datos aportados en BITS-95/BITS-219 |

Esta entrega cubre el frontend inicial de BITS-93; no permite declarar aceptada la HU completa sin las dependencias de backend y las historias relacionadas.

## Ajustes respecto a Figma

Se recrean HTML y SCSS Angular editables; no se usa una captura como fondo. Diseño de escritorio en dos columnas y adaptación responsiva. Tipografías y SVG locales, sin URLs temporales. Hay capturas de la implementación en `docs/previews`.
Se ajustaron mensajes que prometían cotización automática o condicionaban el acceso a confirmar correo, para respetar AC-2/AC-3. Se preservan los textos de los modales del prototipo: deben confirmarse con BITS-94 antes de integrarlos como contenido definitivo. Los permisos desmarcados y campos vacíos son estados iniciales interactivos deliberados.

## Validación

```powershell
npm run build
npm run lint
npm test -- --watch=false
npx playwright install chromium
npm run e2e
```

Resultados de la entrega anterior (antes de la integración HTTP): build de producción, lint, 34 pruebas unitarias y 8 pruebas web. Cobertura del conjunto instrumentado por el runner: statements 96,79 %, branches 97,84 %, functions 87,50 %, lines 99,13 %, superior al umbral configurado de 80 %. La medición no sustituye las pruebas de backend o seguridad de la HU.
Se verificaron resultado y registro a 1440 px de ancho y ausencia de desbordamiento horizontal a 390 px.

## Información necesaria para integración final

- BITS-94: alcance de consentimientos Open Finance/Open Data, versiones de textos, obligatoriedad y trazabilidad.
- Contrato OpenAPI del BFF y mecanismo de sesión/IdP: DTO, rutas, errores, reenvío sin sesión, expiración y confirmación.
- BITS-95/BITS-219 cuando se implemente la acción «Cotizar mi seguro».
- BITS-101 al formalizar: exige correo confirmado; no debe bloquear el registro o el Home.

## Documentos legales del BFF

Los tres modales usan GET /v1/documentos-legales (CO, es-CO). Las versiones enviadas corresponden a los documentos cargados. Una carga fallida bloquea el envío y permite reintentar. policies.ts conserva solo etiquetas y acciones de interfaz; los textos de ejemplo están separados en documentos-legales.fixture.ts para modo mock y pruebas.
