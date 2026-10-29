// Testes de ponta a ponta: abrem o app como num celular e usam como uma pessoa usaria.
const { test, expect } = require('@playwright/test');
const path = require('path');

const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');

let erros;
test.beforeEach(async ({ page }) => {
  erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  // as fontes vêm do Google Fonts; sem internet o app usa a fonte do sistema
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});
test.afterEach(() => {
  expect(erros, 'erros de JavaScript na página').toEqual([]);
});

test.describe('modo demonstração (?demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP + '?demo');
    await expect(page.locator('#banner')).toContainText('Modo demonstração');
  });

  test('mostra a semana do ciclo e os anéis das metas', async ({ page }) => {
    await expect(page.locator('#v-hoje .kicker').first()).toContainText('Semana 2 de 12');
    await expect(page.locator('#v-hoje .rp')).toHaveCount(3);
    // o card de treino mostra a próxima ficha (e não um número de outro card que estava animando)
    await page.waitForTimeout(1200);
    await expect(page.locator('#v-hoje .numrow .big:not(.w):not(.p):not(.c)')).toHaveText(/^Ficha [A-E]$/);
  });

  test('água: adiciona um copo e desfaz', async ({ page }) => {
    const agua = page.locator('#v-hoje .big.w');
    await expect(agua).toHaveText('1 L');
    await page.click('[data-act="agua"][data-v="250"]');
    await expect(agua).toHaveText('1,25 L');
    await page.click('#toast .tbtn');
    await expect(agua).toHaveText('1 L');
  });

  test('seletor de carga: Cancelar não muda o valor', async ({ page }) => {
    await page.click('[data-t="treino"]');
    const valor = page.locator('.srow2 .val').first();
    const antes = await valor.textContent();
    await valor.click();
    await expect(page.locator('#sheet')).toBeVisible();
    await page.locator('#rl-kg').evaluate((el) => { el.scrollLeft += 56 * 3; });
    await page.click('#sheetIn .btn.ghost[data-act="sheet-close"]');
    await expect(page.locator('#sheet')).toBeHidden();
    await expect(valor).toHaveText(antes);
  });

  test('concluir uma série e desfazer', async ({ page }) => {
    await page.click('[data-t="treino"]');
    const serie = page.locator('.srow2').first();
    await serie.locator('.done').click();
    await expect(serie).toHaveClass(/feita/);
    await expect(page.locator('#restbar')).toBeVisible();
    await page.click('#toast .tbtn');
    await expect(serie).not.toHaveClass(/feita/);
    await expect(page.locator('#restbar')).toBeHidden();
  });

  test('deslizar a série para a direita conclui', async ({ page }) => {
    await page.click('[data-t="treino"]');
    const fg = page.locator('.srow2').first().locator('.sfg');
    await fg.scrollIntoViewIfNeeded();
    const b = await fg.boundingBox();
    const y = b.y + b.height / 2;
    await page.mouse.move(b.x + 40, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + 40 + i * 20, y);
    await page.mouse.up();
    await expect(page.locator('.srow2').first()).toHaveClass(/feita/);
  });

  test('salvar o treino e desfazer o salvamento', async ({ page }) => {
    await page.click('[data-t="treino"]');
    const primeiro = page.locator('article.ex').first();
    for (const botao of await primeiro.locator('.done').all()) await botao.dispatchEvent('click');
    await expect(primeiro).toHaveClass(/exdone/);
    await page.click('#btnSalvar');
    await expect(page.locator('[data-act="treino-desfazer"]')).toBeVisible();
    await page.click('[data-act="treino-desfazer"]');
    await expect(page.locator('#toast')).toContainText('Salvamento desfeito');
    await expect(primeiro.locator('.srow2.feita')).toHaveCount(3);
  });

  test('progresso: semáforo aceso e sem rolagem lateral', async ({ page }) => {
    await page.click('[data-t="prog"]');
    await expect(page.locator('.sem-luz i.on').first()).toBeVisible();
    await expect(page.locator('#v-prog .ch-line').first()).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(390);
  });
});

test.describe('modo local (sem ?demo)', () => {
  test('começa na semana 1 e guarda os dados depois de recarregar', async ({ page }) => {
    await page.goto(APP);
    await expect(page.locator('#v-hoje .kicker').first()).toContainText('Semana 1 de 12');
    await page.click('[data-act="agua"][data-v="500"]');
    await expect(page.locator('#v-hoje .big.w')).toHaveText('0,5 L');
    await page.waitForTimeout(1000); // a gravação acontece ~0,7 s depois do último toque
    await page.reload();
    await expect(page.locator('#v-hoje .big.w')).toHaveText('0,5 L');
  });
});
