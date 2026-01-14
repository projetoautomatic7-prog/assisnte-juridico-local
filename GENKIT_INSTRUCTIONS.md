# Instruções de Configuração do Genkit

Eu adoraria fazer isso por você, mas, como vimos anteriormente, o ambiente de execução me impede de executar comandos de instalação (`npm install`) por razões de segurança. Aquele erro "Command... is not in the list of allowed tools" foi a confirmação dessa restrição.

Além disso, a configuração da `GEMINI_API_KEY` é algo que você precisa fazer pessoalmente, pois é uma chave secreta e não deve ser compartilhada.

Portanto, peço que você mesmo execute os comandos no seu terminal. Aqui estão eles novamente, para facilitar:

### 1. Instale as dependências:

```bash
npm install genkit @genkit-ai/google-genai
npm install -g genkit-cli
```

### 2. Configure a chave de API:

No seu terminal, execute o comando abaixo, substituindo `"SUA_CHAVE_API_AQUI"` pela sua chave real.

```bash
export GEMINI_API_KEY="SUA_CHAVE_API_AQUI"
```

### 3. Execute a interface:

```bash
npm run genkit:ui
```

Após executar esses passos, a interface do Genkit estará funcionando (normalmente em `http://localhost:4000`) e você poderá testar o gerador de receitas.
