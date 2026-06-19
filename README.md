# Bottle Bloom

Sistema ecológico inteligente para clasificar, reutilizar y transformar botellas PET en EcoBottles con biofertilizantes. El proyecto combina una experiencia web interactiva, generación de QR, dashboard ambiental, gamificación con EcoCoins y una simulación de trazabilidad tipo blockchain para presentar el flujo completo de la solución.

> Estado actual: prototipo web/demo interactiva. La clasificación IA y el registro Blockchain Flow están representados como simulaciones locales para explicar el concepto y validar la experiencia de usuario.

## Resumen

Bottle Bloom nace para reducir el desperdicio de botellas PET dentro del campus ZooBotánica de Eight Academy. La propuesta convierte el reciclaje en una experiencia educativa, visual y medible: cada botella escaneada recibe una clasificación, suma impacto ecológico, genera EcoCoins y puede obtener un pasaporte QR.

## Problema

En muchas instituciones educativas se generan grandes cantidades de residuos plásticos, especialmente botellas PET. Aunque existen campañas de reciclaje, muchas no logran mantener la participación estudiantil porque no integran tecnología, trazabilidad ni retroalimentación inmediata.

Esto provoca tres retos principales:

- acumulación de residuos plásticos,
- baja reutilización de materiales con potencial ecológico,
- poca visibilidad del impacto ambiental generado por cada estudiante.

## Solución

Bottle Bloom propone una estación ecológica inteligente que guía el proceso desde el depósito de una botella hasta su transformación en una EcoBottle con biofertilizante.

La solución contempla:

- escaneo de la botella mediante una interfaz web,
- clasificación en tres categorías ambientales,
- generación de un pasaporte QR,
- registro de trazabilidad simulado,
- dashboard con métricas ecológicas,
- recompensas con EcoCoins para motivar la participación.

## Clasificación

| Categoría | Descripción | Recompensa |
| --- | --- | --- |
| Reutilizable | Botella en buen estado, apta para limpieza ecológica y transformación en EcoBottle. | +50 EcoCoins |
| Reciclaje industrial | Botella deformada o dañada, destinada a reciclaje especializado. | +25 EcoCoins |
| Descarte contaminado | Botella con contaminación alta, requiere disposición especial. | +10 EcoCoins |

## Flujo de uso

1. El estudiante deposita o presenta una botella PET.
2. La interfaz permite simular el análisis o cargar una imagen.
3. El sistema muestra una clasificación ambiental.
4. La botella recibe EcoCoins según su categoría.
5. Se genera un pasaporte ecológico en QR.
6. Se simula un registro de trazabilidad tipo blockchain.
7. El dashboard muestra impacto, ranking y registros recientes.

## Funcionalidades

- Landing page del proyecto.
- Escáner demo de botellas PET.
- Carga de imagen o uso de cámara del dispositivo.
- Clasificación visual: reutilizable, reciclaje industrial o descarte contaminado.
- Generación y descarga de QR.
- Registro blockchain simulado en navegador.
- Dashboard ecológico con métricas, gráficas y ranking.
- Historial local usando `localStorage`.
- Gamificación con EcoCoins y logros.

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Chart.js
- qrcode.js
- Figma
- Canva
- GitHub

Tecnologías proyectadas para una versión completa:

- modelo de visión artificial real,
- Firebase o base de datos en la nube,
- integración real con Flow Blockchain,
- backend para usuarios, registros e historial persistente.

## Estructura del proyecto

```text
BOTTLE-BLOOM/
├── index.html          # Página principal
├── scanner.html        # Escáner demo y generación de QR
├── dashboard.html      # Métricas ecológicas y gamificación
├── css/
│   └── style.css       # Estilos globales
├── js/
│   ├── app.js          # Funciones globales y estadísticas
│   ├── scanner.js      # Lógica del escáner demo
│   └── dashboard.js    # Gráficas, ranking y registros
├── README.md
└── assets visuales     # Logos, prototipos, manual visual y mockups
```

## Cómo ejecutar

Este proyecto es una web estática. No requiere instalación.

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.
3. Entra a `scanner.html` para probar el flujo de escaneo.
4. Entra a `dashboard.html` para revisar las métricas.

Para una mejor experiencia, usa un navegador moderno. La cámara puede requerir HTTPS o ejecución desde un entorno local compatible.

## Modo demo

La versión actual está pensada para presentación y validación del concepto. Por eso:

- la clasificación se genera mediante una simulación ponderada,
- el hash blockchain se crea localmente como demostración,
- los datos se guardan en `localStorage` del navegador,
- las métricas base son datos de ejemplo para mostrar el potencial del dashboard.

Esta decisión permite explicar el producto completo sin depender todavía de hardware, backend, modelo IA o red blockchain real.

## Impacto esperado

Bottle Bloom contribuye al ODS 13: Acción por el Clima, promoviendo:

- reducción de residuos plásticos,
- educación ambiental activa,
- economía circular,
- cultura de reutilización,
- medición del impacto ecológico escolar.

## Próximos pasos

- Conectar un modelo real de visión artificial para analizar botellas PET.
- Crear una base de datos en la nube para usuarios, botellas y recompensas.
- Integrar transacciones reales con Flow Blockchain.
- Diseñar el flujo físico de limpieza y llenado con biofertilizante.
- Crear perfiles de estudiantes y ranking por cursos.
- Publicar la demo en GitHub Pages.

## Equipo

| Integrante | Rol |
| --- | --- |
| Pamela Rubio | Líder |
| Emily Orozco | Secretaria |
| Thomas Hermida | Expositor |
| Emanuel Gerardo | Diseñador |
| Juan Diego Moreno | Investigador |
| Anita Parreño | Mentora |

## Entregable 3

### MVP Web
[Abrir Plataforma WOLVES](https://alparrenob-ship-it.github.io/LOS-WOLVES/)

### Video Demo
[Ver Video Demo WOLVES](https://www.youtube.com/shorts/YNOrElG3D5c?feature=share)

### Pitch Deck



### Whitepaper



### Infografía


## Créditos

Proyecto desarrollado para Eight Academy, campus ZooBotánica, como propuesta de innovación ambiental, educación sostenible y tecnología aplicada al reciclaje PET.
