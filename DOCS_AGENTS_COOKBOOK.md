# 🎯 Sistema de Agentes - Análise OpenAI Cookbook

## ✅ Implementado (Prioridade 1)

### 1. Sistema de Avaliação (Evaluation System)
**Fonte:** `examples/evaluation/Building_resilient_prompts_using_an_evaluation_flywheel.md`

**Conceito:** Evaluation Flywheel - Ciclo contínuo de melhoria
- **Analyze:** Identificar padrões de erro (open coding → axial coding)
- **Measure:** Quantificar com graders automatizados
- **Improve:** Ajustar prompts e sistema

**Implementação:** `backend/src/services/agent-evaluator.ts`

#### Graders Implementados:
1. **Formatting Grader** - Valida formato (JSON/Markdown/Plain)
2. **Hallucination Grader** - Detecta alucinações vs Ground Truth
3. **Completeness Grader** - Verifica elementos obrigatórios
4. **LLM-as-a-Judge** - Avaliação geral de qualidade (0-10)

#### Categorias de Erro:
- `HALLUCINATION` - Informações inventadas
- `FORMATTING` - Formato incorreto
- `INCOMPLETE` - Falta elementos
- `INCORRECT_INFO` - Informação errada
- `CONTEXT_MISS` - Contexto ignorado
- `LEGAL_ERROR` - Erro jurídico específico

#### API:
```bash
POST /api/evaluation/evaluate
{
  "agentId": "harvey-specter",
  "input": "Solicito análise de contrato X",
  "output": "Análise: ...",
  "groundTruth": "Informação correta base", // opcional
  "requiredElements": ["conclusão", "fundamentos"], // opcional
  "expectedFormat": "markdown" // opcional
}

Resposta:
{
  "success": true,
  "evaluation": {
    "taskId": "task_123",
    "agentId": "harvey-specter",
    "score": 8,
    "passed": true,
    "errorCategories": [],
    "feedback": "Resposta clara e completa...",
    "timestamp": 1234567890,
    "evaluatorType": "llm"
  }
}
```

---

## 📋 Próximas Implementações (Prioridade 2)

### 2. Structured Outputs Multi-Agent
**Fonte:** `examples/Structured_outputs_multi_agent.ipynb`

**Conceito:** Saídas estruturadas com JSON Schema + múltiplos agentes

**Notebook:** 66 células (18 code, 48 markdown)

**Bibliotecas:** 
- `openai`
- `pydantic` (validação)
- `json`

**Aplicação:**
- Garantir formato consistente entre agentes
- Validação automática com schemas
- Facilitar handoffs estruturados

---

## 🔍 Sistemas Adicionais Identificados

### 3. Entity Extraction for Long Documents
**Fonte:** `examples/Entity_extraction_for_long_documents.ipynb`

**Conceito:** Extração de entidades em documentos longos com sliding window

**Aplicação Jurídica:**
- Extrair partes, datas, valores de petições extensas
- Processar documentos acima do limite de contexto
- Manter consistência com validação cruzada

---

### 4. Custom LLM-as-a-Judge
**Fonte:** `examples/evaluation/Custom-LLM-as-a-Judge.ipynb`

**Conceito:** LLM especializado para avaliar outputs

**Implementado parcialmente em:** `gradeLLMAsJudge()` (agent-evaluator.ts)

**Melhorias Pendentes:**
- Customizar critérios jurídicos específicos
- Calibração com exemplos gold standard
- Métricas agregadas (Cohen's Kappa, F1)

---

### 5. Hallucination Guardrails (Completo)
**Fonte:** `examples/Developing_hallucination_guardrails.ipynb`

**Conceito:** Precision/Recall para detectar alucinações

**Implementado em:** `gradeHallucination()` (agent-evaluator.ts)

**Métricas:**
- **Precision:** Quantos dos positivos detectados são reais?
- **Recall:** Quantos dos reais foram detectados?
- **Confidence:** 0.0-1.0 (usado threshold 0.7)

---

## 🛠️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                               │
│  (LangGraph + Handoffs)                                     │
│                                                             │
│  1. selectInitialAgent() ─────> LLM escolhe agente         │
│  2. executeAgent() ────────────> Executa agente            │
│  3. decideHandoff() ───────────> LLM decide próximo        │
│  4. Loop até conclusão                                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  EVALUATOR (NOVO)                           │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐                │
│  │ Formatting      │  │ Hallucination    │                │
│  │ Grader          │  │ Grader           │                │
│  └─────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐                │
│  │ Completeness    │  │ LLM-as-a-Judge   │                │
│  │ Grader          │  │                  │                │
│  └─────────────────┘  └──────────────────┘                │
│                                                             │
│  Score: 0-10 | Passed: boolean | ErrorCategories: []       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  15 AGENTES     │
              │  ESPECIALIZADOS │
              └─────────────────┘
```

---

## 📊 Evaluation Flywheel

```
1. ANALYZE
   ├─ Coletar exemplos de falhas
   ├─ Open Coding: identificar problemas únicos
   └─ Axial Coding: agrupar em categorias

2. MEASURE
   ├─ Criar graders automatizados
   ├─ Definir thresholds (ex: score >= 7 = pass)
   └─ Executar em batch

3. IMPROVE
   ├─ Ajustar system prompts
   ├─ Adicionar few-shot examples
   └─ Refinar instruções
```

---

## 🎯 Próximos Passos

### Imediato:
- [x] Implementar Evaluation System
- [x] Criar API `/api/evaluation/evaluate`
- [x] Integrar com agentes existentes

### Curto Prazo (Prioridade 2):
- [ ] Implementar Structured Outputs (JSON Schema)
- [ ] Adicionar Pydantic validation layer
- [ ] Integrar structured outputs com handoffs

### Médio Prazo:
- [ ] Entity Extraction para processos longos
- [ ] Custom LLM Judge jurídico especializado
- [ ] Persistência de histórico de avaliações (PostgreSQL)

### Longo Prazo:
- [ ] Calibração com dataset jurídico gold standard
- [ ] Métricas agregadas (Cohen's Kappa, Inter-rater reliability)
- [ ] Dashboard de análise de qualidade dos agentes

---

## 📚 Referências

- OpenAI Cookbook: `./openai-cookbook/examples/`
- Evaluation Flywheel: `evaluation/Building_resilient_prompts_using_an_evaluation_flywheel.md`
- Hallucination Guardrails: `Developing_hallucination_guardrails.ipynb`
- Structured Outputs: `Structured_outputs_multi_agent.ipynb`
- Entity Extraction: `Entity_extraction_for_long_documents.ipynb`
- Custom Judge: `evaluation/Custom-LLM-as-a-Judge.ipynb`

---

**Status Atual:** ✅ Prioridade 1 implementada | Próximo: Prioridade 2 (Structured Outputs)

