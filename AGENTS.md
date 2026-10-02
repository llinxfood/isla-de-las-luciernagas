# Acuerdos de trabajo

- Ejecutar `npm test` después de modificar archivos JavaScript; ejecutar también los tests tras cambios relevantes en TypeScript.
- Preferir `pnpm` para instalar dependencias.
- Pedir confirmación antes de añadir dependencias de producción.
- Mantener la interfaz y la documentación en castellano.
- Firebase Authentication y Firestore están autorizados para sincronizar partidas entre dispositivos. No añadir analítica, publicidad ni otros servicios externos. Conservar el modo local y sus partidas.
- Mantener el dominio independiente de React y comprobar el build con `pnpm build`.
- Conservar las partidas existentes en cada actualización. No renombrar la clave de guardado ni reiniciar datos para resolver errores de lectura.
- Si cambia el esquema de progreso, implementar una migración explícita y probarla con las partidas históricas de `tests/fixtures/`. Una versión desconocida debe conservarse intacta.
