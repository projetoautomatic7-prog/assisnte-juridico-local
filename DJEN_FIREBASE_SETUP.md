# 🚀 DJEN Scheduler no Firebase - Guia Completo

## ✅ **O Que Foi Configurado**

### **1. Firebase Functions com Scheduler Automático**
- ⏰ **01:00** - Execução diária (madrugada)
- ⏰ **09:00** - Execução diária (manhã)
- 🌍 **Região:** `southamerica-east1` (Brasil) - obrigatório para API CNJ
- 📦 **Arquivo:** `functions/src/djen-scheduler.ts`

### **2. Endpoints Criados**
| Endpoint | URL | Descrição |
|----------|-----|-----------|
| **Scheduler 01h** | (Cloud Scheduler) | Automático às 01:00 BRT |
| **Scheduler 09h** | (Cloud Scheduler) | Automático às 09:00 BRT |
| **Trigger Manual** | `https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual` | Execução manual via HTTP |
| **Status** | `https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenStatus` | Verifica configuração |

---

## 📋 **Passo a Passo para Deploy**

### **1. Configurar Secrets no Firebase**

```bash
# No terminal do seu projeto:
firebase functions:secrets:set DJEN_OAB_NUMERO
# Digite: 184404

firebase functions:secrets:set DJEN_OAB_UF
# Digite: MG

firebase functions:secrets:set DJEN_ADVOGADO_NOME
# Digite: Thiago Bodevan Veiga
```

### **2. Fazer Deploy das Functions**

```bash
# Deploy completo (todas as functions DJEN)
firebase deploy --only functions:djenScheduler01h,functions:djenScheduler09h,functions:djenTriggerManual,functions:djenStatus

# Ou deploy de tudo
firebase deploy --only functions
```

### **3. Ativar Cloud Scheduler (Primeira Vez)**

Após o deploy, acesse o [Console do Firebase](https://console.firebase.google.com/):
1. Vá em **Functions** > **Scheduled functions**
2. Você verá `djenScheduler01h` e `djenScheduler09h`
3. Clique em cada uma e verifique se estão **Enabled**

⚠️ **Importante:** O Cloud Scheduler pode exigir **ativação de billing** no projeto.

---

## 🧪 **Como Testar**

### **Opção 1: Via cURL**
```bash
curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
```

### **Opção 2: Via Browser (DevTools)**
```javascript
fetch('https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual', { 
  method: 'POST' 
})
  .then(r => r.json())
  .then(console.log);
```

### **Opção 3: Verificar Status**
```bash
curl https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenStatus
```

**Resposta esperada:**
```json
{
  "status": "ativo",
  "timezone": "America/Sao_Paulo",
  "horarios": ["01:00", "09:00"],
  "advogadoPadrao": {
    "nome": "Thiago Bodevan Veiga",
    "oab": "184404/MG"
  },
  "region": "southamerica-east1 (Brasil)"
}
```

---

## 🎛️ **Adicionar Botão no Frontend (Opcional)**

Se você quiser um **botão visual** no app para disparar manualmente:

### **1. Criar Componente de Botão**

Arquivo: `src/components/DJENManualTrigger.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

const DJEN_FUNCTION_URL = 
  "https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual";

export function DJENManualTrigger() {
  const [loading, setLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    toast.info("Consultando API DJEN...");

    try {
      const response = await fetch(DJEN_FUNCTION_URL, { method: "POST" });
      const data = await response.json();

      if (data.sucesso) {
        toast.success(
          `✅ ${data.dados.processadas} publicações processadas!`,
          {
            description: `Total: ${data.dados.total} | Erros: ${data.dados.erros}`,
          }
        );
      } else {
        toast.error("Erro ao processar DJEN", {
          description: data.mensagem || "Erro desconhecido",
        });
      }
    } catch (error: any) {
      toast.error("Falha na conexão", {
        description: error.message || "Verifique sua internet",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTrigger}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Consultando...
        </>
      ) : (
        <>
          <PlayCircle className="mr-2 h-4 w-4" />
          Buscar DJEN Agora
        </>
      )}
    </Button>
  );
}
```

### **2. Adicionar ao Dashboard**

No arquivo onde você quer o botão (ex: `src/components/Dashboard.tsx`):

```tsx
import { DJENManualTrigger } from "@/components/DJENManualTrigger";

// Dentro do JSX:
<div className="flex items-center gap-2">
  <h2>Publicações DJEN</h2>
  <DJENManualTrigger />
</div>
```

---

## 📊 **Monitoramento**

### **Ver Logs em Tempo Real**
```bash
firebase functions:log --only djenScheduler01h,djenScheduler09h,djenTriggerManual
```

### **Ver Logs no Console**
Acesse: [Firebase Console > Functions > Logs](https://console.firebase.google.com/project/sonic-terminal-474321-s1/functions/logs)

Procure por:
- `[DJEN Scheduler 01h]` - Execuções automáticas da madrugada
- `[DJEN Scheduler 09h]` - Execuções automáticas da manhã
- `[DJEN Manual]` - Execuções manuais via endpoint

---

## ⚠️ **Troubleshooting**

### **Erro 403/451 (Geobloqueio)**
**Causa:** Firebase Functions fora do Brasil.
**Solução:** Todas as functions DJEN estão configuradas com `region: "southamerica-east1"`.

Verifique no deploy:
```bash
firebase deploy --only functions:djenTriggerManual
# Deve mostrar: southamerica-east1
```

### **Erro "Billing não ativado"**
**Causa:** Cloud Scheduler requer plano Blaze (pay-as-you-go).
**Solução:** 
1. Acesse [Firebase Console > Configurações](https://console.firebase.google.com/project/sonic-terminal-474321-s1/settings/usage)
2. Clique em **Mudar plano** > **Blaze**
3. Adicione cartão (cobre apenas uso real - DJEN é gratuito)

### **Scheduler não executa automaticamente**
1. Verifique se o Cloud Scheduler está ativo:
   ```bash
   gcloud scheduler jobs list --project=sonic-terminal-474321-s1
   ```
2. Teste manualmente primeiro:
   ```bash
   curl -X POST https://southamerica-east1-sonic-terminal-474321-s1.cloudfunctions.net/djenTriggerManual
   ```

---

## 🎉 **Resumo Final**

| Item | Status | Comando |
|------|--------|---------|
| **Functions criadas** | ✅ | `functions/src/djen-scheduler.ts` |
| **Secrets configurar** | ⏳ | `firebase functions:secrets:set` |
| **Deploy fazer** | ⏳ | `firebase deploy --only functions` |
| **Testar manual** | ⏳ | `curl -X POST <url>` |
| **Aguardar 01:00/09:00** | ⏳ | Automático após deploy |

---

**Próximo Passo:** Execute os comandos na seção **"Passo a Passo para Deploy"** ☝️
