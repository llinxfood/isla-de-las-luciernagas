# Contexto para futuras ampliaciones

Actualizado el 3 de octubre de 2026. La usuaria considera terminada la primera versión. Esta nota conserva el contexto; antes de trabajar, comprobar Git y el código porque pueden haber cambiado.

## Proyecto y colaboración

- Juego: **La isla de las luciérnagas**, para aprender las tablas del 1 al 10, dirigido a niñas y niños de 7–9 años. Prioridad: tablet, móvil y desktop, en ese orden.
- María es desarrolladora senior y Team Leader de Ingeniería. Prefiere trabajo autónomo, decisiones razonadas y comunicación breve en castellano; no necesita explicaciones básicas ni consultas constantes.
- Repositorio: https://github.com/llinxfood/isla-de-las-luciernagas. Rama de publicación: `main`.
- Web: https://llinxfood.github.io/isla-de-las-luciernagas/.
- Última versión revisada: `95a6ee3`, con los cambios de Claude incorporados y el despliegue de GitHub Actions correcto.
- Su hija ya juega y tenía su partida en otro dispositivo. **Preservar ese progreso es prioritario en cualquier cambio.** No asumir acceso a ese navegador ni afirmar que su partida se ha modificado remotamente sin comprobarlo.

## Producto terminado

- Diez refugios y amigos, con tablas en orden `1, 2, 10, 5, 3, 4, 6, 7, 8, 9`.
- Expediciones de 24 retos en tres tramos de ocho: semillas, puente y luces. Descansos, ayudas tras errores y elección de decoración al completar el refugio.
- Aprendizaje adaptativo por operación individual: aciertos, errores, práctica, ayudas, tiempo, recencia y próxima revisión. Evitar sustituirlo por preguntas aleatorias o equiparar amigos desbloqueados con dominio de las tablas.
- Interfaz bilingüe: castellano por defecto e inglés opcional. Textos en `src/i18n.tsx`; contenido de refugios en `src/content.ts`.
- Apodo opcional de hasta 20 caracteres, sonido activado inicialmente y opciones para desactivar sonido y movimiento.
- Gestión de cuenta en Ajustes y una invitación inicial que se puede cerrar. Vista previa para compartir en redes sociales.

## Arquitectura y persistencia

- React, TypeScript y Vite; Node 24 y pnpm 12.8.1. GitHub Pages con recursos relativos y despliegue automático mediante `.github/workflows/pages.yml`.
- Dominio independiente de React en `src/core/`; componentes en `src/components/`; integración de cuentas en `src/cloud/`.
- Se puede jugar sin cuenta. El guardado histórico es `luciernagas.progress.v1`, esquema `version: 1`, con campo opcional `name`.
- Firebase Authentication con correo y contraseña y Firestore para continuar desde cualquier dispositivo. Esta decisión posterior sustituye el requisito inicial de almacenamiento exclusivamente local: Firebase está autorizado; no añadir publicidad, analítica ni otros servicios externos.
- Proyecto Firebase: `la-isla-de-las-luciernagas`, número `644568022414`. Firestore `(default)`, Standard, `europe-west1`, con protección contra borrado, confirmado por API al revisar esta versión.
- Configuración web pública en `src/cloud/config.json`; no guardar tokens ni credenciales privadas en documentación o código.
- El SDK se carga al iniciar sesión o recuperar una sesión existente. Sin cuenta no se carga Firebase ni se envía el progreso.
- Documento remoto `players/{uid}` con partida serializada, revisión y fecha de actualización. Reglas en `firestore.rules` limitan el acceso al propietario.
- Copias locales separadas por cuenta (`luciernagas.account.{uid}.*`). Revisiones y transacciones detectan conflictos; se conservan ambas alternativas antes de elegir. La partida invitada se conserva al entrar y salir.
- Copias JSON exportables/importables y copia previa a restaurar. Los formatos desconocidos permanecen intactos; no solucionar incompatibilidades borrando datos ni cambiando la clave. Cambios de esquema requieren migración y fixtures históricos.
- Recuperación manual de Luma, Pipo, Coral y Mora: **Ajustes → Para acompañantes → Recuperar cuatro amigos sin copia**. Conserva historial, ajustes y expedición; no inventa aciertos ni luces. Se aplica en el dispositivo elegido, no a todos los jugadores al desplegar.

## Validación y continuación

- Última revisión: 35 tests unitarios, 16 recorridos Playwright en móvil y tablet, lint y build correctos. Esa revisión no volvió a probar registro real ni sincronización entre dos dispositivos contra Firebase de producción.
- Ejecutar `npm test` tras cambios JavaScript o TypeScript relevantes; lint y build antes de publicar. Validar con navegador cuando cambie la experiencia táctil. Los acuerdos completos están en `AGENTS.md`.
- Pedir confirmación antes de añadir dependencias de producción. Firebase, React y React DOM ya están autorizados.
- Mantener README en castellano y añadir los nuevos textos visibles a ambos idiomas.
- Ampliación solicitada el 3 de octubre: límite diario opcional de 5–120 minutos, con PIN para ajustes de acompañante, aviso al quedar un minuto y cierre de descanso conservando la expedición. Cuenta retos y elección de premio; pausa en Ajustes, descansos, navegación y pestaña oculta. Campo opcional `playTime` en v1; las partidas antiguas siguen sin límite. Configuración y consumo se sincronizan con la cuenta, con escrituras agrupadas en ventanas de cinco segundos.
- El PIN tiene hash PBKDF2 con sal. Es un límite dentro del juego: puede evitarse usando otra cuenta, borrando datos o jugando desconectado en varios dispositivos; no presentarlo como control parental del sistema.
- Validación de la ampliación: 43 tests de lógica; los recorridos de navegador cubren configuración, PIN, pausa, agotamiento, recarga y renovación diaria. Los 20 recorridos de móvil y tablet, lint, formato y build pasan. Con PIN, la gestión de cuenta también queda tras el acceso de acompañante.
