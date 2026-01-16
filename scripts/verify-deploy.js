import axios from 'axios';

// Configure aqui a URL do seu FRONTEND no Firebase
// Se não definido, tenta pegar do ambiente ou usa o padrão
const APP_URL = process.env.FRONTEND_URL || 'https://assistente-juridico-local.web.app'; 

async function runTests() {
  console.log(`🚀 Iniciando Verificação de Produção 2026: ${APP_URL}\n`);

  const checks = [
    {
      name: "1. Conectividade Backend (Health Check)",
      url: `${APP_URL}/api/health`,
      expectedStatus: 200
    },
    {
      name: "2. Integração com Agentes (Genkit)",
      url: `${APP_URL}/api/agents`, // Ou sua rota de listagem de agentes
      expectedStatus: 200
    },
    {
      name: "3. Redirecionamento de API (Firebase Rewrites)",
      url: `${APP_URL}/api/non-existent-route`,
      expectedStatus: 404 // Garante que o backend está respondendo o 404, não o hosting
    }
  ];

  for (const check of checks) {
    try {
      const start = Date.now();
      const response = await axios.get(check.url, { timeout: 10000 });
      const duration = Date.now() - start;
      
      if (response.status === check.expectedStatus) {
        console.log(`✅ ${check.name} - OK (${duration}ms)`);
      }
    } catch (error) {
      if (error.response && error.response.status === check.expectedStatus) {
        console.log(`✅ ${check.name} - OK (Recebeu status esperado ${check.expectedStatus})`);
      } else {
        console.error(`❌ ${check.name} - FALHOU!`);
        console.error(`   URL: ${check.url}`);
        console.error(`   Erro: ${error.message}`);
        if (error.response) {
            console.error(`   Status recebido: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        if (error.code === 'ECONNABORTED') console.error("   Dica: O Cloud Run pode estar demorando no Cold Start.");
      }
    }
  }
}

runTests();
