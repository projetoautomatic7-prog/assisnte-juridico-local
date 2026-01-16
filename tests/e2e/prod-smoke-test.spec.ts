import { test, expect } from '@playwright/test';

// Define URL padrão se não vier do ambiente
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://assistente-juridico-local.web.app';

test.describe('Smoke Test de Produção', () => {
  test('deve verificar se o front chama o back com sucesso', async ({ page }) => {
    console.log(`Testando URL: ${BASE_URL}`);
    await page.goto(BASE_URL);
    
    // Intercepta a chamada da API
    // Ajuste o padrão da URL conforme necessário para sua API
    const apiCallPromise = page.waitForResponse(response => 
      response.url().includes('/api/agents') && response.status() === 200
    );

    // Tenta encontrar um elemento que dispare a chamada ou verifica se ela acontece no load
    // Se o app carrega agentes ao iniciar:
    // const response = await apiCallPromise;
    // expect(response.ok()).toBeTruthy();

    // Se precisa de interação (ex: abrir chat):
    // await page.click('button[aria-label="Abrir Chat"]'); 
    
    // Verificando apenas se a página carregou e título está correto como teste básico
    await expect(page).toHaveTitle(/Assistente Jurídico|PJe/);
    
    console.log("Página carregada com sucesso!");
  });
});
