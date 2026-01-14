@echo off
SETLOCAL EnableDelayedExpansion
TITLE Assistente Juridico PJe - Controle

:: Configurações
SET "DB_URL=http://localhost:3001/health"
SET "LOG_FILE=production.log"

:MENU
cls
echo ==========================================================
echo       ASSISTENTE JURIDICO PJe - CONTROLE DE PRODUCAO
echo ==========================================================
echo 1. Iniciar Sistema (Producao)
echo 2. Atualizar Sistema (Git Pull + Build)
echo 3. Parar Sistema (PM2 Stop)
echo 4. Ver Logs Sanitizados (LGPD)
echo 5. Configurar/Iniciar Proxy (Caddy SSL)
echo 6. Verificar Saude do Sistema (Health Check)
echo 7. Sair
echo ==========================================================
set /p opt="Escolha uma opcao: "

if "%opt%"=="1" goto START_APP
if "%opt%"=="2" goto UPDATE_APP
if "%opt%"=="3" goto STOP_APP
if "%opt%"=="4" goto LOGS_APP
if "%opt%"=="5" goto PROXY_CONFIG
if "%opt%"=="6" goto HEALTH_CHECK
if "%opt%"=="7" exit
goto MENU

:START_APP
echo.
echo [INFO] Verificando dependencias...
call pm2 -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] PM2 nao encontrado. Instalando...
    call npm install pm2 -g
)
echo [INFO] Iniciando backend...
call pm2 start backend/dist/backend/src/server.js --name "pje-backend"
timeout /t 5
goto HEALTH_CHECK

:UPDATE_APP
echo.
echo [INFO] Atualizando codigo fonte...
git pull
echo [INFO] Reinstalando dependencias e compilando...
call npm install
call npm run build:deploy
call pm2 restart pje-backend
echo [OK] Atualizacao concluida.
pause
goto MENU

:STOP_APP
call pm2 stop pje-backend
echo [OK] Sistema parado.
pause
goto MENU

:LOGS_APP
echo.
echo [INFO] Exibindo logs (Sanitizacao automatica via SafeLogger aplicada no backend)...
echo [DICA] Use 'api/lib/safe-logger.ts' para garantir LGPD.
call pm2 logs pje-backend --lines 50
pause
goto MENU

:PROXY_CONFIG
echo.
if not exist "Caddyfile" (
    echo [INFO] Criando Caddyfile para SSL Local...
    (
    echo localhost {
    echo     reverse_proxy localhost:3000
    echo     handle_path /api/* {
    echo         reverse_proxy localhost:3001
    echo     }
    echo     header {
    echo         Strict-Transport-Security max-age=31536000;
    echo         X-Content-Type-Options nosniff
    echo         X-Frame-Options DENY
    echo     }
    echo }
    ) > Caddyfile
)

if not exist "caddy.exe" (
    echo [ERRO] caddy.exe nao encontrado. Baixe em https://caddyserver.com/download
    pause
    goto MENU
)

echo [INFO] Iniciando Caddy com SSL automatico...
start caddy.exe run --config Caddyfile
echo [OK] Proxy rodando em https://localhost
pause
goto MENU

:HEALTH_CHECK
echo.
echo [INFO] Verificando saude do sistema em %DB_URL%...
powershell -Command "$resp = try { Invoke-RestMethod -Uri '%DB_URL%' -Method Get } catch { $null }; if ($resp -and $resp.status -eq 'ok') { write-host '[SUCESSO] Sistema Online e DB conectado.' -ForegroundColor Green } else { write-host '[FALHA] Sistema offline ou erro no DB.' -ForegroundColor Red }"
pause
goto MENU
