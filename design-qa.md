# QA visual — prototipo de login

final result: passed

Referencia: imagen adjunta image(20261009-051300).png, 959 × 617 px. Se excluyó el marco gris de Figma y el título externo: recorte (15,27)–(935,602), 920 × 575 px, normalizado a 1440 × 900 px.
Implementación: docs/previews/login-desktop.png, viewport CSS 1440 × 900, deviceScaleFactor 1. Estado: login inicial, campos vacíos según la preferencia del usuario, sin autenticación implementada.
Comparación conjunta: /workspace/scratch/4c782aa56c09/outputs/login-comparison.png (referencia e implementación alineadas).
Móvil: docs/previews/login-mobile.png, viewport CSS 390 × 844.

## Historial y hallazgos

- Primera captura: márgenes del encabezado/pie más estrechos que la referencia y enlace de recuperación atenuado por el estilo global de controles deshabilitados (P2).
- Corrección: márgenes de 48 px en escritorio exclusivamente en el login, y opacidad explícita para conservar el color del enlace deshabilitado.
- Móvil: se corrigió el salto de línea de ES · CO con ancho flexible de marca y white-space: nowrap; captura posterior sin desbordamiento.
- Segunda captura comparada con la referencia: composición central, tarjeta blanca, campos, espaciado, encabezado y pie alineados. Sin hallazgos P0/P1/P2 pendientes.

## Superficies evaluadas

- Tipografía: Plus Jakarta Sans local y Dancing Script existente para la marca; jerarquía y tamaños comparados con el diseño.
- Espaciado: tarjeta de 660 px, controles de 56 px y diseño centrado; adaptación móvil sin desbordamiento horizontal.
- Color: fondo claro y color teal del proyecto. Sin sombras añadidas.
- Recursos: se reutiliza la marca existente; la referencia no incorpora fotografías ni ilustraciones nuevas.
- Texto: mismos títulos y acciones; campos deliberadamente vacíos. Ingresar y recuperación deshabilitados porque el usuario solicita solo el prototipo. Crear cuenta nueva funciona.

## Verificación de interacción

Playwright: inicio redirige a /ingreso; Crear cuenta nueva abre /crear-cuenta; logo regresa a /ingreso; /cuenta redirige al login incluso después del registro; no aparece Ir a mi cuenta en la pantalla de correo. Se comprobó ausencia de errores JavaScript durante el recorrido de login y ausencia de desbordamiento móvil. Navegador Chromium local; no se publicó ni desplegó el proyecto.

## Diferencias aceptadas

Los ejemplos de correo/contraseña del diseño no se precargan. La autenticación y recuperación siguen pendientes. Posibles diferencias menores de antialiasing provienen de comparar una captura de Figma escalada con renderizado real.
