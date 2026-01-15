#!/bin/bash

echo "🔧 Iniciando correção de erros de deploy..."

# 1. Corrigir permissões (Erro: firebase-tools update check failed)
echo "🔐 Corrigindo permissões da pasta .config..."
if [ -d "$HOME/.config" ]; then
    sudo chown -R $USER:$(id -gn $USER) "$HOME/.config"
    echo "✅ Permissões corrigidas."
else
    echo "⚠️ Pasta .config não encontrada, pulando."
fi

# 2. Liberar espaço em disco (Erro: ENOSPC)
echo "🧹 Liberando espaço em disco..."
npm cache clean --force
rm -rf node_modules dist .vite coverage
rm -rf /tmp/*
echo "✅ Cache e arquivos temporários removidos."

# 3. Instruções para Autenticação
echo ""
echo "⚠️  AÇÃO NECESSÁRIA: Re-autenticação do Firebase"
echo "O erro 'Authentication Error' indica que seu token expirou."
echo "Execute o seguinte comando manualmente no terminal:"
echo ""
echo "  firebase login --reauth"
echo ""