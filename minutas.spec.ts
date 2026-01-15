import { expect, test } from '@playwright/test';

test.describe('Gerenciador de Minutas', () => {
  // Setup inicial antes de cada teste
  test.beforeEach(async ({ page }) => {
    // Ajuste a URL se necessário. Assumindo que o componente está em uma rota /minutas
    // ou acessível via dashboard. Aqui vamos para a raiz e navegamos se necessário.
    await page.goto('/');

    // Se o login for necessário e não estiver coberto pelo global-setup:
    // await page.getByTestId('login-username').fill('adm');
    // await page.getByTestId('login-password').fill('adm123');
    // await page.getByRole('button', { name: 'Entrar' }).click();

    // Navegar para Minutas (ajuste o seletor conforme seu menu)
    // Se não houver link direto, você pode forçar a URL: await page.goto('/minutas');
    // Por enquanto, assumo que há um botão ou link acessível ou que a home já exibe.
    // Se for um modal no Dashboard, o teste funcionará se o botão "Nova Minuta" estiver visível.
  });

  test('deve abrir o modal de nova minuta corretamente e verificar opacidade', async ({ page }) => {
    // 1. Abrir modal
    const btnNovaMinuta = page.getByRole('button', { name: 'Nova Minuta' });
    await expect(btnNovaMinuta).toBeVisible();
    await btnNovaMinuta.click();

    // 2. Verificar se modal abriu
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nova Minuta' })).toBeVisible();

    // 3. Verificar correção visual (fundo não transparente)
    // O DialogContent deve ter a classe bg-background
    const dialogContent = dialog.locator('.bg-background');
    await expect(dialogContent).toBeVisible();
  });

  test('deve criar uma nova minuta com sucesso', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Minuta' }).click();

    // 1. Preencher metadados
    await page.getByLabel('Título').fill('Minuta de Teste E2E Playwright');

    // Selecionar Tipo (Select do Shadcn/Radix)
    await page.getByLabel('Tipo').click();
    await page.getByRole('option', { name: 'Petição' }).click();

    // Selecionar Status
    await page.getByLabel('Status').click();
    await page.getByRole('option', { name: 'Rascunho' }).click();

    // 2. Preencher Editor (CKEditor 5)
    // CKEditor usa uma div com contenteditable e classe .ck-editor__editable
    const editor = page.locator('.ck-editor__editable');
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill('Conteúdo de teste da minuta gerado automaticamente pelo Playwright.');

    // 3. Salvar
    await page.getByRole('button', { name: 'Criar Minuta' }).click();

    // 4. Verificações pós-salvamento
    // Modal deve fechar
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Toast de sucesso deve aparecer
    await expect(page.getByText('Minuta criada com sucesso!')).toBeVisible();

    // A nova minuta deve aparecer na lista (assumindo que a lista atualiza)
    await expect(page.getByText('Minuta de Teste E2E Playwright')).toBeVisible();
  });
});