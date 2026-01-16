# Build e Deploy Local - Assistente Jur�dico v1.4.0
# Execute este arquivo com: .\build-and-preview.ps1

param(
    [switch]$SkipTests,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BUILD E DEPLOY LOCAL - v1.4.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Diret�rio do projeto
$projectRoot = $PSScriptRoot

# Procurar npm no reposit�rio
$npmPaths = @(
    "$projectRoot\node_modules\.bin\npm.cmd",
    "$projectRoot\node_modules\.bin\npm",
    "npm"  # Fallback para npm global
)

$npmCmd = $null
foreach ($path in $npmPaths) {
    if (Test-Path $path -ErrorAction SilentlyContinue) {
        $npmCmd = $path
        Write-Host "[INFO] npm encontrado em: $npmCmd" -ForegroundColor Green
        break
    } elseif ($path -eq "npm") {
        # Testar se npm global existe
        try {
            $null = Get-Command npm -ErrorAction Stop
            $npmCmd = "npm"
            Write-Host "[INFO] Usando npm global" -ForegroundColor Green
            break
        } catch {
            continue
        }
    }
}

if (-not $npmCmd) {
    Write-Host "[ERRO] npm n�o encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Op��es:" -ForegroundColor Yellow
    Write-Host "1. Instale Node.js 22.x de: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "2. Ou execute 'npm install' uma vez para ter npm local" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Exibir vers�es
Write-Host ""
Write-Host "[INFO] Vers�es:" -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor White
} catch {
    Write-Host "  Node.js: N�o encontrado (mas npm est� dispon�vel)" -ForegroundColor Yellow
}

$npmVersion = & $npmCmd --version
Write-Host "  npm: $npmVersion" -ForegroundColor White
Write-Host ""

# Verificar se arquivo .env existe
if (-not (Test-Path "$projectRoot\.env")) {
    Write-Host "[ERRO] Arquivo .env no encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, crie o arquivo .env na raiz do projeto." -ForegroundColor Yellow
    Write-Host "Voc precisa configurar VITE_GOOGLE_CLIENT_ID e VITE_GEMINI_API_KEY." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# PASSO 1: INSTALAR DEPEND�NCIAS
if (-not $SkipInstall) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " PASSO 1: INSTALAR DEPEND�NCIAS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[INFO] Instalando depend�ncias..." -ForegroundColor Yellow
    & $npmCmd install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar depend�ncias!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "[OK] Depend�ncias instaladas com sucesso!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[INFO] Pulando instala��o de depend�ncias (--SkipInstall)" -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: BUILD DE PRODU��O
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PASSO 2: BUILD DE PRODU��O" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Executando build de produ��o..." -ForegroundColor Yellow
& $npmCmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERRO] Build falhou!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os erros acima e corrija antes de continuar." -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Compilando Backend..." -ForegroundColor Yellow
& $npmCmd run build:backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Build do backend falhou!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Build conclu�do com sucesso!" -ForegroundColor Green
Write-Host ""

# Verificar tamanho do bundle
if (Test-Path "$projectRoot\dist\assets") {
    $distSize = (Get-ChildItem "$projectRoot\dist\assets" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "[INFO] Tamanho do bundle: $([math]::Round($distSize, 2)) MB" -ForegroundColor Cyan
    
    if ($distSize -gt 2) {
        Write-Host "[AVISO] Bundle maior que 2MB. Considere otimizar." -ForegroundColor Yellow
    }
    Write-Host ""
}

# PASSO 3: EXECUTAR TESTES
if (-not $SkipTests) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " PASSO 3: EXECUTAR TESTES" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "[INFO] Executando testes unit�rios..." -ForegroundColor Yellow
    & $npmCmd run test:run
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[AVISO] Alguns testes falharam!" -ForegroundColor Yellow
        Write-Host ""
        
        $continuar = Read-Host "Deseja continuar mesmo assim? (S/N)"
        if ($continuar -ne "S" -and $continuar -ne "s") {
            Write-Host ""
            Write-Host "Build interrompido pelo usu�rio." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "[OK] Todos os testes passaram!" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[INFO] Pulando testes (--SkipTests)" -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 4: PREVIEW LOCAL
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PASSO 4: PREVIEW LOCAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] Iniciando servidor de preview local..." -ForegroundColor Yellow
Write-Host "[INFO] O servidor ser� aberto em: " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:4173" -ForegroundColor White
Write-Host "[INFO] Iniciando Backend em nova janela..." -ForegroundColor Yellow
Start-Process $npmCmd -ArgumentList "run", "start:production"
Write-Host "[INFO] Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
Write-Host ""

# Tentar abrir o navegador ap�s 2 segundos
$job = Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4173"
}

& $npmCmd run preview

# Limpar job do navegador
Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue

# Se chegou aqui, o preview foi parado
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BUILD E DEPLOY LOCAL - CONCLU�DO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "?? Estat�sticas do build:" -ForegroundColor Cyan
Write-Host "  - Arquivos compilados: dist/" -ForegroundColor White
Write-Host "  - Bundle principal: dist/assets/index-[hash].js" -ForegroundColor White
if (Test-Path "$projectRoot\dist\assets") {
    $distSize = (Get-ChildItem "$projectRoot\dist\assets" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  - Tamanho total: $([math]::Round($distSize, 2)) MB" -ForegroundColor White
}
Write-Host ""

Write-Host "?? Pr�ximos passos:" -ForegroundColor Cyan
Write-Host "  1. Se os testes passaram, voc� pode fazer deploy para Vercel" -ForegroundColor White
Write-Host "  2. Configure VITE_ENABLE_PII_FILTERING=true no Vercel" -ForegroundColor White
Write-Host "  3. Execute: vercel --prod" -ForegroundColor White
Write-Host ""

Write-Host "? Processo conclu�do com sucesso!" -ForegroundColor Green
