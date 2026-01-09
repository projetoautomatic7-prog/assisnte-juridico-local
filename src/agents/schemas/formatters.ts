/**
 * Formatters para Structured Outputs dos Agentes
 *
 * Funções específicas para formatar cada tipo de output estruturado
 * em formato legível para o usuário.
 */

import type {
  HarveyOutput,
  RedacaoPeticoesOutput,
  PesquisaJurisOutput,
  AnaliseDocumentalOutput,
  MonitorDJENOutput,
} from "./index";
import { formatCurrency, formatDate, formatBadge, formatList } from "./helpers";

/**
 * Formata output do Harvey Specter
 */
export function formatHarveyOutput(output: HarveyOutput): string {
  return `# 📋 Análise Estratégica Completa

${output.analise_estrategica}

## ⚡ Ações Recomendadas

${output.acoes_recomendadas
  .map(
    (acao, i) => `
${i + 1}. **${acao.acao}** (${formatBadge(acao.prioridade, `Prioridade ${acao.prioridade}`)})
   - 📅 Prazo: ${acao.prazo}
   - 📝 Fundamentação: ${acao.fundamentacao}
`
  )
  .join("\n")}

## ⚠️ Riscos Identificados

${
  output.riscos_identificados.length > 0
    ? output.riscos_identificados
        .map(
          (risco, i) => `
${i + 1}. **${risco.risco}** (${formatBadge(risco.severidade, `Severidade ${risco.severidade}`)}${risco.probabilidade ? ` | Probabilidade: ${risco.probabilidade}` : ""})
   - 🛡️ Mitigação: ${risco.mitigacao}
`
        )
        .join("\n")
    : "_Nenhum risco crítico identificado_"
}

## 📚 Fundamentação Legal

${formatList(output.fundamentacao_legal, true)}

${
  output.custo_estimado
    ? `
## 💰 Estimativa de Custos

**Faixa:** ${formatCurrency(output.custo_estimado.minimo)} - ${formatCurrency(output.custo_estimado.maximo)}
${output.custo_estimado.detalhamento ? `**Detalhamento:** ${output.custo_estimado.detalhamento}` : ""}
`
    : ""
}

${
  output.prazo_processual
    ? `
## ⏰ Prazo Processual Crítico

⚠️ **${output.prazo_processual}**
`
    : ""
}

## 🎯 Próximos Passos

${formatList(output.proximos_passos, true)}

${
  output.observacoes_adicionais
    ? `
## 📝 Observações Adicionais

${output.observacoes_adicionais}
`
    : ""
}

---
_Análise gerada com Structured Outputs para garantir consistência e qualidade._
`;
}

/**
 * Formata output de Redação de Petições
 */
export function formatRedacaoPeticoesOutput(output: RedacaoPeticoesOutput): string {
  return `# 📄 ${output.tipo_documento.replace(/_/g, " ").toUpperCase()}

## 👥 Partes

**Requerente:** ${output.partes.requerente}  
**Requerido:** ${output.partes.requerido}  
${output.partes.advogado ? `**Advogado:** ${output.partes.advogado}` : ""}  
${output.partes.oab ? `**OAB:** ${output.partes.oab}` : ""}

---

${output.peticao_completa}

---

## 📚 Fundamentação Legal

${output.fundamentacao
  .map(
    (f, i) => `
${i + 1}. **${f.artigo}** - ${f.lei}
   - ${f.aplicacao}
   ${f.ementa ? `- _Jurisprudência: ${f.ementa}_` : ""}
`
  )
  .join("\n")}

## 🎯 Pedidos

${formatList(output.pedidos, true)}

${
  output.valor_causa
    ? `
## 💰 Valor da Causa

${formatCurrency(output.valor_causa)}
`
    : ""
}

## 📎 Documentos Anexos

${formatList(output.documentos_anexos)}

## ✅ Status

- Formatação adequada: ${output.formatacao_adequada ? "✅ Sim" : "❌ Não"}
- Revisão ortográfica: ${output.revisao_ortografica ? "✅ Concluída" : "⏳ Pendente"}

---
_Petição gerada com validação estruturada de qualidade._
`;
}

/**
 * Formata output de Pesquisa Jurisprudencial
 */
export function formatPesquisaJurisOutput(output: PesquisaJurisOutput): string {
  const tendenciaEmoji = {
    favoravel: "✅",
    desfavoravel: "❌",
    dividida: "⚖️",
    sem_precedentes: "🔍",
  };

  return `# 🔍 Pesquisa Jurisprudencial

**Consulta:** ${output.consulta_realizada}

## 📊 Tendência Jurisprudencial

${tendenciaEmoji[output.tendencia_jurisprudencial]} **${output.tendencia_jurisprudencial.toUpperCase()}**

${
  output.precedentes_vinculantes && output.precedentes_vinculantes.length > 0
    ? `
## ⚖️ Precedentes Vinculantes

${output.precedentes_vinculantes
  .map(
    (p, i) => `
${i + 1}. **${p.tipo.replace(/_/g, " ").toUpperCase()}** nº ${p.numero}
   - ${p.enunciado}
`
  )
  .join("\n")}
`
    : ""
}

## 📚 Resultados Encontrados (${output.resultados.length})

${
  output.resultados.length > 0
    ? output.resultados
        .map(
          (r, i) => `
### ${i + 1}. ${r.tribunal} - ${r.numero_processo}

**Ementa:** ${r.ementa}

${r.relator ? `**Relator:** ${r.relator}` : ""}  
${r.data_julgamento ? `**Data:** ${formatDate(r.data_julgamento)}` : ""}  
**Relevância:** ${(r.relevancia * 100).toFixed(0)}%

${r.dispositivo ? `**Dispositivo:** ${r.dispositivo}` : ""}  
${r.tese_firmada ? `**Tese:** ${r.tese_firmada}` : ""}  
${r.link ? `[🔗 Ver julgado completo](${r.link})` : ""}
`
        )
        .join("\n---\n")
    : "_Nenhum resultado encontrado para a consulta._"
}

## 📝 Análise Consolidada

${output.analise_consolidada}

## 💡 Recomendação de Uso

${output.recomendacao_uso}

---
_Pesquisa realizada com validação de relevância e estruturação automática._
`;
}

/**
 * Formata output de Análise Documental
 */
export function formatAnaliseDocumentalOutput(output: AnaliseDocumentalOutput): string {
  const statusEmoji = {
    conforme: "✅",
    nao_conforme: "❌",
    requer_ajustes: "⚠️",
  };

  return `# 📑 Análise Documental

**Tipo de Documento:** ${output.tipo_documento.toUpperCase()}

## 📋 Resumo Executivo

${output.resumo_executivo}

## 👤 Entidades Extraídas

### Pessoas (${output.entidades_extraidas.pessoas.length})

${output.entidades_extraidas.pessoas
  .map(
    (p) => `
- **${p.nome}** ${p.cpf ? `(CPF: ${p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")})` : ""}
  - Papel: ${p.papel}
`
  )
  .join("\n")}

### Empresas (${output.entidades_extraidas.empresas.length})

${output.entidades_extraidas.empresas
  .map(
    (e) => `
- **${e.razao_social}** ${e.cnpj ? `(CNPJ: ${e.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")})` : ""}
  ${e.papel ? `- Papel: ${e.papel}` : ""}
`
  )
  .join("\n")}

### Datas Importantes (${output.entidades_extraidas.datas_importantes.length})

${output.entidades_extraidas.datas_importantes
  .map(
    (d) => `
- **${formatDate(d.data)}:** ${d.evento}
`
  )
  .join("\n")}

### Valores Monetários (${output.entidades_extraidas.valores_monetarios.length})

${output.entidades_extraidas.valores_monetarios
  .map(
    (v) => `
- **${formatCurrency(v.valor)}:** ${v.descricao}
`
  )
  .join("\n")}

${
  output.clausulas_criticas.length > 0
    ? `
## ⚠️ Cláusulas Críticas

${output.clausulas_criticas
  .map(
    (c, i) => `
${i + 1}. **${c.localizacao}** - ${c.tipo.replace(/_/g, " ").toUpperCase()}
   - ${c.clausula}
   - Observação: ${c.observacao}
`
  )
  .join("\n")}
`
    : ""
}

## ${statusEmoji[output.conformidade_legal.status]} Conformidade Legal

**Status:** ${output.conformidade_legal.status.replace(/_/g, " ").toUpperCase()}

${
  output.conformidade_legal.violacoes.length > 0
    ? `
### ❌ Violações Detectadas

${formatList(output.conformidade_legal.violacoes)}
`
    : ""
}

${
  output.conformidade_legal.recomendacoes.length > 0
    ? `
### 💡 Recomendações

${formatList(output.conformidade_legal.recomendacoes, true)}
`
    : ""
}

${
  output.documentos_faltantes.length > 0
    ? `
## 📎 Documentos Faltantes

${formatList(output.documentos_faltantes)}
`
    : ""
}

${
  output.pontos_atencao.length > 0
    ? `
## 🔍 Pontos de Atenção

${formatList(output.pontos_atencao)}
`
    : ""
}

## 🎯 Próxima Ação

${output.proxima_acao}

---
_Análise documental com extração automatizada de entidades e validação de conformidade._
`;
}

/**
 * Formata output do Monitor DJEN
 */
export function formatMonitorDJENOutput(output: MonitorDJENOutput): string {
  return `# 📰 Monitor DJEN - Publicações

**OAB:** ${output.consulta_info.oab}  
**Advogado:** ${output.consulta_info.advogado}  
**Data da Consulta:** ${formatDate(output.consulta_info.data_consulta.split("T")[0])}  
**Período:** Últimos ${output.consulta_info.periodo_consultado} dias

## 📊 Resumo

- **Total de Publicações:** ${output.resumo.total_publicacoes}
- **Publicações Urgentes:** ${output.resumo.publicacoes_urgentes} ${output.resumo.publicacoes_urgentes > 0 ? "🚨" : ""}

${
  output.publicacoes.length > 0
    ? `
## 📋 Publicações Encontradas

${output.publicacoes
  .map(
    (p, i) => `
### ${i + 1}. ${p.processo_numero} ${p.urgente ? "🚨 URGENTE" : ""}

**Tribunal:** ${p.tribunal || "Não informado"}  
**Data de Publicação:** ${formatDate(p.data_publicacao)}  
**Tipo:** ${p.tipo_documento}

${p.conteudo_resumido}

${
  p.prazo_fatal
    ? `
⏰ **Prazo Fatal:** ${formatDate(p.prazo_fatal)} (${p.dias_uteis_restantes} dias úteis restantes)
`
    : ""
}

${p.processo_link ? `[🔗 Ver processo](${p.processo_link})` : ""}
`
  )
  .join("\n---\n")}
`
    : `
_Nenhuma publicação encontrada no período consultado._
`
}

${
  output.resumo.proximos_prazos.length > 0
    ? `
## ⏰ Próximos Prazos

${output.resumo.proximos_prazos
  .map(
    (p, i) => `
${i + 1}. **${p.processo}**
   - Prazo: ${formatDate(p.prazo)}
   - Dias restantes: ${p.dias_restantes} dias úteis
`
  )
  .join("\n")}
`
    : ""
}

${
  output.alertas.length > 0
    ? `
## 🔔 Alertas

${formatList(output.alertas)}
`
    : ""
}

## 🔄 Próxima Consulta Sugerida

${output.proxima_consulta_sugerida}

---
_Monitoramento automatizado do DJEN com detecção de prazos críticos._
`;
}
