
import { test, expect } from '@playwright/test';

test.describe('Fluxo Todoist e Processos - Integração Real', () => {
  test.beforeAll(() => {
    if (process.env.DISABLE_MOCKS !== 'true') {
      test.skip(true, 'Este teste requer DISABLE_MOCKS=true para conformidade ética.');
    }
    if (!process.env.TODOIST_API_TOKEN) {
      test.skip(true, 'TODOIST_API_TOKEN não configurado no ambiente de teste.');
    }
  });

  test('deve criar tarefas no Todoist ao adicionar um novo processo via API real', async ({ page }) => {
    const testProcessNumber = `E2E-${Date.now()}`;

    // 1. Navegar para a página de Processos (Acervo/CRM)
    await page.goto('/');
    await page.waitForSelector('[data-testid="sidebar-nav"]');
    await page.click('[data-testid="nav-acervo"]'); 

    // 2. Abrir modal de Novo Processo
    await page.getByRole('button', { name: 'Novo Processo' }).click();

    // 3. Preencher formulário
    await page.getByLabel('Número CNJ').fill(testProcessNumber);
    await page.getByLabel('Título do Processo').fill('Ação de Teste E2E - Integração Real');
    await page.getByLabel('Autor').fill('Advogado de Teste');
    await page.getByLabel('Réu').fill('Empresa de Teste');

    // 4. Salvar (O backend deve disparar a criação no Todoist via /api/todoist)
    await page.getByRole('button', { name: 'Adicionar Processo' }).click();

    // 5. Verificar feedback na UI
    await expect(page.getByText('Processo adicionado com sucesso')).toBeVisible({ timeout: 15000 });
    
    // 6. Validação de Integridade: Consultar API do Todoist para confirmar existência
    const todoistResponse = await fetch(`https://api.todoist.com/rest/v2/tasks`, {
      headers: { 'Authorization': `Bearer ${process.env.TODOIST_API_TOKEN}` }
    });
    
    const tasks = await todoistResponse.json();
    const createdTask = tasks.find((t: any) => t.content.includes(testProcessNumber));
    
    expect(createdTask).toBeDefined();
    console.log(`✅ Tarefa confirmada no Todoist: ${createdTask.id}`);

    // Cleanup: Remover a tarefa de teste do Todoist
    if (createdTask) {
      await fetch(`https://api.todoist.com/rest/v2/tasks/${createdTask.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.TODOIST_API_TOKEN}` }
      });
      console.log(`🧹 Cleanup: Tarefa ${createdTask.id} removida.`);
    }
  });
});
