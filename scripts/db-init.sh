#!/bin/bash

# Script para inicializar o banco de dados e serviços locais no Windows (via Git Bash/WSL)

echo "🚀 Iniciando setup do banco de dados e serviços..."

# 1. Criar .env se não existir
if [ ! -f ".env" ]; then
  echo "📄 Criando arquivo .env a partir do .env.example..."
  cp .env.example .env
fi

# 2. Verificar se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
  echo "❌ Erro: O Docker Desktop não parece estar rodando. Por favor, inicie o Docker e tente novamente."
  exit 1
fi

# 3. Subir os containers via Docker Compose
echo "📦 Subindo containers (Postgres, Redis, Qdrant)..."
docker-compose up -d

# 4. Aguardar o Postgres ficar pronto
echo "⏳ Aguardando o PostgreSQL ficar pronto..."
until docker exec assistente_postgres pg_isready -U admin -d assistente_juridico > /dev/null 2>&1; do
  echo -n "."
  sleep 2
done
echo -e "\n✅ PostgreSQL está online!"

# 5. Inicializar o Schema do Prisma
echo "🏗️  Sincronizando schema do Prisma..."
if [ -d "backend" ]; then
  echo "📂 Entrando na pasta backend..."
  cd backend
  npx prisma db push
  cd ..
else
  npx prisma db push
fi

# 6. Verificar Redis
echo "🔍 Verificando Redis..."
if docker exec assistente_redis redis-cli ping | grep -q "PONG"; then
  echo "✅ Redis está online!"
else
  echo "⚠️  Aviso: Redis não respondeu ao ping."
fi

echo "✨ Setup concluído com sucesso!"
echo "-------------------------------------------------------"
echo "PostgreSQL: localhost:5432 (admin/admin123)"
echo "Redis:      localhost:6379"
echo "Qdrant:     localhost:6333"
echo "Adminer:    http://localhost:8080"
echo "-------------------------------------------------------"