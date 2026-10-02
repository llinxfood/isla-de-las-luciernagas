import { expect, test, type Page } from '@playwright/test';
const key = 'luciernagas.progress.v1';
async function currentFact(page: Page) {
  return page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    return saved.expedition.questions[saved.expedition.index].fact;
  }, key);
}
async function solve(page: Page) {
  const availablePlots = page.getByRole('button', { name: /Parcela.*plantar/ });
  while (await availablePlots.count()) await availablePlots.first().click();
  const fact = await currentFact(page);
  const input = page.getByRole('textbox', { name: 'Tu respuesta' });
  if (await input.count()) {
    await input.fill(String(fact.a * fact.b));
    await page.getByRole('button', { name: 'Encender ✦' }).click();
  } else
    await page.getByRole('button', { name: `Responder ${fact.a * fact.b}`, exact: true }).click();
}
test('expedición completa, error, semillas, pausa, premio y desbloqueo', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Un poquito de magia/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/island-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: '¡Vamos a explorar!' }).click();
  await page.getByRole('button', { name: 'Parcela 1, plantar' }).click();
  await expect(page.locator('.garden-count')).toBeVisible();
  const fact = await currentFact(page);
  const wrong = page
    .getByRole('button', { name: /^Responder/ })
    .filter({ hasText: new RegExp(`^(?!${fact.a * fact.b}$)\\d+$`) })
    .first();
  await wrong.click();
  await expect(page.getByRole('status')).toContainText('Todavía no');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar mi aventura' }).click();
  await expect(page.getByRole('heading', { name: `${fact.a} × ${fact.b} = ?` })).toBeVisible();
  for (let i = 0; i < 24; i++) {
    await solve(page);
    await expect(page.getByRole('status')).toContainText('Lo has conseguido');
    await page
      .getByRole('button', {
        name:
          i === 23
            ? 'Descubrir mi refugio'
            : (i + 1) % 8 === 0
              ? '¡Tramo completado!'
              : 'Seguir explorando',
      })
      .click();
    if ([7, 15].includes(i)) {
      await expect(page.getByRole('button', { name: 'Vamos al siguiente tramo' })).toBeVisible();
      if (i === 7) {
        await page.reload();
        await page.getByRole('button', { name: 'Continuar mi aventura' }).click();
      }
      await page.getByRole('button', { name: 'Vamos al siguiente tramo' }).click();
    }
  }
  await page.getByRole('button', { name: /Cristales/ }).click();
  await page.getByRole('button', { name: 'Decorar y conocer a mi amigo' }).click();
  await page.getByRole('button', { name: /Luma Tabla del 1/ }).click();
  await expect(page.getByText(/Una pequeña exploradora/)).toBeVisible();
  await page.getByRole('button', { name: 'Mi isla', exact: false }).first().click();
  await expect(page.getByRole('button', { name: /bosque gemelo.*disponible/ })).toBeEnabled();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(saved.lights).toBe(24);
  expect(saved.missions).toBe(1);
  expect(saved.completed).toEqual([1]);
  expect(saved.decorations['1']).toBe('crystals');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test('ajustes, teclado y ausencia de desbordamientos', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('checkbox', { name: /Animaciones/ }).uncheck();
  await page.getByRole('checkbox', { name: /Sonidos/ }).check();
  await page.getByText('Para acompañantes', { exact: true }).click();
  await expect(page.getByText('Operaciones afianzadas:', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toBeFocused();
  await page.reload();
  expect(await page.locator('html').getAttribute('data-motion')).toBe('off');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('las cien semillas son táctiles y caben en pantalla', async ({ page }, testInfo) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          facts: {},
          completed: [1, 2],
          decorations: { 1: 'flowers', 2: 'crystals' },
          missions: 2,
          lights: 48,
          settings: { sound: false, motion: false },
          expedition: {
            table: 10,
            index: 0,
            lights: 0,
            phase: 'playing',
            questions: [
              {
                fact: { id: '10x10', a: 10, b: 10 },
                options: [90, 100, 99, 98],
                mistakes: 0,
                hinted: true,
                resolved: false,
              },
            ],
          },
        }),
      );
    },
    { key },
  );
  await page.goto('./');
  await page.getByRole('button', { name: 'Continuar mi aventura' }).click();
  await expect(page.getByRole('button', { name: 'Responder 100', exact: true })).toBeDisabled();
  const plots = page.getByRole('button', { name: /Parcela.*plantar/ });
  await expect(plots).toHaveCount(10);
  while (await plots.count()) await plots.first().click();
  await expect(page.locator('.garden-count')).toContainText('10 grupos de 10 = 100 semillas');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `test-results/garden-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Responder 100', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Lo has conseguido');
});

test('una partida anterior sobrevive a la actualización y se puede exportar y restaurar', async ({
  page,
}) => {
  const { legacySave } = await import('./fixtures/progress-v1');
  await page.goto('./');
  await page.evaluate(({ key, legacySave }) => localStorage.setItem(key, legacySave), {
    key,
    legacySave,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByText('Para acompañantes', { exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar copia', exact: true }).click();
  const download = await downloaded;
  const path = await download.path();
  expect(path).toBeTruthy();
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(path!, 'utf8');
  expect(JSON.parse(content).progress).toEqual(JSON.parse(legacySave));
  // Change the live save, then check that merely reading/cancelling a backup never changes it.
  await page.getByRole('checkbox', { name: /Sonidos/ }).uncheck();
  const current = await page.evaluate((key) => localStorage.getItem(key), key);
  const input = page.getByLabel('Archivo de copia de seguridad');
  await input.setInputFiles({
    name: 'incorrecta.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('alert')).toContainText('Tu partida actual sigue intacta');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(current);
  await input.setInputFiles({
    name: 'aventura.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
  await expect(page.getByText('Revisa la copia antes de restaurar')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(current);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(current);
  await input.setInputFiles({
    name: 'aventura.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
  await page.getByRole('button', { name: 'Restaurar esta copia', exact: true }).click();
  await expect(page.getByText('Partida restaurada.', { exact: false })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(`${key}.before-restore`), key)).toBe(
    current,
  );
  await page.reload();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(
    JSON.parse(legacySave),
  );
  await page.getByRole('button', { name: 'Continuar mi aventura' }).click();
  await expect(page.getByRole('heading', { name: '10 × 6 = ?' })).toBeVisible();
});

test('una partida de formato desconocido permanece intacta después de recargar y jugar', async ({
  page,
}) => {
  const original = JSON.stringify({ version: 2, progress: 'partida que esta versión no entiende' });
  await page.goto('./');
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), {
    key,
    original,
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('La original sigue intacta');
  await page.getByRole('button', { name: '¡Vamos a explorar!' }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(original);
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(original);
});

test('recupera cuatro amigos y conserva la partida tras recargar', async ({ page }) => {
  const { legacySave } = await import('./fixtures/progress-v1');
  await page.goto('./');
  await page.evaluate(({ key, legacySave }) => localStorage.setItem(key, legacySave), {
    key,
    legacySave,
  });
  await page.reload();
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByText('Para acompañantes', { exact: true }).click();
  await page.getByText('Recuperar cuatro amigos sin copia', { exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar los cuatro amigos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ya tienes los cuatro amigos' })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(`${key}.before-restore`), key)).toBe(
    before,
  );
  await page.reload();
  const recovered = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(recovered).toEqual({
    ...JSON.parse(legacySave),
    completed: [1, 2, 10, 5],
    decorations: { '1': 'flowers', '2': 'crystals', '10': 'flowers', '5': 'flowers' },
  });
  await page.getByRole('button', { name: /Mis amigos/ }).click();
  await expect(page.locator('.friend-card:enabled')).toHaveCount(4);
  for (const name of ['Luma', 'Pipo', 'Coral', 'Mora'])
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
});
