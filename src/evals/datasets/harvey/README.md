# Harvey Specter - Golden Dataset

Este dataset contém casos de teste para o agente **Harvey Specter** (consultor jurídico estratégico).

## 📊 Estatísticas

- **Total de casos:** 50
- **Dificuldades:**
  - Easy: 15 casos (30%)
  - Medium: 20 casos (40%)
  - Hard: 15 casos (30%)

## 🎯 Áreas Cobertas

- **Trabalhista:** 10 casos
- **Consumidor:** 10 casos
- **Família:** 8 casos
- **Tributário:** 7 casos
- **Civil (Responsabilidade):** 8 casos
- **Empresarial:** 7 casos

## 📋 Estrutura de Caso

```json
{
  "id": "harvey-001",
  "input": {
    "problema": "Descrição do problema legal",
    "contexto": "Contexto adicional relevante"
  },
  "expected_output": {
    "estrategia_recomendada": "string",
    "fundamento_legal": ["array", "de", "artigos"],
    "chances_sucesso": "baixa|media|alta|muito_alta",
    "valor_causa_estimado": "string (range)",
    "prazo_acao": "string (prazo prescricional)",
    "documentos_necessarios": ["array"],
    "riscos_identificados": ["array"],
    "observacoes": ["array"]
  },
  "metadata": {
    "difficulty": "easy|medium|hard",
    "tags": ["array", "de", "tags"]
  }
}
```

## 🎓 Casos Incluídos

### Easy (Casos simples, jurisprudência consolidada)

- harvey-002: Defeito oculto em veículo 0km
- harvey-008: Cobrança indevida em fatura telefônica
- harvey-012: Revisão de aluguel comercial
- ... (15 casos total)

### Medium (Casos com complexidade moderada)

- harvey-001: Verbas rescisórias + pandemia
- harvey-010: Dissolução de sociedade empresarial
- harvey-015: Acidente de trânsito com vítima
- ... (20 casos total)

### Hard (Casos complexos, múltiplas teses)

- harvey-003: Divórcio litigioso com violência doméstica
- harvey-004: Repetição de indébito tributário (ICMS-ST)
- harvey-005: Erro médico com sequelas permanentes
- ... (15 casos total)

## ✅ Critérios de Sucesso

Para cada caso, o agente deve:

- ✅ Identificar corretamente a estratégia jurídica
- ✅ Citar ao menos 80% dos fundamentos legais esperados
- ✅ Estimar corretamente as chances de sucesso
- ✅ Fornecer documentação necessária completa
- ✅ Identificar os principais riscos
- ✅ Latência < 3 segundos (P95)

## 📊 Métricas Esperadas

| Métrica      | Target | Baseline |
| ------------ | ------ | -------- |
| Accuracy     | ≥ 85%  | TBD      |
| Relevance    | ≥ 90%  | TBD      |
| Completeness | ≥ 95%  | TBD      |
| Latency P95  | < 3s   | TBD      |

## 🔄 Atualização

Este dataset deve ser atualizado quando:

- Novas áreas do direito forem cobertas
- Jurisprudência relevante mudar
- Feedback de usuários indicar casos edge
- Performance do agente melhorar significativamente

**Última atualização:** 08/01/2026  
**Próxima revisão:** 15/02/2026
