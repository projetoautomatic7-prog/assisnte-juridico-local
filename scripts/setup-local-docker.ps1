# Script de Setup do Ambiente Local (Docker)
Write-Host "🚀 Iniciando setup do ambiente local..." -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "🔍 Verificando Docker..."
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker não está rodando" }
    Write-Host "✅ Docker está ativo." -ForegroundColor Green
} catch {
    Write-Error "❌ Docker não detectado ou não está rodando. Por favor, inicie o Docker Desktop."
    exit 1
}

# 2. Subir Containers
Write-Host "📦 Subindo containers (Postgres, Redis, Qdrant)..."
docker-compose up -d

Write-Host "⏳ Aguardando serviços inicializarem (10s)..."
Start-Sleep -Seconds 10

# 3. Configurar .env.local
Write-Host "📝 Configurando .env.local..."

$envContent = @"
# Configuração Local Automática (Docker)
VITE_AUTH_MODE=simple

# PostgreSQL Local
DATABASE_URL=postgresql://admin:admin123@localhost:5432/assistente_juridico

# Redis Local (Nota: Backend precisa suportar conexão direta Redis ou user deve usar Upstash Local layer)
# Para este projeto, vamos manter a compatibilidade se houver adaptação, 
# mas note que UPSTASH_REDIS_REST_URL geralmente espera HTTP.
# Se o backend usar apenas @upstash/redis, precisaremos de um proxy ou o projeto deve suportar 'redis://' direto.
# Assumindo suporte direto ou futuro ajuste. Por enquanto, definimos para compatibilidade de chaves.
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=local_token_placeholder

# Qdrant Local
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=local_key_ignored

# Gemini (Requer chave real, mantendo placeholder ou pedindo input)
# VITE_GEMINI_API_KEY=
# GEMINI_API_KEY=

VITE_ENABLE_PII_FILTERING=false
"@

$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Warning "Arquivo $envFile já existe. Fazendo backup para $envFile.bak"
    Copy-Item $envFile "$envFile.bak" -Force
}

Set-Content -Path $envFile -Value $envContent
Write-Host "✅ Arquivo $envFile criado com configurações locais." -ForegroundColor Green

# 4. Inicializar Banco de Dados
Write-Host "🗄️ Inicializando banco de dados..."
Push-Location "backend"
try {
    # Instalar deps se necessário (rápido)
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Instalando dependências do backend..."
        npm install
    }
    
    # Rodar init, forçando uso do .env.local se possível ou injetando env vars
    # Como db:init usa dotenv, ele deve ler .env.local se configurado ou se mesclarmos
    # Vamos injetar DATABASE_URL via env var na sessão para garantir
    $env:DATABASE_URL = "postgresql://admin:admin123@localhost:5432/assistente_juridico"
    $env:NODE_ENV = "development"
    
    npm run db:init
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Banco de dados inicializado com sucesso!" -ForegroundColor Green
    } else {
        Write-Error "❌ Falha ao inicializar banco de dados."
    }
} finally {
    Pop-Location
}

Write-Host "`n🎉 Setup concluído! Para rodar o projeto:" -ForegroundColor Cyan
Write-Host "1. Frontend: npm run dev"
Write-Host "2. Backend: cd backend; npm run dev"
Write-Host "3. Adminer (DB UI): http://localhost:8080 (Sistema: PostgreSQL, Server: postgres, User: admin, Pass: admin123, DB: assistente_juridico)"
