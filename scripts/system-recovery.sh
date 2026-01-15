#!/bin/bash

echo "🚀 Iniciando recuperação do sistema..."

# 1. Limpeza de disco
echo "🧹 Limpando cache e arquivos temporários..."
npm cache clean --force
rm -rf dist .vite
sudo rm -rf /tmp/gemini-client-error-*
df -h | grep '^/' # Mostra o espaço atual

# 2. Identificar arquivos JSON corrompidos (Local e Global)
echo "🔍 Verificando arquivos JSON corrompidos (pode pedir senha)..."
# Verifica no projeto e na pasta de configuração do usuário (~/.config)
find . ~/.config -name "*.json" -not -path "*/node_modules/*" -type f 2>/dev/null | xargs -I {} sh -c '
  for file do
    if ! jq . "$file" >/dev/null 2>&1; then
      echo "❌ Corrompido: $file"
      # Se o arquivo estiver vazio ou inválido, removemos para que o sistema possa recriar
      rm "$file"
    fi
  done
' sh {} +

# 3. Reinstalar dependências e ferramentas
echo "📦 Reinstalando dependências e ferramentas de IA..."
npm install
if ! command -v genkit &> /dev/null; then
    echo "🔧 Instalando Genkit CLI..."
    npm install -g genkit
fi

echo "✅ Recuperação concluída. Tente rodar o build ou o chat novamente."