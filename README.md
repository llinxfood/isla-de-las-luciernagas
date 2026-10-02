# La isla de las luciérnagas

Una aventura en castellano para practicar las tablas del 1 al 10. La niña da vida a diez refugios, descubre a sus habitantes y elige cómo decorarlos. Pensada para 7–9 años y para jugar con los dedos en una tablet.

**React + TypeScript + Vite. Sin backend, cuentas, anuncios, analítica ni recursos de terceros en tiempo de ejecución.** La partida y los ajustes permanecen en el navegador del dispositivo.

## Jugar

1. Pulsa **¡Vamos a explorar!** en la isla.
2. Completa tres tramos de ocho retos: sembrar, construir el puente y encender el refugio.
3. Los dos primeros retos permiten construir la multiplicación: toca las parcelas y observa cómo crece el total. Después el apoyo es opcional. El último tramo requiere escribir la respuesta.
4. Un error abre las semillas para ayudar a entender el resultado. Se puede intentar de nuevo sin perder luces.
5. Al terminar, elige flores, setas o cristales. La decoración aparece en la isla y se descubre un amigo al que puedes visitar.

Cada expedición contiene 24 retos y dos descansos. El objetivo de duración es de 5–10 minutos, pero depende del ritmo y **no se impone un tiempo mínimo ni máximo**. Se puede salir y continuar incluso después de cerrar el navegador.

## Requisitos e instalación

- Node.js 24 o superior.
- pnpm 12.8.1, fijado en `packageManager`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Si no quieres activar los ejecutables de Corepack globalmente, utiliza `corepack pnpm` en lugar de `pnpm`. El servidor muestra su URL local, normalmente `http://127.0.0.1:5173`.

Para probar desde una tablet en la misma red:

```sh
pnpm dev --host 0.0.0.0
```

Abre en la tablet la dirección de red que muestra Vite. Cada navegador conserva una partida independiente.

## Validación

```sh
npm test
pnpm lint
pnpm build
pnpm test:e2e
```

- **Vitest:** preguntas de las cien operaciones, prioridad adaptativa, repaso espaciado, errores y ayudas, puntuación, descansos, desbloqueos, recorrido de las diez tablas y persistencia.
- **ESLint:** TypeScript y reglas de Hooks. No se utiliza React Compiler.
- **TypeScript:** comprobación estricta antes de construir.
- **Playwright:** recorrido completo en Chromium con perfiles táctiles de tablet y móvil, ayudas, error deliberado, recarga a mitad de partida, descanso, recompensa, desbloqueo, ajustes y ausencia de peticiones externas. También comprueba que no haya desbordamiento horizontal.

En desarrollo, Playwright utiliza Google Chrome instalado. En CI descarga Chromium. Para usar Chromium también localmente:

```sh
pnpm exec playwright install chromium
CI=1 pnpm test:e2e
```

Las pruebas de navegador requieren ejecutar primero `pnpm build`. Sirven el resultado de producción bajo **`/aventura/`**, para comprobar una subruta real. Guardan capturas y trazas de fallos en `test-results/`.

La emulación táctil no sustituye una prueba física de Safari/iPadOS ni una sesión con niñas. La duración, el interés sostenido y el aprendizaje real todavía necesitan validación con usuarias.

## Build y vista previa

```sh
pnpm build
pnpm preview
```

El resultado está en `dist/`. `base: './'` genera referencias relativas para los recursos, incluido el favicon. La navegación usa estado local, sin rutas de servidor; las recargas funcionan desde `https://usuario.github.io/nombre-del-repositorio/`.

## GitHub Pages

El flujo `.github/workflows/pages.yml` valida cada pull request. En un push a `main` o `master`, o al ejecutarlo manualmente, valida, construye y publica `dist/` mediante el entorno `github-pages`. No requiere secretos propios.

Configuración inicial del repositorio:

1. Crea un repositorio público, por ejemplo `isla-de-las-luciernagas`.
2. Conecta este directorio al remoto y sube la rama principal.
3. En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**.
4. Consulta la ejecución **Validación y GitHub Pages**. El trabajo de despliegue muestra la URL publicada.

Si se cambia la rama principal, hay que actualizar el disparador del workflow. El despliegue no corre en pull requests. Las validaciones tienen permisos de lectura; solo el trabajo de publicación recibe `pages: write` e `id-token: write`.

## Arquitectura

```text
src/
  core/
    model.ts          Tipos, orden de tablas y reglas de desbloqueo
    learning.ts       Prioridad, selección, respuestas y actualización del aprendizaje
    game.ts           Transiciones de la expedición y recompensas
    storage.ts        Guardado protegido, validación y copias portables
    core.test.ts      Pruebas del dominio
    backup.test.ts    Compatibilidad y restauración sin pérdidas
  components/
    Artwork.tsx       Isla, habitantes y decoraciones SVG locales
    Challenge.tsx     Reto, parcelas táctiles, ayudas y tiempo activo
    BackupPanel.tsx   Descarga, revisión e importación de partidas
  content.ts          Refugios, personajes, tramos y textos compartidos
  App.tsx             Navegación, expedición, colección, ajustes y guardado
  main.tsx
  styles.css
tests/
  adventure.spec.ts   Recorridos completos sobre el build
```

El dominio no depende de React, del DOM ni de `localStorage`. El reloj y la fuente de aleatoriedad se pueden inyectar para probar la selección. La UI envía acciones al reductor y guarda los cambios; las transiciones inválidas no modifican la partida.

Las únicas dependencias de producción son React y React DOM. Los gráficos son SVG propios, las fuentes son del sistema y los sonidos se generan con Web Audio. No se descargan imágenes, fuentes ni audio.

## Aprendizaje adaptativo

### Datos por operación

Se conservan por separado las cien operaciones ordenadas (`7x8` y `8x7` tienen registros independientes):

- Retos terminados (`attempts`).
- Retos sin respuestas erróneas (`correct`) y retos con algún error (`errors`).
- Retos con apoyo (`hints`), incluido el descubrimiento guiado inicial.
- Media móvil del tiempo aproximado, última práctica y próxima fecha de repaso.
- Nivel de consolidación entre 0 y 4.

Un reto con varios fallos cuenta como **un reto con error**, para que tocar repetidamente la pantalla no domine la estadística. El detalle de errores del reto activo sí se conserva. El registro se actualiza al resolverlo. El tiempo se redondea a milisegundos enteros y se limita a dos minutos para reducir el efecto de interrupciones; se excluye el tiempo de pestaña oculta. Al abandonar la pantalla o recargar, el reloj de ese reto vuelve a empezar, por lo que es una señal aproximada.

### Selección

`priority()` combina:

- Si el repaso ya ha vencido.
- Nivel bajo de consolidación.
- Proporción de errores.
- Respuestas lentas.
- Pocas ocasiones de práctica.

Las operaciones nuevas tienen un peso inicial de 6. La selección es aleatoria ponderada: una operación difícil aparece más, pero no ocupa toda la sesión. No se repiten las tres operaciones inmediatamente anteriores. Cada cuarto reto puede recuperar un error anterior que ya esté suficientemente separado; en otros turnos se intercalan repasos de tablas previamente desbloqueadas. El resto trabaja la tabla elegida.

### Consolidación y recencia

Una respuesta sin errores, sin ayuda y en aproximadamente 20 segundos puede aumentar el nivel **solo si ha llegado la fecha de repaso**. Los intervalos son 6 horas, 1 día, 3 días y 7 días. Repetir rápido dentro de la misma sesión no produce dominio artificial.

Los aciertos con apoyo no aumentan el nivel ni borran conocimientos anteriores, pero dejan pendiente un repaso. Los errores bajan un nivel y dejan la operación disponible para volver a practicar. Las respuestas lentas aumentan el peso de selección; no restan recompensas. Se consideran afianzadas las operaciones en nivel 3 o 4. Este dato está en el panel para acompañantes, no en la pantalla de juego.

Los pesos, intervalos y umbral de tiempo están concentrados en `learning.ts`. Son heurísticas iniciales, no una evaluación clínica ni una garantía de memorización.

## Progresión y propósito de las recompensas

- Orden: **1, 2, 10, 5, 3, 4, 6, 7, 8, 9**. Empieza por patrones fáciles de reconocer.
- Cada reto resuelto aporta una luz, aunque haya hecho falta ayuda.
- Completar la expedición y colocar la decoración desbloquea el siguiente refugio.
- Los amigos guardan una pequeña historia relacionada con su tabla.
- Se puede volver a cualquier refugio abierto y cambiar su decoración mediante otra expedición.
- El último refugio no termina la práctica: todas las tablas siguen disponibles.

El mapa responde a lo aprendido mediante el progreso de la aventura. El desbloqueo expresa exploración, **no dominio matemático**. No hay rachas diarias obligatorias, vidas, clasificaciones ni premios que se pierdan por no volver. Las decoraciones ofrecen una elección pequeña y un cambio permanente visible.

## Persistencia, privacidad y accesibilidad

- Clave de guardado: `luciernagas.progress.v1`.
- Se guarda cada transición, también los errores, las ayudas y los descansos.
- El lector valida estructuras, tipos, contadores, preguntas y fases. Una partida desconocida o dañada permanece intacta en su clave original: se bloquea la escritura automática y se ofrece descargarla para recuperarla.
- Antes de cada cambio de guardado se conserva el estado válido anterior en `luciernagas.progress.v1.backup`. Recargar sin cambios no reemplaza esa copia. Si falla la copia previa, no se escribe la principal.
- Si el navegador bloquea el almacenamiento o se agota la cuota, muestra un aviso y permite seguir jugando en memoria.
- No hay sincronización entre pestañas o dispositivos. Conviene usar una sola pestaña para la partida; dos abiertas pueden sobrescribir el progreso local.
- No se envían respuestas, tiempos ni progreso. GitHub Pages recibe las peticiones normales de archivos estáticos; la aplicación no hace peticiones de datos ni utiliza rastreadores.
- Borrar los datos del navegador elimina el progreso. No se solicitan nombres, edad u otros datos personales.
- Botones grandes, navegación por teclado, foco visible, mensajes de estado y ayudas con símbolos y texto.
- El diálogo de ajustes atrapa el foco y se cierra con Escape. Se respeta `prefers-reduced-motion`, además del interruptor propio de animaciones. Sonido desactivado inicialmente.

## Conservar y trasladar la partida

En **Ajustes → Para acompañantes → Copia de tu aventura**:

1. **Descargar copia** guarda un archivo JSON con toda la partida: operaciones, recompensas, ajustes y expedición en curso. Conserva ese archivo fuera del navegador.
2. **Abrir una copia** permite seleccionar ese archivo desde el mismo dispositivo o desde otro. Admite también el formato original v1. Primero muestra un resumen y permite cancelar; leer el archivo no modifica la partida.
3. **Restaurar esta copia** sustituye la partida solo tras pulsar el botón de confirmación. Antes guarda la original en `luciernagas.progress.v1.before-restore`; se puede descargar desde **Recuperar una partida anterior**.
4. **Ver copia automática anterior** permite revisar y restaurar el guardado inmediatamente anterior. Esta copia local también se pierde al borrar los datos del navegador; el archivo descargado es la copia independiente.

El archivo se procesa localmente, sin subirlo a ningún servidor. Se rechazan archivos dañados, formatos no compatibles y archivos de más de 1 MB. Una restauración que no se pueda guardar no sustituye la partida en memoria.

### Recuperar cuatro amigos sin archivo

En el dispositivo donde juega la niña, abre **Ajustes → Para acompañantes → Recuperar cuatro amigos sin copia → Recuperar los cuatro amigos**. Esto recupera a Luma, Pipo, Coral y Mora y abre la siguiente tabla. Conserva los amigos adicionales, las decoraciones existentes, la expedición, los ajustes y el historial de aprendizaje; no inventa aciertos ni añade luces. Antes guarda la partida en la copia previa a la restauración. La opción queda desactivada si ya tiene los cuatro amigos o si el guardado original no es compatible. No modifica las partidas de otros dispositivos ni se aplica automáticamente al desplegar.

Las actualizaciones mantienen la clave y el formato actuales. Un cambio futuro de esquema debe incorporar una migración explícita y conservar las pruebas con la partida histórica de `tests/fixtures/progress-v1.ts`. Nunca se debe solucionar una incompatibilidad borrando o reiniciando el guardado. Localhost y GitHub Pages tienen almacenes distintos: para trasladar una partida entre ellos, descarga e importa el archivo.

## Decisiones y límites de esta primera versión

- **Sin PWA por ahora.** Evita complejidad de actualización de cachés. Una página ya cargada funciona sin llamadas de datos, pero no se garantiza abrirla de nuevo sin conexión.
- **Sin gestor de estado ni router adicionales.** Una expedición y tres vistas no los requieren.
- **Sin biblioteca de animaciones ni recursos remotos.** El dibujo y los efectos son locales.
- **TypeScript 5.9 y ESLint 9.** Combinación compatible con las herramientas elegidas; versiones exactas resueltas en el lockfile. No se activa React Compiler.
- **Una partida por navegador.** No hay perfiles, cuentas ni tratamiento de información personal.
- **Próxima validación de producto:** observar una sesión de 5–10 minutos, comprobar si entiende las parcelas sin ayuda, si recuerda el propósito de los tres tramos y si desea volver. Ajustar longitud y pesos a partir de esa observación, sin añadir analítica.
