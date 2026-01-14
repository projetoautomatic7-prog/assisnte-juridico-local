#!/bin/bash

# Script: find-mocks.sh
# Objetivo: Identificar arquivos que utilizam vi.mock ou vi.fn para refatoração em testes reais.
# Alinhado com a regra de ética "Sem Simulação" do projeto.

TARGET_DIRS=("tests" "src")
REPORT_FILE="docs/MOCK_REFACTOR_REPORT.md"

echo "🔍 Iniciando busca por simulações (vi.mock/vi.fn)..."

# Garante que o diretório de documentação existe
mkdir -p docs

# Inicializa o cabeçalho do relatório
{
    echo "# 📋 Relatório de Refatoração: Remoção de Mocks"
    echo ""
    echo "**Data da Varredura:** $(date '+%d/%m/%Y %H:%M:%S')"
    echo "**Status:** 🔴 BLOQUEADO PARA PRODUÇÃO"
    echo ""
    echo "Este relatório lista os arquivos que violam a regra de ética **Sem Simulação**."
    echo "Devem ser convertidos para testes de integração real ou E2E."
    echo ""
    echo "## 🎯 Arquivos Identificados"
    echo ""
} > "$REPORT_FILE"

total_count=0

for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        # Busca arquivos que contenham vi.mock ou vi.fn
        FILES=$(grep -rlE "vi\.mock|vi\.fn" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null)
        
        for file in $FILES; do
            echo "- [ ] \`$file\`" >> "$REPORT_FILE"
            ((total_count++))
        done
    fi
done

if [ "$total_count" -eq 0 ]; then
    echo "✅ Nenhum mock detectado. O projeto está em conformidade!" >> "$REPORT_FILE"
else
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "**Total de arquivos para refatorar:** $total_count" >> "$REPORT_FILE"
fi

echo "✅ Relatório gerado em: $REPORT_FILE"
echo "📊 Total de arquivos encontrados: $total_count"