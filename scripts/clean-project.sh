#!/bin/bash

# Script de limpeza para liberar espaço em disco e corrigir problemas de instalação

echo "🧹 Iniciando limpeza do projeto..."

# 1. Remover dependências (node_modules)
if [ -d "node_modules" ]; then
  echo "📦 Removendo node_modules..."
  rm -rf node_modules
fi

# 2. Remover builds anteriores
echo "🏗️  Removendo pastas de build (dist, build)..."
rm -rf dist build

# 3. Limpar caches
echo "💾 Limpando cache do NPM e arquivos temporários..."
npm cache clean --force
rm -rf .turbo .cache coverage
rm -f tsconfig.tsbuildinfo

echo "✨ Limpeza concluída! Agora você pode rodar 'npm install' para restaurar o projeto."